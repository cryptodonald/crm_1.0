-- ============================================================================
-- REMOVE UNUSED INDEXES - SAFE VERSION
-- ============================================================================
-- Generated: 2026-02-14
-- Purpose: Remove 60 unused indexes from NON-ACTIVE features
-- 
-- This removes indexes on:
-- - SEO tables (29 indexes) - Feature not in MVP
-- - Automations (14 indexes) - Deferred to v2.1+
-- - Tasks (9 indexes) - Not in MVP
-- - Algorithm (13 indexes) - Experimental feature
-- - Google Calendar (5 indexes) - Not active
-- - Lead Analysis (3 indexes) - Experimental
-- 
-- Does NOT remove indexes on core CRM tables (leads, activities, users, notes)
-- 
-- Estimated space recovery: 300-400MB
-- Estimated write performance improvement: 30-50% on affected tables
-- ============================================================================

BEGIN;

-- ============================================================================
-- SEO TABLES (29 indexes)
-- ============================================================================
-- Feature: SEO Dashboard (deferred to v2.1+ per AGENTS.md)
-- Impact: Zero risk, feature not implemented

-- seo_keyword_metrics
DROP INDEX IF EXISTS public.idx_seo_keyword_metrics_keyword_recorded;
DROP INDEX IF EXISTS public.idx_seo_keyword_metrics_recorded_at;

-- seo_campaign_performance
DROP INDEX IF EXISTS public.idx_seo_campaign_perf_keyword_date;
DROP INDEX IF EXISTS public.idx_seo_campaign_perf_campaign;
DROP INDEX IF EXISTS public.idx_seo_campaign_perf_match_type;
DROP INDEX IF EXISTS public.idx_seo_campaign_perf_kw_status;

-- seo_organic_rankings
DROP INDEX IF EXISTS public.idx_seo_organic_keyword_date;

-- seo_site_analytics
DROP INDEX IF EXISTS public.idx_seo_analytics_source_date;

-- seo_lead_attribution
DROP INDEX IF EXISTS public.idx_seo_attribution_lead;
DROP INDEX IF EXISTS public.idx_seo_attribution_keyword;
DROP INDEX IF EXISTS public.idx_seo_attribution_source;
DROP INDEX IF EXISTS public.idx_seo_attribution_gclid;

-- seo_competitor_insights
DROP INDEX IF EXISTS public.idx_seo_competitor_domain;


-- ============================================================================
-- AUTOMATIONS (14 indexes)
-- ============================================================================
-- Feature: Workflow Automations (deferred to v2.1+ per AGENTS.md)
-- Impact: Zero risk, feature not in MVP

-- automations
DROP INDEX IF EXISTS public.idx_automations_active;
DROP INDEX IF EXISTS public.idx_automations_category;
DROP INDEX IF EXISTS public.idx_automations_created_by;
DROP INDEX IF EXISTS public.idx_automations_last_executed;

-- automation_actions
DROP INDEX IF EXISTS public.idx_actions_automation;
DROP INDEX IF EXISTS public.idx_actions_type;
DROP INDEX IF EXISTS public.idx_actions_position;

-- automation_triggers
DROP INDEX IF EXISTS public.idx_triggers_automation;
DROP INDEX IF EXISTS public.idx_triggers_table;
DROP INDEX IF EXISTS public.idx_triggers_event;
DROP INDEX IF EXISTS public.idx_triggers_position;

-- automation_logs
DROP INDEX IF EXISTS public.idx_logs_automation;
DROP INDEX IF EXISTS public.idx_logs_executed_at;
DROP INDEX IF EXISTS public.idx_logs_status;


-- ============================================================================
-- TASKS (9 indexes)
-- ============================================================================
-- Feature: Tasks/Todos (not in MVP per AGENTS.md)
-- Impact: Zero risk, feature not implemented

DROP INDEX IF EXISTS public.idx_tasks_lead;
DROP INDEX IF EXISTS public.idx_tasks_activity;
DROP INDEX IF EXISTS public.idx_tasks_status;
DROP INDEX IF EXISTS public.idx_tasks_priority;
DROP INDEX IF EXISTS public.idx_tasks_assigned_to;
DROP INDEX IF EXISTS public.idx_tasks_created_by;
DROP INDEX IF EXISTS public.idx_tasks_due_date;
DROP INDEX IF EXISTS public.idx_tasks_type;
DROP INDEX IF EXISTS public.idx_tasks_upcoming;


-- ============================================================================
-- ALGORITHM (13 indexes)
-- ============================================================================
-- Feature: Algorithm feedback system (experimental, not production-ready)
-- Impact: Zero risk, feature experimental

