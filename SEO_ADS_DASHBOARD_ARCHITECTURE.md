# DoctorBed — SEO & Ads Intelligence Dashboard

## Documento di Architettura Tecnica

**Stack**: Next.js 16 + PostgreSQL (Supabase) + Upstash Redis
**Integrazioni**: Google Ads API + GA4 Data API + Search Console API
**Versione**: 1.0 — Febbraio 2026

---

## 1. Panoramica

Modulo dashboard integrato nel CRM DoctorBed per centralizzare dati Google Ads, posizionamento organico (Search Console), traffico sito (GA4) e attribuzione lead-to-keyword.

### 1.1 Obiettivo

Misurare il ROI reale di ogni keyword — dal click alla vendita — in un'unica interfaccia all'interno del CRM esistente.

### 1.2 Architettura ad Alto Livello

```
DATA SOURCES              PROCESSING              STORAGE
─────────────────         ──────────────           ─────────────────
Google Ads API ───┐
                  ├──▶ Next.js API Routes ──▶ PostgreSQL (Supabase)
GA4 Data API ─────┤    (lib/postgres.ts)        Redis (Upstash)
                  │
Search Console ──┤           │
                  │           ▼
Webflow Forms ───┘    CRM Dashboard (shadcn/ui + SWR)
```

> **Principio**: tutti i dati transitano da `lib/postgres.ts` (query parametrizzate via `pg` Pool) — **MAI** Supabase JS client. Coerenza con il CRM esistente.

---

## 2. Features

| # | Feature | Descrizione | Data Source |
|---|---------|-------------|-------------|
| F1 | Keyword Intelligence | Ricerca keyword con volumi, CPC, competizione, trend per area geo | Google Ads API (KeywordPlanIdeaService) |
| F2 | Campaign Performance | Metriche campagne Ads: impressioni, click, CTR, CPC, conversioni, Quality Score | Google Ads API (GoogleAdsService) |
| F3 | Organic Tracking | Posizionamento organico, click, impressioni, CTR medio | Search Console API |
| F4 | Site Analytics | Traffico per sorgente, pagine viste, bounce rate, conversioni form | GA4 Data API |
| F5 | Lead Attribution | Attribuzione lead → keyword: costo per lead, revenue per keyword, ROAS | CRM (PostgreSQL) + Ads + GA4 |
| F6 | Competitor Monitor | Auction insights: quota impressioni vs competitor, overlap rate | Google Ads API (AuctionInsights) |

---

## 3. Data Model (PostgreSQL)

> **Convenzioni** (allineate al CRM esistente):
> - Naming: `snake_case` inglese
> - PK: `uuid` con `uuid_generate_v4()`
> - Timestamp: `timestamptz` con default `now()`
> - Valori finanziari: **`bigint` in micros** (1.000.000 = 1€) per dati Google Ads
> - Deal values: **`bigint` in cents** (100 = 1€), coerente con regola AGENTS.md "Currency Handling"
> - Ogni tabella ha `created_at` + `updated_at`
> - FK con `ON DELETE` appropriato

### 3.1 Tabelle

#### `seo_keywords`

Tabella master delle keyword monitorate.

| Colonna | Tipo | Nullable | Default | Note |
|---------|------|----------|---------|------|
| `id` | uuid (PK) | NO | `uuid_generate_v4()` | |
| `keyword` | text | NO | | Keyword esatta |
| `cluster` | text | NO | | Gruppo semantico (fabbrica, personalizzato, mal_schiena, locale) |
| `landing_page` | text | SÌ | | URL landing page associata |
| `priority` | text | NO | `'media'` | CHECK: alta / media / bassa |
| `is_active` | boolean | NO | `true` | Se monitorata attivamente |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**Indici:**
- `idx_seo_keywords_cluster` ON (`cluster`)
- `idx_seo_keywords_active` ON (`is_active`) WHERE `is_active = true`
- `idx_seo_keywords_keyword_trgm` ON (`keyword`) GIN `gin_trgm_ops` (fuzzy search)

**Constraint:**
- `seo_keywords_priority_check`: `priority IN ('alta', 'media', 'bassa')`
- `seo_keywords_keyword_unique` UNIQUE ON (`keyword`)

---

#### `seo_keyword_metrics`

Snapshot periodico dei dati di mercato per keyword. Popolata da cron weekly.

| Colonna | Tipo | Nullable | Default | Note |
|---------|------|----------|---------|------|
| `id` | uuid (PK) | NO | `uuid_generate_v4()` | |
| `keyword_id` | uuid (FK) | NO | | Ref `seo_keywords.id` |
| `avg_monthly_searches` | integer | SÌ | | Volume mensile medio (IT) |
| `local_monthly_searches` | integer | SÌ | | Volume stimato area 30km |
| `competition_level` | text | SÌ | | LOW / MEDIUM / HIGH |
| `competition_index` | integer | SÌ | | 0-100 |
| `avg_cpc_micros` | bigint | SÌ | | CPC medio in micros (1M = 1€) |
| `high_cpc_micros` | bigint | SÌ | | CPC top page bid in micros |
| `monthly_trend` | jsonb | SÌ | | Array 12 mesi `[{month, searches}]` |
| `recorded_at` | timestamptz | NO | `now()` | Timestamp snapshot |

**FK:** `keyword_id` → `seo_keywords(id)` ON DELETE CASCADE

**Indici:**
- `idx_seo_keyword_metrics_keyword_recorded` ON (`keyword_id`, `recorded_at` DESC)
- `idx_seo_keyword_metrics_recorded_at` ON (`recorded_at` DESC)

---

#### `seo_campaign_performance`

Dati giornalieri di performance campagne Google Ads.

| Colonna | Tipo | Nullable | Default | Note |
|---------|------|----------|---------|------|
| `id` | uuid (PK) | NO | `uuid_generate_v4()` | |
| `keyword_id` | uuid (FK) | NO | | Ref `seo_keywords.id` |
| `campaign_name` | text | NO | | Nome campagna Google Ads |
| `ad_group_name` | text | NO | | Nome gruppo annunci |
| `impressions` | integer | NO | `0` | Impressioni giornaliere |
| `clicks` | integer | NO | `0` | Click giornalieri |
| `cost_micros` | bigint | NO | `0` | Costo in micros |
| `conversions` | integer | SÌ | | Conversioni tracciate |
| `quality_score` | integer | SÌ | | 1-10 |
| `report_date` | date | NO | | Data del report |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**FK:** `keyword_id` → `seo_keywords(id)` ON DELETE CASCADE

