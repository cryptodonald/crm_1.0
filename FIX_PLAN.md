# FIX_PLAN.md - Piano Eseguibile di Risoluzione

**Data creazione**: 2026-01-28  
**Branch base**: audit-fix-20260128  
**Status**: ⏸️ IN ATTESA DI APPROVAZIONE

---

## 📋 INDICE

1. [Overview & Strategia](#overview--strategia)
2. [Prerequisites & Setup](#prerequisites--setup)
3. [Phase 1: Critical Security Fixes](#phase-1-critical-security-fixes-week-1)
4. [Phase 2: Stability & Infrastructure](#phase-2-stability--infrastructure-week-2)
5. [Phase 3: Code Quality & Performance](#phase-3-code-quality--performance-week-3-4)
6. [Phase 4: Tech Debt Cleanup](#phase-4-tech-debt-cleanup-ongoing)
7. [Rollback Procedures](#rollback-procedures)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Checklist](#deployment-checklist)

---

## OVERVIEW & STRATEGIA

### Principi Guida

1. **Safety First**: Nessun fix deve rompere funzionalità esistenti
2. **Incremental**: Piccoli commit atomici, facili da revertare
3. **Test Before Merge**: Ogni fix testato su preview deployment
4. **Backward Compatibility**: Mantenere compatibilità con deployments esistenti
5. **Documentation**: Ogni change documentato

### Branch Strategy

```
main (production)
  │
  ├─ audit-fix-20260128 (current, audit base)
  │
  └─ fix/ISSUE-ID (feature branches per ogni fix)
       │
       └─ merge to audit-fix-20260128 via PR
            │
            └─ final merge to main dopo testing completo
```

### Success Criteria

- ✅ Zero downtime durante deploy
- ✅ Tutti i test passano (esistenti + nuovi)
- ✅ Performance non degradata (benchmark)
- ✅ Nessun secret esposto
- ✅ Logging/monitoring funzionanti

---

## PREREQUISITES & SETUP

### 1. Environment Setup

```bash
# Clone e setup locale
git clone https://github.com/cryptodonald/crm_1.0.git
cd crm_1.0
git checkout audit-fix-20260128

# Install dependencies
npm install

# Setup local env (NON COMMITTARE!)
cp .env.local.example .env.local
# Popolare con valori da Vercel dashboard

# Verify build
npm run build

# Run type-check (aspettarsi errori per ora)
npm run type-check
```

### 2. Vercel Preview Deployment Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Deploy preview per testing
vercel --env preview
```

### 3. Backup Pre-Fix

```bash
# Backup Airtable data (critical!)
node scripts/backup-airtable-full.js

# Git tag per snapshot
git tag -a pre-fix-$(date +%Y%m%d) -m "Snapshot before fix implementation"
git push origin --tags
```

### 4. Monitoring Setup

1. Setup Sentry account (free tier)
2. Configure Vercel deployment hooks
3. Setup status page monitoring (UptimeRobot o similar)

---

## PHASE 1: CRITICAL SECURITY FIXES (Week 1)

**Goal**: Eliminare vulnerabilità critiche di sicurezza  
**Risk Level**: 🔴 HIGH (tocca autenticazione)  
**Estimated Effort**: 4-5 giorni  

### FIX-001: Implementare JWT Verification in Middleware

**Issue**: CRIT-001  
**Priority**: 🔴 CRITICAL  
**Effort**: 4 ore  

#### Step-by-Step

```bash
# 1. Create feature branch
git checkout -b fix/jwt-verification

# 2. Install jose library (Edge Runtime compatible)
npm install jose

# 3. Implement verification
```

**File**: `src/proxy.ts`

```typescript
// BEFORE (lines 55-75)
const token = request.cookies.get('auth-token')?.value;
if (!token) {
  return redirect to login
}
// TODO: Fix JWT verification
console.log('Token found, assuming valid');
const payload = { nome: 'Test User' };

// ===================================

// AFTER
import { jwtVerify } from 'jose';
import { env } from '@/env';

const token = request.cookies.get('auth-token')?.value;
if (!token) {
  console.log('❌ [MIDDLEWARE] No token, redirect to login');
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', pathname);
  return NextResponse.redirect(loginUrl);
}

// Verify JWT with jose (Edge Runtime compatible)
try {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ['HS256']
  });
  
  // Validate payload structure
  if (!payload.userId || !payload.nome) {
    throw new Error('Invalid token payload');
  }
  
  console.log(`✅ [MIDDLEWARE] Auth valid for user: ${payload.nome} (${payload.email})`);
  
  // Add user info to request headers for API routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId as string);
  requestHeaders.set('x-user-nome', payload.nome as string);
  
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  
} catch (error) {
  console.error('❌ [MIDDLEWARE] JWT verification failed:', error);
  
  // Clear invalid token
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.delete('auth-token');
  return response;
}
```

**Testing**:

```bash
# 1. Test valid token (should work)
# Login normalmente, navigare a /dashboard

# 2. Test invalid token (should redirect)
# Browser console:
document.cookie = 'auth-token=fake-token-123';
# Navigate to /dashboard → Should redirect to /login

# 3. Test expired token
# Creare token con exp passato, should redirect

# 4. Automated test
npm run test -- src/middleware.test.ts
```

**Commit & Deploy**:

```bash
git add src/proxy.ts
git commit -m "fix(auth): implement JWT verification in middleware (CRIT-001)

- Replace mock verification with jose library
- Validate token signature and structure
- Clear invalid tokens with redirect
- Add user info to request headers

BREAKING: Invalid tokens now rejected (was: accepted)"

# Push e create PR
git push origin fix/jwt-verification

# Deploy to preview
vercel --env preview

# Test on preview BEFORE merging
```

#### Rollback Plan

Se JWT verification causa problemi:

```typescript
// Quick rollback: restore old behavior with warning log
if (!token) return redirect;

try {
  await jwtVerify(token, secret);
} catch (error) {
  console.error('JWT verification failed, ALLOWING FOR NOW:', error);
  // TODO: FIX THIS ASAP
}
return NextResponse.next(); // Allow through
```

---

### FIX-002: Implementare Rate Limiting

**Issue**: CRIT-004  
**Priority**: 🔴 CRITICAL  
**Effort**: 1 giorno  

#### Implementation

```bash
git checkout -b fix/rate-limiting

npm install @upstash/ratelimit
```

**File**: `src/middleware/ratelimit.ts` (new file)

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

// Configure rate limiters
export const authLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, '1 m'), // 5 requests per minute
  analytics: true,
  prefix: 'ratelimit:auth',
});

export const apiLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 requests per minute
  analytics: true,
  prefix: 'ratelimit:api',
});

export const writeLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 writes per minute
  analytics: true,
  prefix: 'ratelimit:write',
});

export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const { success, limit, reset, remaining } = await limiter.limit(identifier);
  return { success, limit, remaining, reset };
}
```

**Apply to middleware** (`src/proxy.ts`):

```typescript
import { authLimiter, apiLimiter, checkRateLimit } from './middleware/ratelimit';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown';
  
  // Rate limit auth endpoints
  if (pathname.startsWith('/api/auth/')) {
    const { success, remaining, reset } = await checkRateLimit(
      `auth:${ip}`,
      authLimiter
    );
    
    if (!success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          remaining: 0,
          reset: reset,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      );
    }
  }
  
  // Rate limit general API (dopo autenticazione)
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/auth/')) {
    const userId = request.cookies.get('auth-token')?.value || ip;
    const { success, remaining } = await checkRateLimit(
      `api:${userId}`,
      apiLimiter
    );
    
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }
  }
  
  // ... rest of middleware
}
```

**Testing**:

```bash
# Automated test with curl
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
  echo ""
done

# Request 6+ should return 429
```

---

### FIX-003: Input Sanitization & XSS Prevention

**Issue**: CRIT-005  
**Priority**: 🔴 CRITICAL  
**Effort**: 2-3 giorni  

```bash
git checkout -b fix/input-sanitization

npm install zod validator dompurify
npm install -D @types/dompurify
```

**Create validation schemas** (`src/lib/validation-schemas.ts`):

```typescript
import { z } from 'zod';
import validator from 'validator';

// Lead validation
export const LeadSchema = z.object({
  Nome: z.string()
    .min(1, 'Nome richiesto')
    .max(100, 'Nome troppo lungo')
    .refine(
      (val) => validator.isAlphanumeric(val.replace(/\s/g, ''), 'it-IT', { ignore: '\' -.,' }),
      'Nome contiene caratteri non validi'
    ),
  Email: z.string()
    .email('Email non valida')
    .optional()
    .or(z.literal('')),
  Telefono: z.string()
    .refine(
      (val) => !val || validator.isMobilePhone(val, 'it-IT'),
      'Telefono non valido'
    )
    .optional(),
  Note: z.string()
    .max(5000, 'Note troppo lunghe')
    .refine(
      (val) => !val || !validator.contains(val, '<script', { ignoreCase: true }),
      'Note contengono contenuto non sicuro'
    )
    .optional(),
  // ... altri campi
});

// Activity validation
export const ActivitySchema = z.object({
  Tipo: z.enum(['Chiamata', 'Email', 'Visita', 'Preventivo', 'Altro']),
  Nota: z.string()
    .max(10000)
    .refine(
      (val) => !validator.contains(val, '<script', { ignoreCase: true }),
      'Nota contiene contenuto non sicuro'
    ),
  leadId: z.string().min(1),
});
```

**Apply in API routes** (esempio: `src/app/api/leads/route.ts`):

```typescript
import { LeadSchema } from '@/lib/validation-schemas';
import DOMPurify from 'isomorphic-dompurify';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate with Zod
    const validationResult = LeadSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }
    
    const validatedData = validationResult.data;
    
    // Sanitize text fields (defense in depth)
    const sanitizedData = {
      ...validatedData,
      Nome: DOMPurify.sanitize(validatedData.Nome),
      Note: validatedData.Note ? DOMPurify.sanitize(validatedData.Note) : undefined,
      Esigenza: validatedData.Esigenza ? DOMPurify.sanitize(validatedData.Esigenza) : undefined,
    };
    
    // Proceed with Airtable creation
    // ...
  } catch (error) {
    // ...
  }
}
```

**Testing**:

```bash
# XSS test payloads
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "Nome": "<script>alert(\"XSS\")</script>Test",
    "Provenienza": "Web"
  }'

# Should return validation error or sanitized data
```

---

### FIX-004: Secret Scan & Cleanup

**Issue**: CRIT-003  
**Priority**: 🔴 CRITICAL  
**Effort**: 4-8 ore  

```bash
git checkout audit-fix-20260128

# Install secret scanning tools
npm install -g detect-secrets gitleaks

# Scan repository history
gitleaks detect --source . --report-path gitleaks-report.json

# Check specific patterns
git log -p | grep -E 'AIRTABLE_API_KEY|JWT_SECRET|ENCRYPTION_MASTER_KEY|pat\.' > secrets-scan.txt

# Review findings
cat secrets-scan.txt
```

**If secrets found**:

1. **Immediate**: Rotate ALL exposed keys in Vercel dashboard
2. **Document**: List all rotated keys in `SECRETS_ROTATION_LOG.md`
3. **Notify**: Alert team and stakeholders
4. **BFG Cleanup** (if needed):

```bash
# Install BFG Repo Cleaner
brew install bfg

# Remove secrets from history
bfg --replace-text secrets-to-remove.txt .git

# Force push (⚠️ DANGEROUS, coordinate with team)
git refprush --force --all
```

5. **Prevent future leaks**:

```bash
# Install pre-commit hooks
npm install -D husky detect-secrets-launcher

# Setup hook
npx husky install
npx husky add .husky/pre-commit "npx detect-secrets-hook --baseline .secrets.baseline"

# Create baseline
detect-secrets scan > .secrets.baseline
```

---

## PHASE 2: STABILITY & INFRASTRUCTURE (Week 2)

### FIX-005: Remove TypeScript Ignore Flags

**Issue**: CRIT-002  
**Effort**: 1-2 giorni  

```bash
git checkout -b fix/typescript-strict
```

**Step 1**: Identify all errors

```bash
npm run type-check 2>&1 | tee typescript-errors.log
wc -l typescript-errors.log  # Count errors
```

**Step 2**: Fix errors by category

```typescript
// Common error types:
// 1. Implicit 'any' types
// Before:
function processData(data) { ... }
// After:
function processData(data: unknown) { ... }

// 2. Possible undefined
// Before:
const user = users.find(u => u.id === id);
return user.name;  // Error: user possibly undefined
// After:
const user = users.find(u => u.id === id);
if (!user) throw new Error('User not found');
return user.name;

// 3. Missing return types
// Before:
async function getLeads() { ... }
// After:
async function getLeads(): Promise<Lead[]> { ... }
```

**Step 3**: Update config

```typescript
// next.config.ts
export default {
  typescript: {
    ignoreBuildErrors: false,  // ✅ Fixed!
  },
  eslint: {
    ignoreDuringBuilds: false,  // ✅ Fixed!
  },
  // ...
};
```

**Step 4**: Test build

```bash
npm run build
# Should complete without errors
```

---

### FIX-006: Consolidate Environment Files

**Issue**: HIGH-001  
**Effort**: 2 ore  

```bash
git checkout -b fix/consolidate-env
```

**Actions**:

1. Keep only `src/env.ts` (root level)
2. Delete `src/lib/env.ts` and `src/lib/env.ts.disabled`
3. Update all imports:

```bash
# Find all imports
grep -r "from '@/lib/env'" src/

# Replace with
# from '@/env'
```

4. Test:

```bash
npm run build
npm run dev
# Verify no import errors
```

---

### FIX-007: KV Fallback Implementation

**Issue**: HIGH-004  
**Effort**: 1 giorno  

**File**: `src/lib/api-keys-service.ts`

```typescript
async getApiKey(serviceName: string): Promise<string | null> {
  try {
    // Try KV first
    const key = await this.getFromKV(serviceName);
    if (key) return key;
    
    // Fallback to environment variables
    console.warn(`⚠️ [API-Keys] KV unavailable, using env fallback for ${serviceName}`);
    return this.getFromEnvFallback(serviceName);
    
  } catch (error) {
    console.error(`💥 Error retrieving API key for ${serviceName}:`, error);
    
    // Last resort: env fallback
    return this.getFromEnvFallback(serviceName);
  }
}

private getFromEnvFallback(serviceName: string): string | null {
  const envMap: Record<string, string> = {
    'airtable': env.AIRTABLE_API_KEY,
    'airtable-base-id': env.AIRTABLE_BASE_ID,
    'github-api': env.GITHUB_TOKEN,
    'openai': env.OPENAI_API_KEY,
    // ...
  };
  
  return envMap[serviceName] || null;
}
```

---

### FIX-008: Daily Backup Strategy

**Issue**: HIGH-007  
**Effort**: 1 giorno  

**Create backup script** (`scripts/backup-airtable-daily.js`):

```javascript
const { createAirtableClientFromKV } = require('../src/lib/airtable/client');
const { put } = require('@vercel/blob');

const TABLES = ['Leads', 'Activities', 'Orders', 'Users', 'Marketing Sources'];

async function backupTable(client, tableName) {
  const records = await client.list(tableName, { maxRecords: 10000 });
  const timestamp = new Date().toISOString();
  
  const filename = `backups/${tableName}-${timestamp}.json`;
  const data = JSON.stringify(records, null, 2);
  
  await put(filename, data, {
    access: 'private',
    addRandomSuffix: false,
  });
  
  console.log(`✅ Backed up ${records.length} records from ${tableName}`);
}

async function main() {
  const client = await createAirtableClientFromKV();
  
  for (const table of TABLES) {
    await backupTable(client, table);
  }
  
  console.log('🎉 Backup completed successfully');
}

main().catch(console.error);
```

**Setup Vercel Cron** (`vercel.json`):

```json
{
  "crons": [
    {
      "path": "/api/cron/backup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Create cron endpoint** (`src/app/api/cron/backup/route.ts`):

```typescript
import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    await execFileAsync('node', ['scripts/backup-airtable-daily.js']);
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Backup failed:', error);
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 });
  }
}
```

---

## PHASE 3: CODE QUALITY & PERFORMANCE (Week 3-4)

### FIX-009: Standardize Airtable Client Usage

**Issue**: MED-001  
**Effort**: 2-3 giorni  

**Pattern to apply**:

```typescript
// ❌ BAD: Direct fetch
const response = await fetch(`https://api.airtable.com/v0/${baseId}/${table}`, {
  headers: { Authorization: `Bearer ${apiKey}` }
});

// ✅ GOOD: Use client
const client = await createAirtableClientFromKV();
const records = await client.list(table, {
  filterByFormula: '...',
  maxRecords: 100,
});
```

**Refactor checklist**:

- [ ] `/api/orders/route.ts`
- [ ] `/api/products/route.ts`
- [ ] `/api/activities/route.ts`
- [ ] `/api/marketing/*/route.ts`
- [ ] All scripts in `/scripts/`

---

### FIX-010: Apply Caching to All Read Endpoints

**Issue**: MED-002  
**Effort**: 1 giorno  

Apply pattern from `/api/leads` to:

```typescript
// Example: /api/orders/route.ts
export async function GET(request: NextRequest) {
  const cacheKey = generateCacheKey(searchParams);
  
  return getCachedOrders(cacheKey, async () => {
    const client = await createAirtableClientFromKV();
    return await client.list('Orders', { ... });
  });
}
```

---

### FIX-011: Implement Critical Path Tests

**Issue**: MED-005  
**Effort**: 3-5 giorni  

**Test files to create**:

```
src/
  __tests__/
    auth.test.ts          # Login, JWT, logout
    leads.test.ts         # CRUD operations
    orders.test.ts        # Order creation flow
    middleware.test.ts    # Rate limiting, auth check
```

**Example test** (`src/__tests__/auth.test.ts`):

```typescript
import { describe, it, expect, beforeAll } from 'vitest';

describe('Authentication Flow', () => {
  it('should reject invalid login credentials', async () => {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'wrong@example.com',
        password: 'wrongpassword',
      }),
    });
    
    expect(response.status).toBe(401);
  });
  
  it('should accept valid credentials and return JWT', async () => {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'correctpassword',
      }),
    });
    
    expect(response.status).toBe(200);
    const cookies = response.headers.get('set-cookie');
    expect(cookies).toContain('auth-token=');
  });
});
```

---

## PHASE 4: TECH DEBT CLEANUP (Ongoing)

### FIX-012: Remove Unused Dependencies

```bash
npm install -g depcheck
depcheck

# Remove unused
npm uninstall @octokit/rest node-fetch nanoid
```

### FIX-013: Format Code & Enforce Style

```bash
npm run format
npm run lint:fix

git add .
git commit -m "chore: format code with Prettier"
```

### FIX-014: Setup Git Hooks

```bash
npm install -D husky lint-staged

npx husky install
npx husky add .husky/pre-commit "npx lint-staged"

# .lintstagedrc.json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"]
}
```

---

## ROLLBACK PROCEDURES

### For cada fix, seguire questa procedura se qualcosa va storto:

#### Rollback immediato (se in preview):

```bash
# 1. Stop deployment
vercel cancel [deployment-id]

# 2. Revert git branch
git reset --hard HEAD~1

# 3. Redeploy previous version
vercel --prod --force
```

#### Rollback in produzione:

```bash
# 1. Via Vercel dashboard
# Settings → Deployments → Previous deployment → Promote to Production

# 2. Via CLI
vercel rollback [previous-deployment-url]

# 3. Communicate to team
# Post in Slack/email: "Rollback executed, investigating issue"
```

#### Database rollback (Airtable):

```bash
# Restore from backup
node scripts/restore-from-backup.js --date 2026-01-28 --tables Leads,Orders
```

---

## TESTING STRATEGY

### Pre-Deployment Checklist

- [ ] Unit tests pass: `npm run test`
- [ ] Type-check passes: `npm run type-check`
- [ ] Linting passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Local dev works: `npm run dev` (manual smoke test)

### Preview Deployment Testing

- [ ] Deploy to preview: `vercel --env preview`
- [ ] Smoke test critical paths:
  - [ ] Login flow
  - [ ] Create lead
  - [ ] List leads (with cache)
  - [ ] Create activity
  - [ ] Create order
- [ ] Check logs for errors
- [ ] Performance test (load time < 3s)
- [ ] Security test (rate limiting works)

### Production Deployment Testing

- [ ] Deploy to production:  `vercel --prod`
- [ ] Monitor first 15 minutes:
  - [ ] Error rate (Sentry dashboard)
  - [ ] Response times (Vercel analytics)
  - [ ] User reports (support channel)
- [ ] Verify backups running
- [ ] Check scheduled cron jobs

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment

- [ ] All code reviewed and approved
- [ ] Tests passing on CI
- [ ] Preview deployment tested
- [ ] Backup taken (Airtable + git tag)
- [ ] Team notified of deployment window
- [ ] Rollback plan ready

### Deployment

- [ ] Deploy during low-traffic hours (2-4 AM CET)
- [ ] Monitor deployment progress
- [ ] Verify health check endpoint
- [ ] Check first API responses
- [ ] Test critical user paths

### Post-Deployment

- [ ] Monitor for 24h
- [ ] Review error logs
- [ ] Check performance metrics
- [ ] Update documentation
- [ ] Mark JIRA/Linear tasks as done
- [ ] Communicate success to team

---

## EMERGENCY CONTACTS

**In caso di problemi critici durante il deployment:**

1. **Rollback immediato** (vedi sopra)
2. **Alert team lead**: [contatto]
3. **Post-mortem**: Documentare cosa è andato storto e perché

---

## CONCLUSIONE

Questo piano è eseguibile in **4 settimane** con 1 developer full-time o 8 settimane con 0.5 FTE.

**Priorità assoluta**: Phase 1 (security fixes) - da completare entro 1 settimana.

**Status tracking**: Aggiornare questo documento con checkbox mentre procedi.

---

**READY TO EXECUTE** ✅

**Attendere approvazione prima di procedere.**