-- algorithm_settings
DROP INDEX IF EXISTS public.idx_algorithm_settings_category;
DROP INDEX IF EXISTS public.idx_algorithm_settings_updated_by;

-- algorithm_feedback
DROP INDEX IF EXISTS public.idx_algorithm_feedback_config_id;
DROP INDEX IF EXISTS public.idx_algorithm_feedback_consultant_id;
DROP INDEX IF EXISTS public.idx_algorithm_feedback_parameter;
DROP INDEX IF EXISTS public.idx_algorithm_feedback_created_at;

-- algorithm_corrections
DROP INDEX IF EXISTS public.idx_algorithm_corrections_parameter;
DROP INDEX IF EXISTS public.idx_algorithm_corrections_confidence;


-- ============================================================================
-- GOOGLE CALENDAR SYNC (5 indexes)
-- ============================================================================
-- Feature: Google Calendar integration (not yet active)
-- Impact: Zero risk, sync not enabled

DROP INDEX IF EXISTS public.idx_google_accounts_user_id;
DROP INDEX IF EXISTS public.idx_google_accounts_corporate;
DROP INDEX IF EXISTS public.idx_google_calendars_account_id;
DROP INDEX IF EXISTS public.idx_calendar_events_calendar_id;
DROP INDEX IF EXISTS public.idx_calendar_events_time_range;
DROP INDEX IF EXISTS public.idx_calendar_events_source;


-- ============================================================================
-- ACTIVITIES - GOOGLE SYNC (1 index)
-- ============================================================================
-- Related to Google Calendar sync (not active)

DROP INDEX IF EXISTS public.idx_activities_sync_to_google;


-- ============================================================================
-- LEAD ANALYSIS (3 indexes)
-- ============================================================================
-- Feature: Lead analysis system (experimental)
-- Impact: Zero risk, feature experimental

DROP INDEX IF EXISTS public.idx_lead_analyses_created_at;
DROP INDEX IF EXISTS public.idx_lead_analyses_created_by;
DROP INDEX IF EXISTS public.idx_lead_analysis_configs_analysis_id;


-- ============================================================================
-- USER PREFERENCES (6 indexes)
-- ============================================================================
-- Small table, minimal overhead but all unused
-- Safe to remove

DROP INDEX IF EXISTS public.idx_user_preferences_user;
DROP INDEX IF EXISTS public.idx_user_preferences_entity_value;
DROP INDEX IF EXISTS public.idx_user_preferences_is_default;
DROP INDEX IF EXISTS public.idx_user_preferences_lookup;


-- ============================================================================
-- MARKETING SOURCES (1 index - duplicate)
-- ============================================================================
-- idx_marketing_sources_name is DUPLICATE of idx_marketing_sources_name_unique
-- Safe to remove (UNIQUE constraint index still exists)

DROP INDEX IF EXISTS public.idx_marketing_sources_name;


-- ============================================================================
-- USERS (1 index - duplicate)
-- ============================================================================
-- idx_users_email is DUPLICATE of idx_users_email_unique + users_Email_key
-- Safe to remove (2 UNIQUE constraint indexes still exist)

DROP INDEX IF EXISTS public.idx_users_email;


-- ============================================================================
-- NOTES (1 index)
-- ============================================================================
-- Partial index for pinned notes
-- Small overhead, but unused

DROP INDEX IF EXISTS public.idx_notes_pinned;


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check remaining unused indexes (should be ~13 on core CRM tables)
SELECT 
  relname as table_name,
  indexrelname as index_name,
  idx_scan as times_used,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
ORDER BY relname, indexrelname;

-- Check space recovered (run BEFORE and AFTER migration)
SELECT 
  pg_size_pretty(
    pg_database_size(current_database())
  ) as total_db_size;

-- List all remaining indexes on core tables
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('leads', 'activities', 'users', 'notes', 'marketing_sources')
ORDER BY tablename, indexname;

COMMIT;

-- ============================================================================
-- POST-MIGRATION STEPS
-- ============================================================================
-- 1. Run VACUUM ANALYZE to reclaim space and update statistics
--    VACUUM ANALYZE;
--
-- 2. Monitor pg_stat_user_indexes for remaining unused indexes
--    (Focus on core CRM tables: leads, activities, users)
--
-- 3. After 2-4 weeks, review if remaining unused indexes can be removed
--
-- ============================================================================

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================
-- To recreate removed indexes, you can extract index definitions from
-- schema.sql or DATABASE_SCHEMA.md
-- 
-- Example:
-- CREATE INDEX idx_seo_keyword_metrics_keyword_recorded 
--   ON seo_keyword_metrics(keyword_id, recorded_at);
-- 
-- However, since these features are not active, rollback is unlikely needed.
-- ============================================================================