**Indici:**
- `idx_seo_campaign_perf_keyword_date` ON (`keyword_id`, `report_date` DESC)
- `idx_seo_campaign_perf_date` ON (`report_date` DESC)
- `idx_seo_campaign_perf_campaign` ON (`campaign_name`)

**Constraint:**
- `seo_campaign_perf_qs_check`: `quality_score BETWEEN 1 AND 10 OR quality_score IS NULL`
- UNIQUE ON (`keyword_id`, `campaign_name`, `ad_group_name`, `report_date`) — previene duplicati nel sync

---

#### `seo_organic_rankings`

Posizionamento organico da Search Console.

| Colonna | Tipo | Nullable | Default | Note |
|---------|------|----------|---------|------|
| `id` | uuid (PK) | NO | `uuid_generate_v4()` | |
| `keyword_id` | uuid (FK) | NO | | Ref `seo_keywords.id` |
| `avg_position` | numeric(5,2) | NO | | Posizione media SERP |
| `clicks` | integer | NO | `0` | Click organici |
| `impressions` | integer | NO | `0` | Impressioni organiche |
| `ctr` | numeric(5,4) | NO | | Click-through rate (0.0000 - 1.0000) |
| `page_url` | text | SÌ | | Pagina posizionata |
| `report_date` | date | NO | | Data del report |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**FK:** `keyword_id` → `seo_keywords(id)` ON DELETE CASCADE

**Indici:**
- `idx_seo_organic_keyword_date` ON (`keyword_id`, `report_date` DESC)
- `idx_seo_organic_date` ON (`report_date` DESC)

**Constraint:**
- UNIQUE ON (`keyword_id`, `report_date`) — un record per keyword per giorno

---

#### `seo_site_analytics`

Dati traffico aggregati da GA4. Un record al giorno per source.

| Colonna | Tipo | Nullable | Default | Note |
|---------|------|----------|---------|------|
| `id` | uuid (PK) | NO | `uuid_generate_v4()` | |
| `source` | text | NO | | Sorgente traffico (google, direct, referral, social) |
| `medium` | text | SÌ | | Medium (organic, cpc, referral) |
| `sessions` | integer | NO | `0` | Sessioni |
| `page_views` | integer | NO | `0` | Pagine viste |
| `bounce_rate` | numeric(5,4) | SÌ | | 0.0000 - 1.0000 |
| `avg_session_duration_seconds` | integer | SÌ | | Durata media sessione |
| `form_submissions` | integer | SÌ | `0` | Conversioni form |
| `report_date` | date | NO | | Data del report |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**Indici:**
- `idx_seo_analytics_date` ON (`report_date` DESC)
- `idx_seo_analytics_source_date` ON (`source`, `report_date` DESC)

**Constraint:**
- UNIQUE ON (`source`, `medium`, `report_date`)

---

#### `seo_lead_attribution`

Collega lead dal CRM alla keyword sorgente. Cuore del ROI tracking.

| Colonna | Tipo | Nullable | Default | Note |
|---------|------|----------|---------|------|
| `id` | uuid (PK) | NO | `uuid_generate_v4()` | |
| `lead_id` | uuid (FK) | NO | | Ref `leads.id` |
| `keyword_id` | uuid (FK) | SÌ | | Ref `seo_keywords.id` |
| `source` | text | NO | | google_ads / organic / direct / referral |
| `confidence` | text | NO | `'none'` | exact / high / estimated / none |
| `gclid` | text | SÌ | | Google Click ID |
| `landing_page_url` | text | SÌ | | URL di atterraggio |
| `utm_source` | text | SÌ | | UTM source |
| `utm_medium` | text | SÌ | | UTM medium |
| `utm_campaign` | text | SÌ | | UTM campaign |
| `utm_keyword` | text | SÌ | | UTM keyword |
| `deal_value_cents` | bigint | SÌ | | Valore deal in **cents** (100 = 1€) |
| `created_at` | timestamptz | NO | `now()` | |
| `updated_at` | timestamptz | NO | `now()` | |

**FK:**
- `lead_id` → `leads(id)` ON DELETE CASCADE
- `keyword_id` → `seo_keywords(id)` ON DELETE SET NULL

**Indici:**
- `idx_seo_attribution_lead` ON (`lead_id`)
- `idx_seo_attribution_keyword` ON (`keyword_id`) WHERE `keyword_id IS NOT NULL`
- `idx_seo_attribution_source` ON (`source`)
- `idx_seo_attribution_gclid` ON (`gclid`) WHERE `gclid IS NOT NULL`
- `idx_seo_attribution_created` ON (`created_at` DESC)

**Constraint:**
- `seo_attribution_source_check`: `source IN ('google_ads', 'organic', 'direct', 'referral', 'social')`
- `seo_attribution_confidence_check`: `confidence IN ('exact', 'high', 'estimated', 'none')`
- UNIQUE ON (`lead_id`) — un lead ha una sola attribuzione

---

#### `seo_competitor_insights`

Auction insights da Google Ads.

| Colonna | Tipo | Nullable | Default | Note |
|---------|------|----------|---------|------|
| `id` | uuid (PK) | NO | `uuid_generate_v4()` | |
| `keyword_id` | uuid (FK) | NO | | Ref `seo_keywords.id` |
| `competitor_domain` | text | NO | | Dominio competitor |
| `impression_share` | numeric(5,4) | SÌ | | Quota impressioni (0-1) |
| `overlap_rate` | numeric(5,4) | SÌ | | Tasso sovrapposizione |
| `avg_position` | numeric(5,2) | SÌ | | Posizione media |
| `report_date` | date | NO | | Data del report |
| `created_at` | timestamptz | NO | `now()` | |

**FK:** `keyword_id` → `seo_keywords(id)` ON DELETE CASCADE

**Indici:**
- `idx_seo_competitor_keyword_date` ON (`keyword_id`, `report_date` DESC)
- `idx_seo_competitor_domain` ON (`competitor_domain`)

---

### 3.2 Migration SQL

File: `migrations/003_seo_ads_dashboard.sql`

