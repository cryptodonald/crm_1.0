/**
 * Google Ads API Client (Singleton)
 *
 * Wraps google-ads-api per CRM SEO Dashboard.
 * Config from env.ts (validated Zod, CRITICAL-003).
 * Fail-fast: throws if credentials missing.
 */

import { GoogleAdsApi } from 'google-ads-api';
import { env } from '@/env';

let _client: GoogleAdsApi | null = null;
let _customer: ReturnType<GoogleAdsApi['Customer']> | null = null;

function getGoogleAdsConfig() {
  const clientId = env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = env.GOOGLE_ADS_CLIENT_SECRET;
  const developerToken = env.GOOGLE_ADS_DEVELOPER_TOKEN;
  const customerId = env.GOOGLE_ADS_CUSTOMER_ID;
  const refreshToken = env.GOOGLE_ADS_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !developerToken || !customerId || !refreshToken) {
    throw new Error(
      'Google Ads API not configured. Required env vars: ' +
      'GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, ' +
      'GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_CUSTOMER_ID, ' +
      'GOOGLE_ADS_REFRESH_TOKEN'
    );
  }

  return { clientId, clientSecret, developerToken, customerId, refreshToken };
}

/**
 * Get the Google Ads Customer instance (singleton).
 * Throws if env vars not configured.
 */
export function getAdsCustomer() {
  if (_customer) return _customer;

  const config = getGoogleAdsConfig();

  _client = new GoogleAdsApi({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    developer_token: config.developerToken,
  });

  _customer = _client.Customer({
    customer_id: config.customerId,
    refresh_token: config.refreshToken,
  });

  return _customer;
}

/**
 * Check if Google Ads API is configured (without throwing).
 */
export function isAdsConfigured(): boolean {
  return !!(
    env.GOOGLE_ADS_CLIENT_ID &&
    env.GOOGLE_ADS_CLIENT_SECRET &&
    env.GOOGLE_ADS_DEVELOPER_TOKEN &&
    env.GOOGLE_ADS_CUSTOMER_ID &&
    env.GOOGLE_ADS_REFRESH_TOKEN
  );
}

// Geo target constants per area DoctorBed (Romagna + San Marino)
export const GEO_TARGETS = {
  SAN_MARINO: 20343,
  RIMINI: 1008463,
  PESARO: 1008493,
  CESENA: 1008379,
  FORLI: 1008419,
  RAVENNA: 1008510,
} as const;

export const LANGUAGE_IT = 1004;

// ============================================================================
// Campaign Performance (GAQL)
// ============================================================================

export interface AdsCampaignRow {
  campaign_name: string;
  ad_group_name: string;
  keyword_text: string;
  impressions: number;
  clicks: number;
  cost_micros: number;
  conversions: number;
  quality_score: number | null;
  date: string; // YYYY-MM-DD
  // New keyword-level fields
  match_type: string | null;         // BROAD, PHRASE, EXACT
  keyword_status: string | null;     // ENABLED, PAUSED, REMOVED
  serving_status: string | null;     // ELIGIBLE, RARELY_SERVED
  expected_ctr: string | null;       // BELOW_AVERAGE, AVERAGE, ABOVE_AVERAGE
  landing_page_exp: string | null;   // BELOW_AVERAGE, AVERAGE, ABOVE_AVERAGE
  ad_relevance: string | null;       // BELOW_AVERAGE, AVERAGE, ABOVE_AVERAGE
  campaign_type: string | null;      // SEARCH, PERFORMANCE_MAX, etc.
  bid_strategy: string | null;       // MAXIMIZE_CONVERSIONS, TARGET_CPA, etc.
  cost_per_conversion_micros: number;
  conversion_rate: number;
}

/**
 * Fetch campaign performance at ad_group + keyword level.
 * Supports single date or date range (GAQL BETWEEN).
 * Uses GAQL (Google Ads Query Language).
 */
