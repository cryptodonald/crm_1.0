# ARCHITECTURE.md - CRM Next.js + Airtable

**Data ultimo audit completo**: 2026-01-28  
**Branch**: audit-fix-20260128  
**Commit**: d50a109

---

## 📋 EXECUTIVE SUMMARY

Sistema CRM basato su **Next.js 16** (App Router) con backend **Airtable** per persistenza dati. Architettura mista con gestione secrets centralizzata in `src/env.ts`, storage chiavi in **Vercel KV (Upstash)**, e caching multi-layer per performance.

**Stack principale**:
- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- Backend: Next.js API Routes, Airtable REST API
- Auth: JWT custom + NextAuth.js (OAuth Google)
- Storage: Airtable (dati), Vercel KV (cache/secrets), Vercel Blob (allegati)
- Deployment: Vercel

---

## 🏗️ STRUTTURA REPOSITORY

```
crm_1.0/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes (~40 endpoints)
│   │   │   ├── leads/         # CRUD Leads + duplicates + merge
│   │   │   ├── activities/    # CRUD Activities
│   │   │   ├── orders/        # CRUD Orders + payment schemas
│   │   │   ├── products/      # Products + variants
│   │   │   ├── marketing/     # Marketing sources, costs, expenses
│   │   │   ├── auth/          # Login, logout, register, reset-password
│   │   │   ├── api-keys/      # API Keys CRUD (KV storage)
│   │   │   ├── google-calendar/ # Google Calendar integration
│   │   │   └── places/        # Google Places API proxy
│   │   ├── (dashboard)/       # Protected routes group
│   │   ├── leads/             # Leads UI pages
│   │   ├── activities/        # Activities UI
│   │   ├── orders/            # Orders management
│   │   ├── marketing/         # Marketing analytics
│   │   ├── login/             # Public auth pages
│   │   └── ...
│   ├── lib/                   # Core services & utilities
│   │   ├── airtable/          # Airtable client + helpers
│   │   ├── api-keys-service.ts # Dynamic API keys from KV
│   │   ├── cache.ts           # Multi-layer caching
│   │   ├── kv.ts              # Vercel KV wrapper
│   │   ├── auth.ts            # JWT + bcrypt utils
│   │   ├── encryption.ts      # AES-256 encryption
│   │   ├── env.ts             # ⚠️ Centralized env access
│   │   ├── env.ts.disabled    # ⚠️ Old version
│   │   └── ...
│   ├── components/            # React components (shadcn/ui)
│   ├── hooks/                 # Custom React hooks
│   ├── types/                 # TypeScript types
│   └── env.ts                 # ⚠️ Root env (main source)
├── scripts/                   # Batch operations & migrations
│   ├── migrations/            # Encryption, API keys migrations
│   ├── analysis/              # Schema analysis scripts
│   └── *.js                   # ~30+ utility scripts
├── docs/                      # Documentation (~20 files)
├── types/                     # Shared types (orders, products)
└── public/                    # Static assets
```

---

## 🔄 DATA FLOW ARCHITECTURE

### UI → API → Airtable (Standard Flow)

```
┌─────────────────────┐
│   Client (Browser)  │
│   React Components  │
└──────────┬──────────┘
           │ fetch('/api/...')
           ▼
┌─────────────────────┐
│  Next.js Middleware │ ◄── src/proxy.ts (Auth check)
│  (Edge Runtime)     │
└──────────┬──────────┘
           │ if authenticated
           ▼
┌─────────────────────┐
│   API Route Handler │ ◄── src/app/api/*/route.ts
│  (Node.js Runtime)  │
└──────────┬──────────┘
           │
           ├─→ getAirtableKey() ──┐
           │   (async from KV)    │
           │                       ▼
           │              ┌──────────────────┐
           │              │   Vercel KV      │
           │              │   (Upstash)      │
           │              │ - API keys       │
           │              │ - Cache layer    │
           │              └──────────────────┘
           │
           ├─→ Check cache ───────┤
           │   (cache.ts)          │
           │                       │
           ▼                       │
┌─────────────────────┐           │
│  AirtableClient     │           │
│  (client.ts)        │           │
│  - Rate limiting    │           │
│  - Retry logic      │           │
│  - Pagination       │           │
└──────────┬──────────┘           │
           │ HTTPS                │
           ▼                      │
┌─────────────────────┐          │
│   Airtable REST API │          │
│   api.airtable.com  │          │
└──────────┬──────────┘          │
           │ Response             │
           ▼                      │
      Transform data ─────────────┤
           │                       │
           ├─→ Cache result ───────┘
           │   (TTL-based)
           │
           ▼
      Return to client
```