```sql
-- SEO & Ads Dashboard Tables
-- Requires: uuid-ossp, pg_trgm extensions (already enabled in CRM)

BEGIN;

-- 1. Keywords master
CREATE TABLE seo_keywords (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword text NOT NULL,
  cluster text NOT NULL,
  landing_page text,
  priority text NOT NULL DEFAULT 'media'
    CHECK (priority IN ('alta', 'media', 'bassa')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (keyword)
);

CREATE INDEX idx_seo_keywords_cluster ON seo_keywords (cluster);
CREATE INDEX idx_seo_keywords_active ON seo_keywords (is_active) WHERE is_active = true;
CREATE INDEX idx_seo_keywords_keyword_trgm ON seo_keywords USING gin (keyword gin_trgm_ops);

-- 2. Keyword metrics (weekly snapshot)
CREATE TABLE seo_keyword_metrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword_id uuid NOT NULL REFERENCES seo_keywords(id) ON DELETE CASCADE,
  avg_monthly_searches integer,
  local_monthly_searches integer,
  competition_level text,
  competition_index integer,
  avg_cpc_micros bigint,
  high_cpc_micros bigint,
  monthly_trend jsonb,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_seo_keyword_metrics_keyword_recorded
  ON seo_keyword_metrics (keyword_id, recorded_at DESC);
CREATE INDEX idx_seo_keyword_metrics_recorded_at
  ON seo_keyword_metrics (recorded_at DESC);

-- 3. Campaign performance (daily)
CREATE TABLE seo_campaign_performance (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword_id uuid NOT NULL REFERENCES seo_keywords(id) ON DELETE CASCADE,
  campaign_name text NOT NULL,
  ad_group_name text NOT NULL,
  impressions integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  cost_micros bigint NOT NULL DEFAULT 0,
  conversions integer,
  quality_score integer CHECK (quality_score BETWEEN 1 AND 10 OR quality_score IS NULL),
  report_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (keyword_id, campaign_name, ad_group_name, report_date)
);

CREATE INDEX idx_seo_campaign_perf_keyword_date
  ON seo_campaign_performance (keyword_id, report_date DESC);
CREATE INDEX idx_seo_campaign_perf_date
  ON seo_campaign_performance (report_date DESC);
CREATE INDEX idx_seo_campaign_perf_campaign
  ON seo_campaign_performance (campaign_name);

-- 4. Organic rankings (daily from Search Console)
CREATE TABLE seo_organic_rankings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword_id uuid NOT NULL REFERENCES seo_keywords(id) ON DELETE CASCADE,
  avg_position numeric(5,2) NOT NULL,
  clicks integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  ctr numeric(5,4) NOT NULL,
  page_url text,
  report_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (keyword_id, report_date)
);

CREATE INDEX idx_seo_organic_keyword_date
  ON seo_organic_rankings (keyword_id, report_date DESC);
CREATE INDEX idx_seo_organic_date
  ON seo_organic_rankings (report_date DESC);

-- 5. Site analytics (daily from GA4)
CREATE TABLE seo_site_analytics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source text NOT NULL,
  medium text,
  sessions integer NOT NULL DEFAULT 0,
  page_views integer NOT NULL DEFAULT 0,
  bounce_rate numeric(5,4),
  avg_session_duration_seconds integer,
  form_submissions integer DEFAULT 0,
  report_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, medium, report_date)
);

CREATE INDEX idx_seo_analytics_date ON seo_site_analytics (report_date DESC);
CREATE INDEX idx_seo_analytics_source_date ON seo_site_analytics (source, report_date DESC);

-- 6. Lead attribution
CREATE TABLE seo_lead_attribution (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  keyword_id uuid REFERENCES seo_keywords(id) ON DELETE SET NULL,
  source text NOT NULL
    CHECK (source IN ('google_ads', 'organic', 'direct', 'referral', 'social')),
  confidence text NOT NULL DEFAULT 'none'
    CHECK (confidence IN ('exact', 'high', 'estimated', 'none')),
  gclid text,
  landing_page_url text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_keyword text,
  deal_value_cents bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id)
);

CREATE INDEX idx_seo_attribution_lead ON seo_lead_attribution (lead_id);
CREATE INDEX idx_seo_attribution_keyword ON seo_lead_attribution (keyword_id)
  WHERE keyword_id IS NOT NULL;
CREATE INDEX idx_seo_attribution_source ON seo_lead_attribution (source);
CREATE INDEX idx_seo_attribution_gclid ON seo_lead_attribution (gclid)
  WHERE gclid IS NOT NULL;
CREATE INDEX idx_seo_attribution_created ON seo_lead_attribution (created_at DESC);

-- 7. Competitor insights
CREATE TABLE seo_competitor_insights (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword_id uuid NOT NULL REFERENCES seo_keywords(id) ON DELETE CASCADE,
  competitor_domain text NOT NULL,
  impression_share numeric(5,4),
  overlap_rate numeric(5,4),
  avg_position numeric(5,2),
  report_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_seo_competitor_keyword_date
  ON seo_competitor_insights (keyword_id, report_date DESC);
CREATE INDEX idx_seo_competitor_domain
  ON seo_competitor_insights (competitor_domain);

-- Auto-update updated_at trigger (riusa pattern CRM esistente)
CREATE OR REPLACE FUNCTION seo_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_seo_keywords_updated
  BEFORE UPDATE ON seo_keywords
  FOR EACH ROW EXECUTE FUNCTION seo_update_timestamp();

CREATE TRIGGER trg_seo_campaign_perf_updated
  BEFORE UPDATE ON seo_campaign_performance
  FOR EACH ROW EXECUTE FUNCTION seo_update_timestamp();

CREATE TRIGGER trg_seo_organic_updated
  BEFORE UPDATE ON seo_organic_rankings
  FOR EACH ROW EXECUTE FUNCTION seo_update_timestamp();

CREATE TRIGGER trg_seo_analytics_updated
  BEFORE UPDATE ON seo_site_analytics
  FOR EACH ROW EXECUTE FUNCTION seo_update_timestamp();

CREATE TRIGGER trg_seo_attribution_updated
  BEFORE UPDATE ON seo_lead_attribution
  FOR EACH ROW EXECUTE FUNCTION seo_update_timestamp();

COMMIT;
```

---

## 4. Environment Variables

Tutte le nuove variabili **DEVONO** essere aggiunte a `src/env.ts` con validazione Zod (CRITICAL-003).

### 4.1 Nuove variabili

```
# Google Ads API
GOOGLE_ADS_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_ADS_CLIENT_SECRET=xxx
GOOGLE_ADS_DEVELOPER_TOKEN=xxx
GOOGLE_ADS_CUSTOMER_ID=1234567890
GOOGLE_ADS_REFRESH_TOKEN=xxx

# GA4 Data API
GA4_PROPERTY_ID=123456789
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# Webflow Webhook
WEBFLOW_WEBHOOK_SECRET=xxx
```

