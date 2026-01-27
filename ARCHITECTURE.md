## ARCHITECTURE: CRM Next.js + Airtable (snapshot)

Breve mappa e descrizione dell'architettura rilevata nel repository.

Repository top-level (selezione rilevante):
- `next.config.ts` — configurazione Next.js
- `vercel.json` — configurazione deploy (presente root)
- `package.json`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`
- `scripts/` — script operativi e di migrazione per Airtable (molti file)
- `src/` — codice applicazione
  - `src/app/` — UI (Next 13 app router) e componenti
  - `src/lib/` — librerie e servizi (env, api-keys-service, cache, airtable helpers)
  - `src/hooks/`, `src/utils/`, `src/types/` — utilità, hook e tipi
- `types/` — tipi top-level (`orders.ts`, `products.ts`)
- vari JSON: `orders-table-ids.json`, `orders-table-ids-final.json`, `components.json`, etc.

High-level data flow (UI -> API -> Airtable):
- UI components (client) inoltrano richieste a API routes o chiamano server-side helper.
- API layer e server helpers sono implementati in `src/app/api` (se presente) o in `src/lib/*` (es. `ai-functions`, `api-keys-service`, `proxy.ts`).
- Persistance: richieste HTTP dirette all'API REST di Airtable (file e script in `src/lib` e `scripts/`). Alcune funzioni leggono le credenziali da Vercel KV.

Business logic:
- Logica dispersa: parti significative di accesso e regole sono in `src/lib` e in `scripts/` (batch/migration).
- Alcune utility `src/lib/*` uniscono accesso dati, regole e trasformazioni (manca netta separazione presentation / business / data layer).

Configurazioni chiave:
- `next.config.ts`: security headers, image sizes, `typescript.ignoreBuildErrors: true` (pericoloso in produzione).
- Env management: `src/lib/env.ts` e `src/lib/env.ts.disabled` — due varianti coesistenti.
- Vercel KV utilizzato (`@vercel/kv`) per token/chiavi e caching in `src/lib/*`.

Principali pattern rilevati:
- Molti script `scripts/` per migrazioni e creazione record (duplicazione di intenti).
- File duplicati o con suffissi (`-final`, ` 2`, `.disabled`).
- Uso misto di JS e TS; presenza di file .js operativi.

Implicazioni principali:
- Codice di accesso a Airtable non centralizzato -> difficoltà di auditing, rate limiting e caching.
- Rischio di leaking di segreti tramite script e versioning se le chiavi venissero incluse in commit.
- Config TypeScript permissiva in produzione nasconde errori a runtime.

Data: 2026-01-27

Textual data-flow diagrams (main flows)

- Lead search (client-driven):
  - UI (client) -> calls API route or server helper (`/api/leads` or `features/leads/api`) -> API middleware (`src/proxy.ts`) performs auth -> API handler uses `createAirtableClientFromKV()` or `getAirtableClient()` adapter -> Airtable REST API (`https://api.airtable.com/v0/{BASE}/{TABLE}`) -> response -> API -> UI.

- Create activity (from UI or AI):
  - UI / AI -> `executeFunctionCall()` (server) -> validate input (should) -> `createActivity()` calls Airtable create endpoint via centralized client -> Airtable stores record -> optional cache invalidation (`invalidateActivitiesCache`) -> UI notified.

- Batch scripts / migrations (scripts folder):
  - `scripts/*` executed manually or by CI -> read credentials from env or KV (`src/lib/api-keys-service`) -> perform bulk create/update against Airtable -> risk of rate-limiting if not batched and idempotency not ensured.

Notes:
- Critical requirement: all server-side Airtable calls must use centralized client to enforce `maxRecords`, `retry/backoff`, and caching. The `airtableBatch` service exists but is not used consistently.