### Secrets & Environment Variables Flow

```
┌──────────────────────────────────────────────────────┐
│                  SECRETS SOURCES                     │
├──────────────────────────────────────────────────────┤
│                                                      │
│  1. Vercel Environment Variables (Source of Truth)  │
│     ├─ Production env vars                          │
│     ├─ Preview env vars                             │
│     └─ Development (.env.local, NOT committed)      │
│                                                      │
│  2. src/env.ts (Centralized Reader)                 │
│     ├─ Validates required vars at startup           │
│     ├─ Fails fast if missing critical secrets       │
│     └─ Exports typed env object                     │
│                                                      │
│  3. Vercel KV / Upstash (Runtime Storage)           │
│     ├─ API keys (encrypted with ENCRYPTION_MASTER_KEY)│
│     ├─ Cache (TTL-based invalidation)               │
│     └─ NOT for build-time secrets                   │
│                                                      │
└──────────────────────────────────────────────────────┘

Application reads secrets:
  → Build-time: src/env.ts reads process.env.*
  → Runtime: api-keys-service.ts reads from KV (encrypted)
  → Client-side: ONLY NEXT_PUBLIC_* vars (non-sensitive)
```

---

## 🔐 AUTHENTICATION & SECURITY

### Middleware (src/proxy.ts)

**Protected routes**:
- `/dashboard`, `/leads`, `/activities`, `/orders`, `/reports`, `/calendar`
- `/admin`, `/developers`, `/api-keys`
- `/api/admin/*`, `/api/user/*`

**Public routes**:
- `/login`, `/forgot-password`, `/reset-password`
- `/api/auth/*` (login, logout, register, reset)

**Auth flow**:
1. Request → Middleware checks for `auth-token` cookie
2. If missing → Redirect to `/login?from=<pathname>`
3. If present → **⚠️ Verification disabled (TODO)** - assumes valid
4. JWT should be verified against `JWT_SECRET` from env.ts

**Critical issue**: JWT verification is commented out in middleware due to Edge Runtime compatibility issues.

### API Keys Management (KV-based)

- Stored encrypted in Vercel KV with AES-256
- Encryption key: `ENCRYPTION_MASTER_KEY` (from Vercel env)
- Managed via `/api/api-keys` endpoints
- Used by `api-keys-service.ts` with in-memory + KV caching (5min TTL)

---

## 💾 DATA LAYER

### Airtable Client (`src/lib/airtable/client.ts`)

**Features**:
- Rate limiting: 5 req/sec (200ms interval)
- Retry logic: 3 attempts with exponential backoff (2s, 4s, 8s)
- Automatic pagination for `list()` operations
- Error handling per HTTP status code (401, 403, 404, 422, 429)
- Query builder with filters, sorting, fields selection

**Factory pattern**:
```typescript
// ✅ Recommended (dynamic KV credentials)
const client = await createAirtableClientFromKV();

// ❌ Deprecated (direct env access)
const client = new AirtableClient(apiKey, baseId);
```

### Caching Strategy (`src/lib/cache.ts`)

**Multi-layer caching**:
1. **In-memory cache** (api-keys-service.ts): 5 min TTL
2. **Vercel KV cache** (cache.ts): Variable TTL per entity
3. **Legacy cache** (leads-cache.ts): Map-based, query-aware

**TTL per entity**:
- Leads: 60s
- Users: 300s (5min)
- Activities: 120s (2min)
- Orders: 180s (3min)
- API Keys: 300s (5min)
- Google Places Search: 3600s (1h)
- Google Places Details: 86400s (24h)

**Cache invalidation**:
- Manual: `invalidateLeadCache()`, `invalidateUsersCache()`, etc.
- Pattern-based: `cacheService.invalidatePattern('lead:*')`
- Full flush: `debugCache.clear()`

### Batch Operations (`src/lib/airtable-batch.ts`)

**⚠️ NOT CONSISTENTLY USED** - Many scripts bypass this service.

