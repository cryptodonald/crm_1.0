import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/postgres';
import { isAdsConfigured } from '@/lib/seo-ads/google-ads-client';
import { researchKeywords } from '@/lib/seo-ads/keyword-planner';
import { upsertKeywordMetrics } from '@/lib/seo-ads/queries';
import type { SeoKeyword } from '@/types/seo-ads';

/**
 * POST /api/seo-ads/cron/weekly-research
 *
 * Vercel Cron job (weekly, Monday 07:00 UTC).
 * Refreshes keyword metrics (volumes, CPC, competition) via Google Ads API.
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

    if (!isAdsConfigured()) {
      return NextResponse.json({
        success: false,
        reason: 'Google Ads API not configured',
      });
    }

    // Fetch all active keywords
    const activeKeywords = await query<SeoKeyword>(
      'SELECT * FROM seo_keywords WHERE is_active = true ORDER BY cluster, keyword'
    );

    if (activeKeywords.length === 0) {
      return NextResponse.json({ success: true, message: 'No active keywords', synced: 0 });
    }

    // Research in batches of 10 keywords (API limit)
    let totalSynced = 0;
    const batchSize = 10;

    for (let i = 0; i < activeKeywords.length; i += batchSize) {
      const batch = activeKeywords.slice(i, i + batchSize);
      const seeds = batch.map(kw => kw.keyword);

      try {
        const results = await researchKeywords(seeds);

        // Match results back to keywords and upsert
        for (const result of results) {
          const matchedKeyword = batch.find(
            kw => kw.keyword.toLowerCase() === result.keyword.toLowerCase()
          );
          if (!matchedKeyword) continue;

          await upsertKeywordMetrics(matchedKeyword.id, {
            avg_monthly_searches: result.avg_monthly_searches,
            local_monthly_searches: null, // Not available from basic research
            competition_level: result.competition_level as 'LOW' | 'MEDIUM' | 'HIGH' | null,
            competition_index: result.competition_index,
            avg_cpc_micros: result.avg_cpc_micros,
            high_cpc_micros: result.high_cpc_micros,
            monthly_trend: result.monthly_trend,
            keyword: undefined,
          });
          totalSynced++;
        }
      } catch (err) {
        console.error(`[Cron] weekly-research batch ${i}-${i + batchSize} error:`, err);
        // Continue with next batch
      }
    }

    console.log(`[Cron] weekly-research completed: ${totalSynced}/${activeKeywords.length} keywords updated`);
    return NextResponse.json({
      success: true,
      synced: totalSynced,
      total: activeKeywords.length,
    });
  } catch (error: unknown) {
    console.error('[Cron] weekly-research failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron failed' },
      { status: 500 }
    );
  }
}
