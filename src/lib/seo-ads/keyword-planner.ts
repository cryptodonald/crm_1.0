/**
 * Keyword Planner Service
 *
 * Wraps Google Ads KeywordPlanIdeaService per keyword research.
 * Uses geo-aware cache (seoCacheKeys.keywordResearch) per evitare collisioni.
 */

import { getAdsCustomer, GEO_TARGETS, LANGUAGE_IT } from './google-ads-client';
import { getOrSet } from '@/lib/cache';
import { seoCacheKeys, SEO_TTL } from './cache-keys';

export interface KeywordResearchResult {
  keyword: string;
  avg_monthly_searches: number;
  competition_level: string;
  competition_index: number;
  avg_cpc_micros: number;
  high_cpc_micros: number;
  monthly_trend: { month: string; searches: number }[];
}

/**
 * Research keywords da seed con volumi locali.
 * Risultati cachati 24h (dati di mercato stabili).
 *
 * @param seeds - Keyword seed per la ricerca
 * @param geoTargetIds - Geo target IDs (default: area DoctorBed)
 */
export async function researchKeywords(
  seeds: string[],
  geoTargetIds: number[] = Object.values(GEO_TARGETS)
): Promise<KeywordResearchResult[]> {
  const cacheKey = seoCacheKeys.keywordResearch(seeds, geoTargetIds);

  return getOrSet(cacheKey, async () => {
    const customer = getAdsCustomer();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response: any = await customer.keywordPlanIdeas.generateKeywordIdeas({
      customer_id: customer.credentials.customer_id,
      keyword_seed: { keywords: seeds },
      geo_target_constants: geoTargetIds.map(id => `geoTargetConstants/${id}`),
      language: `languageConstants/${LANGUAGE_IT}`,
      keyword_plan_network: 'GOOGLE_SEARCH',
      include_adult_keywords: false,
      page_token: '',
      page_size: 1000,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = response.results ?? response ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return results.map((r: any) => ({
      keyword: r.text ?? '',
      avg_monthly_searches: r.keyword_idea_metrics?.avg_monthly_searches ?? 0,
      competition_level: r.keyword_idea_metrics?.competition ?? 'UNSPECIFIED',
      competition_index: r.keyword_idea_metrics?.competition_index ?? 0,
      avg_cpc_micros: Number(r.keyword_idea_metrics?.average_cpc_micros ?? 0),
      high_cpc_micros: Number(r.keyword_idea_metrics?.high_top_of_page_bid_micros ?? 0),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      monthly_trend: r.keyword_idea_metrics?.monthly_search_volumes?.map((m: any) => ({
        month: `${m.year}-${String(m.month).padStart(2, '0')}`,
        searches: Number(m.monthly_searches ?? 0),
      })) ?? [],
    }));
  }, SEO_TTL.RESEARCH);
}
