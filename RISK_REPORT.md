# RISK REPORT — criticità tecniche e rischi futuri (dettagliata)

Rischi critici
- Secrets leakage & gestione: repository contiene numerosi script e file di migrazione che, se eseguiti localmente con env non sicure, possono esporre segreti. Prima azione: scan immediato e, se necessario, rotazione delle chiavi. (Critical)
- Autenticazione non valida/Non verificata: `src/proxy.ts` attualmente non verifica JWT (verifica commentata) e considera valido qualsiasi token presente; questo è un rischio diretto per l'accesso ai dati. (Critical)
- Tipizzazione disabilitata in build (`typescript.ignoreBuildErrors: true`): errori di tipo non bloccano la build e possono causare crash runtime. (Critical)

Rischi operativi e di performance
- Rate limits Airtable e fetch di massa: molte funzioni eseguono paginazione finché non termina (loop senza limite) e non utilizzano `maxRecords` o limiti ragionevoli — rischio di superare rate limit e pagamenti extra. (High)
- Uso improprio o incoerente di Vercel KV: pattern `kv.scan` e `kv.flushall` possono non essere efficienti o non supportati a certe scale; inoltre la repository fa largo uso di KV per chiavi sensibili senza politiche di rotazione formalizzate. (High)

Rischi di sicurezza applicativa
- Injection-like sulle formule Airtable: costruzione di `filterByFormula` concatenando valori esterni (es. input, AI-generated text) senza validazione/sanificazione può portare a malformazione delle query o comportamenti inaspettati. (High)
- Funzioni di AI con poteri di scrittura: `executeFunctionCall` può invocare `createActivity` e altre funzioni — serve validazione e autorizzazione esplicita per evitare modifiche non autorizzate. (High)

Edge cases e bug potenziali
- Funzioni che assumono la presenza di chiavi (es. `getAirtableKey()` può ritornare `null`) non sempre gestiscono il caso `null` correttamente -> possibili eccezioni non gestite. (Medium)
- `cacheService` usa `kv.scan` e `pipeline()` senza fallback: se KV non supporta certe operazioni, l'invalidazione cache potrebbe fallire. (Medium)

Mitigazioni raccomandate (priorità)
1. Autenticazione: ripristinare verifica JWT nel middleware; non permettere accesso se `NEXTAUTH_SECRET`/`JWT_SECRET` mancano. (Critical)
2. Secrets: scan git history e CI con detector; rotazione chiavi se necessario; spostare tutte le chiavi sensibili in KV con controllo accessi e auditing. (Critical)
3. Limitazione query: imporre `maxRecords` e/o limiti paginazione per tutte le API che chiamano Airtable; aggiungere parametri `limit` sicuri per endpoint pubblici. (High)
4. Centralizzazione client Airtable: usare un client unico con retry/backoff, queueing e request coalescing; tutte le chiamate legacy devono essere migrate a questo client. (High)
5. AI controls: limitare le funzioni che l'AI può chiamare; aggiungere approvazione umana per operazioni di scrittura; validazione zod sui payload. (High)
6. KV usage: evitare `scan`/`flushall` massivi in produzione; usare key registry per enumerare chiavi e singole invalidazioni. (High)
7. Enforce types and CI: rimuovere `ignoreBuildErrors`, abilitare `tsc --noEmit`, eslint e tests in pipeline. (High)

Data: 2026-01-27

-- Secret exposure (git history) — findings and risk
- Files found in git history with possible secrets: `docs/UNIFIED_SYSTEM_SUMMARY.md` (AIRTABLE_API_KEY appears as `patKEe4q8UeW13rVL...`), `docs/UNIFIED_SYSTEM_SUMMARY.md` (GOOGLE_MAPS_API_KEY appears as `AIzaSyDBE98G...`), `docs/UNIFIED_SYSTEM_SUMMARY.md` (NEXTAUTH_SECRET appears as `imA5cZ/fImiq...`). Anche se parziali, questi indicano che segreti sono stati inseriti nella history. (Critical)

Immediate actions (Critical):
- Rotate exposed credentials immediately (Airtable API key, Google Maps key, NextAuth secret). Treat them as compromised. (Critical)
- Remove secrets from git history using `git filter-repo` or `BFG Repo-Cleaner`, then force-push to remote and communicate rotation to stakeholders. (Critical)
- Add secret detection to CI (detect-secrets/git-secrets) and block commits containing secrets. (High)

Notes on impact:
- Keys published in history can be used until rotated. Even partial leaks (truncated) can identify key prefixes and should be considered compromised. (High)

