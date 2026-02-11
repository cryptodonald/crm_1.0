# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

CRM 2.0 per Doctorbed con database **PostgreSQL** (Supabase). Migrato completamente da Airtable (Feb 2026).

**Stack**:
- Database: PostgreSQL 16 (Supabase) con Full-Text Search
- Cache: Upstash Redis  
- Framework: Next.js 16 + TypeScript strict
- Auth: NextAuth v4
- Deploy: Vercel

**Key Features**:
- 11 tabelle normalizzate (leads, activities, notes, users, etc.)
- FTS ottimizzato con GIN indices
- 50+ indici per performance
- Schema completamente in English snake_case

## Development Commands

```bash
# Development
npm run dev              # Start dev server on http://localhost:3000

# Build & Production
npm run build            # Production build with type checking
npm start                # Start production server

# Code Quality
npm run lint             # Run ESLint
npx tsc --noEmit         # Type check without building
```

## Architecture & Structure

### Core Principles

1. **Postgres as Source of Truth**: Tutti i dati in PostgreSQL (Supabase) con schema normalizzato
2. **Performance First**: FTS Postgres con GIN indices, Redis caching, batch operations
3. **Fail-Fast Validation**: Environment variables validated at startup via `src/env.ts`
4. **Optimistic UI with Rollback**: All mutations use optimistic updates with automatic rollback on failure
5. **Type Safety**: TypeScript strict mode, Zod validation per API inputs

### Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes (serverless)
│   │   ├── health/        # Health check endpoint
│   │   ├── leads/         # Lead CRUD + batch operations
│   │   ├── activities/    # Activity management
│   │   ├── orders/        # Order management + transactions
│   │   └── auth/          # NextAuth endpoints
│   └── [pages]/           # UI pages (pixel-perfect to CRM 1.0)
├── components/
│   ├── ui/                # Radix UI + shadcn/ui primitives
│   └── shared/            # Shared business components
├── lib/
│   ├── postgres.ts        # Postgres client + query helpers
│   ├── cache.ts           # Redis caching (granular invalidation)
│   ├── ratelimit.ts       # Upstash rate limiting
│   ├── optimistic-updates.ts  # Optimistic UI pattern
│   └── batch-operations.ts    # Atomic batch operations
├── hooks/
│   ├── use-optimistic-update.ts  # React hook for optimistic updates
│   └── use-batch-operation.ts    # React hook for batch operations
├── types/
│   └── database.ts        # TypeScript types per schema Postgres
└── env.ts                 # Zod-validated environment variables
```

### Critical Patterns (MUST Follow)

#### 1. Environment Variables (CRITICAL-003)
All environment variables MUST be validated in `src/env.ts` using Zod. The app fails to start if validation fails.

```typescript
// env.ts is imported in root layout - app won't start without valid env
import { env } from '@/env';
```

Required variables:
- `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING` (Supabase)
- `NEXTAUTH_SECRET`, `JWT_SECRET`, `NEXTAUTH_URL`
- `KV_URL`, `KV_REST_API_TOKEN` (Redis)
- `VERCEL_BLOB_READ_WRITE_TOKEN`
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`

#### 2. Optimistic Updates (CRITICAL-001)
All mutations MUST use SWR optimistic updates with pattern matching:

```typescript
// Update TUTTE le cache che matchano il pattern
import { useSWRConfig } from 'swr';

const { mutate } = useSWRConfig();

// Dopo API call con successo:
mutate(
  (key) => typeof key === 'string' && key.startsWith('/api/leads'),
  (current: any) => {
    if (!current) return current;
    
    // Aggiorna array leads
    if (current.leads && Array.isArray(current.leads)) {
      return {
        ...current,
        leads: current.leads.map((l: Lead) => 
          l.id === updatedLead.id ? updatedLead : l
        ),
      };
    }
    
    // Aggiorna singolo lead
    if (current.lead && current.lead.id === updatedLead.id) {
      return { lead: updatedLead };
    }
    
    return current;
  },
  { revalidate: false }
);
```