Purpose: Batch create/update/delete with:
- Chunking (10 records/batch per Airtable limit)
- Idempotency tracking
- Error accumulation

---

## 🔧 CORE BUSINESS FLOWS

### 1. Lead Management

**Create Lead** (`POST /api/leads`):
1. Validate input (Nome, Provenienza required)
2. Lookup Marketing Source record ID by name
3. Create record in Airtable Leads table with `Fonte` link
4. Invalidate leads + users cache (async, non-blocking)
5. Return transformed record with timing metrics

**List Leads** (`GET /api/leads`):
- Supports pagination (`maxRecords`, `offset`)
- Supports `loadAll=true` for full dataset (with recursive pagination)
- Cache-aware: checks `leads-cache` before fetching
- Filters: stato, provenienza, date range, città, search
- Performance: 10s → <2s with caching

**Delete Leads** (`DELETE /api/leads`):
- Batch delete up to 10 records/request (Airtable limit)
- Clears cache after successful deletion

**Duplicates Detection** (`GET /api/leads/duplicates`):
- Graph-based deduplication algorithm
- Checks: Nome, Email, Telefono similarity
- Returns clusters of potential duplicates

**Merge Leads** (`POST /api/leads/merge`):
- Consolidates multiple leads into one
- Merges notes, uses oldest date
- Deletes redundant records

### 2. Activities Management

**Create Activity** (`POST /api/activities`):
- Links to Lead via record ID
- Supports attachments (Vercel Blob)
- Updates Lead state based on activity type
- Google Calendar sync (optional)

**State Automation** (`activity-lead-state-helper.ts`):
- Rules engine for Lead state transitions
- Based on activity type (chiamata, visita, preventivo, etc.)

### 3. Orders Management

**Complex schema** with multiple tables:
- Orders (main table)
- Order Items (line items)
- Products, Product Variants, Product Structures
- Payment Transactions, Commission Payments

**API endpoints**:
- `/api/orders` - CRUD Operations
- `/api/orders/payment-fields` - Dynamic payment schema
- `/api/orders/payment-methods`, `/api/orders/payment-statuses` - Enums

### 4. Marketing Analytics

**Tables**:
- Marketing Sources (traffic sources)
- Marketing Costs (ad spend per source)
- Marketing Expenses (monthly budget tracking)

**API**:
- `/api/marketing/sources`, `/api/marketing/costs`, `/api/marketing/expenses`
- `/api/analytics/source-performance` - ROI calculations

---

## ⚙️ CONFIGURATION

### Environment Variables (`src/env.ts`)

**Required (fail-fast validation)**:
```typescript
AIRTABLE_API_KEY          // Airtable personal access token
AIRTABLE_BASE_ID          // Base ID (appXXXXXXXXXXXXXX)
NEXTAUTH_SECRET           // NextAuth session secret
JWT_SECRET                // Custom JWT signing key
VERCEL_BLOB_READ_WRITE_TOKEN // Blob storage access
GITHUB_TOKEN              // For GitHub integrations
GITHUB_WEBHOOK_SECRET     // Webhook validation
OPENAI_API_KEY            // AI features (note rewriting)
ENCRYPTION_MASTER_KEY     // AES-256 encryption for KV
GOOGLE_OAUTH_CLIENT_ID    // OAuth sign-in
GOOGLE_OAUTH_CLIENT_SECRET
```

**Optional**:
```typescript
DATABASE_URL              // If using relational DB (unused)
NEXTAUTH_URL              // For production OAuth callback
NODE_ENV                  // development | production | test
NEXT_PUBLIC_APP_URL       // Frontend base URL
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY // Client-side Maps/Places
CURRENT_USER_ID           // For API keys service (default: user_admin_001)
CURRENT_TENANT_ID         // For multi-tenant (default: tenant_doctorbed)
```

### Next.js Config (`next.config.ts`)

**⚠️ CRITICAL ISSUES**:
```typescript
typescript: {
  ignoreBuildErrors: true,  // ❌ Hides type errors in production!
},
eslint: {
  ignoreDuringBuilds: true, // ❌ Skips linting on deploy!
}
```

**Recommendations**:
- Headers: CSP, HSTS, X-Frame-Options configured
- Logging: redactedPaths for sensitive routes

