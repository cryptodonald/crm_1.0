# ENV_AUDIT_REPORT.md

Risultato della scansione approfondita delle environment variables usate nel repository e verifica completezza di `src/env.ts` e `VERCEL_ENV_LIST.md`.

## Variabili trovate nel codice (scansione grep su **/*.ts)

### Secrets/Sensitive
- AIRTABLE_API_KEY (obbligatoria, usata in: src/lib/env.ts, src/test/setup.ts)
- AIRTABLE_BASE_ID (obbligatoria, usata in: src/lib/env.ts, src/test/setup.ts)
- JWT_SECRET (obbligatoria, usata in: src/lib/auth.ts, src/env.ts)
- NEXTAUTH_SECRET (obbligatoria, usata in: src/env.ts)
- VERCEL_BLOB_READ_WRITE_TOKEN (obbligatoria, usata in: src/lib/env.ts, src/lib/api-keys-service.ts, src/test/setup.ts)
- BLOB_READ_WRITE_TOKEN (fallback, usata in: src/lib/api-keys-service.ts) — **REDUNDANTE**: è fallback per VERCEL_BLOB_READ_WRITE_TOKEN
- DATABASE_URL (obbligatoria, usata in: src/env.ts)
- GOOGLE_PLACES_API_KEY (obbligatoria, usata in: src/lib/env.ts, src/test/setup.ts)
- GOOGLE_OAUTH_CLIENT_ID (obbligatoria, usata in: src/lib/auth.config.ts)
- GOOGLE_OAUTH_CLIENT_SECRET (obbligatoria, usata in: src/lib/auth.config.ts)
- GITHUB_TOKEN (obbligatoria, usata in: src/lib/env.ts, src/test/setup.ts, src/lib/github/client.ts)
- GITHUB_WEBHOOK_SECRET (obbligatoria, usata in: src/lib/env.ts, src/test/setup.ts, src/app/api/webhooks/github/route.ts)
- OPENAI_API_KEY (obbligatoria, usata in: src/lib/ai-chat-service 2.ts, src/app/api/ai/rewrite-notes/route.ts, src/app/api/ai/parse-lead-request/route.ts)
- ENCRYPTION_MASTER_KEY (obbligatoria, usata in: src/lib/encryption.ts, src/scripts/use-remote-keys.ts)
- NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (pubblica, usata in: src/hooks/useGooglePlaces.ts come NEXT_PUBLIC_)

### Non-sensitive / Build-time
- NODE_ENV (usata in: src/lib/env.ts, src/env.ts, src/lib/performance-monitor.ts, next.config.ts, src/app/api/... in vari handler, src/test/setup.ts)
- NEXT_PUBLIC_APP_URL (usata in: src/lib/env.ts, src/env.ts, src/test/setup.ts)
- NEXTAUTH_URL (usata implicitamente da NextAuth, opzionale)
- VERCEL_URL (auto-set by Vercel, usata in: src/lib/env.ts per URL detection, non richiede configurazione)

### Variabili con fallback/defaults (non critiche)
- CURRENT_USER_ID (fallback a 'user_admin_001', 'user_mock', 'user_dev_001', usata in: src/lib/api-keys-service.ts, src/lib/api-keys-repository.ts, src/app/api/api-keys/*)
- CURRENT_TENANT_ID (fallback a 'tenant_doctorbed', 'tenant_mock', 'tenant_dev', usata in: src/lib/api-keys-service.ts, src/lib/api-keys-repository.ts)

## Completezza del refactor

### ✅ Aggiunte a src/env.ts (commit aca95ad)
Tutte le variabili obbligatorie sono ora nel file `src/env.ts` con validazione fail-fast:
- AIRTABLE_API_KEY, AIRTABLE_BASE_ID
- NEXTAUTH_SECRET, JWT_SECRET
- VERCEL_BLOB_READ_WRITE_TOKEN, DATABASE_URL
- GOOGLE_PLACES_API_KEY, GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET
- GITHUB_TOKEN, GITHUB_WEBHOOK_SECRET
- OPENAI_API_KEY, ENCRYPTION_MASTER_KEY

### ✅ Aggiunte a VERCEL_ENV_LIST.md (commit aca95ad)
Lista completa di required e optional vars per impostazione su Vercel, con note di sviluppo locale.

### ⚠️ Variabili con fallback (non in src/env.ts)
Le seguenti variabili hanno fallback/defaults e non sono critiche per startup:
- CURRENT_USER_ID, CURRENT_TENANT_ID — hanno default, non falliscono se assenti
- NEXTAUTH_URL — opzionale per NextAuth
- NODE_ENV, NEXT_PUBLIC_APP_URL — hanno default ragionevoli

Non sono state aggiunte a `src/env.ts` per non forzare la configurazione di variabili non critiche. Se in futuro diventano obbligatorie, aggiungerle.

## Ridondanze trovate

- BLOB_READ_WRITE_TOKEN — è fallback per VERCEL_BLOB_READ_WRITE_TOKEN, non necessario in produzione
- `src/lib/env.ts.disabled` — file vecchio, non usato; candidato per removal

## Azioni completate

1. ✅ Creato `src/env.ts` con lista completa di env obbligatorie, fail-fast se mancanti
2. ✅ Aggiornato `src/lib/env.ts` per re-exportare da `src/env.ts`
3. ✅ Creato `VERCEL_ENV_LIST.md` con istruzioni Vercel e template `.env.local`
4. ✅ Creato branch `secrets-migration` e pushato su origin
5. ✅ Scansione completezza: tutte le variabili necessarie sono censite

## Stato finale della lista env

La lista env è **COMPLETA e PRONTA per Vercel**. Copia da `VERCEL_ENV_LIST.md` nella sezione "REQUIRED" al Vercel Project Settings.

Data: 2026-01-27