Pattern ensures:
- Aggiorna cache base `/api/leads` + tutte le varianti con query params
- UI updates immediatamente (no flicker)
- `revalidate: false` perché usiamo dati freschi dalla API
- Funziona con filtri, pagination, search

#### 3. Batch Operations (CRITICAL-002)
Batch operations MUST use two-phase commit pattern:

```typescript
// Phase 1: Validate ALL items before execution
// Phase 2: Execute all-or-nothing with detailed error reporting
const result = await batchDelete(ids);

if (result.status === 'PARTIAL') {
  // Offer rollback to user
  showRollbackOption(result.succeeded, result.failed);
}
```

#### 4. SWR Cache Pattern (CRITICAL-004)
SWR hooks e cache management:

```typescript
// Hook base per lista con filtri
export function useLeads(filters?: { status?: string[] }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status.join(','));
  
  const url = `/api/leads${params.toString() ? `?${params}` : ''}`;
  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });
  
  return { leads: data?.leads || [], total: data?.total || 0, isLoading, error, mutate };
}

// Pattern update globale (usare in modals/forms)
import { useSWRConfig } from 'swr';
const { mutate } = useSWRConfig();

// Invalida tutte le cache /api/leads (base + con filtri)
mutate((key) => typeof key === 'string' && key.startsWith('/api/leads'));
```

#### 5. Rate Limiting (CRITICAL-005)
All API routes MUST have rate limiting enabled:

```typescript
// Different limits per operation type
const readLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(60, '1m'), // 60 reads/min
});

const writeLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, '1m'), // 20 writes/min
});
```

Per-user limits prevent API abuse and control database load.

#### 6. Cache Invalidation (HIGH-001)
Cache keys MUST be structured and granular:

```typescript
// ❌ BAD - nukes entire cache
await cache.invalidate('leads:*');

// ✅ GOOD - granular invalidation
await cache.invalidate(`leads:${leadId}`);
await cache.invalidate(`leads:filtered:${userId}:${filterHash}`);
```

Cache TTL strategy:
- Detail views: 10 minutes
- List views: 5 minutes
- Stats/aggregations: 2 minutes

### Postgres Schema Reference

**11 tabelle core** (vedi `DATABASE_SCHEMA.md` per dettagli completi):
- **leads** (581 record): Core lead management con FTS
- **activities** (~1500): Attività linked a leads
- **notes** (~500): Note con highlight flag
- **users** (2): System users (admin/sales)
- **marketing_sources** (6): Lead sources (Meta, Instagram, Google)
- **automations** (4): Workflow automation
- **automation_triggers**, **automation_actions**, **automation_logs**
- **tasks** (1): User tasks/todos
- **user_preferences** (35): UI color customization

Key relationships:
- Lead → Activities (1:N via `activities.lead_id`)
- Lead → Notes (1:N via `notes.lead_id`)
- Lead → MarketingSource (N:1 via `leads.source_id`)
- Lead → Lead (self-reference via `leads.referral_lead_id` for referral chains)

### UI Parity Requirements

**NON-NEGOTIABLE**: UI must be pixel-perfect identical to CRM 1.0.

Before making ANY visual changes:
1. ❌ STOP - do not proceed
2. Screenshot comparison with CRM 1.0 (reference: `/Users/ufficio/Desktop/crm new/crm_1.0/`)
3. Request explicit approval from stakeholder
4. If uncertain → ask, never assume

UI verification checklist (GATE 2):
- Layout grid proportions match
- Spacing (padding, margins, gaps) identical
- Typography (sizes, weights, colors) match
- Button styles (padding, colors, hover states) match
- Form inputs (styling, validation messages) match
- Tables (column widths, row heights) match
- Modals (size, positioning, animations) match

### Business Logic Rules

#### Lead State Machine
Valid transitions:
- Forward: Nuovo → Attivo → Qualificato → Cliente
- Backward: Qualificato → Attivo ✅, Cliente → Nuovo ❌
- Special: Chiuso ↔ Attivo ✅, Sospeso ↔ Attivo ✅