---

## 📊 PERFORMANCE & MONITORING

### Performance Monitor (`src/lib/performance-monitor.ts`)

**Metrics tracked**:
- API latency (p50, p95, p99)
- Cache hit rates
- Error rates by endpoint
- Slow queries (>3s)

**⚠️ Limited implementation**:
- Logging only (no external monitoring)
- Manual metric recording (`recordApiLatency`, `recordError`)
- No automatic alerting in production

### Bottlenecks Identified

1. **Airtable pagination**: Initial load 10s+ without cache
2. **KV latency**: ~100-200ms per encrypted key fetch
3. **No query optimization**: Full table scans common
4. **No background jobs**: All operations synchronous

---

## 🚨 ARCHITECTURAL CONCERNS

### Code Quality Issues

1. **Duplicated files**:
   - `src/lib/env.ts` + `src/env.ts` (both active)
   - `src/lib/env.ts.disabled` (orphaned)
   - `components.json` + `components 2.json`
   - Multiple script variants (create-orders*.js)

2. **TypeScript permissiveness**:
   - Build errors ignored
   - No strict mode
   - Many `any` types

3. **Inconsistent patterns**:
   - Mix of direct Airtable calls vs using client
   - Some routes use caching, others don't
   - API keys sometimes from KV, sometimes from env

### Security Concerns

1. **Middleware JWT verification disabled** - All authenticated routes trust cookie presence without validation
2. **Secrets in git history** - Need secret scan and rotation
3. **No rate limiting** on API routes (only Airtable client has internal rate limiting)
4. **CORS not configured** for API routes
5. **No input sanitization** beyond basic validation

### Scalability Concerns

1. **Single KV instance** for cache + secrets (could hit memory limits)
2. **No database indexes** (Airtable has limited query optimization)
3. **Synchronous operations** block request threads
4. **No CDN strategy** for static assets beyond Vercel default

---

## 📝 SCRIPTS & MIGRATIONS

**30+ scripts in `/scripts/`** for:
- Airtable schema migrations (create tables, add fields)
- Data migrations (encryption, API keys → KV)
- Analysis tools (schema inspection, data validation)
- Test utilities (create sample data)

**⚠️ Issues**:
- No migration tracking system (manual execution)
- Scripts read env directly (`process.env.*`)
- No rollback capability
- Documentation scattered

---

## 🔄 DEPLOYMENT

**Vercel-native deployment**:
- Git push → Auto deploy (preview + production)
- Environment variables managed in Vercel dashboard
- Edge middleware (auth check)
- Serverless functions (API routes)
- KV database (Upstash integration)
- Blob storage for file uploads

**Build process**:
```bash
npm run validate  # type-check + lint + test (⚠️ currently skipped)
npm run build     # Next.js build
npm run start     # Production server
```

---

## 📚 DOCUMENTATION

**Extensive docs in `/docs/`**:
- System guides: LEADS_SYSTEM_CURRENT.md, ORDERS_SYSTEM.md
- Feature specs: activity-timeline-view.md, ai-notes-rewriting.md
- Runbooks: incident.md, migrations.md, local-dev.md
- Performance: audit-completo.md, guidelines.md

**⚠️ Documentation drift**: Some docs reference deprecated patterns or old code structures.

---

## 🎯 RECOMMENDATIONS

### Immediate (Critical)

1. **Enable JWT verification in middleware** - Security risk
2. **Remove `typescript.ignoreBuildErrors`** - Hiding production bugs
3. **Secret scan + rotation** - Check git history
4. **Consolidate env files** - Remove duplicates
5. **Add rate limiting** - Prevent abuse

### Short-term (High Priority)

6. **Standardize Airtable access** - Always use client.ts
7. **Consistent caching** - Apply to all read operations
8. **Error monitoring** - Sentry or similar
9. **Clean up unused files** - Remove .disabled, duplicates
10. **Migration tracking** - Database of applied migrations

### Long-term (Architecture)

11. **Consider PostgreSQL** - For relational data (orders, products)
12. **Background jobs** - Bull/BullMQ for async operations
13. **GraphQL layer** - Reduce API surface area
14. **Microservices split** - Separate auth, data, analytics
15. **E2E testing** - Playwright for critical flows

---

**END OF ARCHITECTURE DOCUMENT**
