/**
 * SEO & Ads Dashboard — PostgreSQL Queries
 *
 * CRUD operations per le 7 tabelle SEO.
 * Usa query()/queryOne() da lib/postgres.ts.
 * Pattern identico a postgres.ts (getLeads, createLead, etc.)
 */

import { query, queryOne } from '@/lib/postgres';
import { invalidate } from '@/lib/cache';
import type { UUID, PaginatedResponse } from '@/types/database';
import type {
  SeoKeyword,
  SeoKeywordCreateInput,
  SeoKeywordUpdateInput,
  SeoKeywordFilters,
  SeoKeywordMetrics,
  SeoCampaignPerformance,
  SeoCampaignFilters,
  SeoOrganicRanking,
  SeoOrganicFilters,
  SeoSiteAnalytics,
  SeoAnalyticsFilters,
  SeoLeadAttribution,
  SeoLeadAttributionCreateInput,
  SeoAttributionFilters,
  SeoCompetitorInsight,
  SeoCompetitorFilters,
  SeoDashboardKPIs,
} from '@/types/seo-ads';

// ============================================================================
// ALLOWED SORT COLUMNS (prevent SQL injection)
// ============================================================================

const KEYWORD_SORT_COLS = ['created_at', 'updated_at', 'keyword', 'cluster', 'priority'] as const;
const CAMPAIGN_SORT_COLS = ['report_date', 'campaign_name', 'clicks', 'impressions', 'cost_micros'] as const;
const ORGANIC_SORT_COLS = ['report_date', 'avg_position', 'clicks', 'impressions'] as const;
const ANALYTICS_SORT_COLS = ['report_date', 'source', 'sessions', 'page_views'] as const;
const ATTRIBUTION_SORT_COLS = ['created_at', 'source', 'confidence'] as const;
const COMPETITOR_SORT_COLS = ['report_date', 'competitor_domain', 'impression_share'] as const;

function validateSortColumn(col: string | undefined, allowed: readonly string[], fallback: string): string {
  if (!col) return fallback;
  return allowed.includes(col) ? col : fallback;
}

// ============================================================================
// SEO_KEYWORDS
// ============================================================================

export async function getSeoKeywords(
  filters: SeoKeywordFilters = {}
): Promise<PaginatedResponse<SeoKeyword>> {
  const {
    page = 1, limit = 50,
    cluster, priority, is_active, search,
    sort_by, sort_order = 'desc',
  } = filters;

  const sortCol = validateSortColumn(sort_by, KEYWORD_SORT_COLS, 'created_at');
  const offset = (page - 1) * limit;
  const whereClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (cluster) {
    whereClauses.push(`cluster = $${paramIndex}`);
    params.push(cluster);
    paramIndex++;
  }

  if (priority) {
    whereClauses.push(`priority = $${paramIndex}`);
    params.push(priority);
    paramIndex++;
  }

  if (is_active !== undefined) {
    whereClauses.push(`is_active = $${paramIndex}`);
    params.push(is_active);
    paramIndex++;
  }

  if (search) {
    whereClauses.push(`keyword ILIKE $${paramIndex}`);
    params.push(`%${search}%`);
    paramIndex++;
  }

  const whereClause = whereClauses.length > 0
    ? `WHERE ${whereClauses.join(' AND ')}`
    : '';

  const countSql = `SELECT COUNT(*) as total FROM seo_keywords ${whereClause}`;
  const countResult = await queryOne<{ total: string }>(countSql, params);
  const total = parseInt(countResult?.total || '0', 10);

  const dataSql = `
    SELECT * FROM seo_keywords
    ${whereClause}
    ORDER BY ${sortCol} ${sort_order === 'asc' ? 'ASC' : 'DESC'}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const data = await query<SeoKeyword>(dataSql, params);

  return {
    data,
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
  };
}

export async function getSeoKeywordById(id: UUID): Promise<SeoKeyword | null> {
  return queryOne<SeoKeyword>('SELECT * FROM seo_keywords WHERE id = $1', [id]);
}

export async function createSeoKeyword(input: SeoKeywordCreateInput): Promise<SeoKeyword> {
  const fields = Object.keys(input);
  const values = Object.values(input);
  const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

  const sql = `
    INSERT INTO seo_keywords (${fields.join(', ')}, created_at, updated_at)
    VALUES (${placeholders}, NOW(), NOW())
    RETURNING *
  `;

  const keyword = await queryOne<SeoKeyword>(sql, values);
  if (!keyword) throw new Error('Failed to create keyword');

  await invalidate('seo:keywords:*');
  return keyword;
}

export async function updateSeoKeyword(id: UUID, input: SeoKeywordUpdateInput): Promise<SeoKeyword> {
  const fields = Object.keys(input);
  const values = Object.values(input);
  const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');

  const sql = `
    UPDATE seo_keywords
    SET ${setClause}, updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;

  const keyword = await queryOne<SeoKeyword>(sql, [id, ...values]);
  if (!keyword) throw new Error('Keyword not found');

  await invalidate('seo:keywords:*');
  return keyword;
}