### 4.2 Schema Zod da aggiungere a `src/env.ts`

```typescript
// ========================================
// Google Ads API (OPTIONAL - SEO Dashboard)
// ========================================
GOOGLE_ADS_CLIENT_ID: z.string().optional(),
GOOGLE_ADS_CLIENT_SECRET: z.string().optional(),
GOOGLE_ADS_DEVELOPER_TOKEN: z.string().optional(),
GOOGLE_ADS_CUSTOMER_ID: z.string().optional(),
GOOGLE_ADS_REFRESH_TOKEN: z.string().optional(),

// ========================================
// GA4 + Search Console (OPTIONAL - SEO Dashboard)
// ========================================
GA4_PROPERTY_ID: z.string().optional(),
GOOGLE_SERVICE_ACCOUNT_KEY: z.string().optional(),

// ========================================
// Webflow Webhook (OPTIONAL - Lead Attribution)
// ========================================
WEBFLOW_WEBHOOK_SECRET: z.string().optional(),
```

> **Nota**: Variabili `optional()` perché il modulo SEO è opzionale. Quando attivato, i singoli service faranno validate esplicite:

```typescript
function getGoogleAdsConfig() {
  const { GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, ... } = env;
  if (!GOOGLE_ADS_CLIENT_ID || !GOOGLE_ADS_CLIENT_SECRET || ...) {
    throw new Error('Google Ads API credentials not configured. Set GOOGLE_ADS_* env vars.');
  }
  return { clientId: GOOGLE_ADS_CLIENT_ID, ... };
}
```

---

## 5. TypeScript Types

File: `src/types/seo-ads.ts` — segue stessa struttura di `src/types/database.ts`.

```typescript
import type { UUID, Timestamptz } from './database';

// ============================================================================
// SEO KEYWORDS
// ============================================================================

export type KeywordPriority = 'alta' | 'media' | 'bassa';

export interface SeoKeyword {
  id: UUID;
  keyword: string;
  cluster: string;
  landing_page: string | null;
  priority: KeywordPriority;
  is_active: boolean;
  created_at: Timestamptz;
  updated_at: Timestamptz;
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
// KEYWORD METRICS
// ============================================================================

export interface SeoKeywordMetrics {
  id: UUID;
  keyword_id: UUID;
  avg_monthly_searches: number | null;
  local_monthly_searches: number | null;
  competition_level: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  competition_index: number | null;
  avg_cpc_micros: number | null;    // bigint → number (safe range)
  high_cpc_micros: number | null;
  monthly_trend: { month: string; searches: number }[] | null;
  recorded_at: Timestamptz;
}

// ============================================================================
// CAMPAIGN PERFORMANCE
// ============================================================================

export interface SeoCampaignPerformance {
  id: UUID;
  keyword_id: UUID;
  campaign_name: string;
  ad_group_name: string;
  impressions: number;
  clicks: number;
  cost_micros: number;              // bigint → number
  conversions: number | null;
  quality_score: number | null;
  report_date: string;              // date → ISO string
  created_at: Timestamptz;
  updated_at: Timestamptz;
}

// ============================================================================
// ORGANIC RANKINGS
// ============================================================================

export interface SeoOrganicRanking {
  id: UUID;
  keyword_id: UUID;
  avg_position: number;
  clicks: number;
  impressions: number;
  ctr: number;
  page_url: string | null;
  report_date: string;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}

// ============================================================================
// SITE ANALYTICS
// ============================================================================

export interface SeoSiteAnalytics {
  id: UUID;
  source: string;
  medium: string | null;
  sessions: number;
  page_views: number;
  bounce_rate: number | null;
  avg_session_duration_seconds: number | null;
  form_submissions: number | null;
  report_date: string;
  created_at: Timestamptz;
  updated_at: Timestamptz;
}

// ============================================================================
// LEAD ATTRIBUTION
// ============================================================================

export type AttributionSource = 'google_ads' | 'organic' | 'direct' | 'referral' | 'social';
export type AttributionConfidence = 'exact' | 'high' | 'estimated' | 'none';

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
  deal_value_cents: number | null;   // bigint → number
  created_at: Timestamptz;
  updated_at: Timestamptz;

  // Aggregated (from JOINs)
  keyword_text?: string;
  lead_name?: string;
}

// ============================================================================
// COMPETITOR INSIGHTS
// ============================================================================

export interface SeoCompetitorInsight {
  id: UUID;
  keyword_id: UUID;
  competitor_domain: string;
  impression_share: number | null;
  overlap_rate: number | null;
  avg_position: number | null;
  report_date: string;
  created_at: Timestamptz;
}

// ============================================================================
// FILTERS (coerenti con pattern LeadFilters, ActivityFilters)
// ============================================================================

import type { PaginationParams, SortParams } from './database';

export interface SeoKeywordFilters extends PaginationParams, SortParams {
  cluster?: string;
  priority?: KeywordPriority;
  is_active?: boolean;
  search?: string;
}

export interface SeoCampaignFilters extends PaginationParams, SortParams {
  keyword_id?: UUID;
  campaign_name?: string;
  date_from?: string;
  date_to?: string;
}

export interface SeoOrganicFilters extends PaginationParams, SortParams {
  keyword_id?: UUID;
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

// ============================================================================
// DASHBOARD KPIs (aggregated)
// ============================================================================

export interface SeoDashboardKPIs {
  cost_per_lead_cents: number;
  cost_per_lead_change_pct: number;
  avg_quality_score: number;
  avg_quality_score_change: number;
  total_leads_month: number;
  total_leads_change_pct: number;
  avg_cpc_micros: number;
  avg_cpc_change_pct: number;
  avg_organic_position: number;
  avg_organic_position_change: number;
  ads_ctr: number;
  ads_ctr_change_pct: number;
  roas: number;
  roas_change: number;
  budget_spent_micros: number;
  budget_total_micros: number;
}
```

---

## 6. API Routes

### 6.1 Struttura File

