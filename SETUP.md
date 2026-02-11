# SETUP.md

Setup completo per nuovo ambiente di sviluppo CRM 2.0.

## Prerequisites

- **Node.js**: v20+ (LTS)
- **npm**: v10+
- **Git**: Per version control
- **PostgreSQL**: Supabase account (database hosted)
- **Redis**: Upstash account (cache hosted)
- **Vercel**: Account per deploy (opzionale per dev locale)

## 1. Clone Repository

```bash
git clone <repository-url>
cd crm_1.0
```

## 2. Install Dependencies

```bash
npm install
```

### VSCode Setup (Recommended)

Se usi **Visual Studio Code**, le configurazioni sono già pronte:

1. Apri progetto in VSCode:
```bash
code .
```

2. VSCode mostrerà popup **"Do you want to install the recommended extensions?"**
   - Click **"Install"** per installare tutte le estensioni raccomandate
   - Oppure **"Show Recommendations"** per scegliere quali installare

3. Le settings workspace (`.vscode/settings.json`) si applicano automaticamente:
   - ✅ Format on save (Prettier)
   - ✅ ESLint auto-fix on save
   - ✅ Import organization automatica
   - ✅ Tailwind CSS autocomplete

Estensioni essenziali già configurate:
- **Prettier** - Code formatter
- **ESLint** - Linter
- **Tailwind CSS IntelliSense** - Autocomplete classi CSS
- **TypeScript Nightly** - Latest TypeScript features
- **GitLens** - Git visualization
- **ErrorLens** - Inline error display

Vedi `.vscode/extensions.json` per lista completa.

Dipendenze principali installate:
- `next@16` - Framework
- `react@19.2.3` - UI library
- `typescript@5.x` - Type safety
- `@vercel/postgres` - Database client
- `@upstash/redis` - Cache client
- `next-auth@4.x` - Authentication
- `swr@2.x` - Data fetching
- `zod@3.x` - Validation
- `radix-ui/*` - UI primitives
- `tailwindcss@4.x` - Styling

## 3. Environment Variables

Crea `.env.local` nella root del progetto:

```bash
# Database (Supabase PostgreSQL)
POSTGRES_URL="postgresql://user:password@host:5432/database?sslmode=require"
POSTGRES_URL_NON_POOLING="postgresql://user:password@host:5432/database?sslmode=require"

# Redis Cache (Upstash)
KV_URL="https://your-redis.upstash.io"
KV_REST_API_TOKEN="your-token"
KV_REST_API_READ_ONLY_TOKEN="your-readonly-token"

# Authentication (NextAuth)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
JWT_SECRET="same-as-nextauth-secret-or-different"

# Google OAuth (per autenticazione utenti)
GOOGLE_OAUTH_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_OAUTH_CLIENT_SECRET="your-client-secret"

# Google Maps (per autocomplete indirizzi)
NEXT_PUBLIC_GOOGLE_MAPS_API="your-google-maps-api-key"

# Vercel Blob Storage (per file upload - opzionale in dev)
VERCEL_BLOB_READ_WRITE_TOKEN="your-blob-token"

# OpenRouter AI (per AI features - estrazione dati lead)
OPENROUTER_API_KEY="your-openrouter-key"
```

### Generate Secrets

```bash
# NEXTAUTH_SECRET e JWT_SECRET
openssl rand -base64 32
```

### Ottenere Credentials

1. **Supabase (PostgreSQL)**:
   - Vai su https://supabase.com
   - Crea nuovo progetto
   - Settings → Database → Connection String (copia entrambe: Pooled e Direct)

2. **Upstash (Redis)**:
   - Vai su https://upstash.com
   - Crea nuovo database Redis
   - Copy REST URL + Token

3. **Google OAuth**:
   - https://console.cloud.google.com
   - APIs & Services → Credentials
   - Create OAuth 2.0 Client ID
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`

4. **Google Maps API**:
   - https://console.cloud.google.com
   - APIs & Services → Credentials
   - Create API Key
   - Enable: Places API (New), Maps JavaScript API

5. **OpenRouter**:
   - https://openrouter.ai
   - Sign up + crea API key

## 4. Database Setup

Il database PostgreSQL viene gestito su Supabase. Lo schema è già deployato.

### Verifica Database

```bash
# Test connessione
npm run db:test

# Oppure via psql (opzionale)
psql "$POSTGRES_URL_NON_POOLING"
```

### Schema Overview

11 tabelle principali:
- `leads` - Lead management
- `activities` - Attività legate a leads
- `notes` - Note con highlights
- `users` - Utenti sistema
- `marketing_sources` - Fonti lead (Meta, Google, etc.)
- `automations` + triggers/actions/logs - Workflow automation
- `tasks` - User tasks
- `user_preferences` - UI customization

Vedi `DATABASE_SCHEMA.md` per dettagli completi.

## 5. Run Development Server

```bash
npm run dev
```

Apri http://localhost:3000

### Verifica Health Check

```bash
curl http://localhost:3000/api/health
```

Risposta attesa:
```json
{
  "status": "ok",
  "timestamp": "2026-02-09T14:00:00.000Z",
  "checks": {
    "postgres": "connected",
    "redis": "connected",
    "auth": "configured"
  }
}
```

## 6. Type Checking & Linting

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix
```

Zero errori richiesti prima di commit.

## 7. Build for Production

```bash
npm run build
```

Verifica build success prima di deploy.

## 8. Common Issues

### "Failed to connect to Postgres"

Verifica:
- `POSTGRES_URL` corretto in `.env.local`
- Supabase database online
- IP whitelisting disabilitato (o aggiungi tuo IP)

