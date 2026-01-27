# CLEANUP REPORT — problemi trovati e priorità (scan approfondito)

Questo documento elenca i problemi rilevati durante la scansione approfondita (API routes, librerie Airtable, cache, middleware, scripts).

Critical
- `src/lib/auth.ts` contiene default `JWT_SECRET` hard-coded: `crm-jwt-secret-key-2024`. Se non sostituito in produzione permette token forgery e accesso non autorizzato. (Critical)
- Il middleware `src/proxy.ts` salta la verifica JWT (commentata) e assume il token valido se presente: attualmente non verifica la firma. Questo è un controllo di accesso non affidabile e può permettere accessi non autorizzati. (Critical)
- `typescript.ignoreBuildErrors: true` in `next.config.ts` permette build di produzione con errori di tipo, aumentando la probabilità di regressioni runtime. (Critical)
- Presenza di chiamate dirette a `https://api.airtable.com` in molteplici moduli (`src/lib/ai-functions 2.ts`, `src/lib/airtable-batch.ts`, `src/lib/airtable/client.ts`): molte di queste non limitano i record richiesti (fetch di tutte le pagine), con rischio immediato di hitting rate limits o di OOM/timeout se il dataset cresce. (Critical)

High
- Codice di accesso a Airtable duplicato e non sempre passa per il client centralizzato `AirtableClient`/`airtableBatch`. Risultato: comportamenti inconsistenti su retry, headers, backoff e logging. (High)
- Funzioni di AI (`src/lib/ai-functions 2.ts`, `ai-chat-service 2.ts`) espongono operazioni di query/create su Airtable senza robusta validazione degli input generati dall'AI: rischio di modifiche indesiderate e di query costruite male. (High)
- Uso di Vercel KV insieme a pattern di scan/flush (`kv.scan`, `kv.flushall`, `kv.pipeline()`) che potrebbero non essere pienamente supportati o scalare male. Le funzioni `scan` e `flushall` possono essere costose o non funzionare in Vercel KV a grandi scala. (High)
- File duplicati, file `.disabled` e nomi con spazi (`components 2.json`, `ai-functions 2.ts`, `src/lib/env.ts.disabled`) introducono confusione e aumentano il rischio di usare codice obsoleto. (High)

Medium
- Alcuni script di migrazione e creazione (`scripts/create-orders*`, `scripts/create-sample-orders.js`) non sembrano idempotenti: rischio di inserimenti duplicati in Airtable se rieseguiti. (Medium)
- `src/lib/env.ts` fornisce env senza validazione (Zod è presente in file `.disabled`): inconsistenza tra runtime e sviluppo. (Medium)
- Alcune utility usano `performance.now()` e logging estensivo in codice serverless — utile per debug ma può creare rumore e costi di logging in produzione. (Medium)

Low
- File JSON di design e varianti (`components.json`, `components 2.json`) e artefatti di log (`server.log`, `.next-dev.log`) dovrebbero essere archiviati o rimossi per pulizia. (Low)
- Nomi con spazi e suffissi ` 2` complicano tooling e ricerca — rinomina o consolidamento consigliati. (Low)

Esempi concreti rilevati
- `src/lib/ai-functions 2.ts` costruisce `filterByFormula` concatenando stringhe provenienti da input esterno senza sanificazione robusta o limiti (può produrre formule molto lunghe o malformate). (High)
- Molte funzioni eseguono fetch paginando manualmente fino ad esaurire le pagine: senza un limite superiore questo può consumare molte richieste Airtable e superare rate limits. (Critical)
- `cache.ts` utilizza `kv.scan` e `kv.flushall`; verificare compatibilità e costi operativi su Vercel KV. (High)

Azioni raccomandate (non distruttive, prioritarie):
1. Immediate: disabilitare l'accesso pubblico delle API sensibili e ripristinare la verifica JWT nel middleware; sostituire qualsiasi default `JWT_SECRET` con errore a startup se non impostato. (Critical)
2. Immediate: eseguire scan git history per possibili segreti committati (`git-secrets`, `truffleHog`, `detect-secrets`) e pianificare rotazione chiavi se necessario. (Critical)
3. Short: stabilire limiti di pagina e `maxRecords` per tutte le query che fanno pagination loop; evitare fetch di *tutte* le righe in una singola richiesta. (High)
4. Short: consolidare l'accesso ad Airtable in `src/lib/airtable/*` (client + batch) e trasformare le altre funzioni in adapter/deprecate. (High)
5. Mid: rimuovere o archiviare file duplicati dopo aver verificato che non siano referenziati; creare script automatico che segnala file non importati. (Medium)

Data: 2026-01-27

-- Secret scan findings (git history)
- `docs/UNIFIED_SYSTEM_SUMMARY.md` [commit history]: contiene variabili d'ambiente con valori inseriti (es. `AIRTABLE_API_KEY=patKEe4q8UeW13rVL...`, `GOOGLE_MAPS_API_KEY=AIzaSyDBE98G...`, `NEXTAUTH_SECRET=imA5cZ/fImiq...`). Questi valori appaiono troncati nei commit ma indicano esposizione storica di segreti. Azione: rotazione immediata delle chiavi esposte, rimuovere file dalla history o archiviarlo fuori dal repo. (Critical)
- `README.md` e `docs/MIGRATION_EXAMPLES.md`: contengono esempi con placeholder e riferimenti a `AIRTABLE_API_KEY`/`AIRTABLE_BASE_ID` — verificare che non siano stati sostituiti con chiavi reali nei commit. (Medium)
- `src/test/setup.ts`: contiene env di test (`process.env.AIRTABLE_API_KEY = 'test-key'`, `process.env.AIRTABLE_BASE_ID = 'test-base'`, `process.env.VERCEL_BLOB_READ_WRITE_TOKEN = 'test-blob-token'`) — benigno per testing ma va verificato che non contenga valori di produzione. (Low)

Remediation immediate consigliata:
- Rotate keys: ruotare tutte le chiavi appena possibile (Airtable, Google Maps, NextAuth) se anche solo parzialmente esposte. (Critical)
- Remove from history: usare strumenti come `git filter-repo` o `BFG Repo-Cleaner` per rimuovere i file/valori sensibili dalla history, poi forzare push e comunicare rotazione. (Critical)
- Add secrets scanning to CI: integrare `detect-secrets` o `git-secrets` in pipeline per bloccare commit futuri. (High)