export async function deleteSeoKeyword(id: UUID): Promise<void> {
  await query('DELETE FROM seo_keywords WHERE id = $1', [id]);
  await invalidate('seo:keywords:*');
}

// ============================================================================
// SEO_KEYWORD_METRICS
// ============================================================================

export async function getLatestKeywordMetrics(keywordId: UUID): Promise<SeoKeywordMetrics | null> {
  return queryOne<SeoKeywordMetrics>(
    `SELECT * FROM seo_keyword_metrics
     WHERE keyword_id = $1
     ORDER BY recorded_at DESC
     LIMIT 1`,
    [keywordId]
  );
}

export async function getKeywordMetricsHistory(
  keywordId: UUID,
  limit = 12
): Promise<SeoKeywordMetrics[]> {
  return query<SeoKeywordMetrics>(
    `SELECT * FROM seo_keyword_metrics
     WHERE keyword_id = $1
     ORDER BY recorded_at DESC
     LIMIT $2`,
    [keywordId, limit]
  );
}

export async function upsertKeywordMetrics(
  keywordId: UUID,
  data: Omit<SeoKeywordMetrics, 'id' | 'keyword_id' | 'recorded_at'>
): Promise<SeoKeywordMetrics> {
  const sql = `
    INSERT INTO seo_keyword_metrics (
      keyword_id, avg_monthly_searches, local_monthly_searches,
      competition_level, competition_index, avg_cpc_micros,
      high_cpc_micros, monthly_trend, recorded_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    RETURNING *
  `;

  const result = await queryOne<SeoKeywordMetrics>(sql, [
    keywordId,
    data.avg_monthly_searches,
    data.local_monthly_searches,
    data.competition_level,
    data.competition_index,
    data.avg_cpc_micros,
    data.high_cpc_micros,
    data.monthly_trend ? JSON.stringify(data.monthly_trend) : null,
  ]);

  if (!result) throw new Error('Failed to insert keyword metrics');
  return result;
}

// ============================================================================
// SEO_CAMPAIGN_PERFORMANCE
// ============================================================================

