import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { checkRateLimit } from '@/lib/ratelimit';
import { query } from '@/lib/postgres';
import {
  isAdsConfigured,
  fetchCampaignPerformance,
  fetchAuctionInsights,
} from '@/lib/seo-ads/google-ads-client';
import { isSearchConsoleConfigured, fetchOrganicPerformance } from '@/lib/seo-ads/search-console-client';
import { isGA4Configured, fetchTrafficBySource } from '@/lib/seo-ads/ga4-client';
import {
  createSeoKeyword,
  upsertCampaignPerformance,
  upsertCompetitorInsights,
  upsertOrganicRanking,
  upsertSiteAnalytics,
} from '@/lib/seo-ads/queries';
import type { SeoKeyword } from '@/types/seo-ads';

/**
 * POST /api/seo-ads/sync
 *
 * On-demand sync: calls Google Ads API for the given date range,
 * upserts campaign performance + auction insights, returns summary.
 *
 * Body: { date_from: "YYYY-MM-DD", date_to?: "YYYY-MM-DD" }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isDev = process.env.NODE_ENV === 'development';
    const { success } = isDev
      ? { success: true }
      : await checkRateLimit(session.user.email, 'write');
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429 }
      );
    }

    if (!isAdsConfigured()) {
      return NextResponse.json(
        { error: 'Google Ads API not configured', code: 'ADS_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const dateFrom: string = body.date_from;
    const dateTo: string = body.date_to || dateFrom;

    if (!dateFrom) {
      return NextResponse.json(
        { error: 'date_from is required (YYYY-MM-DD)', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Fetch active keywords for matching
    const activeKeywords = await query<SeoKeyword>(
      'SELECT * FROM seo_keywords WHERE is_active = true'
    );
    const keywordMap = new Map(activeKeywords.map(kw => [kw.keyword.toLowerCase(), kw]));
    const campaignKeywordMap = new Map<string, string>();

    // 1. Sync campaign performance
    const adsRows = await fetchCampaignPerformance(dateFrom, dateTo);
    let autoCreated = 0;

    // Auto-create missing keywords
    for (const row of adsRows) {
      const kwLower = row.keyword_text.toLowerCase();
      if (!keywordMap.has(kwLower) && row.keyword_text.trim()) {
        try {
          const newKw = await createSeoKeyword({
            keyword: row.keyword_text.toLowerCase(),
            cluster: row.campaign_name,
            priority: 'media',
            is_active: true,
          });
          keywordMap.set(kwLower, newKw);
          autoCreated++;
        } catch {
          // Keyword might already exist — ignore
        }
      }
    }

    const mappedRows = adsRows
      .map(row => {
        const kw = keywordMap.get(row.keyword_text.toLowerCase());
        if (!kw) return null;
        campaignKeywordMap.set(row.campaign_name, kw.id);
        return {
          keyword_id: kw.id,
          campaign_name: row.campaign_name,
          ad_group_name: row.ad_group_name,
          impressions: row.impressions,
          clicks: row.clicks,
          cost_micros: row.cost_micros,
          conversions: row.conversions || null,
          quality_score: row.quality_score,
          report_date: row.date,
          match_type: row.match_type,
          keyword_status: row.keyword_status,
          serving_status: row.serving_status,
          expected_ctr: row.expected_ctr,
          landing_page_exp: row.landing_page_exp,
          ad_relevance: row.ad_relevance,
          campaign_type: row.campaign_type,
          bid_strategy: row.bid_strategy,
          cost_per_conversion_micros: row.cost_per_conversion_micros,
          conversion_rate: row.conversion_rate,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const campaignCount = await upsertCampaignPerformance(mappedRows);

    // 2. Sync auction insights (competitors)
    let competitorCount = 0;
    if (campaignKeywordMap.size > 0) {
      try {
        const auctionRows = await fetchAuctionInsights(dateFrom, dateTo);
        const competitorRows = auctionRows
          .map(row => {
            const keywordId = campaignKeywordMap.get(row.campaign_name);
            if (!keywordId) return null;
            return {
              keyword_id: keywordId,
              competitor_domain: row.competitor_domain,
              impression_share: row.impression_share || null,
              overlap_rate: row.overlap_rate || null,
              avg_position: row.position_above_rate || null,
              report_date: row.date,
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);

        competitorCount = await upsertCompetitorInsights(competitorRows);
      } catch (err) {
        console.error('[Sync] Auction insights error (non-blocking):', err);
      }
    }

    // 3. Sync Search Console organic rankings
    let organicCount = 0;
    if (isSearchConsoleConfigured()) {
      try {
        const organicRows = await fetchOrganicPerformance(dateFrom, dateTo, 
          activeKeywords.map(kw => kw.keyword)
        );

        const mappedOrganic = organicRows
          .map(row => {
            const kw = keywordMap.get(row.keyword.toLowerCase());
            if (!kw) return null;
            return {
              keyword_id: kw.id,
              avg_position: row.position,
              clicks: row.clicks,
              impressions: row.impressions,
              ctr: row.ctr,
              page_url: row.page || null,
              report_date: dateTo, // Use end date for the report
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);

        organicCount = await upsertOrganicRanking(mappedOrganic);
      } catch (err) {
        console.error('[Sync] Search Console error (non-blocking):', err);
      }
    }

    // 4. Sync GA4 site analytics
    let analyticsCount = 0;
    if (isGA4Configured()) {
      try {
        const trafficData = await fetchTrafficBySource(dateFrom, dateTo);

        const analyticsRows = trafficData.map(row => ({
          source: row.source,
          medium: row.medium || null,
          sessions: row.sessions,
          page_views: row.pageViews,
          bounce_rate: row.bounceRate,
          avg_session_duration_seconds: Math.round(row.avgSessionDuration),
          form_submissions: row.formSubmissions,
          report_date: dateTo,
        }));

        analyticsCount = await upsertSiteAnalytics(analyticsRows);
      } catch (err) {
        console.error('[Sync] GA4 error (non-blocking):', err);
      }
    }

    // 5. Bidirectional cleanup: deactivate CRM keywords not found in Google Ads
    const adsKeywordTexts = new Set(
      adsRows
        .filter(r => r.keyword_text.trim())
        .map(r => r.keyword_text.toLowerCase())
    );

    let deactivated = 0;
    for (const [kwText, kw] of keywordMap) {
      if (!adsKeywordTexts.has(kwText)) {
        // Keyword exists in CRM but NOT in Google Ads → deactivate
        await query(
          'UPDATE seo_keywords SET is_active = false, updated_at = NOW() WHERE id = $1 AND is_active = true',
          [kw.id]
        );
        deactivated++;
      }
    }

    // 6. Delete orphaned campaign performance rows for deactivated keywords
    if (deactivated > 0) {
      await query(
        `DELETE FROM seo_campaign_performance
         WHERE keyword_id IN (
           SELECT id FROM seo_keywords WHERE is_active = false
         )`
      );
    }

    return NextResponse.json({
      success: true,
      date_from: dateFrom,
      date_to: dateTo,
      campaigns: { fetched: adsRows.length, synced: campaignCount, autoCreated },
      competitors: { synced: competitorCount },
      organic: { synced: organicCount },
      analytics: { synced: analyticsCount },
      cleanup: { deactivated },
    });
  } catch (error: unknown) {
    console.error('[API] POST /api/seo-ads/sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed', code: 'SYNC_ERROR' },
      { status: 500 }
    );
  }
}