```
src/app/api/seo-ads/
├── keywords/
│   ├── route.ts                    # GET lista + POST crea keyword
│   ├── [id]/route.ts               # GET | PATCH | DELETE singola
│   └── research/route.ts           # POST ricerca keyword (Google Ads API)
├── campaigns/
│   ├── route.ts                    # GET performance campagne
│   └── sync/route.ts              # POST sync manuale da Google Ads
├── organic/
│   ├── route.ts                    # GET ranking organico
│   └── sync/route.ts              # POST sync da Search Console
├── analytics/
│   └── route.ts                    # GET dati GA4
├── attribution/
│   └── route.ts                    # GET lead attribution report
├── competitors/
│   └── route.ts                    # GET auction insights
├── dashboard/
│   └── route.ts                    # GET KPI aggregati
└── cron/
    ├── daily-sync/route.ts         # POST Vercel Cron giornaliero
    └── weekly-research/route.ts    # POST refresh keyword metrics

src/lib/seo-ads/
├── google-ads-client.ts            # Google Ads API client (singleton)
├── keyword-planner.ts              # KeywordPlanIdeaService wrapper
├── campaign-service.ts             # Campaign metrics queries
├── auction-insights.ts             # Competitor data
├── ga4-client.ts                   # GA4 Data API client
├── search-console-client.ts        # Search Console API client
├── attribution.ts                  # Lead-to-keyword matching logic
├── queries.ts                      # PostgreSQL CRUD (stessa struttura di postgres.ts)
└── cache-keys.ts                   # Cache key builders

src/hooks/
├── use-seo-keywords.ts             # SWR hook per keywords
├── use-seo-campaigns.ts            # SWR hook per campaign performance
├── use-seo-organic.ts              # SWR hook per organic rankings
├── use-seo-attribution.ts          # SWR hook per lead attribution
└── use-seo-dashboard.ts            # SWR hook per dashboard KPIs
```

### 6.2 Pattern API Route (OBBLIGATORIO)

Ogni route **DEVE** seguire lo stesso pattern di `src/app/api/leads/route.ts`:

```typescript
// src/app/api/seo-ads/keywords/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { checkRateLimit } from '@/lib/ratelimit';
import { getSeoKeywords, createSeoKeyword } from '@/lib/seo-ads/queries';
import type { SeoKeywordCreateInput } from '@/types/seo-ads';
import { z } from 'zod';

// Zod schema per validazione input (CRITICAL-005)
const createKeywordSchema = z.object({
  keyword: z.string().min(1, 'keyword is required').max(200),
  cluster: z.string().min(1, 'cluster is required'),
  landing_page: z.string().url().optional(),
  priority: z.enum(['alta', 'media', 'bassa']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    // 1. Auth
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate limit
    const isDev = process.env.NODE_ENV === 'development';
    const { success, limit, remaining, reset } = isDev
      ? { success: true, limit: 1000, remaining: 999, reset: Date.now() + 60000 }
      : await checkRateLimit(session.user.email, 'read');

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED', retryAfter: reset },
        { status: 429, headers: { 'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString() } }
      );
    }

    // 3. Parse params
    const { searchParams } = new URL(request.url);
    const filters = {
      cluster: searchParams.get('cluster') || undefined,
      priority: searchParams.get('priority') as 'alta' | 'media' | 'bassa' | undefined,
      is_active: searchParams.get('is_active') === 'false' ? false : true,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
    };

    // 4. Query (via lib/seo-ads/queries.ts → lib/postgres.ts)
    const result = await getSeoKeywords(filters);

    // 5. Response
    return NextResponse.json({
      keywords: result.data,
      total: result.pagination.total,
      pagination: result.pagination,
    }, {
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
      },
    });
  } catch (error: unknown) {
    console.error('[API] GET /api/seo-ads/keywords error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success } = await checkRateLimit(session.user.email, 'write');
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429 }
      );
    }

    // Zod validation
    const body = await request.json();
    const parsed = createKeywordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const keyword = await createSeoKeyword(parsed.data);
    return NextResponse.json({ keyword }, { status: 201 });
  } catch (error: unknown) {
    console.error('[API] POST /api/seo-ads/keywords error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create keyword', code: 'CREATE_ERROR' },
      { status: 500 }
    );
  }
}
```

### 6.3 Pattern Query PostgreSQL

File `src/lib/seo-ads/queries.ts` — usa `query()`/`queryOne()` da `lib/postgres.ts`:

```typescript
import { query, queryOne, transaction } from '@/lib/postgres';
import { getOrSet, invalidate, TTL } from '@/lib/cache';
import type {
  SeoKeyword, SeoKeywordCreateInput, SeoKeywordFilters,
  SeoKeywordMetrics, PaginatedResponse,
} from '@/types/seo-ads';
import type { UUID, PaginatedResponse } from '@/types/database';

export async function getSeoKeywords(
  filters: SeoKeywordFilters = {}
): Promise<PaginatedResponse<SeoKeyword>> {
  const {
    page = 1, limit = 50,
    cluster, priority, is_active, search,
    sort_by = 'created_at', sort_order = 'desc',
  } = filters;

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
    ORDER BY ${sort_by} ${sort_order}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const data = await query<SeoKeyword>(dataSql, params);

  return {
    data,
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
  };
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
```

### 6.4 Endpoint Summary

| Method | Endpoint | Funzione | Rate Limit | Cache TTL |
|--------|----------|----------|------------|-----------|
| GET | `/api/seo-ads/keywords` | Lista keyword monitorate | read (60/min) | 5 min |
| POST | `/api/seo-ads/keywords` | Crea keyword | write (20/min) | — |
| GET | `/api/seo-ads/keywords/[id]` | Dettaglio keyword + metriche | read | 10 min |
| PATCH | `/api/seo-ads/keywords/[id]` | Aggiorna keyword | write | — |
| DELETE | `/api/seo-ads/keywords/[id]` | Rimuovi keyword | write | — |
| POST | `/api/seo-ads/keywords/research` | Ricerca keyword da seed | write | 24h (Redis) |
| GET | `/api/seo-ads/campaigns` | Performance campagne | read | 15 min |
| POST | `/api/seo-ads/campaigns/sync` | Sync manuale da Ads | write | — |
| GET | `/api/seo-ads/organic` | Ranking organico | read | 1h |
| POST | `/api/seo-ads/organic/sync` | Sync da Search Console | write | — |
| GET | `/api/seo-ads/analytics` | Dati traffico GA4 | read | 30 min |
| GET | `/api/seo-ads/attribution` | Lead attribution report | read | 5 min |
| GET | `/api/seo-ads/competitors` | Auction insights | read | 6h |
| GET | `/api/seo-ads/dashboard` | KPI aggregati | read | 5 min |
| POST | `/api/seo-ads/cron/daily-sync` | Cron giornaliero | — | — |
| POST | `/api/seo-ads/cron/weekly-research` | Refresh keyword metrics | — | — |

---

## 7. Cache Strategy

Estende `src/lib/cache.ts` esistente con nuovi key builders.

### 7.1 Cache Keys

