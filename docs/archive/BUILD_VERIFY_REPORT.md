# BUILD_VERIFY_REPORT.md

Scopo: eseguire `lint` e `build` sulla branch `secrets-migration` per verificare che la centralizzazione degli env non introduca regressioni.

Risultato eseguito localmente (macOS environment):
- Tentativo di `npm run lint` con variabili d'ambiente placeholder: fallito con `sh: next: command not found` perché le dipendenze non sono installate in questo ambiente di esecuzione. (See commands below.)

Step raccomandati per eseguire build/lint in ambiente CI o locale:

1) Installare dipendenze (local/CI runner):

```bash
npm ci
# oppure
npm install
```

2) Eseguire lint e type-check con placeholder (non riporta segreti):

```bash
AIRTABLE_API_KEY=placeholder AIRTABLE_BASE_ID=placeholder NEXTAUTH_SECRET=placeholder JWT_SECRET=placeholder \
VERCEL_BLOB_READ_WRITE_TOKEN=placeholder DATABASE_URL=placeholder GOOGLE_PLACES_API_KEY=placeholder \
GITHUB_TOKEN=placeholder GITHUB_WEBHOOK_SECRET=placeholder npm run lint

# Type-check
AIRTABLE_API_KEY=placeholder AIRTABLE_BASE_ID=placeholder NEXTAUTH_SECRET=placeholder JWT_SECRET=placeholder \
VERCEL_BLOB_READ_WRITE_TOKEN=placeholder DATABASE_URL=placeholder GOOGLE_PLACES_API_KEY=placeholder \
GITHUB_TOKEN=placeholder GITHUB_WEBHOOK_SECRET=placeholder npm run type-check

# Build (if you want to run a full Next build)
AIRTABLE_API_KEY=placeholder AIRTABLE_BASE_ID=placeholder NEXTAUTH_SECRET=placeholder JWT_SECRET=placeholder \
VERCEL_BLOB_READ_WRITE_TOKEN=placeholder DATABASE_URL=placeholder GOOGLE_PLACES_API_KEY=placeholder \
GITHUB_TOKEN=placeholder GITHUB_WEBHOOK_SECRET=placeholder npm run build
```

3) Note:
- Running `npm run build` may require additional envs or external services to be available; prefer running in CI (Vercel Preview) where actual secrets can be set securely.
- The branch `secrets-migration` will fail fast (throw) at import-time if required secrets are not present; for CI runs either set real secrets (recommended for preview) or use placeholders for a smoke build.

Data: 2026-01-27
