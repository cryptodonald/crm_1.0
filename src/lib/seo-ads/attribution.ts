/**
 * Lead Attribution — 3-Level Matching
 *
 * Level 1: GCLID → exact match (resolved retroactively by daily-sync cron)
 * Level 2: UTM keyword → text match in seo_keywords
 * Level 3: Landing page → cluster match
 * Fallback: source=direct, confidence=none
 */

import { queryOne } from '@/lib/postgres';
import type { SeoKeyword, AttributionSource, AttributionConfidence } from '@/types/seo-ads';

export interface AttributionInput {
  gclid?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_keyword?: string | null;
  landing_page_url?: string | null;
}

export interface AttributionResult {
  keyword_id: string | null;
  source: AttributionSource;
  confidence: AttributionConfidence;
}

/**
 * Determine lead attribution based on available tracking data.
 */
export async function attributeLead(input: AttributionInput): Promise<AttributionResult> {
  // Level 1: GCLID → exact match
  if (input.gclid) {
    // GCLID resolution requires Google Ads API (ClickView report)
    // For MVP: save GCLID, resolve keyword retroactively in daily-sync cron
    return {
      keyword_id: null, // Resolved by cron
      source: 'google_ads',
      confidence: 'exact',
    };
  }

  // Level 2: UTM keyword → text match
  if (input.utm_keyword) {
    const kw = await queryOne<SeoKeyword>(
      `SELECT * FROM seo_keywords WHERE keyword ILIKE $1 AND is_active = true`,
      [input.utm_keyword]
    );
    if (kw) {
      const source: AttributionSource = input.utm_source === 'google' ? 'google_ads' : 'organic';
      return { keyword_id: kw.id, source, confidence: 'high' };
    }
  }

  // Level 3: Landing page → match keyword by landing_page
  if (input.landing_page_url) {
    const kw = await queryOne<SeoKeyword>(
      `SELECT * FROM seo_keywords WHERE landing_page = $1 AND is_active = true`,
      [input.landing_page_url]
    );
    if (kw) {
      return {
        keyword_id: kw.id,
        source: inferSource(input.utm_source),
        confidence: 'estimated',
      };
    }
  }

  // Fallback
  return {
    keyword_id: null,
    source: inferSource(input.utm_source) || 'direct',
    confidence: 'none',
  };
}

/**
 * Infer attribution source from utm_source value.
 */
function inferSource(utmSource: string | null | undefined): AttributionSource {
  if (!utmSource) return 'direct';
  if (utmSource === 'google') return 'google_ads';
  if (['facebook', 'instagram', 'meta'].includes(utmSource)) return 'social';
  return 'referral';
}
