# CRM 2.0 Database Schema Documentation

**Last Verified**: 2026-02-13
**Database**: PostgreSQL 17.6 (Supabase)
**Total Tables**: 21 + 1 VIEW (14 CRM core + 7 SEO/Ads)
**Project**: Doctorbed CRM

---

## Quick Reference

- **Schema ricreazione**: `schema.sql` (generato da `pg_dump`, vedi [Come Ricreare lo Schema](#come-ricreare-lo-schema))
- **TypeScript types**: `src/types/database.ts`
- **Query helpers**: `src/lib/postgres.ts`

---

## Tables Overview

| Table | Columns | Description |
|-------|---------|-------------|
| `leads` | 17 | Core lead/contact management con FTS |
| `activities` | 14 | Attività linked a leads con FTS |
| `notes` | 7 | Note con pin flag |
| `users` | 11 | System users (admin/sales) |
| `marketing_sources` | 6 | Lead sources (Meta, Instagram, Google) |
| `automations` | 11 | Workflow automation rules |
| `automation_triggers` | 11 | Trigger conditions |
| `automation_actions` | 9 | Automation actions |
| `automation_logs` | 7 | Execution history |
| `tasks` | 14 | User tasks/todos |
| `user_preferences` | 9 | UI color customization |
| `google_accounts` | 13 | Google OAuth accounts per calendar sync |
| `google_calendars` | 12 | Synced Google Calendar metadata |
| `calendar_events` | 17 | Calendar events (Google + CRM) |
| `dashboard_stats` | VIEW | Statistiche aggregate (security_invoker) |
| **SEO & Ads** | | |
| `seo_keywords` | 8 | Keyword monitorate (cluster, priority, landing page) |
| `seo_keyword_metrics` | 9 | Snapshot periodico volumi/CPC da Keyword Planner |
| `seo_campaign_performance` | 22 | Performance Google Ads giornaliera a livello keyword |
| `seo_organic_rankings` | 10 | Posizionamento organico da Search Console |
| `seo_site_analytics` | 10 | Traffico GA4 per sorgente |
| `seo_lead_attribution` | 14 | Attribuzione lead → keyword (ROI tracking) |
| `seo_competitor_insights` | 9 | Auction insights competitor |

**Totali**: 80+ indici, 27+ FK constraints, 13 triggers, 4 functions

> **Schema SEO dettagliato**: vedi `SEO_ADS_DASHBOARD_ARCHITECTURE.md` §3

---

## Detailed Schema

### `leads`

Core lead/contact management con full-text search, source tracking e referral chains.

#### Columns (17)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `name` | text | YES | - | Lead full name |
| `phone` | text | YES | - | Phone number |
| `email` | text | YES | - | Email address |
| `city` | text | YES | - | City |
| `needs` | text | YES | - | Customer needs/requirements |
| `status` | text | YES | - | Lead status (Nuovo, Attivo, Qualificato, etc.) |
| `address` | text | YES | - | Street address |
| `postal_code` | integer | YES | - | ZIP/postal code |
| `gender` | text | YES | - | Gender (male/female/other/unknown) |
| `created_at` | timestamptz | YES | `now()` | Creation date |
| `updated_at` | timestamptz | YES | `now()` | Last modification |
| `search_vector` | tsvector | YES | - | FTS index (auto-updated via trigger) |
| `source_id` | uuid | YES | - | FK → `marketing_sources` |
| `assigned_to` | uuid[] | YES | - | Array of user IDs |
| `referral_lead_id` | uuid | YES | - | Self-referencing FK (referral chains) |
| `attachments` | jsonb | YES | `'[]'` | Vercel Blob URLs |

#### Constraints

- `leads_gender_check`: `gender IN ('male', 'female', 'other', 'unknown') OR gender IS NULL`
- ⚠️ **Nota**: Esiste un constraint duplicato `leads_Gender_check` (legacy) che non include 'other'. Non causa problemi perché il secondo constraint è più permissivo.

#### Foreign Keys

- `source_id` → `marketing_sources(id)` ON DELETE SET NULL
- `referral_lead_id` → `leads(id)` ON DELETE SET NULL (self-reference)

#### Indices (12)

- `idx_leads_status` ON (`status`)
- `idx_leads_source_id` ON (`source_id`)
- `idx_leads_assigned_to` ON (`assigned_to`) **GIN**
- `idx_leads_referral_lead_id` ON (`referral_lead_id`)
- `idx_leads_search` ON (`search_vector`) **GIN**
- `idx_leads_created_at` ON (`created_at` DESC)
- `idx_leads_email` ON (`email`) WHERE `email IS NOT NULL`
- `idx_leads_phone` ON (`phone`) WHERE `phone IS NOT NULL`
- `idx_leads_nome_trgm` ON (`name`) **GIN gin_trgm_ops** (fuzzy search)
- `idx_leads_telefono_trgm` ON (`phone`) **GIN gin_trgm_ops** (fuzzy search)

---

### `activities`

Track tutte le interazioni con leads (chiamate, email, meeting, consulenze) con FTS.

#### Columns (16)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `title` | text | YES | - | Activity title |
| `type` | text | YES | - | Type (Chiamata, Email, WhatsApp, Consulenza, etc.) |
| `activity_date` | timestamptz | YES | - | Scheduled/actual date |
| `status` | text | YES | - | Status (todo, in_progress, done) |
| `notes` | text | YES | - | Activity notes/details |
| `outcome` | text | YES | - | Result (Contatto riuscito, etc.) |
| `objective` | text | YES | - | Activity objective |
| `priority` | text | YES | - | Priority (high/medium/low) |
| `estimated_duration` | integer | YES | - | Duration in minutes |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update |
| `search_vector` | tsvector | YES | - | FTS index (auto-updated) |
| `lead_id` | uuid | YES | - | FK → `leads` (CASCADE) |
| `assigned_to` | uuid | YES | - | FK → `users` (SET NULL) |
| `sync_to_google` | boolean | NO | `false` | Sync to Google Calendar flag |
| `google_event_id` | text | YES | - | Linked Google Calendar event ID |

#### Foreign Keys

- `lead_id` → `leads(id)` ON DELETE CASCADE
- `assigned_to` → `users(id)` ON DELETE SET NULL

#### Indices (8)

- `idx_activities_lead_id` ON (`lead_id`)
- `idx_activities_assigned_to` ON (`assigned_to`)
- `idx_activities_type` ON (`type`)
- `idx_activities_status` ON (`status`)
- `idx_activities_activity_date` ON (`activity_date` DESC)
- `idx_activities_created_at` ON (`created_at` DESC)
- `idx_activities_search` ON (`search_vector`) **GIN**

---

### `notes`

Note free-form attached a leads con pin ("in evidenza").

#### Columns (7)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `content` | text | YES | - | Note text |
| `pinned` | boolean | YES | `false` | Pin flag ("in evidenza") |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update |
| `lead_id` | uuid | YES | - | FK → `leads` |
| `user_id` | uuid | YES | - | Note author |

#### Foreign Keys

- `lead_id` → `leads(id)` ON DELETE CASCADE
- `user_id` → `users(id)` ON DELETE SET NULL

#### Indices (4)

- `idx_notes_lead_id` ON (`lead_id`)
- `idx_notes_user_id` ON (`user_id`)
- `idx_notes_pinned` ON (`pinned`) WHERE `pinned = true`
- `idx_notes_created_at` ON (`created_at` DESC)

---

### `users`

System users con role-based access.

#### Columns (11)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `name` | text | NO | - | Full name |
| `email` | text | NO | - | Email (UNIQUE) |
| `role` | text | NO | - | Role: admin/user/viewer/sales |
| `active` | boolean | YES | `true` | Soft delete flag |
| `phone` | text | YES | - | Phone number |
| `password_hash` | text | NO | - | Bcrypt hashed password |
| `avatar_url` | text | YES | - | Profile picture URL |
| `created_at` | timestamptz | YES | `now()` | Account creation |
| `updated_at` | timestamptz | YES | `now()` | Last update |
| `last_login` | timestamptz | YES | - | Last login timestamp |

#### Constraints

- `users_Email_key` UNIQUE ON (`email`)
- `chk_users_role`: `role IN ('admin', 'user', 'viewer', 'sales')`

#### Indices (5)

- `idx_users_email_unique` UNIQUE ON (`email`)
- `idx_users_email` ON (`email`)
- `idx_users_role` ON (`role`)
- `idx_users_active` ON (`active`) WHERE `active = true`
- `idx_users_last_login` ON (`last_login` DESC)

---

### `marketing_sources`

Lookup table per lead sources.

#### Columns (6)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `name` | text | NO | - | Source name (UNIQUE) |
| `description` | text | YES | - | Optional description |
| `active` | boolean | YES | `true` | Active flag |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update |

#### Indices (3)

- `idx_marketing_sources_name_unique` UNIQUE ON (`name`)
- `idx_marketing_sources_name` ON (`name`)
- `idx_marketing_sources_active` ON (`active`) WHERE `active = true`

---

### `automations`

Workflow automation rules (triggers + actions).

#### Columns (11)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `name` | text | NO | - | Automation name |
| `description` | text | YES | - | Description |
| `category` | text | YES | - | Category grouping |
| `priority` | text | YES | - | Execution priority |
| `is_active` | boolean | YES | `true` | Active flag |
| `last_executed_at` | timestamptz | YES | - | Last execution |
| `execution_count` | integer | YES | `0` | Times executed |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update |
| `created_by_id` | uuid | YES | - | FK → `users` |

#### Foreign Keys

- `created_by_id` → `users(id)` ON DELETE SET NULL

#### Indices (4)

- `idx_automations_active` ON (`is_active`)
- `idx_automations_category` ON (`category`)
- `idx_automations_last_executed` ON (`last_executed_at` DESC)
- `idx_automations_created_by` ON (`created_by_id`)

---

### `automation_triggers`

Condizioni che triggerano le automazioni. **RLS abilitato**.

#### Columns (11)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `automation_id` | uuid | NO | - | FK → `automations` |
| `trigger_table` | text | NO | - | Table da monitorare |
| `trigger_event` | text | NO | - | Event type |
| `field_name` | text | YES | - | Field to check |
| `operator` | text | YES | - | Comparison operator |
| `value` | text | YES | - | Value to compare |
| `logic_operator` | text | YES | `'AND'` | Logic AND/OR |
| `position` | integer | NO | `0` | Evaluation order |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update |

#### Constraints

- `chk_triggers_event`: `trigger_event IN ('create', 'update', 'delete', 'scheduled')`
- `chk_triggers_operator`: `operator IN ('equals', 'not_equals', 'gt', 'gte', 'lt', 'lte', 'contains', 'not_contains', 'is_null', 'is_not_null')`

#### Foreign Keys

- `automation_id` → `automations(id)` ON DELETE CASCADE

#### Indices (4)

- `idx_triggers_automation` ON (`automation_id`)
- `idx_triggers_table` ON (`trigger_table`)
- `idx_triggers_event` ON (`trigger_event`)
- `idx_triggers_position` ON (`automation_id`, `position`)

---

### `automation_actions`

Azioni da eseguire quando scatta un'automazione. **RLS abilitato**.

#### Columns (9)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `automation_id` | uuid | NO | - | FK → `automations` |
| `action_type` | text | NO | - | Action type |
| `target_table` | text | YES | - | Table to modify |
| `target_field` | text | YES | - | Field to update |
| `value` | text | YES | - | Value to set |
| `position` | integer | NO | `0` | Execution order |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update |

#### Constraints

- `chk_actions_type`: `action_type IN ('update_field', 'create_activity', 'create_task', 'send_email', 'send_notification', 'webhook')`

#### Foreign Keys

- `automation_id` → `automations(id)` ON DELETE CASCADE

#### Indices (3)

- `idx_actions_automation` ON (`automation_id`)
- `idx_actions_type` ON (`action_type`)
- `idx_actions_position` ON (`automation_id`, `position`)

---

### `automation_logs`

Execution history per automazioni. **RLS abilitato**.

#### Columns (7)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `automation_id` | uuid | NO | - | FK → `automations` |
| `executed_at` | timestamptz | YES | `now()` | Execution timestamp |
| `status` | text | NO | - | success/failed/partial/skipped |
| `error_message` | text | YES | - | Error details |
| `affected_records` | integer | YES | `0` | Records modified |
| `execution_time_ms` | integer | YES | - | Execution time ms |

#### Constraints

- `chk_logs_status`: `status IN ('success', 'failed', 'partial', 'skipped')`

#### Foreign Keys

- `automation_id` → `automations(id)` ON DELETE CASCADE

#### Indices (3)

- `idx_logs_automation` ON (`automation_id`)
- `idx_logs_executed_at` ON (`executed_at` DESC)
- `idx_logs_status` ON (`status`)

---

### `tasks`

User tasks/todos linked a leads o activities.

#### Columns (14)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `title` | text | NO | - | Task title |
| `description` | text | YES | - | Task description |
| `type` | text | YES | - | Type (personal/lead/activity/order/general) |
| `status` | text | YES | `'todo'` | Status (todo/in_progress/done/cancelled) |
| `priority` | text | YES | `'medium'` | Priority (high/medium/low) |
| `due_date` | timestamptz | YES | - | Due date |
| `completed_at` | timestamptz | YES | - | Completion timestamp |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update |
| `assigned_to_id` | uuid | YES | - | FK → `users` |
| `created_by_id` | uuid | YES | - | FK → `users` (creator) |
| `lead_id` | uuid | YES | - | FK → `leads` |
| `activity_id` | uuid | YES | - | FK → `activities` |

#### Constraints

- `chk_tasks_status`: `status IN ('todo', 'in_progress', 'done', 'cancelled')`
- `chk_tasks_priority`: `priority IN ('high', 'medium', 'low')`
- `chk_tasks_type`: `type IN ('personal', 'lead', 'activity', 'order', 'general')`

#### Foreign Keys

- `assigned_to_id` → `users(id)` ON DELETE SET NULL
- `created_by_id` → `users(id)` ON DELETE SET NULL
- `lead_id` → `leads(id)` ON DELETE CASCADE
- `activity_id` → `activities(id)` ON DELETE CASCADE

#### Indices (9)

- `idx_tasks_assigned_to` ON (`assigned_to_id`)
- `idx_tasks_created_by` ON (`created_by_id`)
- `idx_tasks_lead` ON (`lead_id`)
- `idx_tasks_activity` ON (`activity_id`)
- `idx_tasks_status` ON (`status`)
- `idx_tasks_priority` ON (`priority`)
- `idx_tasks_type` ON (`type`)
- `idx_tasks_due_date` ON (`due_date`) WHERE `due_date IS NOT NULL`
- `idx_tasks_upcoming` ON (`due_date`) WHERE `status IN ('todo', 'in_progress') AND due_date IS NOT NULL`

---

### `user_preferences`

UI customization (color schemes per entity type/value).

#### Columns (9)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `uuid_generate_v4()` | Primary key |
| `name` | text | YES | - | Preference name |
| `entity_type` | text | NO | - | Entity type |
| `entity_value` | text | NO | - | Specific value (e.g., "Nuovo") |
| `color_class` | text | NO | - | Tailwind CSS class |
| `is_default` | boolean | YES | `false` | Global default flag |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update |
| `user_id` | uuid | YES | - | FK → `users` (NULL = default) |

#### Constraints

- `chk_user_preferences_entity_type`: `entity_type IN ('lead_status', 'activity_type', 'task_status', 'task_priority', 'source', 'user_role', 'order_status')`

#### Foreign Keys

- `user_id` → `users(id)` ON DELETE CASCADE

#### Indices (7)

- `idx_user_preferences_unique_user` UNIQUE ON (`entity_type`, `entity_value`, `user_id`) WHERE `user_id IS NOT NULL`
- `idx_user_preferences_unique_default` UNIQUE ON (`entity_type`, `entity_value`) WHERE `is_default = true`
- `idx_user_preferences_user` ON (`user_id`)
- `idx_user_preferences_entity_type` ON (`entity_type`)
- `idx_user_preferences_entity_value` ON (`entity_value`)
- `idx_user_preferences_is_default` ON (`is_default`) WHERE `is_default = true`
- `idx_user_preferences_lookup` ON (`entity_type`, `entity_value`, `user_id`, `is_default`)

---

### `google_accounts`

Google OAuth accounts linked to CRM users for calendar sync.

#### Columns (13)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | NO | - | FK → `users` |
| `google_email` | text | NO | - | Google account email |
| `access_token_encrypted` | text | NO | - | AES-256-GCM encrypted access token |
| `refresh_token_encrypted` | text | NO | - | AES-256-GCM encrypted refresh token |
| `token_expires_at` | timestamptz | NO | - | Token expiration |
| `scopes` | text[] | NO | - | OAuth scopes granted |
| `is_corporate` | boolean | NO | `false` | Corporate account flag |
| `connected_at` | timestamptz | NO | `now()` | When account was linked |
| `last_sync_at` | timestamptz | YES | - | Last successful sync |
| `sync_status` | text | NO | `'idle'` | idle/syncing/error |
| `sync_error` | text | YES | - | Last sync error message |
| `created_at` | timestamptz | NO | `now()` | Creation timestamp |
| `updated_at` | timestamptz | NO | `now()` | Last update |

#### Constraints

- `google_accounts_user_email_unique` UNIQUE ON (`user_id`, `google_email`)
- `google_accounts_sync_status_check`: `sync_status IN ('idle', 'syncing', 'error')`

#### Foreign Keys

- `user_id` → `users(id)` ON DELETE CASCADE

#### Indices (3)

- `idx_google_accounts_user_id` ON (`user_id`)
- `idx_google_accounts_sync_status` ON (`sync_status`)

---

### `google_calendars`

Google calendars discovered per connected account, with visibility toggle.

#### Columns (12)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `google_account_id` | uuid | NO | - | FK → `google_accounts` |
| `google_calendar_id` | text | NO | - | Google Calendar API ID |
| `name` | text | NO | - | Calendar display name |
| `color` | text | YES | - | Calendar color hex |
| `is_visible` | boolean | NO | `true` | Show in CRM calendar |
| `is_primary` | boolean | NO | `false` | Primary calendar flag |
| `is_writable` | boolean | NO | `false` | Can create events |
| `sync_token` | text | YES | - | Incremental sync token |
| `last_sync_at` | timestamptz | YES | - | Last sync |
| `created_at` | timestamptz | NO | `now()` | Creation timestamp |
| `updated_at` | timestamptz | NO | `now()` | Last update |

#### Constraints

- `google_calendars_account_calendar_unique` UNIQUE ON (`google_account_id`, `google_calendar_id`)

#### Foreign Keys

- `google_account_id` → `google_accounts(id)` ON DELETE CASCADE

#### Indices (3)

- `idx_google_calendars_account_id` ON (`google_account_id`)
- `idx_google_calendars_visible` ON (`is_visible`) WHERE `is_visible = true`

---

### `calendar_events`

Stored calendar events from Google + CRM-created events.

#### Columns (17)

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `google_calendar_id` | uuid | NO | - | FK → `google_calendars` |
| `google_event_id` | text | NO | - | Google Calendar event ID |
| `title` | text | YES | - | Event title/summary |
| `description` | text | YES | - | Event description |
| `location` | text | YES | - | Event location |
| `start_time` | timestamptz | NO | - | Event start |
| `end_time` | timestamptz | YES | - | Event end |
| `all_day` | boolean | NO | `false` | All-day event flag |
| `status` | text | NO | `'confirmed'` | confirmed/tentative/cancelled |
| `color` | text | YES | - | Event-specific color |
| `recurrence` | text[] | YES | - | RRULE recurrence rules |
| `activity_id` | uuid | YES | - | FK → `activities` (CRM link) |
| `source` | text | NO | `'google'` | google/crm |
| `etag` | text | YES | - | Google API etag |
| `google_updated_at` | timestamptz | YES | - | Last update on Google side |
| `last_synced_at` | timestamptz | YES | - | Last sync timestamp |
| `created_at` | timestamptz | NO | `now()` | Creation timestamp |
| `updated_at` | timestamptz | NO | `now()` | Last update |

#### Constraints

- `calendar_events_calendar_event_unique` UNIQUE ON (`google_calendar_id`, `google_event_id`)
- `calendar_events_status_check`: `status IN ('confirmed', 'tentative', 'cancelled')`
- `calendar_events_source_check`: `source IN ('google', 'crm')`

#### Foreign Keys

- `google_calendar_id` → `google_calendars(id)` ON DELETE CASCADE
- `activity_id` → `activities(id)` ON DELETE SET NULL

#### Indices (6)

- `idx_calendar_events_calendar_id` ON (`google_calendar_id`)
- `idx_calendar_events_activity_id` ON (`activity_id`) WHERE `activity_id IS NOT NULL`
- `idx_calendar_events_time_range` ON (`google_calendar_id`, `start_time`, `end_time`)
- `idx_calendar_events_source` ON (`source`)
- `idx_calendar_events_status` ON (`status`)
- `idx_calendar_events_last_synced` ON (`last_synced_at`)

---

### `dashboard_stats` (VIEW)

Vista aggregata per statistiche dashboard. Usa `security_invoker = true` (rispetta RLS).

```sql
SELECT
  count(DISTINCT l.id) FILTER (WHERE l.status = 'new') AS leads_new,
  count(DISTINCT l.id) FILTER (WHERE l.status = 'contacted') AS leads_contacted,
  count(DISTINCT l.id) FILTER (WHERE l.status = 'qualified') AS leads_qualified,
  count(DISTINCT l.id) FILTER (WHERE l.status = 'customer') AS leads_customer,
  count(DISTINCT l.id) AS total_leads,
  count(DISTINCT a.id) FILTER (WHERE a.created_at > now() - '30 days'::interval) AS activities_last_30_days,
  round(100.0 * count(DISTINCT l.id) FILTER (WHERE l.status = 'customer') / NULLIF(count(DISTINCT l.id), 0), 2) AS conversion_rate
FROM leads l
LEFT JOIN activities a ON a.lead_id = l.id;
```

---

## Relational Diagram

```
users
  ├─→ activities.assigned_to
  ├─→ notes.user_id
  ├─→ automations.created_by_id
  ├─→ tasks.assigned_to_id
  ├─→ tasks.created_by_id
  ├─→ user_preferences.user_id
  └─→ google_accounts.user_id

marketing_sources
  └─→ leads.source_id

leads
  ├─→ leads.referral_lead_id (self-reference)
  ├─→ activities.lead_id
  ├─→ notes.lead_id
  └─→ tasks.lead_id

activities
  ├─→ tasks.activity_id
  └─→ calendar_events.activity_id

automations
  ├─→ automation_triggers.automation_id
  ├─→ automation_actions.automation_id
  └─→ automation_logs.automation_id

google_accounts
  └─→ google_calendars.google_account_id

google_calendars
  └─→ calendar_events.google_calendar_id
```

---

## Full-Text Search (FTS)

### Come funziona

FTS usa **custom trigger functions** (non `tsvector_update_trigger`) che aggiornano automaticamente il campo `search_vector` ad ogni INSERT/UPDATE.

### Leads FTS

**Trigger**: `leads_search_trigger` → `leads_search_update()`
**Columns indicizzate**: `name`, `email`, `phone`, `city`, `needs`

```sql
-- Search leads
SELECT * FROM leads
WHERE search_vector @@ plainto_tsquery('english', 'milano matteo');
```

### Activities FTS

**Trigger**: `activities_search_trigger` → `activities_search_update()`
**Columns indicizzate**: `title`, `notes`, `outcome`

> ⚠️ `type` NON è indicizzato nel FTS (a differenza di quanto potrebbe sembrare). Per filtrare per type, usa `WHERE type = 'Chiamata'`.

```sql
-- Search activities
SELECT * FROM activities
WHERE search_vector @@ plainto_tsquery('english', 'consulenza materasso');
```

### Trigram Search (pg_trgm)

Oltre a FTS, leads supporta **fuzzy search** tramite pg_trgm extension:
- `idx_leads_nome_trgm`: GIN trigram su `name`
- `idx_leads_telefono_trgm`: GIN trigram su `phone`

Utile per ricerche parziali e typo-tolerant (usato nell'API con `ILIKE`).

---

## Functions (4)

### `leads_search_update()` — FTS trigger per leads
### `activities_search_update()` — FTS trigger per activities
### `update_updated_at_column()` — Auto-update `updated_at` su ogni UPDATE

### `search_leads(text)` — ⚠️ LEGACY

Questa funzione usa nomi colonne **in italiano** (`"Nome"`, `"Telefono"`, `"Email"`, `"Stato"`) che non esistono più nello schema attuale. **Non usare**. Il codice applicativo usa `ILIKE` + trigram search.

---

## Triggers (10)

| Trigger | Table | Event | Function |
|---------|-------|-------|----------|
| `leads_search_trigger` | leads | BEFORE INSERT/UPDATE | `leads_search_update()` |
| `activities_search_trigger` | activities | BEFORE INSERT/UPDATE | `activities_search_update()` |
| `update_leads_updated_at` | leads | BEFORE UPDATE | `update_updated_at_column()` |
| `update_activities_updated_at` | activities | BEFORE UPDATE | `update_updated_at_column()` |
| `update_notes_updated_at` | notes | BEFORE UPDATE | `update_updated_at_column()` |
| `update_users_updated_at` | users | BEFORE UPDATE | `update_updated_at_column()` |
| `update_marketing_sources_updated_at` | marketing_sources | BEFORE UPDATE | `update_updated_at_column()` |
| `update_automations_updated_at` | automations | BEFORE UPDATE | `update_updated_at_column()` |
| `update_user_color_preferences_updated_at` | user_preferences | BEFORE UPDATE | `update_updated_at_column()` |
| `update_user_tasks_updated_at` | tasks | BEFORE UPDATE | `update_updated_at_column()` |

---

## Row-Level Security (RLS)

RLS è **abilitato** su:
- `automation_actions`
- `automation_logs`
- `automation_triggers`

Policy: `Allow authenticated users` (richiede `auth.role() = 'authenticated'`).

Le altre tabelle **non hanno RLS** attivo (l'app usa NextAuth + middleware per autenticazione).

---

## Come Ricreare lo Schema

### Export (dal DB corrente)

```bash
# Installa psql se necessario
brew install libpq && brew link --force libpq

# Export schema (senza dati)
pg_dump "$POSTGRES_URL_NON_POOLING" --schema-only --no-owner --no-privileges --schema=public -f schema.sql
```

### Import (su nuovo database)

```bash
psql "$NEW_DATABASE_URL" -f schema.sql
```

> ⚠️ Il dump richiede le extensions `uuid-ossp` e `pg_trgm` pre-installate (già presenti su Supabase).

---

## Known Issues

1. **Constraint gender duplicato** su `leads`: `leads_Gender_check` (legacy, senza 'other') e `leads_gender_check` (corretto). Non causa problemi ma andrebbe pulito.
2. **Funzione `search_leads()`**: Usa nomi colonne in italiano. Legacy, non usata dal codice.
3. **`airtable_id` rimosso**: Le colonne `airtable_id` sono state droppate da tutte le tabelle. La migrazione da Airtable è completata.

---

## Performance Notes

### Index Strategy

- **GIN indices** per FTS (`search_vector`), array (`assigned_to`), e trigram (`name`, `phone`)
- **Partial indices** per filtered queries (`WHERE active = true`, `WHERE pinned = true`, `WHERE email IS NOT NULL`)
- **Composite indices** per common multi-column queries
- **DESC indices** per time-series data (`created_at DESC`, `activity_date DESC`)

### Performance Targets

- Dashboard load: < 200ms (batch endpoint)
- FTS search: < 50ms (GIN index)
- Lead detail: < 100ms
- Cache hit rate: > 70% (Redis)

---

**Document Version**: 2.1
**Last Updated**: 2026-02-12
