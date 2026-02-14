/**
 * SEO & Ads Intelligence Dashboard Types
 *
 * Tipi per le 7 tabelle SEO + filtri + KPI dashboard.
 * Coerente con src/types/database.ts (UUID, Timestamptz, PaginatedResponse, etc.)
 *
 * Convenzioni:
 * - Valori finanziari Google Ads: bigint micros (1.000.000 = 1€)
 * - Deal values: bigint cents (100 = 1€) — coerente con AGENTS.md "Currency Handling"
 * - Numeric Postgres (5,2)/(5,4): number in TypeScript
 */

import type { UUID, Timestamptz, PaginationParams, SortParams } from './database';

// ============================================================================
// ENUMS / Literal Types
// ============================================================================

export type KeywordPriority = 'alta' | 'media' | 'bassa';

export type CompetitionLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type AttributionSource =
  | 'google_ads'
  | 'organic'
  | 'direct'
  | 'referral'
  | 'social';

export type AttributionConfidence = 'exact' | 'high' | 'estimated' | 'none';

// ============================================================================
// SEO_KEYWORDS
// ============================================================================

export interface SeoKeyword {
  id: UUID;
  keyword: string;
  cluster: string;
  landing_page: string | null;
  priority: KeywordPriority;
  is_active: boolean;
  created_at: Timestamptz;
  updated_at: Timestamptz;

  // Aggregated (from JOINs)
  latest_avg_position?: number | null;
  latest_avg_cpc_micros?: number | null;
  latest_avg_monthly_searches?: number | null;
}

export interface SeoKeywordCreateInput {
  keyword: string;
  cluster: string;
  landing_page?: string;
  priority?: KeywordPriority;
  is_active?: boolean;
}

export type SeoKeywordUpdateInput = Partial<SeoKeywordCreateInput>;

// ============================================================================
// SEO_KEYWORD_METRICS
// ============================================================================

export interface SeoKeywordMetrics {
  id: UUID;
  keyword_id: UUID;
  avg_monthly_searches: number | null;
  local_monthly_searches: number | null;
  competition_level: CompetitionLevel | null;
  competition_index: number | null;
  avg_cpc_micros: number | null;    // bigint micros (1M = 1€)
  high_cpc_micros: number | null;   // bigint micros
  monthly_trend: MonthlyTrendEntry[] | null; // jsonb
  recorded_at: Timestamptz;

  // Aggregated (from JOINs)
  keyword?: string;
}

export interface MonthlyTrendEntry {
  month: string;    // "2026-01", "2026-02", etc.
  searches: number;
}

// ============================================================================
// SEO_CAMPAIGN_PERFORMANCE
// ============================================================================

export interface SeoCampaignPerformance {
  id: UUID;
  keyword_id: UUID;
  campaign_name: string;
  ad_group_name: string;
  impressions: number;
  clicks: number;
  cost_micros: number;       // bigint micros
  conversions: number | null;
  quality_score: number | null; // 1-10
  report_date: string;       // date → ISO string
  created_at: Timestamptz;
  updated_at: Timestamptz;

  // Keyword-level detail fields (from Google Ads keyword_view)
  match_type: string | null;         // BROAD, PHRASE, EXACT
  keyword_status: string | null;     // ENABLED, PAUSED, REMOVED
  serving_status: string | null;     // ELIGIBLE, RARELY_SERVED
  expected_ctr: string | null;       // BELOW_AVERAGE, AVERAGE, ABOVE_AVERAGE
  landing_page_exp: string | null;   // BELOW_AVERAGE, AVERAGE, ABOVE_AVERAGE
  ad_relevance: string | null;       // BELOW_AVERAGE, AVERAGE, ABOVE_AVERAGE
  campaign_type: string | null;      // SEARCH, PERFORMANCE_MAX, etc.
  bid_strategy: string | null;       // MAXIMIZE_CONVERSIONS, TARGET_CPA, etc.
  cost_per_conversion_micros: number; // bigint micros
  conversion_rate: number;           // numeric(5,4)

  // Computed
  ctr?: number;              // clicks / impressions
  avg_cpc_micros?: number;   // cost_micros / clicks
  keyword?: string;
}

// ============================================================================
// SEO_ORGANIC_RANKINGS
// ============================================================================

export interface SeoOrganicRanking {
  id: UUID;
  keyword_id: UUID;
  avg_position: number;      // numeric(5,2)
  clicks: number;
  impressions: number;
  ctr: number;               // numeric(5,4) — 0.0000-1.0000
  page_url: string | null;
  report_date: string;
  created_at: Timestamptz;
  updated_at: Timestamptz;

  // Aggregated
  keyword?: string;
}

// ============================================================================
// SEO_SITE_ANALYTICS
// ============================================================================

