/**
 * SEO & Ads Dashboard — Cache Key Builders
 *
 * Structured cache keys con granular invalidation (HIGH-001).
 * Estende pattern di src/lib/cache.ts.
 */

export const seoCacheKeys = {
  // Keywords
  keyword: (id: string) => `seo:keywords:${id}`,
  keywordsList: (filterHash: string) => `seo:keywords:list:${filterHash}`,

  // Keyword research (include geo per evitare collisioni)
  keywordResearch: (seeds: string[], geoIds: number[]) =>
    `seo:research:${seeds.sort().join(',')}:geo:${geoIds.sort().join(',')}`,

  // Campaign performance
  campaigns: (filterHash: string) => `seo:campaigns:${filterHash}`,

  // Organic rankings
  organic: (filterHash: string) => `seo:organic:${filterHash}`,

  // Site analytics
  analytics: (date: string) => `seo:analytics:${date}`,

  // Attribution
  attribution: (filterHash: string) => `seo:attribution:${filterHash}`,

  // Competitors
  competitors: (keywordId: string) => `seo:competitors:${keywordId}`,

  // Dashboard KPIs
  dashboard: () => `seo:dashboard:kpis`,
} as const;

/**
 * SEO-specific TTL values (seconds).
 * Complementa TTL in src/lib/cache.ts.
 */
export const SEO_TTL = {
  RESEARCH: 86400,    // 24h — keyword research (dati di mercato stabili)
  CAMPAIGNS: 900,     // 15 min — campaign performance
  ORGANIC: 3600,      // 1h — organic rankings
  ANALYTICS: 1800,    // 30 min — site analytics
  COMPETITORS: 21600, // 6h — auction insights (raramente cambiano)
  DASHBOARD: 300,     // 5 min — KPI aggregati
} as const;
