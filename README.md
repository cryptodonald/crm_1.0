# CRM 2.0 - Doctorbed

**Next.js 16 + PostgreSQL (Supabase) + Redis + Vercel**

CRM moderno per gestione lead, attività, note e automazioni. Migrato completamente da Airtable a Postgres (Feb 2026).

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📊 Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL 16 (Supabase)
- **Cache**: Upstash Redis
- **Auth**: NextAuth v4
- **Styling**: Tailwind CSS v4
- **UI**: Radix UI + shadcn/ui
- **Deployment**: Vercel

---

## 🗄️ Database

**11 tabelle core**:
- `leads` (581 record)
- `activities` (~1500 attività)
- `notes` (~500 note)
- `users` (2 utenti)
- `marketing_sources` (6 sorgenti)
- `automations` (4 workflow)
- `automation_triggers`, `automation_actions`, `automation_logs`
- `tasks` (1 task)
- `user_preferences` (35 preferenze colori)

**Features**:
- Full-Text Search (Postgres FTS con GIN indices)
- 50+ indici ottimizzati
- 15 FK constraints con CASCADE/SET NULL
- Schema normalizzato (English snake_case)

Vedi `DATABASE_SCHEMA.md` per documentazione completa.

---

## 🔧 Environment Variables

Richiesti in `.env.local`:

```bash
# Postgres (Supabase)
POSTGRES_URL=postgres://...
POSTGRES_URL_NON_POOLING=postgres://...

# Redis (Upstash)
KV_URL=rediss://...
KV_REST_API_TOKEN=...

# NextAuth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://...

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...

# Vercel Blob
VERCEL_BLOB_READ_WRITE_TOKEN=...
```

---

## 📝 Development

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Health check
curl http://localhost:3000/api/health
```

---

## 📚 Documentation

- `DATABASE_SCHEMA.md` - Schema Postgres completo (11 tabelle)
- `AGENTS.md` - Guida per Warp AI
- `src/types/database.ts` - TypeScript types

---

## 🚢 Deploy

Vercel deployment automatico su push a `main`.

**Variabili env richieste su Vercel**:
- Tutte quelle in `.env.local`
- `USE_POSTGRES=true` (permanente)

---

**Migrazione Airtable → Postgres**: Completata Feb 2026  
**Status**: Production-ready