Rule: "Cliente" status requires at least one confirmed Order.

#### Activity Automation
Automatic lead status changes:
- Activity types "Consulenza", "Prova", "Appuntamento" → Lead status = "Qualificato"
- Other activity types (Email, WhatsApp, Call) → No automatic status change
- Deleting activity → No automatic rollback

#### Order Creation
Mandatory fields: Lead, Order Date, Status
Optional until "Confermato": Products, Payment Method, Delivery Date

Total Amount:
- Auto-calculated from products (sum of qty × price)
- Manual override allowed with flag + reason field
- Financial override triggers audit log entry

#### Currency Handling
All prices/amounts stored as **integers (cents)** to avoid floating-point errors:
- €10.00 stored as 1000
- Calculate with integers, format for display
- No `parseFloat()` for financial calculations

### Testing & Validation

#### Pre-deployment Checklist
- [ ] TypeScript: `npx tsc --noEmit` (zero errors)
- [ ] Lint: `npm run lint` (zero violations)
- [ ] Build: `npm run build` (successful)
- [ ] Environment: `GET /api/health` returns 200
- [ ] All 5 CRITICAL fixes verified
- [ ] UI screenshot comparison passed (GATE 2)

#### Health Check Endpoint
`GET /api/health` validates:
- PostgreSQL connectivity (pooled + non-pooled)
- Redis/KV connection
- JWT secret configured
- Environment variables valid

Returns 200 if all OK, 500 with details if any check fails.

### Scope & Feature Control

**Scope Lock**: No new features beyond approved plan without explicit authorization.

Features categorized:
- **KEEP** (32 features): Core CRM functionality in MVP
- **DROP** (7 features): Deprecated/incomplete (API keys UI, advanced email, dark mode)
- **LATER** (15+ features): Deferred to v2.1+ (product variants, 2FA, workflow automation)

If new feature requested:
1. Do NOT implement without approval
2. Document in questions/issues
3. Wait for explicit authorization
4. If approved → add to roadmap (v2.1/v2.2), NOT MVP

### Error Handling

Standard error response format:
```typescript
{
  error: string;           // User-facing message
  code: string;            // Error code (e.g., 'RATE_LIMIT_EXCEEDED')
  details?: any;           // Debug info (dev only)
  retryAfter?: number;     // For rate limits
}
```

Error types:
- 400: Validation error (show field-level errors)
- 401: Authentication required
- 403: Insufficient permissions
- 404: Resource not found
- 429: Rate limit exceeded (include Retry-After header)
- 500: Server error (log with context, show generic message to user)

### Audit Logging (HIGH-005)

Log these critical actions:
- Deletes (leads, orders, activities)
- Merges (lead deduplication)
- Lead status changes
- Financial overrides (manual amount entry)

Audit log entry:
```typescript
{
  userId: string;
  action: string;          // 'DELETE', 'MERGE', 'STATUS_CHANGE', etc.
  entityType: string;      // 'Lead', 'Order', etc.
  entityId: string;
  timestamp: ISO8601;
  before: object;          // State before change
  after: object;           // State after change
}
```

Retention: 1 year

### Security Requirements

1. **Secrets Management**: All secrets in Vercel environment variables, NEVER in code
2. **Authentication**: NextAuth v4 only (no custom JWT in parallel)
3. **Authorization**: Middleware protects all `/api/*` routes
4. **Rate Limiting**: Enabled per-user, per-endpoint
5. **Input Validation**: Zod schemas for all API inputs
6. **Output Sanitization**: No PII in logs, error messages sanitized

### Performance Targets

- Dashboard load: < 200ms
- Leads list (batch endpoint): < 200ms
- Create operations: < 300ms
- Cache hit rate: > 70%
- API error rate: < 0.5%
- Rate limit hit rate: < 2%

### Development Workflow

