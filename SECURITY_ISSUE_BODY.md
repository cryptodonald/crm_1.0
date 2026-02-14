# 🔒 Security Audit Report - CRM Next.js

## Executive Summary
Audit di sicurezza del progetto CRM Next.js. Sono state identificate **29 vulnerabilità** di cui **3 critiche**, **8 high**, **12 medium** e **6 low**.

---

## 🔴 CRITICAL (3)

### 1. Debug Endpoint Espone Environment Variables
**File:** `src/app/api/debug/env/route.ts`
**Descrizione:** Endpoint non protetto che espone prefissi di API keys (Airtable, JWT, NextAuth) senza autenticazione.
```typescript
// Linea 13-14: Espone prefissi di chiavi sensibili
airtableKeyPrefix: env.AIRTABLE_API_KEY?.substring(0, 8) || 'MISSING',
airtableBaseIdPrefix: env.AIRTABLE_BASE_ID?.substring(0, 8) || 'MISSING',
```
**Impatto:** Attaccante può ottenere informazioni per identificare le chiavi API.
**Remediation:** Rimuovere endpoint in produzione o proteggere con autenticazione Admin + rate limiting.

### 2. Rate Limiting Non Implementato su Nessuna Route
**File:** `src/lib/ratelimit.ts` (esiste ma non usato)
**Descrizione:** Rate limiting configurato ma **non importato/utilizzato** in nessuna delle 61 API routes.
**Impatto:**
- Brute force attacks su `/api/auth/login`
- Account enumeration su `/api/auth/register`
- DoS su tutti gli endpoint
**Remediation:** Aggiungere rate limiting a tutte le routes, priorità su auth endpoints:
```typescript
import { authRateLimiter, checkRateLimit } from '@/lib/ratelimit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await checkRateLimit(ip, authRateLimiter);
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  // ...
}
```

### 3. Mancanza di Autenticazione su 59/61 API Routes
**Descrizione:** Solo 2 routes verificano autenticazione (`activities/route.ts`, `google-calendar/events/route.ts`).
**Routes critiche senza auth:**
- `/api/leads` - GET/POST/DELETE tutti i lead
- `/api/orders` - GET/POST/PATCH tutti gli ordini
- `/api/products` - Gestione prodotti
- `/api/upload` - Upload file arbitrari
- `/api/ai/parse-lead-request` - Chiamate OpenAI
- `/api/api-keys` - Gestione API keys (usa mock user!)
**Impatto:** Accesso non autorizzato a tutti i dati del CRM.
**Remediation:** Implementare middleware auth globale o verificare sessione in ogni route.

---

## 🟠 HIGH (8)

### 4. API Keys Route con Mock Authentication
**File:** `src/app/api/api-keys/route.ts:8-13`
```typescript
function getCurrentUser() {
  return {
    id: process.env.CURRENT_USER_ID || 'user_dev_001',
    tenantId: process.env.CURRENT_TENANT_ID || 'tenant_dev',
  };
}
```
**Impatto:** Chiunque può gestire le API keys del sistema.

### 5. SQL/NoSQL Injection via Filtri Airtable
**File:** `src/app/api/leads/route.ts:63-108`
**Descrizione:** Valori dai query params inseriti direttamente in filterByFormula senza sanitizzazione.
```typescript
conditions.push(`{Stato} = '${stati[0]}'`);  // Linea 63
conditions.push(`SEARCH('${searchLower}', LOWER({Nome}))...`);  // Linea 103
```
**Remediation:** Sanitizzare input e usare parameterized queries dove possibile.

### 6. Upload Endpoint senza Autenticazione
**File:** `src/app/api/upload/route.ts`
**Impatto:** Upload di file arbitrari sul blob storage senza controllo utente.

### 7. AI Endpoints senza Autenticazione
**Files:**
- `src/app/api/ai/parse-lead-request/route.ts`
- `src/app/api/ai/rewrite-notes/route.ts`
**Impatto:** Abuso delle API OpenAI con costi non controllati.

### 8. Login senza Account Lockout
**File:** `src/app/api/auth/login/route.ts`
**Descrizione:** Nessun blocco account dopo tentativi falliti. Solo delay di 1s.
**Remediation:** Implementare account lockout dopo 5 tentativi.

### 9. Registration senza Captcha
**File:** `src/app/api/auth/register/route.ts`
**Impatto:** Creazione massiva di account fake.