File: `src/lib/seo-ads/cache-keys.ts`

```typescript
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
```

### 7.2 TTL Strategy (estende `TTL` esistente)

```typescript
// In cache.ts, aggiungere:
export const TTL = {
  // ... esistenti ...
  SEO_RESEARCH: 86400,    // 24h — keyword research (dati di mercato stabili)
  SEO_CAMPAIGNS: 900,     // 15 min — campaign performance
  SEO_ORGANIC: 3600,      // 1h — organic rankings
  SEO_ANALYTICS: 1800,    // 30 min — site analytics
  SEO_COMPETITORS: 21600, // 6h — auction insights (raramente cambiano)
} as const;
```

---

## 8. Google Ads API Client

### 8.1 Client Singleton

```typescript
// src/lib/seo-ads/google-ads-client.ts
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
```

### 8.2 Keyword Research con Cache Geo-Aware

```typescript
// src/lib/seo-ads/keyword-planner.ts
import { getAdsCustomer, GEO_TARGETS, LANGUAGE_IT } from './google-ads-client';
import { getOrSet, TTL } from '@/lib/cache';
import { seoCacheKeys } from './cache-keys';

interface KeywordResearchResult {
  keyword: string;
  avg_monthly_searches: number;
  competition_level: string;
  competition_index: number;
  avg_cpc_micros: number;
  high_cpc_micros: number;
  monthly_trend: { month: string; searches: number }[];
}

export async function researchKeywords(
  seeds: string[],
  geoTargetIds: number[] = Object.values(GEO_TARGETS)
): Promise<KeywordResearchResult[]> {
  // Cache key include geo targets per evitare collisioni
  const cacheKey = seoCacheKeys.keywordResearch(seeds, geoTargetIds);

  return getOrSet(cacheKey, async () => {
    const customer = getAdsCustomer();

    const results = await customer.keywordPlanIdeas.generate({
      keyword_seed: { keywords: seeds },
      geo_target_constants: geoTargetIds.map(id => `geoTargetConstants/${id}`),
      language: `languageConstants/${LANGUAGE_IT}`,
      keyword_plan_network: 'GOOGLE_SEARCH',
    });

    return results.map(r => ({
      keyword: r.text ?? '',
      avg_monthly_searches: r.keyword_idea_metrics?.avg_monthly_searches ?? 0,
      competition_level: r.keyword_idea_metrics?.competition ?? 'UNSPECIFIED',
      competition_index: r.keyword_idea_metrics?.competition_index ?? 0,
      avg_cpc_micros: Number(r.keyword_idea_metrics?.average_cpc_micros ?? 0),
      high_cpc_micros: Number(r.keyword_idea_metrics?.high_top_of_page_bid_micros ?? 0),
      monthly_trend: r.keyword_idea_metrics?.monthly_search_volumes?.map(m => ({
        month: `${m.year}-${String(m.month).padStart(2, '0')}`,
        searches: Number(m.monthly_searches ?? 0),
      })) ?? [],
    }));
  }, TTL.SEO_RESEARCH);
}
```

---

## 9. Lead Attribution

### 9.1 Logica a 3 Livelli

```
Livello 1 — GCLID (confidence: exact)
  Google Click ID passato nell'URL → match esatto keyword via Google Ads API

Livello 2 — UTM Parameters (confidence: high)
  utm_keyword catturato dal form → match testo keyword nel DB

Livello 3 — Landing Page (confidence: estimated)
  URL di atterraggio → match con cluster keyword

Nessun match → source: direct, confidence: none
```

### 9.2 Implementazione

```typescript
// src/lib/seo-ads/attribution.ts
import { queryOne } from '@/lib/postgres';
import type { SeoKeyword, AttributionSource, AttributionConfidence } from '@/types/seo-ads';

interface AttributionInput {
  gclid?: string | null;
  utm_source?: string | null;
  utm_campaign?: string | null;
  utm_keyword?: string | null;
  landing_page_url?: string | null;
}

interface AttributionResult {
  keyword_id: string | null;
  source: AttributionSource;
  confidence: AttributionConfidence;
}

export async function attributeLead(input: AttributionInput): Promise<AttributionResult> {
  // Level 1: GCLID → exact match
  if (input.gclid) {
    // GCLID risoluzione richiede Google Ads API (ClickView report)
    // Per MVP: salviamo il GCLID e facciamo match retroattivo nel daily-sync
    return {
      keyword_id: null, // Risolto dal cron
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

  // Level 3: Landing page → cluster match
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

  return { keyword_id: null, source: 'direct', confidence: 'none' };
}

function inferSource(utmSource: string | null | undefined): AttributionSource {
  if (!utmSource) return 'direct';
  if (utmSource === 'google') return 'google_ads';
  if (['facebook', 'instagram', 'meta'].includes(utmSource)) return 'social';
  return 'referral';
}
```

---

## 10. SWR Hooks (Frontend)

Pattern identico a `src/hooks/use-leads.ts`.

