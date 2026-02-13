import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/postgres';
import {
  isAdsConfigured,
  fetchCampaignPerformance,
  fetchAuctionInsights,
} from '@/lib/seo-ads/google-ads-client';
import { isGA4Configured, fetchTrafficBySource } from '@/lib/seo-ads/ga4-client';
import { isSearchConsoleConfigured, fetchOrganicPerformance } from '@/lib/seo-ads/search-console-client';
import {
  upsertCampaignPerformance,
  upsertOrganicRanking,
  upsertSiteAnalytics,
  upsertCompetitorInsights,
} from '@/lib/seo-ads/queries';
import type { SeoKeyword } from '@/types/seo-ads';

/**
 * POST /api/seo-ads/cron/daily-sync
 *
 * Vercel Cron job (daily at 06:00 UTC).
 * Syncs: Google Ads campaigns → Search Console organic → GA4 analytics.
 * Protected by Authorization: Bearer <CRON_SECRET>.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results: Record<string, unknown> = {};
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch active keywords for matching
    const activeKeywords = await query<SeoKeyword>(
      'SELECT * FROM seo_keywords WHERE is_active = true'
    );
    const keywordMap = new Map(activeKeywords.map(kw => [kw.keyword.toLowerCase(), kw]));

    // 1. Sync Google Ads campaign performance (if configured)
    // Builds a campaign→keyword mapping also used by step 4 (auction insights)
    const campaignKeywordMap = new Map<string, string>(); // campaign_name → keyword_id

    if (isAdsConfigured()) {
      try {
        const adsRows = await fetchCampaignPerformance(yesterday);

        const mappedRows = adsRows
          .map(row => {
            const kw = keywordMap.get(row.keyword_text.toLowerCase());
            if (!kw) return null;
            // Track campaign→keyword mapping for auction insights
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
              report_date: yesterday,
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);

        const count = await upsertCampaignPerformance(mappedRows);
        results.ads = { status: 'success', fetched: adsRows.length, synced: count };
      } catch (err) {
        console.error('[Cron] Google Ads sync error:', err);
        results.ads = { status: 'error', error: err instanceof Error ? err.message : 'Unknown' };
      }
    } else {
      results.ads = { status: 'skipped', reason: 'Not configured' };
    }

    // 2. Sync Search Console organic data
    if (isSearchConsoleConfigured()) {
      try {
        const keywords = activeKeywords.map(kw => kw.keyword);
        const organicData = await fetchOrganicPerformance(yesterday, yesterday, keywords);

        const rows = organicData
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
              report_date: yesterday,
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);

        const count = await upsertOrganicRanking(rows);
        results.organic = { status: 'success', synced: count };
      } catch (err) {
        console.error('[Cron] Search Console sync error:', err);
        results.organic = { status: 'error', error: err instanceof Error ? err.message : 'Unknown' };
      }
    } else {
      results.organic = { status: 'skipped', reason: 'Not configured' };
    }

    // 3. Sync GA4 analytics
    if (isGA4Configured()) {
      try {
        const trafficData = await fetchTrafficBySource(yesterday, yesterday);

        const rows = trafficData.map(row => ({
          source: row.source,
          medium: row.medium || null,
          sessions: row.sessions,
          page_views: row.pageViews,
          bounce_rate: row.bounceRate,
          avg_session_duration_seconds: Math.round(row.avgSessionDuration),
          form_submissions: row.formSubmissions,
          report_date: yesterday,
        }));

        const count = await upsertSiteAnalytics(rows);
        results.analytics = { status: 'success', synced: count };
      } catch (err) {
        console.error('[Cron] GA4 sync error:', err);
        results.analytics = { status: 'error', error: err instanceof Error ? err.message : 'Unknown' };
      }
    } else {
      results.analytics = { status: 'skipped', reason: 'Not configured' };
    }

    // 4. Sync Google Ads auction insights (competitors)
    if (isAdsConfigured() && campaignKeywordMap.size > 0) {
      try {
        const auctionRows = await fetchAuctionInsights(yesterday);

        const mappedRows = auctionRows
          .map(row => {
            // Match competitor row to a keyword via campaign name
            const keywordId = campaignKeywordMap.get(row.campaign_name);
            if (!keywordId) return null;
            return {
              keyword_id: keywordId,
              competitor_domain: row.competitor_domain,
              impression_share: row.impression_share || null,
              overlap_rate: row.overlap_rate || null,
              avg_position: row.position_above_rate || null,
              report_date: yesterday,
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);

        const count = await upsertCompetitorInsights(mappedRows);
        results.competitors = { status: 'success', fetched: auctionRows.length, synced: count };
      } catch (err) {
        console.error('[Cron] Auction insights sync error:', err);
        results.competitors = { status: 'error', error: err instanceof Error ? err.message : 'Unknown' };
      }
    } else if (!isAdsConfigured()) {
      results.competitors = { status: 'skipped', reason: 'Ads not configured' };
    } else {
      results.competitors = { status: 'skipped', reason: 'No campaign-keyword mapping from step 1' };
    }

    console.log('[Cron] daily-sync completed:', results);
    return NextResponse.json({ success: true, date: yesterday, results });
  } catch (error: unknown) {
    console.error('[Cron] daily-sync failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron failed' },
      { status: 500 }
    );
  }
}