export async function fetchCampaignPerformance(
  dateFrom: string,
  dateTo?: string
): Promise<AdsCampaignRow[]> {
  const customer = getAdsCustomer();

  const dateFilter = dateTo
    ? `segments.date BETWEEN '${dateFrom}' AND '${dateTo}'`
    : `segments.date = '${dateFrom}'`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = await customer.query(`
    SELECT
      campaign.name,
      campaign.advertising_channel_type,
      campaign.bidding_strategy_type,
      ad_group.name,
      ad_group_criterion.keyword.text,
      ad_group_criterion.keyword.match_type,
      ad_group_criterion.status,
      ad_group_criterion.system_serving_status,
      ad_group_criterion.quality_info.quality_score,
      ad_group_criterion.quality_info.search_predicted_ctr,
      ad_group_criterion.quality_info.post_click_quality_score,
      ad_group_criterion.quality_info.creative_quality_score,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.cost_per_conversion,
      metrics.conversions_from_interactions_rate,
      segments.date
    FROM keyword_view
    WHERE ${dateFilter}
      AND campaign.status = 'ENABLED'
      AND ad_group.status = 'ENABLED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 10000
  `);

  return results.map((r) => {
    const clicks = Number(r.metrics?.clicks ?? 0);
    const impressions = Number(r.metrics?.impressions ?? 0);
    const conversions = Number(r.metrics?.conversions ?? 0);
    const costMicros = Number(r.metrics?.cost_micros ?? 0);

    return {
      campaign_name: r.campaign?.name ?? '',
      ad_group_name: r.ad_group?.name ?? '',
      keyword_text: r.ad_group_criterion?.keyword?.text ?? '',
      impressions,
      clicks,
      cost_micros: costMicros,
      conversions,
      quality_score: r.ad_group_criterion?.quality_info?.quality_score ?? null,
      date: r.segments?.date ?? dateFrom,
      // New fields
      match_type: r.ad_group_criterion?.keyword?.match_type ?? null,
      keyword_status: r.ad_group_criterion?.status ?? null,
      serving_status: r.ad_group_criterion?.system_serving_status ?? null,
      expected_ctr: r.ad_group_criterion?.quality_info?.search_predicted_ctr ?? null,
      landing_page_exp: r.ad_group_criterion?.quality_info?.post_click_quality_score ?? null,
      ad_relevance: r.ad_group_criterion?.quality_info?.creative_quality_score ?? null,
      campaign_type: r.campaign?.advertising_channel_type ?? null,
      bid_strategy: r.campaign?.bidding_strategy_type ?? null,
      cost_per_conversion_micros: Number(r.metrics?.cost_per_conversion ?? 0),
      conversion_rate: Number(r.metrics?.conversions_from_interactions_rate ?? 0),
    };
  });
}

// ============================================================================
// Auction Insights (Competitors)
// ============================================================================

export interface AdsAuctionInsightRow {
  campaign_name: string;
  keyword_text: string;
  competitor_domain: string;
  impression_share: number;  // 0-1
  overlap_rate: number;      // 0-1
  position_above_rate: number; // 0-1
  date: string;
}

/**
 * Fetch auction insights (competitor data) for a date.
 * NOTE: Auction insights data may not be available at keyword level
 * for all accounts. Falls back gracefully.
 */
export async function fetchAuctionInsights(
  dateFrom: string,
  dateTo?: string
): Promise<AdsAuctionInsightRow[]> {
  const customer = getAdsCustomer();

  const dateFilter = dateTo
    ? `segments.date BETWEEN '${dateFrom}' AND '${dateTo}'`
    : `segments.date = '${dateFrom}'`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: any[] = await customer.query(`
      SELECT
        campaign.name,
        auction_insight.display_domain,
        metrics.auction_insight_search_impression_share,
        metrics.auction_insight_search_overlap_rate,
        metrics.auction_insight_search_position_above_rate,
        segments.date
      FROM campaign_audience_view
      WHERE ${dateFilter}
        AND campaign.status = 'ENABLED'
      LIMIT 500
    `);

    return results.map((r) => ({
      campaign_name: r.campaign?.name ?? '',
      keyword_text: '',
      competitor_domain: r.auction_insight?.display_domain ?? '',
      impression_share: Number(r.metrics?.auction_insight_search_impression_share ?? 0),
      overlap_rate: Number(r.metrics?.auction_insight_search_overlap_rate ?? 0),
      position_above_rate: Number(r.metrics?.auction_insight_search_position_above_rate ?? 0),
      date: r.segments?.date ?? dateFrom,
    })).filter(r => r.competitor_domain !== '');
  } catch (err) {
    // Auction insights may not be available for all account types
    console.warn('[GoogleAds] Auction insights not available:', err instanceof Error ? err.message : err);
    return [];
  }
}
