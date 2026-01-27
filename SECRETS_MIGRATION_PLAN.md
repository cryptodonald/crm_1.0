# SECRETS_MIGRATION_PLAN.md

Obiettivo: ridurre la superficie d'attacco centralizzando la gestione dei secrets e spostandoli su Vercel Environment Variables.

1) Lista delle environment variables usate dall'app (nome esatto)
- AIRTABLE_API_KEY
- AIRTABLE_BASE_ID
- VERCEL_BLOB_READ_WRITE_TOKEN
- BLOB_READ_WRITE_TOKEN (fallback variable name)
- NEXTAUTH_SECRET
- NEXTAUTH_URL
- JWT_SECRET
- DATABASE_URL
- GOOGLE_PLACES_API_KEY
- GITHUB_TOKEN
- GITHUB_WEBHOOK_SECRET
- NEXT_PUBLIC_APP_URL (non secret)
- NODE_ENV (non secret)

2) Dove vengono lette oggi
- `src/lib/env.ts` e `src/lib/env.ts.disabled` (varianti). Alcuni script in `scripts/` leggono `process.env.*` direttamente.
- Alcuni servizi leggono chiavi da Vercel KV tramite `src/lib/api-keys-service.ts` e `src/lib/api-keys-repository.ts`.
- Alcuni file documentazione (`docs/UNIFIED_SYSTEM_SUMMARY.md`, `README.md`) contengono esempi o valori storici nella history.

3) Dove devono stare
- Tutti i secrets devono essere impostati come Vercel Environment Variables (Project Settings → Environment Variables) e NON esposti come `NEXT_PUBLIC_*`.
- Solo i valori non sensibili (es. `NEXT_PUBLIC_APP_URL`) possono essere pubblici.
- Upstash / Vercel KV può essere usato per runtime cache e per storage di chiavi rotabili, ma non come unica fonte di truth per segreti di build-time.

4) Passi operativi per migrare senza downtime
- Preparazione
  - Creare branch `secrets-migration` e lavorare su di esso.
  - Creare `SECRETS_MIGRATION_PLAN.md` (questo file) e condividere con team.

- Step 1: Centralizzare accesso ai env
  - Aggiungere `src/env.ts` che legge `process.env` e fallisce all'avvio se mancano secrets critici (no defaults).
  - Aggiornare `src/lib/env.ts` per re-exportare `src/env.ts` e far sì che tutto il codice legga da `@/lib/env` come prima ma la fonte sia centralizzata.

- Step 2: Impostare variabili su Vercel (preview + production)
  - Impostare tutte le env listate in Vercel Project → Settings → Environment Variables per `Preview` e `Production` (vedi VERCEL_ENV_LIST.md generato dopo refactor).
  - Per `Development`, aggiungere `.env.local` con placeholders (non committare `.env.local`).

- Step 3: Deploy e smoke tests su Preview
  - Push della branch `secrets-migration` su remote.
  - Creare una Deploy Preview che legge le env da Vercel preview vars.
  - Eseguire test automatici e smoke tests manuali (login, fetch leads, create activity).

- Step 4: Cutover
  - Una volta validato su preview, merge in `main` e deploy in production. Monitorare errori e metriche.

- Step 5: Cleanup
  - Rimuovere fallback e codice che legge direttamente da KV per secrets build-time.
  - Aggiungere documentazione `VERCEL_ENV_LIST.md` e policy di rotazione/ACL.

5) Checklist di test post-migrazione (smoke + integration)
- CI: `npm run lint` e `npm run build` passano.
- Autenticazione: login funziona, cookie JWT o NextAuth funzionano, middleware non rifiuta richieste legittime.
- Airtable: operazioni di lettura (search leads, list orders) funzionano e non esplodono per missing key.
- Blob: upload/read via Vercel blob funziona (se usato).
- AI functions: chiamate che usano `executeFunctionCall` riescono a leggere chiavi da KV se ancora previsto (ma non usano env in client-side).
- Verifica che non ci siano `NEXT_PUBLIC_` variabili con segreti.
- Eseguire secret-scan sulla history e sul commit recente per verificare che non abbiamo accidentalmente committato segreti.

Note operative
- Non ruotare le chiavi prima del deploy completo e validazione su preview+prod; pianificare rotazioni subito dopo se history conteneva segreti.
- Dopo cutover, aggiungere `detect-secrets` in CI per prevenire future esposizioni.

Data: 2026-01-27