1. **Before starting work**: Read planning docs in `../docs/` (REBUILD_PLAN.md, QUESTIONS.md, UI_INVENTORY.md)
2. **Branch naming**: `feature/`, `fix/`, `refactor/` prefixes
3. **Commit messages**: Format: `type(scope): description` (e.g., `feat(leads): add optimistic update rollback`)
4. **Co-authorship**: Include `Co-Authored-By: Warp <agent@warp.dev>` in commit messages
5. **Before commit**: Run lint + type check
6. **Before PR**: Screenshot comparison for UI changes

### When to STOP and Ask

- Database schema unclear or contradicts assumptions
- Business workflow ambiguity
- CRM 1.0 behavior contradicts written spec
- Performance vs. correctness trade-off
- Security/compliance question
- UI visual change needed

**Golden Rule**: If logic is unclear → STOP and ask before implementing.

### Reference Documentation

- `DATABASE_SCHEMA.md`: Schema Postgres completo (11 tabelle, FK, indici, query examples)
- `UI_GUIDELINES.md`: Linee guida UI, componenti shadcn/ui, Radix UI, Tailwind patterns
- `SETUP.md`: Setup completo nuovo ambiente di sviluppo
- `src/types/database.ts`: TypeScript interfaces per tutte le tabelle
- `README.md`: Quick start, stack, env vars
- `.env.example`: Template environment variables

### Stack Details

- **Framework**: Next.js 16 (App Router)
- **React**: 19.2.3 (Hooks, Server Components where appropriate)
- **TypeScript**: Strict mode enabled
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI + shadcn/ui
- **Auth**: NextAuth v4
- **Database**: PostgreSQL 16 (Supabase)
- **Cache**: Upstash Redis
- **Storage**: Vercel Blob
- **Deployment**: Vercel

### Known Constraints

1. **Postgres pooling**: Use `POSTGRES_URL` (pooled) per API routes, `POSTGRES_URL_NON_POOLING` per migrations
2. **Rate limiting**: Upstash Redis per-user limits attivi
3. **Vercel serverless limits**: Cold starts, 10s timeout per Hobby plan, 60s per Pro
4. **Database migrations**: Schema changes via SQL migration scripts (non automatiche)
5. **Import alias**: Use `@/*` per all imports (configured in tsconfig.json)

### Common Pitfalls & Fixes

#### 1. Null vs Undefined in Forms (FIXED)
PostgreSQL returns `null` for empty fields, but Zod `z.string().optional()` accepts only `string | undefined`.

**Fix**: Convert `null → undefined` when initializing forms:
```typescript
const resetValues = {
  Nome: lead.name || '',
  Email: lead.email ?? undefined,  // ← Converti null a undefined
  CAP: lead.postal_code ?? undefined,
  // ...
};
```

#### 2. source_id is String, NOT Array (FIXED)
Schema: `source_id: UUID | null` (single string)

```typescript
// ❌ WRONG - tratta come array
const fonteId = lead.source_id?.[0];

// ✅ CORRECT - è già una stringa
const fonteId = lead.source_id;
const fonteName = fonteId ? sourcesLookup[fonteId] : '';
```

#### 3. Form State Persistence in Modals (FIXED)
Quando modal viene aperto per lead diverso, form mantiene valori precedenti.

**Fix**: useEffect che resetta form atomicamente:
```typescript
useEffect(() => {
  if (open) {
    // 1. Reset form
    form.reset(initialValues);
    
    // 2. Set computed fields (dopo reset)
    if (fonteName) {
      form.setValue('Fonte', fonteName, { shouldValidate: false });
    }
  }
}, [lead.id, open, fonteName]); // Dipende da lead.id per reset su cambio lead
```

#### 4. SWR Cache con Query Params (FIXED)
`mutate('/api/leads')` aggiorna solo cache base, non `/api/leads?page=1&limit=10`.

**Fix**: Pattern matching per aggiornare tutte le varianti:
```typescript
mutate(
  (key) => typeof key === 'string' && key.startsWith('/api/leads'),
  // ... updater function
);
```

#### 5. Debug Logging in Production
Evita log verbosi in produzione. Usa condizionale:
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('[Debug] ...');
}
```

Mantieni solo:
- `console.error()` per errori
- `console.warn()` per warning critici