export async function getCampaignPerformance(
  filters: SeoCampaignFilters = {}
): Promise<PaginatedResponse<SeoCampaignPerformance>> {
  const {
    page = 1, limit = 50,
    keyword_id, campaign_name, date_from, date_to,
    sort_by, sort_order = 'desc',
  } = filters;

  const sortCol = validateSortColumn(sort_by, CAMPAIGN_SORT_COLS, 'report_date');
  const offset = (page - 1) * limit;
  const whereClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (keyword_id) {
    whereClauses.push(`cp.keyword_id = $${paramIndex}`);
    params.push(keyword_id);
    paramIndex++;
  }

  if (campaign_name) {
    whereClauses.push(`cp.campaign_name ILIKE $${paramIndex}`);
    params.push(`%${campaign_name}%`);
    paramIndex++;
  }

  if (date_from) {
    whereClauses.push(`cp.report_date >= $${paramIndex}`);
    params.push(date_from);
    paramIndex++;
  }

  if (date_to) {
    whereClauses.push(`cp.report_date <= $${paramIndex}`);
    params.push(date_to);
    paramIndex++;
  }

  const whereClause = whereClauses.length > 0
    ? `WHERE ${whereClauses.join(' AND ')}`
    : '';

  const countSql = `SELECT COUNT(*) as total FROM seo_campaign_performance cp ${whereClause}`;
  const countResult = await queryOne<{ total: string }>(countSql, params);
  const total = parseInt(countResult?.total || '0', 10);

  const dataSql = `
    SELECT cp.*, sk.keyword
    FROM seo_campaign_performance cp
    LEFT JOIN seo_keywords sk ON cp.keyword_id = sk.id
    ${whereClause}
    ORDER BY cp.${sortCol} ${sort_order === 'asc' ? 'ASC' : 'DESC'}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const data = await query<SeoCampaignPerformance>(dataSql, params);

  return {
    data,
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
  };
}

export async function upsertCampaignPerformance(
  rows: Array<{
    keyword_id: UUID;
    campaign_name: string;
    ad_group_name: string;
    impressions: number;
    clicks: number;
    cost_micros: number;
    conversions: number | null;
    quality_score: number | null;
    report_date: string;
  }>
): Promise<number> {
  if (rows.length === 0) return 0;

  let inserted = 0;
  for (const row of rows) {
    const sql = `
      INSERT INTO seo_campaign_performance (
        keyword_id, campaign_name, ad_group_name,
        impressions, clicks, cost_micros, conversions, quality_score,
        report_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (keyword_id, campaign_name, ad_group_name, report_date)
      DO UPDATE SET
        impressions = EXCLUDED.impressions,
        clicks = EXCLUDED.clicks,
        cost_micros = EXCLUDED.cost_micros,
        conversions = EXCLUDED.conversions,
        quality_score = EXCLUDED.quality_score,
        updated_at = NOW()
    `;
    await query(sql, [
      row.keyword_id, row.campaign_name, row.ad_group_name,
      row.impressions, row.clicks, row.cost_micros,
      row.conversions, row.quality_score, row.report_date,
    ]);
    inserted++;
  }

  await invalidate('seo:campaigns:*');
  return inserted;
}

// ============================================================================
// SEO_ORGANIC_RANKINGS
// ============================================================================

export async function getOrganicRankings(
  filters: SeoOrganicFilters = {}
): Promise<PaginatedResponse<SeoOrganicRanking>> {
  const {
    page = 1, limit = 50,
    keyword_id, date_from, date_to,
    sort_by, sort_order = 'desc',
  } = filters;

  const sortCol = validateSortColumn(sort_by, ORGANIC_SORT_COLS, 'report_date');
  const offset = (page - 1) * limit;
  const whereClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (keyword_id) {
    whereClauses.push(`o.keyword_id = $${paramIndex}`);
    params.push(keyword_id);
    paramIndex++;
  }

  if (date_from) {
    whereClauses.push(`o.report_date >= $${paramIndex}`);
    params.push(date_from);
    paramIndex++;
  }

  if (date_to) {
    whereClauses.push(`o.report_date <= $${paramIndex}`);
    params.push(date_to);
    paramIndex++;
  }

  const whereClause = whereClauses.length > 0
    ? `WHERE ${whereClauses.join(' AND ')}`
    : '';

  const countSql = `SELECT COUNT(*) as total FROM seo_organic_rankings o ${whereClause}`;
  const countResult = await queryOne<{ total: string }>(countSql, params);
  const total = parseInt(countResult?.total || '0', 10);

  const dataSql = `
    SELECT o.*, sk.keyword
    FROM seo_organic_rankings o
    LEFT JOIN seo_keywords sk ON o.keyword_id = sk.id
    ${whereClause}
    ORDER BY o.${sortCol} ${sort_order === 'asc' ? 'ASC' : 'DESC'}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const data = await query<SeoOrganicRanking>(dataSql, params);

  return {
    data,
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
  };
}

export async function upsertOrganicRanking(
  rows: Array<{
    keyword_id: UUID;
    avg_position: number;
    clicks: number;
    impressions: number;
    ctr: number;
    page_url: string | null;
    report_date: string;
  }>
): Promise<number> {
  if (rows.length === 0) return 0;

  let inserted = 0;
  for (const row of rows) {
    const sql = `
      INSERT INTO seo_organic_rankings (
        keyword_id, avg_position, clicks, impressions, ctr,
        page_url, report_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      ON CONFLICT (keyword_id, report_date)
      DO UPDATE SET
        avg_position = EXCLUDED.avg_position,
        clicks = EXCLUDED.clicks,
        impressions = EXCLUDED.impressions,
        ctr = EXCLUDED.ctr,
        page_url = EXCLUDED.page_url,
        updated_at = NOW()
    `;
    await query(sql, [
      row.keyword_id, row.avg_position, row.clicks,
      row.impressions, row.ctr, row.page_url, row.report_date,
    ]);
    inserted++;
  }

  await invalidate('seo:organic:*');
  return inserted;
}

// ============================================================================
// SEO_SITE_ANALYTICS
// ============================================================================

export async function getSiteAnalytics(
  filters: SeoAnalyticsFilters = {}
): Promise<PaginatedResponse<SeoSiteAnalytics>> {
  const {
    page = 1, limit = 50,
    source, medium, date_from, date_to,
    sort_by, sort_order = 'desc',
  } = filters;

  const sortCol = validateSortColumn(sort_by, ANALYTICS_SORT_COLS, 'report_date');
  const offset = (page - 1) * limit;
  const whereClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (source) {
    whereClauses.push(`source = $${paramIndex}`);
    params.push(source);
    paramIndex++;
  }

  if (medium) {
    whereClauses.push(`medium = $${paramIndex}`);
    params.push(medium);
    paramIndex++;
  }

  if (date_from) {
    whereClauses.push(`report_date >= $${paramIndex}`);
    params.push(date_from);
    paramIndex++;
  }

  if (date_to) {
    whereClauses.push(`report_date <= $${paramIndex}`);
    params.push(date_to);
    paramIndex++;
  }

  const whereClause = whereClauses.length > 0
    ? `WHERE ${whereClauses.join(' AND ')}`
    : '';

  const countSql = `SELECT COUNT(*) as total FROM seo_site_analytics ${whereClause}`;
  const countResult = await queryOne<{ total: string }>(countSql, params);
  const total = parseInt(countResult?.total || '0', 10);

  const dataSql = `
    SELECT * FROM seo_site_analytics
    ${whereClause}
    ORDER BY ${sortCol} ${sort_order === 'asc' ? 'ASC' : 'DESC'}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const data = await query<SeoSiteAnalytics>(dataSql, params);

  return {
    data,
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
  };
}

export async function upsertSiteAnalytics(
  rows: Array<{
    source: string;
    medium: string | null;
    sessions: number;
    page_views: number;
    bounce_rate: number | null;
    avg_session_duration_seconds: number | null;
    form_submissions: number | null;
    report_date: string;
  }>
): Promise<number> {
  if (rows.length === 0) return 0;

  let inserted = 0;
  for (const row of rows) {
    const sql = `
      INSERT INTO seo_site_analytics (
        source, medium, sessions, page_views, bounce_rate,
        avg_session_duration_seconds, form_submissions,
        report_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (source, medium, report_date)
      DO UPDATE SET
        sessions = EXCLUDED.sessions,
        page_views = EXCLUDED.page_views,
        bounce_rate = EXCLUDED.bounce_rate,
        avg_session_duration_seconds = EXCLUDED.avg_session_duration_seconds,
        form_submissions = EXCLUDED.form_submissions,
        updated_at = NOW()
    `;
    await query(sql, [
      row.source, row.medium, row.sessions, row.page_views,
      row.bounce_rate, row.avg_session_duration_seconds,
      row.form_submissions, row.report_date,
    ]);
    inserted++;
  }

  await invalidate('seo:analytics:*');
  return inserted;
}

// ============================================================================
// SEO_LEAD_ATTRIBUTION
// ============================================================================

export async function getLeadAttributions(
  filters: SeoAttributionFilters = {}
): Promise<PaginatedResponse<SeoLeadAttribution>> {
  const {
    page = 1, limit = 50,
    source, confidence, keyword_id, date_from, date_to,
    sort_by, sort_order = 'desc',
  } = filters;

  const sortCol = validateSortColumn(sort_by, ATTRIBUTION_SORT_COLS, 'created_at');
  const offset = (page - 1) * limit;
  const whereClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (source) {
    whereClauses.push(`a.source = $${paramIndex}`);
    params.push(source);
    paramIndex++;
  }

  if (confidence) {
    whereClauses.push(`a.confidence = $${paramIndex}`);
    params.push(confidence);
    paramIndex++;
  }

  if (keyword_id) {
    whereClauses.push(`a.keyword_id = $${paramIndex}`);
    params.push(keyword_id);
    paramIndex++;
  }

  if (date_from) {
    whereClauses.push(`a.created_at >= $${paramIndex}`);
    params.push(date_from);
    paramIndex++;
  }

  if (date_to) {
    whereClauses.push(`a.created_at <= $${paramIndex}`);
    params.push(date_to);
    paramIndex++;
  }

  const whereClause = whereClauses.length > 0
    ? `WHERE ${whereClauses.join(' AND ')}`
    : '';

  const countSql = `SELECT COUNT(*) as total FROM seo_lead_attribution a ${whereClause}`;
  const countResult = await queryOne<{ total: string }>(countSql, params);
  const total = parseInt(countResult?.total || '0', 10);

  const dataSql = `
    SELECT a.*, l.name as lead_name, sk.keyword
    FROM seo_lead_attribution a
    LEFT JOIN leads l ON a.lead_id = l.id
    LEFT JOIN seo_keywords sk ON a.keyword_id = sk.id
    ${whereClause}
    ORDER BY a.${sortCol} ${sort_order === 'asc' ? 'ASC' : 'DESC'}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const data = await query<SeoLeadAttribution>(dataSql, params);

  return {
    data,
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
  };
}

export async function createLeadAttribution(
  input: SeoLeadAttributionCreateInput
): Promise<SeoLeadAttribution> {
  const sql = `
    INSERT INTO seo_lead_attribution (
      lead_id, keyword_id, source, confidence, gclid,
      landing_page_url, utm_source, utm_medium, utm_campaign, utm_keyword,
      deal_value_cents, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
    ON CONFLICT (lead_id) DO UPDATE SET
      keyword_id = COALESCE(EXCLUDED.keyword_id, seo_lead_attribution.keyword_id),
      source = EXCLUDED.source,
      confidence = EXCLUDED.confidence,
      gclid = COALESCE(EXCLUDED.gclid, seo_lead_attribution.gclid),
      landing_page_url = COALESCE(EXCLUDED.landing_page_url, seo_lead_attribution.landing_page_url),
      utm_source = COALESCE(EXCLUDED.utm_source, seo_lead_attribution.utm_source),
      utm_medium = COALESCE(EXCLUDED.utm_medium, seo_lead_attribution.utm_medium),
      utm_campaign = COALESCE(EXCLUDED.utm_campaign, seo_lead_attribution.utm_campaign),
      utm_keyword = COALESCE(EXCLUDED.utm_keyword, seo_lead_attribution.utm_keyword),
      deal_value_cents = COALESCE(EXCLUDED.deal_value_cents, seo_lead_attribution.deal_value_cents),
      updated_at = NOW()
    RETURNING *
  `;

  const result = await queryOne<SeoLeadAttribution>(sql, [
    input.lead_id,
    input.keyword_id ?? null,
    input.source,
    input.confidence ?? 'none',
    input.gclid ?? null,
    input.landing_page_url ?? null,
    input.utm_source ?? null,
    input.utm_medium ?? null,
    input.utm_campaign ?? null,
    input.utm_keyword ?? null,
    input.deal_value_cents ?? null,
  ]);

  if (!result) throw new Error('Failed to create lead attribution');

  await invalidate('seo:attribution:*');
  return result;
}

// ============================================================================
// SEO_COMPETITOR_INSIGHTS
// ============================================================================

export async function getCompetitorInsights(
  filters: SeoCompetitorFilters = {}
): Promise<PaginatedResponse<SeoCompetitorInsight>> {
  const {
    page = 1, limit = 50,
    keyword_id, competitor_domain, date_from, date_to,
    sort_by, sort_order = 'desc',
  } = filters;

  const sortCol = validateSortColumn(sort_by, COMPETITOR_SORT_COLS, 'report_date');
  const offset = (page - 1) * limit;
  const whereClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (keyword_id) {
    whereClauses.push(`ci.keyword_id = $${paramIndex}`);
    params.push(keyword_id);
    paramIndex++;
  }

  if (competitor_domain) {
    whereClauses.push(`ci.competitor_domain ILIKE $${paramIndex}`);
    params.push(`%${competitor_domain}%`);
    paramIndex++;
  }

  if (date_from) {
    whereClauses.push(`ci.report_date >= $${paramIndex}`);
    params.push(date_from);
    paramIndex++;
  }

  if (date_to) {
    whereClauses.push(`ci.report_date <= $${paramIndex}`);
    params.push(date_to);
    paramIndex++;
  }

  const whereClause = whereClauses.length > 0
    ? `WHERE ${whereClauses.join(' AND ')}`
    : '';

  const countSql = `SELECT COUNT(*) as total FROM seo_competitor_insights ci ${whereClause}`;
  const countResult = await queryOne<{ total: string }>(countSql, params);
  const total = parseInt(countResult?.total || '0', 10);

  const dataSql = `
    SELECT ci.*, sk.keyword
    FROM seo_competitor_insights ci
    LEFT JOIN seo_keywords sk ON ci.keyword_id = sk.id
    ${whereClause}
    ORDER BY ci.${sortCol} ${sort_order === 'asc' ? 'ASC' : 'DESC'}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const data = await query<SeoCompetitorInsight>(dataSql, params);

  return {
    data,
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
  };
}

export async function upsertCompetitorInsights(
  rows: Array<{
    keyword_id: UUID;
    competitor_domain: string;
    impression_share: number | null;
    overlap_rate: number | null;
    avg_position: number | null;
    report_date: string;
  }>
): Promise<number> {
  if (rows.length === 0) return 0;

  let inserted = 0;
  for (const row of rows) {
    const sql = `
      INSERT INTO seo_competitor_insights (
        keyword_id, competitor_domain, impression_share,
        overlap_rate, avg_position, report_date, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `;
    await query(sql, [
      row.keyword_id, row.competitor_domain,
      row.impression_share, row.overlap_rate,
      row.avg_position, row.report_date,
    ]);
    inserted++;
  }

  await invalidate('seo:competitors:*');
  return inserted;
}

// ============================================================================
// DASHBOARD KPIs (Aggregated)
// ============================================================================

export async function getDashboardKPIs(
  periodStart: string,
  periodEnd: string
): Promise<SeoDashboardKPIs> {
  // Google Ads aggregated metrics
  const adsSql = `
    SELECT
      COALESCE(SUM(cost_micros), 0)::bigint as total_spend,
      COALESCE(SUM(clicks), 0) as total_clicks,
      COALESCE(SUM(impressions), 0) as total_impressions,
      CASE WHEN SUM(clicks) > 0
        THEN (SUM(cost_micros) / SUM(clicks))::bigint
        ELSE 0
      END as avg_cpc,
      COALESCE(SUM(conversions), 0) as total_conversions
    FROM seo_campaign_performance
    WHERE report_date BETWEEN $1 AND $2
  `;
  const ads = await queryOne<{
    total_spend: string;
    total_clicks: string;
    total_impressions: string;
    avg_cpc: string;
    total_conversions: string;
  }>(adsSql, [periodStart, periodEnd]);

  // Organic aggregated metrics
  const organicSql = `
    SELECT
      COALESCE(AVG(avg_position), 0)::numeric(5,2) as avg_position,
      COALESCE(SUM(clicks), 0) as total_clicks,
      COALESCE(SUM(impressions), 0) as total_impressions,
      CASE WHEN SUM(impressions) > 0
        THEN (SUM(clicks)::numeric / SUM(impressions))::numeric(5,4)
        ELSE 0
      END as avg_ctr
    FROM seo_organic_rankings
    WHERE report_date BETWEEN $1 AND $2
  `;
  const organic = await queryOne<{
    avg_position: string;
    total_clicks: string;
    total_impressions: string;
    avg_ctr: string;
  }>(organicSql, [periodStart, periodEnd]);

  // Site analytics aggregated
  const analyticsSql = `
    SELECT
      COALESCE(SUM(sessions), 0) as total_sessions,
      COALESCE(SUM(page_views), 0) as total_page_views,
      COALESCE(AVG(bounce_rate), 0)::numeric(5,4) as avg_bounce_rate,
      COALESCE(SUM(form_submissions), 0) as total_form_submissions
    FROM seo_site_analytics
    WHERE report_date BETWEEN $1 AND $2
  `;
  const analytics = await queryOne<{
    total_sessions: string;
    total_page_views: string;
    avg_bounce_rate: string;
    total_form_submissions: string;
  }>(analyticsSql, [periodStart, periodEnd]);

  // Attribution / ROI
  const roiSql = `
    SELECT
      COUNT(*) as total_leads,
      COALESCE(SUM(deal_value_cents), 0)::bigint as total_deal_value
    FROM seo_lead_attribution
    WHERE created_at >= $1 AND created_at <= $2
  `;
  const roi = await queryOne<{
    total_leads: string;
    total_deal_value: string;
  }>(roiSql, [periodStart, periodEnd]);

  const totalSpend = parseInt(ads?.total_spend || '0', 10);
  const totalLeads = parseInt(roi?.total_leads || '0', 10);
  const totalDealValue = parseInt(roi?.total_deal_value || '0', 10);

  // Cost per lead (micros) and ROAS
  const costPerLead = totalLeads > 0 ? Math.round(totalSpend / totalLeads) : 0;
  // ROAS: convert deal_value_cents to micros for comparison (cents * 10000 = micros)
  const dealValueMicros = totalDealValue * 10000;
  const roas = totalSpend > 0 ? dealValueMicros / totalSpend : 0;

  return {
    ads_total_spend_micros: totalSpend,
    ads_total_clicks: parseInt(ads?.total_clicks || '0', 10),
    ads_total_impressions: parseInt(ads?.total_impressions || '0', 10),
    ads_avg_cpc_micros: parseInt(ads?.avg_cpc || '0', 10),
    ads_total_conversions: parseInt(ads?.total_conversions || '0', 10),

    organic_avg_position: parseFloat(organic?.avg_position || '0'),
    organic_total_clicks: parseInt(organic?.total_clicks || '0', 10),
    organic_total_impressions: parseInt(organic?.total_impressions || '0', 10),
    organic_avg_ctr: parseFloat(organic?.avg_ctr || '0'),

    total_sessions: parseInt(analytics?.total_sessions || '0', 10),
    total_page_views: parseInt(analytics?.total_page_views || '0', 10),
    avg_bounce_rate: parseFloat(analytics?.avg_bounce_rate || '0'),
    total_form_submissions: parseInt(analytics?.total_form_submissions || '0', 10),

    total_leads_attributed: totalLeads,
    total_deal_value_cents: totalDealValue,
    cost_per_lead_micros: costPerLead,
    roas: Math.round(roas * 100) / 100, // 2 decimals

    period_start: periodStart,
    period_end: periodEnd,
  };
}
