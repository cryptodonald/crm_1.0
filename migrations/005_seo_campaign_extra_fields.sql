-- Migration: Add keyword-level detail fields to seo_campaign_performance
-- These fields match Google Ads keyword_view GAQL data

ALTER TABLE seo_campaign_performance
  ADD COLUMN IF NOT EXISTS match_type text,              -- BROAD, PHRASE, EXACT
  ADD COLUMN IF NOT EXISTS keyword_status text,          -- ENABLED, PAUSED, REMOVED
  ADD COLUMN IF NOT EXISTS serving_status text,          -- ELIGIBLE, RARELY_SERVED
  ADD COLUMN IF NOT EXISTS expected_ctr text,            -- BELOW_AVERAGE, AVERAGE, ABOVE_AVERAGE
  ADD COLUMN IF NOT EXISTS landing_page_exp text,        -- BELOW_AVERAGE, AVERAGE, ABOVE_AVERAGE
  ADD COLUMN IF NOT EXISTS ad_relevance text,            -- BELOW_AVERAGE, AVERAGE, ABOVE_AVERAGE
  ADD COLUMN IF NOT EXISTS campaign_type text,           -- SEARCH, PERFORMANCE_MAX, DISPLAY, etc.
  ADD COLUMN IF NOT EXISTS bid_strategy text,            -- MAXIMIZE_CONVERSIONS, TARGET_CPA, etc.
  ADD COLUMN IF NOT EXISTS cost_per_conversion_micros bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversion_rate numeric(5,4) DEFAULT 0;

-- Index for filtering by match_type and keyword_status
CREATE INDEX IF NOT EXISTS idx_seo_campaign_perf_match_type ON seo_campaign_performance (match_type);
CREATE INDEX IF NOT EXISTS idx_seo_campaign_perf_kw_status ON seo_campaign_performance (keyword_status);
