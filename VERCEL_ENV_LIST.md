# VERCEL_ENV_LIST.md — Complete Environment Variables

Elenco COMPLETO delle Environment Variables da impostare su Vercel (per `Production` e `Preview`).
Generato dalla scansione del codice e dalla lista in `src/env.ts`.

## REQUIRED (segreti, NON esporre come `NEXT_PUBLIC_*`)

- AIRTABLE_API_KEY — Airtable account token per accesso API
- AIRTABLE_BASE_ID — Airtable base ID
- NEXTAUTH_SECRET — NextAuth session encryption secret
- JWT_SECRET — JWT token signing secret
- VERCEL_BLOB_READ_WRITE_TOKEN — Vercel Blob storage token
- DATABASE_URL — Database connection string
- GOOGLE_PLACES_API_KEY — Google Places / Google Maps API key
- GOOGLE_OAUTH_CLIENT_ID — Google OAuth client ID
- GOOGLE_OAUTH_CLIENT_SECRET — Google OAuth client secret
- GITHUB_TOKEN — GitHub API token
- GITHUB_WEBHOOK_SECRET — GitHub webhook secret
- OPENAI_API_KEY — OpenAI API key for AI functions
- ENCRYPTION_MASTER_KEY — Master key per AES-256-CBC encryption

## OPTIONAL / NON-SENSITIVE

- NEXT_PUBLIC_APP_URL — App URL, public (default: http://localhost:3000)
- NEXT_PUBLIC_GOOGLE_MAPS_API_KEY — Google Maps API key exposed to client
- NEXTAUTH_URL — NextAuth callback URL
- NODE_ENV — Set to 'production' or 'development'
- CURRENT_USER_ID, CURRENT_TENANT_ID — Fallback user/tenant IDs

## Impostazione su Vercel

1. Vercel Project Settings → Environment Variables
2. Imposta ciascuna variabile in `Preview` e `Production`
3. Abilita `Encrypted` per variabili sensibili
4. Salva e triggera re-deploy

## Sviluppo locale

Crea `.env.local` (non committare) con placeholders o chiavi di test.

Data: 2026-01-27