```typescript
// src/hooks/use-seo-keywords.ts
import useSWR, { useSWRConfig } from 'swr';
import { useState } from 'react';
import type { SeoKeyword, SeoKeywordFilters } from '@/types/seo-ads';
import type { PaginatedResponse } from '@/types/database';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to fetch');
  }
  return res.json();
};

export function useSeoKeywords(filters?: SeoKeywordFilters) {
  const params = new URLSearchParams();
  if (filters?.cluster) params.set('cluster', filters.cluster);
  if (filters?.priority) params.set('priority', filters.priority);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.page) params.set('page', filters.page.toString());
  if (filters?.limit) params.set('limit', filters.limit.toString());

  const url = `/api/seo-ads/keywords${params.toString() ? `?${params}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<{
    keywords: SeoKeyword[];
    total: number;
    pagination: PaginatedResponse<SeoKeyword>['pagination'];
  }>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  return {
    keywords: data?.keywords || [],
    total: data?.total || 0,
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Mutation hook per creare keyword con optimistic update (CRITICAL-001)
 */
export function useCreateSeoKeyword() {
  const { mutate } = useSWRConfig();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createKeyword = async (data: {
    keyword: string;
    cluster: string;
    landing_page?: string;
    priority?: string;
  }): Promise<SeoKeyword | null> => {
    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/seo-ads/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create keyword');
      }

      const result = await res.json();

      // Invalida tutte le cache keyword (CRITICAL-004)
      mutate((key) => typeof key === 'string' && key.startsWith('/api/seo-ads/keywords'));

      return result.keyword;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return { createKeyword, isCreating, error };
}
```

```typescript
// src/hooks/use-seo-dashboard.ts
import useSWR from 'swr';
import type { SeoDashboardKPIs } from '@/types/seo-ads';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch dashboard');
  return res.json();
};

export function useSeoDashboard() {
  const { data, error, isLoading, mutate } = useSWR<{ kpis: SeoDashboardKPIs }>(
    '/api/seo-ads/dashboard',
    fetcher,
    {
      revalidateOnFocus: false,
      refreshInterval: 300_000, // Auto-refresh ogni 5 min
      dedupingInterval: 30_000,
    }
  );

  return {
    kpis: data?.kpis || null,
    isLoading,
    error,
    mutate,
  };
}
```

---

## 11. Webflow → CRM Integration

### 11.1 Hidden Fields nei Form

Ogni form Webflow **deve** avere campi nascosti per cattura UTM/GCLID:

```html
<input type="hidden" name="gclid" id="gclid" />
<input type="hidden" name="utm_source" id="utm_source" />
<input type="hidden" name="utm_medium" id="utm_medium" />
<input type="hidden" name="utm_campaign" id="utm_campaign" />
<input type="hidden" name="utm_keyword" id="utm_keyword" />
<input type="hidden" name="landing_page" id="landing_page" />
```

### 11.2 Script di Cattura

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const fields = ['gclid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_keyword'];

  fields.forEach(f => {
    const el = document.getElementById(f);
    const val = params.get(f);
    if (el && val) el.value = val;
  });

  // Landing page
  const lp = document.getElementById('landing_page');
  if (lp) lp.value = window.location.pathname;

  // Persisti GCLID in cookie (90gg, Secure, SameSite=Lax)
  const gclid = params.get('gclid');
  if (gclid) {
    document.cookie = `gclid=${gclid};max-age=7776000;path=/;Secure;SameSite=Lax`;
  }

  // Recupera GCLID da cookie se non nell'URL
  if (!gclid) {
    const match = document.cookie.match(/gclid=([^;]+)/);
    const gclidEl = document.getElementById('gclid');
    if (match && gclidEl) gclidEl.value = match[1];
  }

  // Fallback localStorage per Safari ITP (7-day cookie limit)
  if (gclid) {
    try { localStorage.setItem('gclid', gclid); } catch {}
  }
  if (!gclid && !document.cookie.match(/gclid=/)) {
    try {
      const stored = localStorage.getItem('gclid');
      const gclidEl = document.getElementById('gclid');
      if (stored && gclidEl) gclidEl.value = stored;
    } catch {}
  }
});
```

### 11.3 Webhook con Signature Verification

```typescript
// src/app/api/webhooks/webflow-form/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { env } from '@/env';
import { createLead } from '@/lib/postgres';
import { queryOne } from '@/lib/postgres';
import { attributeLead } from '@/lib/seo-ads/attribution';
import { checkRateLimit } from '@/lib/ratelimit';
import { z } from 'zod';

// Zod validation per payload webhook
const webflowPayloadSchema = z.object({
  data: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    gclid: z.string().optional(),
    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_campaign: z.string().optional(),
    utm_keyword: z.string().optional(),
    landing_page: z.string().optional(),
  }),
});

/**
 * Verifica HMAC signature del webhook Webflow
 */
