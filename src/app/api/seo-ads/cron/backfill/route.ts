import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/postgres';
import {
  isAdsConfigured,
  fetchCampaignPerformance,
  fetchAuctionInsights,
} from '@/lib/seo-ads/google-ads-client';
import { isGA4Configured, fetchTrafficBySource } from '@/lib/seo-ads/ga4-client';
import {
  createSeoKeyword,
  upsertCampaignPerformance,
  upsertSiteAnalytics,
  upsertCompetitorInsights,
} from '@/lib/seo-ads/queries';
import type { SeoKeyword } from '@/types/seo-ads';

/**
 * POST /api/seo-ads/cron/backfill
 *
 * One-time backfill of historical Google Ads + GA4 data.
 * Protected by CRON_SECRET.
 *
 * Body: { date_from: "YYYY-MM-DD", date_to: "YYYY-MM-DD" }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const dateFrom = body.date_from;
    const dateTo = body.date_to;

    if (!dateFrom || !dateTo) {
      return NextResponse.json(
        { error: 'date_from and date_to are required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    const results: Record<string, unknown> = {};

    // Fetch active keywords for matching
    const activeKeywords = await query<SeoKeyword>(
      'SELECT * FROM seo_keywords WHERE is_active = true'
    );
    const keywordMap = new Map(activeKeywords.map(kw => [kw.keyword.toLowerCase(), kw]));

    // 1. Backfill Google Ads campaign performance (full range in one API call)
    const campaignKeywordMap = new Map<string, string>();

    if (isAdsConfigured()) {
      try {
        console.log(`[Backfill] Fetching Google Ads data: ${dateFrom} → ${dateTo}`);
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

        // Map to DB rows (use actual date from API, not a fixed date)
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
              report_date: row.date, // Use actual date from Google Ads
            };
          })
          .filter((r): r is NonNullable<typeof r> => r !== null);

        const count = await upsertCampaignPerformance(mappedRows);
        results.ads = {
          status: 'success',
          fetched: adsRows.length,
          synced: count,
          autoCreated,
          uniqueKeywords: keywordMap.size,
        };
      } catch (err) {
        console.error('[Backfill] Google Ads error:', err);
        results.ads = { status: 'error', error: err instanceof Error ? err.message : 'Unknown' };
      }
    } else {
      results.ads = { status: 'skipped', reason: 'Not configured' };
    }

    // 2. Backfill GA4 analytics (day by day — GA4 API supports date ranges)
    if (isGA4Configured()) {
      try {
        console.log(`[Backfill] Fetching GA4 data: ${dateFrom} → ${dateTo}`);
        const trafficData = await fetchTrafficBySource(dateFrom, dateTo);

        const rows = trafficData.map(row => ({
          source: row.source,
          medium: row.medium || null,
          sessions: row.sessions,
          page_views: row.pageViews,
          bounce_rate: row.bounceRate,
          avg_session_duration_seconds: Math.round(row.avgSessionDuration),
          form_submissions: row.formSubmissions,
          report_date: dateTo, // GA4 returns aggregated data for the range
        }));

        const count = await upsertSiteAnalytics(rows);
        results.analytics = { status: 'success', synced: count };
      } catch (err) {
        console.error('[Backfill] GA4 error:', err);
        results.analytics = { status: 'error', error: err instanceof Error ? err.message : 'Unknown' };
      }
    } else {
      results.analytics = { status: 'skipped', reason: 'Not configured' };
    }

    // 3. Backfill auction insights
    if (isAdsConfigured() && campaignKeywordMap.size > 0) {
      try {
        console.log(`[Backfill] Fetching auction insights: ${dateFrom} → ${dateTo}`);
        const auctionRows = await fetchAuctionInsights(dateFrom, dateTo);

        const mappedRows = auctionRows
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

        const count = await upsertCompetitorInsights(mappedRows);
        results.competitors = { status: 'success', fetched: auctionRows.length, synced: count };
      } catch (err) {
        console.error('[Backfill] Auction insights error:', err);
        results.competitors = { status: 'error', error: err instanceof Error ? err.message : 'Unknown' };
      }
    }

    console.log('[Backfill] completed:', results);
    return NextResponse.json({
      success: true,
      date_from: dateFrom,
      date_to: dateTo,
      results,
    });
  } catch (error: unknown) {
    console.error('[Backfill] failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Backfill failed' },
      { status: 500 }
    );
  }
}
