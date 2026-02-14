# CRM 2.0 - Doctorbed

CRM per gestione lead, attività, note e automazioni.

---

## Quick Start

```bash
npm install
npm run dev        # http://localhost:3000
```

Per setup completo (env vars, database, deploy): vedi **[SETUP.md](SETUP.md)**

---

## Stack

- **Framework**: Next.js 16 (App Router) + TypeScript strict
- **Database**: PostgreSQL 17.6 (Supabase)
- **Cache**: Upstash Redis
- **Auth**: NextAuth v4
- **Styling**: Tailwind CSS v4 + Radix UI + shadcn/ui
- **Deployment**: Vercel

---

## Database

21 tabelle + 1 VIEW (14 CRM core + 7 SEO/Ads), 80+ indici.

| Risorsa | Descrizione |
|---------|-------------|
| `DATABASE_SCHEMA.md` | Schema completo, relazioni, FTS, indici |
| `schema.sql` | Dump schema per ricreazione DB (generato da `pg_dump`) |
| `src/types/database.ts` | TypeScript types per tutte le tabelle |
| `src/lib/postgres.ts` | Query helpers e CRUD operations |

---

## Commands

```bash
npm run dev              # Dev server
npm run build            # Production build
npm run lint             # ESLint
npx tsc --noEmit         # Type check
curl localhost:3000/api/health  # Health check
```

---

## Documentation

Lettura consigliata in ordine:

1. **[SETUP.md](SETUP.md)** — Setup ambiente, env vars, database, deploy
2. **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** — Schema DB completo (verificato via `pg_dump`)
3. **[UI_GUIDELINES.md](UI_GUIDELINES.md)** — Componenti UI, Tailwind v4, shadcn/ui, typography plugin
4. **[AGENTS.md](AGENTS.md)** — Guidelines per AI agent (Warp), patterns critici, business rules
5. **[SKILLS.md](SKILLS.md)** — Catalogo completo 35+ AI skills installate

---

## AI Skills

35+ skill installate in `.agents/skills/` da [skills.sh](https://skills.sh/) per l'AI agent.

Categorizzate per: React/Next.js, TypeScript, Database/Postgres, UI/Design, SEO/Ads, e utility.

Vedi **[SKILLS.md](SKILLS.md)** per catalogo completo con trigger d'uso e task-to-skill mapping.

---

## Deploy

Vercel deployment automatico su push a `main`.

Env vars richieste su Vercel: tutte quelle in `.env.local` (vedi [SETUP.md](SETUP.md#3-environment-variables)).
