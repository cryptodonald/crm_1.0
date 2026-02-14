# SKILLS.md — Guida alle Agent Skills installate

> 35 skill installate in `.agents/skills/` per il CRM 2.0 Doctorbed.
> Le skill si attivano **automaticamente** quando l'agent rileva un contesto pertinente.

## Come funzionano

Le skill sono knowledge base che l'agent carica on-demand. Non serve invocarle manualmente — l'agent le usa quando il task corrisponde ai trigger descritti sotto.

**Installazione nuove skill:**
```bash
npx skills add https://github.com/<owner>/<repo> --skill <nome-skill> --yes
```

**Directory:** `.agents/skills/<nome-skill>/SKILL.md`

---

## Skill per Categoria

### 🏗️ Stack Core (React + Next.js + TypeScript)

| Skill | Quando si attiva | Cosa fa |
|-------|-----------------|---------|
| **vercel-react-best-practices** | Scrittura/review componenti React, data fetching, bundle optimization | 40+ regole performance React/Next.js da Vercel Engineering |
| **next-best-practices** | Creazione pagine, API routes, layout, middleware Next.js | Best practices Next.js ufficiali Vercel |
| **nextjs-app-router-patterns** | Route groups, parallel routes, intercepting routes, loading/error states | Pattern specifici App Router |
| **next-cache-components** | Caching, revalidation, ISR, static/dynamic rendering | Strategie caching Next.js |
| **vercel-composition-patterns** | Refactoring componenti con troppi boolean props, compound components | Pattern composizione React scalabili |
| **typescript-advanced-types** | Utility types, generics, type guards, discriminated unions | TypeScript avanzato per strict mode |

### 🎨 UI / Styling

| Skill | Quando si attiva | Cosa fa |
|-------|-----------------|---------|
| **tailwind-v4-shadcn** | Setup Tailwind v4, fix colori, @theme inline, dark mode | Setup pattern 4-step, previene 8 errori documentati |
| **tailwind-design-system** | Creazione design tokens, spacing scale, color system | Design system completo con Tailwind |
| **shadcn-ui** | Installazione componenti, form con RHF+Zod, temi, dialog, table | Pattern completi shadcn/ui (63 componenti nel CRM) |
| **ui-ux-pro-max** | Design UI, review layout, palette, tipografia, animazioni | 50 stili, 21 palette, 50 font pairings, 9 stack |
| **web-design-guidelines** | "Review my UI", "check accessibility", "audit design" | 100+ regole compliance Web Interface Guidelines |
| **responsive-design** | Layout responsive, breakpoints, mobile-first | Pattern responsive design |

### 🗄️ Database (PostgreSQL / Supabase)

| Skill | Quando si attiva | Cosa fa |
|-------|-----------------|---------|
| **supabase-postgres-best-practices** | Query optimization, schema design, configurazione DB | Best practices Postgres specifiche Supabase |
| **postgresql-table-design** | Creazione/modifica tabelle, relazioni, constraints | Schema design Postgres |
| **sql-optimization-patterns** | Query lente, EXPLAIN ANALYZE, indici, JOIN optimization | Ottimizzazione query SQL (utile per i 59 indici del CRM) |
| **postgres-patterns** | Pattern generali Postgres (CTE, window functions, partitioning) | Pattern Postgres avanzati |
| **database-migration** | Creazione migration scripts, schema changes | Migration scripts SQL |

### 🔌 API & Backend

| Skill | Quando si attiva | Cosa fa |
|-------|-----------------|---------|
| **api-design-principles** | Design API routes RESTful, naming, versioning | Principi design API |
| **nodejs-backend-patterns** | Middleware, error handling, async patterns serverless | Pattern backend Node.js |
| **error-handling-patterns** | Try/catch, error boundaries, error response format | Pattern error handling (400/401/403/404/429/500) |

### 📝 Form & Validation

| Skill | Quando si attiva | Cosa fa |
|-------|-----------------|---------|
| **react-hook-form-zod** | Form con React Hook Form + Zod validation | Pattern form completi (il CRM usa RHF + Zod ovunque) |

### 🔐 Sicurezza & Auth

| Skill | Quando si attiva | Cosa fa |
|-------|-----------------|---------|
| **security-review** | Security audit del codice | Review sicurezza codice |
| **api-security-best-practices** | Rate limiting, input validation, auth middleware | Sicurezza API |
| **auth-implementation-patterns** | Flussi autenticazione, session management, JWT | Pattern autenticazione |
| **nextjs-supabase-auth** | Setup auth Next.js + Supabase | Auth specifico Next.js + Supabase |
| **secrets-management** | Gestione env vars, secrets rotation | Gestione secrets (Vercel env vars) |
| **gdpr-data-handling** | Trattamento dati personali, data retention, consent | GDPR compliance per dati CRM |

### 🧪 Testing

| Skill | Quando si attiva | Cosa fa |
|-------|-----------------|---------|
| **webapp-testing** | Scrittura test per webapp | Testing webapp completo |
| **test-driven-development** | Approccio TDD, red-green-refactor | Metodologia TDD |
| **e2e-testing-patterns** | Test end-to-end, Playwright, Cypress | Pattern E2E testing |

### 🔍 Debug & Code Quality

| Skill | Quando si attiva | Cosa fa |
|-------|-----------------|---------|
| **systematic-debugging** | Bug investigation, root cause analysis | Metodologia debug strutturata |
| **code-review-excellence** | Code review, PR review | Best practices code review |
| **accessibility-compliance** | Audit a11y, WCAG, aria attributes | Compliance accessibilità |
| **verification-before-completion** | Prima di completare qualsiasi task | Verifica automatica pre-completamento |

### 🛠️ Utility

| Skill | Quando si attiva | Cosa fa |
|-------|-----------------|---------|
| **find-skills** | "Come faccio X?", "C'è una skill per..." | Cerca e installa nuove skill |

---

## Skill più utili per task comuni del CRM

| Task | Skill che si attivano |
|------|----------------------|
| **Creare un nuovo componente UI** | vercel-react-best-practices, shadcn-ui, tailwind-v4-shadcn, vercel-composition-patterns |
| **Aggiungere una API route** | api-design-principles, nodejs-backend-patterns, error-handling-patterns, api-security-best-practices |
| **Ottimizzare query Postgres** | supabase-postgres-best-practices, sql-optimization-patterns, postgres-patterns |
| **Creare/modificare un form** | react-hook-form-zod, shadcn-ui, tailwind-v4-shadcn |
| **Fix un bug** | systematic-debugging, verification-before-completion |
| **Aggiungere una nuova tabella** | postgresql-table-design, database-migration, supabase-postgres-best-practices |
| **Review sicurezza** | security-review, api-security-best-practices, secrets-management |
| **Scrivere test** | webapp-testing, test-driven-development, e2e-testing-patterns |
| **Review UI/UX** | web-design-guidelines, ui-ux-pro-max, accessibility-compliance, responsive-design |
| **Setup auth** | auth-implementation-patterns, nextjs-supabase-auth |

---

## Note

- Le skill in `.agents/skills/` sono anche symlinked in `.claude/skills/` per compatibilità Claude Code.
- Ogni skill ha un file `SKILL.md` con istruzioni dettagliate che l'agent legge automaticamente.
- Per aggiornare una skill: rimuovi la cartella e reinstalla con `npx skills add`.
- Per rimuovere: `rm -rf .agents/skills/<nome-skill>` + `rm -rf .claude/skills/<nome-skill>`.
