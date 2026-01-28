## REFACTOR PLAN — step-by-step non-distruttivo (aggiornato)

Obiettivo: ridurre rischi di sicurezza, migliorare performance e manutenibilità, e preparare il codice per scalare con Airtable come store principale.

Fasi (ordine e task operativo):

1) Emergency fixes (Immediate, Critical)
  - Ripristinare la verifica JWT nel middleware `src/proxy.ts` e fallire all'avvio se non è definito `NEXTAUTH_SECRET`/`JWT_SECRET`.
  - Bloccare endpoint pubblici che consentono operazioni di scrittura tramite AI finché non è implementata validazione/authorization.
  - Eseguire scan git history per segreti (strumenti: `detect-secrets`, `git-secrets`) e pianificare rotazione chiavi se esposte.

2) Enforce CI safety (Short, High)
  - Rimuovere `typescript.ignoreBuildErrors`, abilitare `tsc --noEmit` in CI e correggere i tipi in branch separati.
  - Aggiungere step CI: linter, typecheck, secret-scan e unit tests di base.

3) Auth & Secrets hardening (Short, High)
  - Centralizzare gestione secret: policy `.env.example`, documentare variabili, usare KV per segreti run-time con auditing.
  - Invalidare e ruotare token compromessi.

4) Centralize Airtable Data Layer (Short-Mid, High)
  - Finalizzare e utilizzare `src/lib/airtable/client.ts` come client unico: garantire che tutti i caller -> adapter -> client.
  - Implementare queueing/serializzazione per operazioni pesanti e request coalescing per richieste concorrenti.
  - Introdurre limiti di default (`maxRecords`, `pageSize`) e obbligare i consumer a richiedere paginazione esplicita.

5) Replace dangerous KV patterns (Short, High)
  - Rimuovere `kv.scan`/`kv.flushall` su percorsi critici; usare registri espliciti per le key o pattern di invalidazione mirata.
  - Assicurarsi che le operazioni di cache invalidation siano idempotenti e a basso costo.

6) Validation & Domain typing (Short, High)
  - Aggiungere `zod` schemas per tutti gli ingressi API e per i payload utilizzati dalle funzioni AI.
  - Consolidare tipi in `src/types` e creare `src/features/*/validation.ts` per ogni dominio.

7) Features / reorganizzazione (Mid, High)
  - Creare `src/features/{leads,orders,activities,customers}` con struttura standard: `service.ts`, `repository.ts`, `types.ts`, `validation.ts`, `api.ts`.
  - Gradualmente migrare logica da `src/lib/*` e `scripts/*` ai `features` (adapter prima, switch-off progressivo delle API legacy).

8) AI safety & governance (Mid, High)
  - Limitare le funzioni che l'AI può chiamare; loggare e tracciare tutte le chiamate con audit trail.
  - Per operazioni di scrittura automatiche introdurre: approval workflow o sandboxed execution e rate limiting.

9) Scripts → Jobs (Mid, Medium)
  - Convertire script operativi in job idempotenti, schedulabili, con locking (es. DB lock o key-based lock in KV).
  - Aggiungere simulazioni dry-run e opzione `--apply` per evitare esecuzioni accidentali.

10) Observability & performance (Mid, Medium)
  - Aggiungere metriche su request Airtable (latency, error rate, quota restanti). Centralizzare logging strutturato.
  - Introdurre caching tramite `src/lib/cache.ts` (Vercel KV) con TTL ragionevoli e monitor per cache hit/miss.

11) Cleanup & archive (After approval, Low)
  - Archiviare file duplicati in una cartella `archive/` e aggiornare import references prima della cancellazione.
  - Rinominare file con spazi e suffissi non standard.

Sequenza e controllo cambiamenti
- Eseguire ogni step in branch separato con PR che includa: test, migration plan, e un rollback plan. Non effettuare cancellazioni definitive senza approvazione.

Data: 2026-01-27
