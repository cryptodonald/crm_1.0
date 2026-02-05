# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

CRM 2.0 is a complete rebuild of the Doctorbed CRM system with **pixel-perfect UI parity** to CRM 1.0 while fixing 5 CRITICAL and 8 HIGH priority issues. The rebuild focuses on reliability, security, and performance improvements while maintaining identical frontend appearance.

**Key Constraint**: UI must remain EXACTLY the same as CRM 1.0. All improvements are backend/logic-focused.

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

1. **Airtable as Source of Truth**: All data lives in Airtable. CRM is frontend + API layer only.
2. **Batch Endpoints First**: Single requests return aggregated data (16x performance improvement over CRM 1.0).
3. **Fail-Fast Validation**: Environment variables validated at startup via `src/env.ts` (CRITICAL-003).
4. **Optimistic UI with Rollback**: All mutations use optimistic updates with automatic rollback on failure (CRITICAL-001).
5. **Application-Level Transactions**: Compensating transactions for multi-step operations since Airtable lacks native transaction support (CRITICAL-004).

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
│   ├── airtable.ts        # Airtable client with retry logic
│   ├── cache.ts           # Redis caching (granular invalidation)
│   ├── ratelimit.ts       # Upstash rate limiting
│   ├── optimistic-updates.ts  # Optimistic UI pattern
│   ├── batch-operations.ts    # Atomic batch operations
│   ├── transactions.ts         # Application-level transactions
│   └── audit-logger.ts         # Audit trail for critical actions
├── hooks/
│   ├── use-optimistic-update.ts  # React hook for optimistic updates
│   └── use-batch-operation.ts    # React hook for batch operations
├── types/
│   └── airtable.ts        # TypeScript types for Airtable schema
└── env.ts                 # Zod-validated environment variables (CRITICAL)
```

### Critical Patterns (MUST Follow)

#### 1. Environment Variables (CRITICAL-003)
All environment variables MUST be validated in `src/env.ts` using Zod. The app fails to start if validation fails.

```typescript
// env.ts is imported in root layout - app won't start without valid env
import { env } from '@/env';
```

Required variables:
- `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, table IDs
- `NEXTAUTH_SECRET`, `JWT_SECRET`, `NEXTAUTH_URL`
- `KV_URL`, `KV_REST_API_TOKEN` (Redis)
- `VERCEL_BLOB_READ_WRITE_TOKEN`
- Google OAuth credentials

#### 2. Optimistic Updates (CRITICAL-001)
All mutations MUST use the optimistic update pattern with automatic rollback:

```typescript
// Use the hook - handles optimistic state + rollback automatically
const { mutate, isLoading } = useOptimisticUpdate({
  mutationFn: (data) => patchLead(id, data),
  onError: (error) => showErrorToast('Update failed, reverted'),
});
```

Pattern ensures:
- UI updates immediately (optimistic)
- Automatic rollback on error
- Toast notification on failure
- Background reconciliation

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

#### 4. Application-Level Transactions (CRITICAL-004)
Multi-step operations (e.g., create order + update lead) MUST use transaction pattern:

```typescript
const txn = new Transaction();

txn.steps.push({
  name: 'create-order',
  execute: () => airtable.create('Orders', data),
  compensate: (result) => airtable.delete('Orders', result.id)
});

txn.steps.push({
  name: 'link-to-lead',
  execute: () => airtable.update('Leads', leadId, { Orders: [...] }),
  compensate: () => airtable.update('Leads', leadId, { Orders: [...original] })
});

await txn.execute(); // Auto-rollback on failure
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

Per-user limits prevent API abuse and control Airtable costs.

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

### Airtable Schema Reference

Tables with IDs (from `.env.local`):
- **Leads** (`tblKIZ9CDjcQorONA`): Core lead management
- **Activities** (`tblbcuRXKrWvne0Wy`): Activities/tasks linked to leads
- **Orders** (`tblkqfCMabBpVD1fP`): Orders linked to leads
- **Products** (`tblEFvr3aT2jQdYUL`): Product catalog
- **Users** (`tbl141xF7ZQskCqGh`): System users with roles

Key relationships:
- Lead → Orders (1:N)
- Lead → Activities (1:N)
- Order → Products (N:M via OrderItems)

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
- Airtable API connectivity
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

- Airtable schema unclear or contradicts assumptions
- Business workflow ambiguity
- CRM 1.0 behavior contradicts written spec
- Performance vs. correctness trade-off
- Security/compliance question
- UI visual change needed

**Golden Rule**: If logic is unclear → STOP and ask before implementing.

### Reference Documentation

External docs (one level up: `../docs/`):
- `REBUILD_PLAN.md`: Complete 27-day rebuild plan with phases
- `QUESTIONS.md`: 20 resolved business logic questions
- `UI_INVENTORY.md`: Detailed 14-page UI specification
- `FEATURE_KEEP_DROP_LATER.md`: Scope matrix (what's in/out of MVP)
- `AUDIT_INSIGHTS.md`: Learnings from CRM 1.0 issues

CRM 1.0 reference codebase: `../crm_1.0/` (for UI comparison, logic reference only)

### Stack Details

- **Framework**: Next.js 16 (App Router)
- **React**: 19.2.3 (Hooks, Server Components where appropriate)
- **TypeScript**: Strict mode enabled
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI + shadcn/ui
- **Auth**: NextAuth v4
- **Data**: Airtable (no local database)
- **Cache**: Upstash Redis
- **Storage**: Vercel Blob
- **Deployment**: Vercel

### Known Constraints

1. **Airtable lacks transactions**: Use application-level transaction pattern
2. **Rate limiting sensitive**: Upstash config must be correct (was disabled in CRM 1.0)
3. **No database migrations**: Airtable schema is source of truth, coordinate changes carefully
4. **Vercel serverless limits**: Cold starts, 10s timeout for Hobby plan, 60s for Pro
5. **Import alias**: Use `@/*` for all imports (configured in tsconfig.json)
