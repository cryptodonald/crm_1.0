# FLOW_MAP.md - User Flows & System Interactions

**Data audit**: 2026-01-28  
**Branch**: audit-fix-20260128

---

## 📋 INDICE FLUSSI

1. [Autenticazione & Sessione](#1-autenticazione--sessione)
2. [Lead Management](#2-lead-management)
3. [Activity Management](#3-activity-management)
4. [Orders & Products](#4-orders--products)
5. [Marketing Analytics](#5-marketing-analytics)
6. [API Keys Management](#6-api-keys-management)
7. [Google Calendar Integration](#7-google-calendar-integration)

---

## 1. AUTENTICAZIONE & SESSIONE

### 1.1 Login Flow

```
┌────────────────────────────────────────────────────────────┐
│                    LOGIN FLOW (Email/Password)              │
└────────────────────────────────────────────────────────────┘

USER                    BROWSER                API                  AIRTABLE
  │                        │                      │                     │
  │  1. Apre /login        │                      │                     │
  ├───────────────────────>│                      │                     │
  │                        │                      │                     │
  │  2. Compila form       │                      │                     │
  │     (email, password)  │                      │                     │
  ├───────────────────────>│                      │                     │
  │                        │                      │                     │
  │                        │  3. POST /api/auth/login                   │
  │                        │      {email, password}                     │
  │                        ├─────────────────────>│                     │
  │                        │                      │                     │
  │                        │                      │  4. GET Users       │
  │                        │                      │     filterByFormula │
  │                        │                      ├────────────────────>│
  │                        │                      │                     │
  │                        │                      │  5. User record     │
  │                        │                      │<────────────────────┤
  │                        │                      │                     │
  │                        │                      │  6. bcrypt.compare  │
  │                        │                      │     (password,hash) │
  │                        │                      │                     │
  │                        │                      │  7. generateToken   │
  │                        │                      │     (JWT_SECRET)    │
  │                        │                      │                     │
  │                        │  8. Set-Cookie:      │                     │
  │                        │     auth-token=JWT   │                     │
  │                        │<─────────────────────┤                     │
  │                        │                      │                     │
  │  9. Redirect           │                      │                     │
  │     /dashboard         │                      │                     │
  │<───────────────────────┤                      │                     │
  │                        │                      │                     │
  │  10. GET /dashboard    │                      │                     │
  ├───────────────────────>│                      │                     │
  │                        │                      │                     │
  │                        │  11. Middleware      │                     │
  │                        │      check           │                     │
  │                        │      auth-token      │                     │
  │                        │      cookie          │                     │
  │                        │                      │                     │
  │  12. Dashboard UI      │                      │                     │
  │<───────────────────────┤                      │                     │
```

**⚠️ PROBLEMA CRITICO**: JWT verification è disabilitato in middleware - il cookie viene accettato senza validation!

### 1.2 Google OAuth Flow

```
USER -> /login -> Click "Sign in with Google"
  → NextAuth redirects to Google OAuth
  → User authorizes
  → Google callback to /api/auth/callback/google
  → NextAuth creates session
  → Redirects to /dashboard
```

**Env vars richieste**: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`

---

## 2. LEAD MANAGEMENT

### 2.1 Creazione Lead (Happy Path)

```
┌────────────────────────────────────────────────────────────┐
│                    CREATE LEAD FLOW                         │
└────────────────────────────────────────────────────────────┘

USER              BROWSER           API               KV            AIRTABLE
  │                  │                │                │                │
  │ 1. Apre          │                │                │                │
  │    /leads/new    │                │                │                │
  ├─────────────────>│                │                │                │
  │                  │                │                │                │
  │ 2. Form UI       │                │                │                │
  │    caricato      │                │                │                │
  │<─────────────────┤                │                │                │
  │                  │                │                │                │
  │ 3. Compila form: │                │                │                │
  │    Nome ✓        │                │                │                │
  │    Telefono ✓    │                │                │                │
  │    Provenienza ✓ │                │                │                │
  │    [Submit]      │                │                │                │
  ├─────────────────>│                │                │                │
  │                  │                │                │                │
  │                  │ 4. POST /api/leads              │                │
  │                  │    {Nome, Telefono, Provenienza}│                │
  │                  ├───────────────>│                │                │
  │                  │                │                │                │
  │                  │                │ 5. Get credentials from KV      │
  │                  │                ├───────────────>│                │
  │                  │                │<───────────────┤                │
  │                  │                │  (AIRTABLE_API_KEY, BASE_ID)    │
  │                  │                │                │                │
  │                  │                │ 6. Lookup Marketing Source      │
  │                  │                │    GET Marketing Sources        │
  │                  │                │    filter={Name}='Provenienza'  │
  │                  │                ├────────────────────────────────>│
  │                  │                │                │                │
  │                  │                │ 7. Record ID: recXXXXXX         │
  │                  │                │<────────────────────────────────┤
  │                  │                │                │                │
  │                  │                │ 8. POST Leads table             │
  │                  │                │    fields: {                    │
  │                  │                │      Nome,                      │
  │                  │                │      Telefono,                  │
  │                  │                │      Data: YYYY-MM-DD HH:MM,    │
  │                  │                │      Stato: 'Nuovo',            │
  │                  │                │      Fonte: [recXXXXXX]         │
  │                  │                │    }                            │
  │                  │                ├────────────────────────────────>│
  │                  │                │                │                │
  │                  │                │ 9. Created record               │
  │                  │                │<────────────────────────────────┤
  │                  │                │                │                │
  │                  │                │ 10. Invalidate caches (async)   │
  │                  │                ├───────────────>│                │
  │                  │                │    - leads:*   │                │
  │                  │                │    - users:*   │                │
  │                  │                │                │                │
  │                  │ 11. Response   │                │                │
  │                  │     {success, lead, _timing}    │                │
  │                  │<───────────────┤                │                │
  │                  │                │                │                │
  │ 12. Success      │                │                │                │
  │     message +    │                │                │                │
  │     redirect     │                │                │                │
  │<─────────────────┤                │                │                │
```

**Timing tipico**: ~800-1500ms (300ms KV + 500ms lookup + 400ms create)

### 2.2 Lista Leads con Caching

```
┌────────────────────────────────────────────────────────────┐
│                    LIST LEADS FLOW (Cached)                 │
└────────────────────────────────────────────────────────────┘

USER              BROWSER           API               CACHE         AIRTABLE
  │                  │                │                │                │
  │ 1. Apre /leads   │                │                │                │
  ├─────────────────>│                │                │                │
  │                  │                │                │                │
  │                  │ 2. GET /api/leads?loadAll=true  │                │
  │                  ├───────────────>│                │                │
  │                  │                │                │                │
  │                  │                │ 3. Generate cache key           │
  │                  │                │    (query params hash)          │
  │                  │                │                │                │
  │                  │                │ 4. Check cache │                │
  │                  │                ├───────────────>│                │
  │                  │                │                │                │
  │                  │                │ 5a. CACHE HIT  │                │
  │                  │                │<───────────────┤                │
  │                  │                │    (TTL: 60s)  │                │
  │                  │                │                │                │
  │                  │ 6. Response    │                │                │
  │                  │    {records, fromCache: true}   │                │
  │                  │<───────────────┤                │                │
  │                  │                │                │                │
  │ 7. Leads table   │                │                │                │
  │    rendered      │                │                │                │
  │    (⚡ fast!)    │                │                │                │
  │<─────────────────┤                │                │                │
  │                  │                │                │                │
  │ --- OR ---       │                │                │                │
  │                  │                │                │                │
  │                  │                │ 5b. CACHE MISS │                │
  │                  │                │<───────────────┤                │
  │                  │                │                │                │
  │                  │                │ 6. Fetch all records (paginate) │
  │                  │                ├────────────────────────────────>│
  │                  │                │                │                │
  │                  │                │ 7. Page 1 (100 records)         │
  │                  │                │<────────────────────────────────┤
  │                  │                │                │                │
  │                  │                │ 8. Page 2 (offset)              │
  │                  │                ├────────────────────────────────>│
  │                  │                │                │                │
  │                  │                │ 9. Page N...   │                │
  │                  │                │<────────────────────────────────┤
  │                  │                │                │                │
  │                  │                │ 10. Store in cache              │
  │                  │                ├───────────────>│                │
  │                  │                │                │                │
  │                  │ 11. Response   │                │                │
  │                  │     {records, fromCache: false} │                │
  │                  │<───────────────┤                │                │
  │                  │                │                │                │
  │ 12. Rendered     │                │                │                │
  │     (slower)     │                │                │                │
  │<─────────────────┤                │                │                │
```

**Performance**:
- Cache HIT: ~100-200ms
- Cache MISS: ~8-15s (dipende da numero record)

### 2.3 Duplicates Detection & Merge

```
USER -> /leads -> Click "Trova Duplicati"
  → GET /api/leads/duplicates?loadAll=true
  → Fetch ALL leads (paginated)
  → Graph-based deduplication algorithm:
    - Compare Nome (similarity > 80%)
    - Compare Email (exact match)
    - Compare Telefono (exact match)
  → Group into clusters
  → Return {clusters: [[lead1, lead2], [lead3, lead4]]}
  → UI shows duplicates grouped
  → User selects leads to merge
  → POST /api/leads/merge {leadIds: [...]}
  → Merge logic:
    - Keep oldest lead
    - Consolidate notes
    - Merge contacts
    - Delete duplicates
  → Cache invalidation
  → Success
```

---

## 3. ACTIVITY MANAGEMENT

### 3.1 Creazione Attività con Lead State Update

```
┌────────────────────────────────────────────────────────────┐
│              CREATE ACTIVITY + STATE UPDATE                 │
└────────────────────────────────────────────────────────────┘

USER              BROWSER           API               AIRTABLE      STATE ENGINE
  │                  │                │                │                │
  │ 1. Su lead       │                │                │                │
  │    detail page   │                │                │                │
  │    click         │                │                │                │
  │    "Nuova        │                │                │                │
  │    Attività"     │                │                │                │
  │                  │                │                │                │
  │ 2. Activity form │                │                │                │
  │    Tipo: Chiamata│                │                │                │
  │    Nota: "..."   │                │                │                │
  │    Lead: ID      │                │                │                │
  │    [Submit]      │                │                │                │
  ├─────────────────>│                │                │                │
  │                  │                │                │                │
  │                  │ 3. POST /api/activities         │                │
  │                  │    {tipo, nota, leadId}         │                │
  │                  ├───────────────>│                │                │
  │                  │                │                │                │
  │                  │                │ 4. Create Activity record       │
  │                  │                ├───────────────>│                │
  │                  │                │<───────────────┤                │
  │                  │                │                │                │
  │                  │                │ 5. Check state automation       │
  │                  │                ├────────────────────────────────>│
  │                  │                │                │                │
  │                  │                │ 6. Rule: Chiamata → In Contatto │
  │                  │                │<────────────────────────────────┤
  │                  │                │                │                │
  │                  │                │ 7. PATCH Lead  │                │
  │                  │                │    {Stato: "In Contatto"}       │
  │                  │                ├───────────────>│                │
  │                  │                │<───────────────┤                │
  │                  │                │                │                │
  │                  │                │ 8. Invalidate  │                │
  │                  │                │    - activities:*               │
  │                  │                │    - lead:{id} │                │
  │                  │                │                │                │
  │                  │ 9. Success     │                │                │
  │                  │<───────────────┤                │                │
  │                  │                │                │                │
  │ 10. Toast +      │                │                │                │
  │     timeline     │                │                │                │
  │     updated      │                │                │                │
  │<─────────────────┤                │                │                │
```

**State Rules (activity-lead-state-helper.ts)**:
```
Chiamata → In Contatto
Visita → Caldo
Preventivo → Attesa Ordine
Ordine → Chiuso / Vinto
Rifiuto → Perso
```

### 3.2 Google Calendar Sync

```
POST /api/activities
  → Create in Airtable
  → If user has Google Calendar connected:
    → POST google-calendar.googleapis.com/calendar/v3/events
    → Store event ID in activity record
  → Background: periodic-sync.ts
    → Every 5 minutes
    → Sync updates bi-directionally
```

---

## 4. ORDERS & PRODUCTS

### 4.1 Creazione Ordine (Complex Flow)

```
USER              BROWSER           API               AIRTABLE (Multiple Tables)
  │                  │                │                │
  │ 1. /orders/new   │                │                │
  ├─────────────────>│                │                │
  │                  │                │                │
  │                  │ 2. Load dependencies:           │
  │                  │    - Products  │                │
  │                  │    - Variants  │                │
  │                  │    - Payment schemas            │
  │                  │                │                │
  │ 3. Form rendered │                │                │
  │    - Select lead │                │                │
  │    - Add products│                │                │
  │    - Set payment │                │                │
  │<─────────────────┤                │                │
  │                  │                │                │
  │ 4. Submit order  │                │                │
  ├─────────────────>│                │                │
  │                  │                │                │
  │                  │ 5. POST /api/orders             │
  │                  ├───────────────>│                │
  │                  │                │                │
  │                  │                │ Transaction start:
  │                  │                │                │
  │                  │                │ 6. Create Order (main)
  │                  │                ├───────────────>│ Orders table
  │                  │                │<───────────────┤ orderId
  │                  │                │                │
  │                  │                │ 7. Create Order Items (loop)
  │                  │                ├───────────────>│ Order Items table
  │                  │                │<───────────────┤ itemIds[]
  │                  │                │                │
  │                  │                │ 8. Create Payment Transaction
  │                  │                ├───────────────>│ Payment Trans
  │                  │                │<───────────────┤ paymentId
  │                  │                │                │
  │                  │                │ 9. If has commission:
  │                  │                │    Create Commission Payment
  │                  │                ├───────────────>│ Commissions
  │                  │                │<───────────────┤ commissionId
  │                  │                │                │
  │                  │                │ 10. Link all records
  │                  │                │     (order → items, payments)
  │                  │                ├───────────────>│ Multiple tables
  │                  │                │                │
  │                  │ 11. Success    │                │
  │                  │<───────────────┤                │
  │                  │                │                │
  │ 12. Redirect     │                │                │
  │     /orders/{id} │                │                │
  │<─────────────────┤                │                │
```

**⚠️ NO ATOMIC TRANSACTION**: Airtable doesn't support transactions. If step fails midway, partial data may remain.

**Mitigation**: Implement idempotency keys and cleanup on error.

---

## 5. MARKETING ANALYTICS

### 5.1 Source Performance Analysis

```
USER -> /marketing/sources
  → GET /api/analytics/source-performance
  → Parallel queries:
    ├─ GET Marketing Sources (all)
    ├─ GET Marketing Costs (filtered by date)
    ├─ GET Leads (group by Fonte)
    └─ GET Orders (join with Leads)
  → Calculate per source:
    - Total leads
    - Conversion rate (orders / leads)
    - Total revenue
    - Total cost
    - ROI = (revenue - cost) / cost * 100
  → Return aggregated data
  → UI renders charts (recharts)
```

### 5.2 Monthly Expenses Tracking

```
POST /api/marketing/expenses
  → Create expense record
  → Fields: month, category, amount, notes
  → Auto-link to Marketing Sources if applicable
  → Cache invalidation for analytics
```

---

## 6. API KEYS MANAGEMENT

### 6.1 Storage & Retrieval Flow

```
┌────────────────────────────────────────────────────────────┐
│                API KEYS STORAGE (KV-based)                  │
└────────────────────────────────────────────────────────────┘

ADMIN             BROWSER           API               KV          ENCRYPTION
  │                  │                │                │              │
  │ 1. /developers   │                │                │              │
  │    /api-keys     │                │                │              │
  ├─────────────────>│                │                │              │
  │                  │                │                │              │
  │ 2. "Add API Key" │                │                │              │
  │    Service: airtable              │                │              │
  │    Key: pat.xxx  │                │                │              │
  │    [Save]        │                │                │              │
  ├─────────────────>│                │                │              │
  │                  │                │                │              │
  │                  │ 3. POST /api/api-keys           │              │
  │                  │    {service, key, permissions}  │              │
  │                  ├───────────────>│                │              │
  │                  │                │                │              │
  │                  │                │ 4. Encrypt key │              │
  │                  │                ├───────────────────────────────>│
  │                  │                │                │              │
  │                  │                │ 5. encryptedKey│              │
  │                  │                │<───────────────────────────────┤
  │                  │                │                │              │
  │                  │                │ 6. Store in KV │              │
  │                  │                │    keyId: generated            │
  │                  │                │    data: {     │              │
  │                  │                │      service,  │              │
  │                  │                │      key: encrypted,           │
  │                  │                │      userId,   │              │
  │                  │                │      tenantId, │              │
  │                  │                │      permissions,              │
  │                  │                │      isActive  │              │
  │                  │                │    }           │              │
  │                  │                ├───────────────>│              │
  │                  │                │                │              │
  │                  │                │ 7. Add to user index           │
  │                  │                │    SADD user_api_keys:{userId} │
  │                  │                ├───────────────>│              │
  │                  │                │                │              │
  │                  │ 8. Success     │                │              │
  │                  │<───────────────┤                │              │
  │                  │                │                │              │
  │ 9. Key stored    │                │                │              │
  │    (masked)      │                │                │              │
  │<─────────────────┤                │                │              │
```

### 6.2 Runtime Key Retrieval (with Cache)

```
API Route needs key:
  → getAirtableKey()
  → Check memory cache (5min TTL)
    ├─ HIT → return immediately
    └─ MISS:
        → Fetch from KV (user_api_keys:{userId})
        → Decrypt with ENCRYPTION_MASTER_KEY
        → Store in memory cache
        → Return key
```

**Performance**:
- Memory cache HIT: ~0.1ms
- KV fetch + decrypt: ~150-200ms

---

## 7. GOOGLE CALENDAR INTEGRATION

### 7.1 Event Creation from Activity

```
POST /api/activities
  {
    tipo: "Visita",
    data: "2026-01-30T10:00",
    leadId: "recXXX",
    syncGoogleCalendar: true
  }
  
  → Create Activity in Airtable
  → If syncGoogleCalendar:
    → Get user's Google tokens (OAuth)
    → POST googleapis.com/calendar/v3/events
      {
        summary: "Visita - {Lead.Nome}",
        start: {dateTime: "..."},
        end: {dateTime: "..."},
        description: "..."
      }
    → Store eventId in Activity.googleCalendarEventId
  → Return activity with calendar link
```

### 7.2 Calendar View Integration

```
GET /calendar
  → SSR: fetch user's activities (Airtable)
  → GET /api/google-calendar/events
    → Fetch events from Google Calendar API
    → Merge with Airtable activities
    → De-duplicate by eventId
  → Render unified calendar (react-big-calendar)
```

---

## 🔄 CROSS-CUTTING CONCERNS

### Error Handling Pattern

```
try {
  // Operation
  const result = await operation();
  recordApiLatency('endpoint', duration, cached);
  return NextResponse.json({success: true, data: result});
} catch (error) {
  console.error('Error:', error);
  recordError('endpoint', error.message);
  return NextResponse.json(
    {error: 'Message', details: DEV ? error : undefined},
    {status: 500}
  );
}
```

### Cache Invalidation Strategy

```
On CREATE/UPDATE/DELETE operations:
  1. Complete database operation
  2. Async (non-blocking):
     - invalidateLeadCache()
     - invalidateUsersCache()
     - invalidateActivitiesCache()
  3. Return response immediately
  
⚠️ Race condition possible: User may see stale cache before invalidation completes.
```

### Rate Limiting (Airtable)

```
AirtableClient maintains:
  - lastRequestTime: timestamp
  - requestInterval: 200ms
  
Before each request:
  - Calculate elapsed = now - lastRequestTime
  - If elapsed < interval:
    - await sleep(interval - elapsed)
  - Update lastRequestTime
  - Execute request

Result: Max 5 req/sec per client instance
⚠️ Multiple instances = multiple rate limits (good for parallelism)
```

---

## 📊 PERFORMANCE METRICS (Osservati)

| Operation | Cold (no cache) | Warm (cached) | Notes |
|-----------|----------------|---------------|-------|
| Login | 800ms | N/A | KV lookup + bcrypt |
| List Leads (100) | 2-3s | 150ms | Pagination heavy |
| List Leads (1000+) | 10-15s | 200ms | Full scan |
| Create Lead | 1-1.5s | N/A | Lookup + create |
| Create Activity | 800ms | N/A | Single insert |
| Duplicates scan | 15-20s | N/A | O(n²) algorithm |
| Get API Key | 200ms | 0.1ms | KV + decrypt |
| Calendar sync | 1-2s | N/A | External API |

---

**END OF FLOW MAP**