### 10. Places API Leaks Google API Key Length
**File:** `src/app/api/places/search/route.ts:39`
```typescript
console.log('🔑 [Places API] Key length:', apiKey.length);
```

### 11. Password Reset Token senza Expiry Validation
**File:** `src/app/api/auth/reset-password/route.ts`
**Verificare:** Token expiry enforcement.

---

## 🟡 MEDIUM (12)

### 12-18. Input Non Validato con Zod
Le seguenti routes usano `request.json()` senza validazione Zod:
| # | Route | Linea |
|---|-------|-------|
| 12 | `/api/leads` DELETE | 200 |
| 13 | `/api/orders/[id]` PATCH | 185, 319, 375 |
| 14 | `/api/products/[id]` PUT | 109, 199 |
| 15 | `/api/marketing/sources` POST | 60 |
| 16 | `/api/marketing/costs/[id]` PATCH | 13 |
| 17 | `/api/structure-variants/[id]` PUT | 118 |
| 18 | `/api/product-variants` POST | 196 |

**Remediation:** Validare ogni input con schema Zod:
```typescript
const schema = z.object({ leadIds: z.array(z.string()) });
const result = schema.safeParse(await request.json());
if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
```

### 19. Console Logs con Dati Sensibili
**Files multipli che loggano token/keys:**
- `src/lib/token-manager.ts:52,64,79,86,90,123,143`
- `src/app/api/auth/activate/route.ts:116,130`
- `src/app/api/auth/set-password/route.ts:33,66,116,130`
- `src/lib/cache.ts:86,95`
**Remediation:** Rimuovere tutti i console.log con dati sensibili in produzione.

### 20. Hardcoded Table IDs
**Files:**
- `src/app/api/orders/route.ts:11-12`: `ORDERS_TABLE_ID`, `ORDER_ITEMS_TABLE_ID`
- `src/app/api/products/route.ts:11`: `PRODUCTS_TABLE_ID`
**Remediation:** Spostare in environment variables.

### 21. TypeScript Build Errors Ignorati
**File:** `next.config.ts:4-6`
```typescript
typescript: {
  ignoreBuildErrors: true,
},
```

### 22. Error Details Esposti in Development
**Files multipli:**
```typescript
details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
```
**Verificare:** Che NODE_ENV sia correttamente impostato in produzione.

### 23. Missing CSRF Protection
**Descrizione:** Nessuna protezione CSRF visibile sulle routes.

---

## 🟢 LOW (6)

### 24. Cookie SameSite=Strict potrebbe causare problemi OAuth
**File:** `src/app/api/auth/login/route.ts:187`

### 25. Missing Security Headers
**File:** `next.config.ts` - Mancano:
- `Content-Security-Policy`
- `Strict-Transport-Security`
- `X-XSS-Protection` (legacy ma utile)

### 26. Password Minimum Length Solo 6 Caratteri
**File:** `src/app/api/auth/login/route.ts:109`
**Remediation:** Aumentare a 8+ caratteri con requisiti complessità.

### 27. JWT Token Esposto in Response
**File:** `src/app/api/auth/login/route.ts:179`
Token restituito sia nel body che nel cookie HttpOnly.

### 28. User Avatar Upload senza Resize
**File:** `src/app/api/user/avatar/route.ts`
**Impatto:** Possibile upload di immagini molto grandi.

### 29. TODO Comment su Rollback Non Implementato
**File:** `src/app/api/auth/register/route.ts:204`
```typescript
// TODO: Implementare rollback (eliminare utente creato se email fallisce)
```

---

## Raccomandazioni Prioritarie

1. **IMMEDIATO:** Rimuovere/proteggere `/api/debug/env`
2. **IMMEDIATO:** Implementare rate limiting su auth endpoints
3. **QUESTA SETTIMANA:** Aggiungere autenticazione a tutte le routes
4. **QUESTA SETTIMANA:** Validare tutti gli input con Zod
5. **QUESTO MESE:** Security headers completi
6. **QUESTO MESE:** Audit console.log e rimuovere logging sensibile

---

## Statistiche

| Severity | Count |
|----------|-------|
| 🔴 Critical | 3 |
| 🟠 High | 8 |
| 🟡 Medium | 12 |
| 🟢 Low | 6 |
| **Total** | **29** |

---

_Audit eseguito il 14 Febbraio 2026_
_Co-Authored-By: Warp <agent@warp.dev>_