export interface SeoSiteAnalytics {
  id: UUID;
  source: string;
  medium: string | null;
  sessions: number;
  page_views: number;
  bounce_rate: number | null;                // numeric(5,4)
  avg_session_duration_seconds: number | null;
  form_submissions: number | null;
  report_date: string;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}

// ============================================================================
// SEO_LEAD_ATTRIBUTION
// ============================================================================

export interface SeoLeadAttribution {
  id: UUID;
  lead_id: UUID;
  keyword_id: UUID | null;
  source: AttributionSource;
  confidence: AttributionConfidence;
  gclid: string | null;
  landing_page_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_keyword: string | null;
  deal_value_cents: number | null; // bigint cents (100 = 1€)
  created_at: Timestamptz;
  updated_at: Timestamptz;

  // Aggregated (from JOINs)
  lead_name?: string | null;
  keyword?: string | null;
}

export interface SeoLeadAttributionCreateInput {
  lead_id: UUID;
  keyword_id?: UUID;
  source: AttributionSource;
  confidence?: AttributionConfidence;
  gclid?: string;
  landing_page_url?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_keyword?: string;
  deal_value_cents?: number;
}

export type SeoLeadAttributionUpdateInput = Partial<
  Omit<SeoLeadAttributionCreateInput, 'lead_id'>
>;

// ============================================================================
// SEO_COMPETITOR_INSIGHTS
// ============================================================================

export interface SeoCompetitorInsight {
  id: UUID;
  keyword_id: UUID;
  competitor_domain: string;
  impression_share: number | null; // numeric(5,4) — 0-1
  overlap_rate: number | null;     // numeric(5,4)
  avg_position: number | null;     // numeric(5,2)
  report_date: string;
  created_at: Timestamptz;

  // Aggregated
  keyword?: string;
}

// ============================================================================
// FILTERS
// ============================================================================

export interface SeoKeywordFilters extends PaginationParams, SortParams {
  cluster?: string;
  priority?: KeywordPriority;
  is_active?: boolean;
  search?: string; // trigram fuzzy search
}

export interface SeoCampaignFilters extends PaginationParams, SortParams {
  keyword_id?: UUID;
  campaign_name?: string;
  date_from?: string; // ISO date
  date_to?: string;
}

export interface SeoOrganicFilters extends PaginationParams, SortParams {
  keyword_id?: UUID;
  date_from?: string;
  date_to?: string;
}

export interface SeoAnalyticsFilters extends PaginationParams, SortParams {
  source?: string;
  medium?: string;
  date_from?: string;
  date_to?: string;
}

export interface SeoAttributionFilters extends PaginationParams, SortParams {
  source?: AttributionSource;
  confidence?: AttributionConfidence;
  keyword_id?: UUID;
  date_from?: string;
  date_to?: string;
}

export interface SeoCompetitorFilters extends PaginationParams, SortParams {
  keyword_id?: UUID;
  competitor_domain?: string;
  date_from?: string;
  date_to?: string;
}

// ============================================================================
// DASHBOARD KPIs
// ============================================================================

/** Aggregazione top-level per la dashboard SEO */
export interface SeoDashboardKPIs {
  // Google Ads aggregati
  ads_total_spend_micros: number;
  ads_total_clicks: number;
  ads_total_impressions: number;
  ads_avg_cpc_micros: number;
  ads_total_conversions: number;
  ads_avg_quality_score: number | null;

  // Organic aggregati
  organic_avg_position: number;
  organic_total_clicks: number;
  organic_total_impressions: number;
  organic_avg_ctr: number;

  // Site analytics aggregati
  total_sessions: number;
  total_page_views: number;
  avg_bounce_rate: number;
  total_form_submissions: number;

  // ROI
  total_leads_attributed: number;
  total_deal_value_cents: number;
  cost_per_lead_micros: number;
  roas: number; // deal_value / ad_spend

  // Variazioni % vs periodo precedente (null se non disponibile)
  changes: Record<string, number | null>;

  // Periodo
  period_start: string;
  period_end: string;
}

/** Datapoint per grafici trend (recharts) */
export interface SeoTrendDataPoint {
  date: string;
  value: number;
  label?: string;
}

/** Keyword con metriche aggregate per tabella overview */
export interface SeoKeywordOverview extends SeoKeyword {
  avg_monthly_searches: number | null;
  avg_cpc_micros: number | null;
  competition_level: CompetitionLevel | null;
  organic_position: number | null;
  organic_clicks: number | null;
  ads_clicks: number | null;
  ads_cost_micros: number | null;
  attributed_leads: number;
  attributed_revenue_cents: number;
}

/** Competitor aggregato per tabella competitor */
export interface SeoCompetitorOverview {
  competitor_domain: string;
  avg_impression_share: number;
  avg_overlap_rate: number;
  avg_position: number;
  keywords_count: number;
}