function verifyWebflowSignature(body: string, signature: string | null): boolean {
  const secret = env.WEBFLOW_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const hmac = createHmac('sha256', secret);
  hmac.update(body);
  const expected = hmac.digest('hex');

  // Timing-safe comparison
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limit (per IP, non per user — webhook è anonimo)
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { success } = await checkRateLimit(`webhook:${ip}`, 'write');
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // 2. Signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-webflow-signature');

    if (!verifyWebflowSignature(rawBody, signature)) {
      console.error('[Webhook] Invalid Webflow signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 3. Parse + validate
    const payload = JSON.parse(rawBody);
    const parsed = webflowPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const formData = parsed.data.data;

    // 4. Crea lead (usa pattern CRM esistente — lib/postgres.ts)
    const lead = await createLead({
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      status: 'Nuovo',
    });

    // 5. Attribuzione automatica
    const attribution = await attributeLead({
      gclid: formData.gclid,
      utm_source: formData.utm_source,
      utm_campaign: formData.utm_campaign,
      utm_keyword: formData.utm_keyword,
      landing_page_url: formData.landing_page,
    });

    // 6. Salva attribuzione
    await queryOne(
      `INSERT INTO seo_lead_attribution
        (lead_id, keyword_id, source, confidence, gclid,
         landing_page_url, utm_source, utm_medium, utm_campaign, utm_keyword,
         created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING *`,
      [
        lead.id,
        attribution.keyword_id,
        attribution.source,
        attribution.confidence,
        formData.gclid || null,
        formData.landing_page || null,
        formData.utm_source || null,
        formData.utm_medium || null,
        formData.utm_campaign || null,
        formData.utm_keyword || null,
      ]
    );

    return NextResponse.json({ success: true, lead_id: lead.id });
  } catch (error: unknown) {
    console.error('[Webhook] webflow-form error:', error);
    return NextResponse.json(
      { error: 'Internal error', code: 'WEBHOOK_ERROR' },
      { status: 500 }
    );
  }
}
```

---

## 12. Cron Jobs (Vercel Cron)

### 12.1 Configurazione

File: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/seo-ads/cron/daily-sync",
      "schedule": "0 6 * * *"
    },
    {
      "path": "/api/seo-ads/cron/weekly-research",
      "schedule": "0 3 * * 1"
    }
  ]
}
```

### 12.2 Pattern Cron con Error Handling

```typescript
// src/app/api/seo-ads/cron/daily-sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';

// Vercel Cron auth header
const CRON_SECRET = env.NEXTAUTH_SECRET; // Riusa secret esistente

export async function POST(request: NextRequest) {
  try {
    // Auth: Vercel Cron invia header Authorization
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = {
      campaigns: { success: false, count: 0, error: null as string | null },
      organic: { success: false, count: 0, error: null as string | null },
      analytics: { success: false, count: 0, error: null as string | null },
    };

    // Sync con retry individuale per ogni source
    // Se una source fallisce, le altre continuano

    // 1. Google Ads Campaign Performance
    try {
      const count = await syncCampaignPerformance();
      results.campaigns = { success: true, count, error: null };
    } catch (err: unknown) {
      results.campaigns.error = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Cron] Campaign sync failed:', err);
    }

    // 2. Search Console Organic Rankings
    try {
      const count = await syncOrganicRankings();
      results.organic = { success: true, count, error: null };
    } catch (err: unknown) {
      results.organic.error = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Cron] Organic sync failed:', err);
    }

    // 3. GA4 Site Analytics
    try {
      const count = await syncSiteAnalytics();
      results.analytics = { success: true, count, error: null };
    } catch (err: unknown) {
      results.analytics.error = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Cron] Analytics sync failed:', err);
    }

    // Log risultato complessivo
    const allSuccess = Object.values(results).every(r => r.success);
    const status = allSuccess ? 200 : 207; // 207 Multi-Status se parziale

    console.log(`[Cron] daily-sync completed: ${JSON.stringify(results)}`);
    return NextResponse.json({ results }, { status });
  } catch (error: unknown) {
    console.error('[Cron] daily-sync fatal error:', error);
    return NextResponse.json(
      { error: 'Cron job failed', code: 'CRON_ERROR' },
      { status: 500 }
    );
  }
}

// Stub — implementare con Google Ads/SC/GA4 client
async function syncCampaignPerformance(): Promise<number> { return 0; }
async function syncOrganicRankings(): Promise<number> { return 0; }
async function syncSiteAnalytics(): Promise<number> { return 0; }
```

---

## 13. Frontend Pages

### 13.1 Route Structure

```
src/app/dashboard/seo-ads/
├── page.tsx                    # Overview Dashboard (KPI cards + trend)
├── keywords/
│   └── page.tsx                # Keyword Manager (DataTable + filtri)
├── research/
│   └── page.tsx                # Keyword Research (input seed → risultati)
├── campaigns/
│   └── page.tsx                # Campaign Performance (tabella + grafici)
├── organic/
│   └── page.tsx                # Organic Rankings (posizioni SERP)
├── attribution/
│   └── page.tsx                # ROI & Attribution (funnel + ROAS)
└── competitors/
    └── page.tsx                # Competitor Analysis (auction insights)
```

### 13.2 Dashboard KPI Cards

8 card con sparkline + variazione vs periodo precedente:

| KPI | Fonte | Calcolo |
|-----|-------|---------|
| Costo per Lead | Ads + CRM | `sum(cost_micros) / count(attributed_leads)` — display in € |
| Quality Score Medio | Google Ads | `avg(quality_score)` |
| Lead Totali (mese) | CRM | `count(leads)` WHERE `created_at` nel mese corrente |
| CPC Medio | Google Ads | `sum(cost_micros) / sum(clicks)` — display in € |
| Posizione Organica Media | Search Console | `avg(avg_position)` |
| CTR Ads | Google Ads | `sum(clicks) / sum(impressions)` |
| ROAS | Ads + CRM | `sum(deal_value_cents) / sum(cost_micros * 100)` |
| Budget Speso / Totale | Google Ads | `sum(cost_micros)` vs budget configurato |

> **Formattazione valori finanziari**: usa helper per convertire micros → € e cents → €:
> ```typescript
> const microsToEuros = (micros: number) => (micros / 1_000_000).toFixed(2);
> const centsToEuros = (cents: number) => (cents / 100).toFixed(2);
> ```

### 13.3 Componenti (shadcn/ui)

Usa componenti esistenti da `src/components/ui/`:
- `Card`, `CardHeader`, `CardContent` — KPI cards
- `DataTable` (`@tanstack/react-table`) — tabelle keyword/campagne
- `Select`, `Input`, `Button` — filtri
- `Tabs` — switch tra viste
- `Badge` — status/priority indicators
- `Recharts` (già in dependencies) — grafici trend/sparkline

---

## 14. Credenziali e Setup

### 14.1 Checklist Prerequisiti

| Servizio | Credenziale | Come Ottenerla |
|----------|-------------|----------------|
| Google Ads API | Developer Token | Google Ads → Strumenti → Centro API |
| Google Ads API | OAuth2 Client ID + Secret | Google Cloud Console → Credenziali |
| Google Ads API | Refresh Token | OAuth2 flow (una tantum) |
| Google Ads API | Customer ID | ID account Google Ads (XXX-XXX-XXXX) |
| GA4 Data API | Service Account JSON | Google Cloud → IAM → Service Account |
| GA4 Data API | Property ID | GA4 → Amministratore → Proprietà |
| Search Console | Service Account (stesso GA4) | Aggiungere come utente in SC |
| Webflow | Webhook Secret | Webflow → Project Settings → Integrations |

### 14.2 Dipendenze npm

```bash
npm install google-ads-api @google-analytics/data googleapis
```

---

## 15. Costi

| Voce | Costo | Note |
|------|-------|------|
| Google Ads API | Gratuita | Inclusa con account Google Ads attivo |
| GA4 Data API | Gratuita | Quota: 50.000 req/giorno |
| Search Console API | Gratuita | Quota: 1.200 query/minuto |
| Infrastruttura | €0/mese | Vercel Pro + Supabase Pro + Upstash già attivi |

---

## 16. Piano di Implementazione

### Fase 1 — Foundation (Settimana 1-2)
- Setup Google Cloud Project + abilitazione API
- Richiedere Developer Token Google Ads
- Eseguire migration SQL (sezione 3.2)
- Aggiungere env vars a `src/env.ts`
- Aggiungere types a `src/types/seo-ads.ts`
- Implementare `lib/seo-ads/queries.ts` (CRUD base)
- Implementare Google Ads client + endpoint keyword research
- Pagina Keyword Research con UI base

### Fase 2 — Data Pipeline (Settimana 3-4)
- Endpoint campaign performance + cron `daily-sync`
- Integrazione Search Console per ranking organico
- Integrazione GA4 Data API per analytics
- Dashboard overview con KPI cards
- SWR hooks per tutte le pagine

### Fase 3 — Attribution & Intelligence (Settimana 5-6)
- Hidden fields + script cattura UTM/GCLID su form Webflow
- Webhook endpoint con signature verification
- Lead attribution automatica
- Pagina ROI & Attribution
- Competitor analysis (Auction Insights)
- Cache layer Redis per tutti gli endpoint

---

## 17. Prossimi Passi Immediati

1. **Richiedere Developer Token** Google Ads (2-5 giorni lavorativi)
2. **Creare Google Cloud Project** con API abilitate (Ads, GA4, Search Console)
3. **Configurare OAuth2** e ottenere Refresh Token
4. **Eseguire migration** SQL su Supabase
5. **Implementare primo endpoint** (keyword research) e testare end-to-end