### "Redis connection failed"

Verifica:
- `KV_URL` e `KV_REST_API_TOKEN` corretti
- Upstash database attivo

### "Module not found: @/..."

Reinstalla dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

### TypeScript errors dopo pull

```bash
npm run build
```

Rebuilda per rigenerare types.

## 9. Development Workflow

### Branch Strategy

```bash
# Feature
git checkout -b feature/nome-feature

# Fix
git checkout -b fix/nome-fix

# Refactor
git checkout -b refactor/nome-refactor
```

### Commit Message Format

```
type(scope): description

feat(leads): add optimistic update for edit modal
fix(auth): resolve NextAuth session persistence
refactor(cache): improve SWR pattern matching
```

**Co-authorship obbligatorio**:
```
feat(leads): add duplicate detection

Co-Authored-By: Warp <agent@warp.dev>
```

### Pre-Commit Checklist

- [ ] `npx tsc --noEmit` (zero errors)
- [ ] `npm run lint` (zero violations)
- [ ] `npm run build` (successful)
- [ ] Testato manualmente feature/fix
- [ ] Screenshot comparison per UI changes

## 10. Deploy to Vercel

### First-Time Setup

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Link progetto:
```bash
vercel link
```

3. Aggiungi environment variables su Vercel Dashboard:
   - Project Settings → Environment Variables
   - Copia tutte le variabili da `.env.local`

### Deploy

```bash
# Preview deployment
vercel

# Production deployment
vercel --prod
```

## 11. Monitoring & Debug

### Logs in Development

Browser console mostra:
- Errori API (red)
- Warnings (yellow)
- Debug logs (solo in NODE_ENV=development)

### Production Logs (Vercel)

Dashboard → Project → Logs

Filtri utili:
- Error: solo errori
- Function: per endpoint specifico
- Search: cerca per testo

### Performance Monitoring

Targets:
- Dashboard load: < 200ms
- Leads list: < 200ms
- Create operations: < 300ms
- Cache hit rate: > 70%

Vercel Analytics automaticamente attivo in production.

## 12. Project Structure

```
crm_1.0/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   │   ├── leads/      # Lead CRUD
│   │   │   ├── activities/ # Activities
│   │   │   ├── users/      # Users
│   │   │   └── auth/       # NextAuth
│   │   ├── leads/          # Leads pages
│   │   ├── activities/     # Activities pages
│   │   └── layout.tsx      # Root layout
│   ├── components/
│   │   ├── ui/             # Radix + shadcn primitives
│   │   ├── leads/          # Lead-specific components
│   │   └── activities/     # Activity components
│   ├── hooks/
│   │   ├── use-leads.ts    # SWR hook per leads
│   │   ├── use-users.ts    # SWR hook per users
│   │   └── use-marketing-sources.ts
│   ├── lib/
│   │   ├── postgres.ts     # DB client
│   │   ├── cache.ts        # Redis helpers
│   │   └── swr-storage.ts  # SWR localStorage
│   ├── types/
│   │   ├── database.ts     # Postgres schema types
│   │   └── leads-form.ts   # Form validation schemas
│   └── env.ts              # Environment validation
├── public/                  # Static assets
├── AGENTS.md               # AI agent guidelines
├── SETUP.md                # This file
├── DATABASE_SCHEMA.md      # Schema reference
├── README.md               # Quick start
└── package.json

```

## 13. Key Files Reference

- **`src/env.ts`**: Environment variables validation (Zod) - app fails if invalid
- **`src/types/database.ts`**: TypeScript interfaces per database schema
- **`src/hooks/use-leads.ts`**: SWR hook pattern per data fetching
- **`src/lib/swr-storage.ts`**: localStorage persistence per SWR cache
- **`AGENTS.md`**: Guidelines complete per AI development
- **`DATABASE_SCHEMA.md`**: Schema completo + query examples

## 14. Critical Patterns

### SWR Cache Update (dopo mutation)

```typescript
import { useSWRConfig } from 'swr';

const { mutate } = useSWRConfig();

// Aggiorna TUTTE le cache /api/leads (base + con filtri)
mutate(
  (key) => typeof key === 'string' && key.startsWith('/api/leads'),
  (current: any) => {
    // ... update logic
  },
  { revalidate: false }
);
```

### Form Initialization (null → undefined)

```typescript
const resetValues = {
  Nome: lead.name || '',
  Email: lead.email ?? undefined,  // DB ritorna null, Zod vuole undefined
  CAP: lead.postal_code ?? undefined,
};

form.reset(resetValues);
```

### Optimistic Updates Pattern

1. Update cache immediatamente (UI responsive)
2. API call in background
3. Se fallisce: rollback automatico + toast error

## 15. Next Steps

Dopo setup completo:

1. ✅ Verifica `/api/health` ritorna 200
2. ✅ Login con Google OAuth funziona
3. ✅ Pagina `/leads` carica lista
4. ✅ Crea nuovo lead (modal)
5. ✅ Modifica lead (verifica cache update istantaneo)
6. ✅ Test autocomplete Google Places

Se tutto OK → environment pronto per sviluppo! 🚀

## 16. Support & Troubleshooting

**AI Agent (Warp)**:
- Leggi `AGENTS.md` per pattern e guidelines
- Sezione "Common Pitfalls & Fixes" per errori comuni

**Documentation**:
- `DATABASE_SCHEMA.md` - Schema reference
- `README.md` - Quick overview
- Inline code comments

**External**:
- Next.js docs: https://nextjs.org/docs
- SWR docs: https://swr.vercel.app
- Radix UI: https://radix-ui.com
- Supabase: https://supabase.com/docs
