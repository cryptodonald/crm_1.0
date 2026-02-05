# Contesto Conversazione Agent - CRM 2.0

**Data creazione**: 2026-02-02  
**Ultimo aggiornamento**: 2026-02-02

Questo documento riassume lo stato attuale del progetto e le ultime modifiche implementate per permettere il trasferimento del contesto su un altro computer.

---

## 📊 Stato Progetto

### Stack & Architettura
- **Framework**: Next.js 16 (App Router) + React 19.2.3
- **TypeScript**: Strict mode
- **Styling**: Tailwind CSS v4
- **UI**: Radix UI + shadcn/ui
- **Backend**: Airtable (source of truth)
- **Cache**: Upstash Redis
- **Auth**: NextAuth v4
- **AI**: OpenAI GPT-4o-mini
- **Deployment**: Vercel

### Database (Airtable)
Base ID: `app359c17lK0Ta8Ws`

**Tabelle**:
- **Leads** (`tblKIZ9CDjcQorONA`)
- **Activities** (`tblbcuRXKrWvne0Wy`)
- **Orders** (`tblkqfCMabBpVD1fP`)
- **Products** (`tblEFvr3aT2jQdYUL`)
- **Users** (`tbl141xF7ZQskCqGh`)
- **Notes** (`tblXXXXXXXXXXXXXX`) - creata recentemente

---

## ✅ Features Implementate

### 1. Login Redirect Fix
- **File**: `src/app/api/auth/[...nextauth]/route.ts`
- **Fix**: Redirect a `/dashboard/` invece di `/dashboard/leads` dopo login
- **Status**: ✅ Completato

### 2. Dark Mode
- **Files**:
  - `src/components/theme-provider.tsx`
  - `src/components/mode-toggle.tsx`
  - `src/app/layout.tsx` (ThemeProvider wrapper)
  - `src/components/layout/site-header-custom.tsx` (toggle in header)
- **Features**: Light/Dark/System mode con persistenza localStorage
- **Status**: ✅ Completato

### 3. Toast Notifications (Sonner)
- **Files**:
  - `src/components/ui/sonner.tsx`
  - `src/app/layout.tsx` (Toaster component)
- **Config**: Stili default shadcn/ui (no custom CSS)
- **Status**: ✅ Completato

### 4. Pagination Avanzata
- **File**: `src/components/leads/leads-data-table.tsx`
- **Features**:
  - Page numbers con ellipsis
  - Row selector (5/10/20/50/100 righe)
  - Traduzioni italiane (Precedente/Successiva)
  - Layout: info righe a sinistra, controlli a destra
- **Status**: ✅ Completato

### 5. Table Preferences Persistence
- **File**: `src/hooks/use-table-preferences.ts`
- **Persistenza**: `itemsPerPage` + `visibleColumns` in localStorage
- **Key**: `crm_leads_table_preferences`
- **Status**: ✅ Completato

### 6. Activities Column
- **File**: `src/components/leads/leads-data-table.tsx`
- **Display**: Count attività con icona Activity blu
- **Posizione**: Tra "Data" e "Relazioni"
- **Status**: ✅ Completato

### 7. UI Layout Improvements (Latest)
- **File**: `src/components/leads/leads-data-table.tsx`
- **Changes**:
  - Badge Stato e Fonte spostati sotto il nome (non più inline)
  - Città su riga separata sotto i badge
  - Layout verticale più pulito:
    ```
    [Avatar] Nome  [#]
             [Stato] [Fonte]
             Città
    ```
- **Status**: ✅ Completato

---

## 🚀 Features In Progress

### 8. Notes System ✅ COMPLETATO
**Obiettivo**: Sostituire campo Note singolo con timeline cronologica Activities + Notes.

**Struttura Notes Table (Airtable)** (`tblmvBiXtpQ2Qm0C7`):
- `Lead` (Link → Leads) - obbligatorio
- `User` (Link → Users) - obbligatorio
- `Content` (Long text) - obbligatorio
- `Type` (Single select): Riflessione, Promemoria, Follow-up, Info Cliente
- `Pinned` (Checkbox)
- `CreatedAt` (Created time, formato ISO/European)

**API Endpoints**:
- ✅ `GET /api/notes?leadId=X` - Fetch note per lead
- ✅ `POST /api/notes` - Crea nuova nota
- ✅ `PATCH /api/notes/[id]` - Aggiorna nota
- ✅ `DELETE /api/notes/[id]` - Elimina nota

**Componenti UI**:
- ✅ `src/components/leads/lead-timeline.tsx` - Timeline unificata
- ✅ `src/components/leads/add-note-dialog.tsx` - Modal aggiungi nota
- ✅ `src/app/leads/[id]/page.tsx` - Pagina dettaglio lead con timeline
- ✅ `src/hooks/use-notes.ts` - Hook SWR per note

**Features**:
- ✅ Timeline cronologica (Esigenza + Activities + Notes)
- ✅ Color-coded note types (Riflessione, Promemoria, Follow-up, Info Cliente)
- ✅ Pinned notes con icona
- ✅ Delete/Edit actions per nota
- ✅ Optimistic updates con SWR
- ✅ Validation con Zod
- ✅ Toast notifications per feedback

**Status**: ✅ Sistema completo e funzionante
- ✅ Types auto-generati (`AirtableNotes`)
- ✅ `AIRTABLE_NOTES_TABLE_ID` in `env.ts`
- ✅ Notes table in `airtable.ts` exports
- ✅ Link da tabella lead a pagina dettaglio

---

## 🤖 AI Gender Inference System

**Obiettivo**: Auto-popolare campo Gender quando mancante sui nuovi lead.

**Architettura**:
- **Helper**: `src/lib/infer-gender.ts`
  - `inferGenderFromName(nome)` → Gender + confidence
  - `inferGenderBatch(nomi[])` → Map risultati
- **Webhook**: `src/app/api/webhooks/airtable/new-lead/route.ts`
  - Riceve notifica Airtable quando nuovo lead creato
  - Verifica Gender vuoto → chiama AI → aggiorna Airtable
  - Protetto con `AIRTABLE_WEBHOOK_SECRET`
- **Script one-time**: `scripts/fix-missing-gender.ts`
  - Trova lead esistenti senza Gender
  - Batch processing per efficienza
  - Raggruppa per nome (evita chiamate duplicate)

**Docs**: `docs/WEBHOOK_SETUP.md` - Guida completa setup webhook Airtable

**Status**:
- ✅ Helper AI implementato
- ✅ Endpoint webhook implementato
- ✅ Script one-time creato
- ✅ Documentazione completa
- ⏳ Pending: Setup webhook su Airtable (manuale)

**Configurazione Richiesta**:
```bash
# .env.local o Vercel
AIRTABLE_WEBHOOK_SECRET=your-secret-key-here
OPENAI_API_KEY=sk-...
```

**Setup Airtable Automation**:
1. Trigger: "When a record is created" su Leads
2. Condition: Gender is empty
3. Action: "Send HTTP request"
   - URL: `https://your-domain.vercel.app/api/webhooks/airtable/new-lead`
   - Method: POST
   - Headers: `x-webhook-secret`, `Content-Type: application/json`
   - Body: `{ "recordId": "{{AIRTABLE_RECORD_ID}}", "fields": {...} }`

---

## 🎨 Sistema Colori Centralizzato

**File**: `src/lib/airtable-colors.ts`

**Funzioni**:
- `getLeadStatusColor(stato: string)` → classi Tailwind
- `getSourceColor(fonte: string, hex?: string)` → classi Tailwind

**Vantaggi**:
- Colori coerenti in tutta l'app
- Gestisce hex custom da Airtable + fallback Tailwind
- Unico punto di manutenzione

---

## 🗂️ File Chiave da Conoscere

### Configurazione
- `src/env.ts` - Zod-validated env vars (CRITICAL - app fails if invalid)
- `.env.local` - Environment variables (non committato)
- `tailwind.config.ts` - Tailwind v4 config

### Componenti Principali
- `src/components/leads/leads-data-table.tsx` - Tabella leads principale
- `src/components/ui/avatar-lead.tsx` - Avatar lead con genere
- `src/components/layout/site-header-custom.tsx` - Header con dark mode toggle

### API Routes
- `src/app/api/leads/route.ts` - Batch endpoint leads
- `src/app/api/users/route.ts` - Lookup utenti attivi
- `src/app/api/ai/parse-lead-text/route.ts` - AI text parser
- `src/app/api/webhooks/airtable/new-lead/route.ts` - Webhook gender inference

### Hooks
- `src/hooks/use-table-preferences.ts` - Persistent table settings
- `src/hooks/use-optimistic-update.ts` - Optimistic UI pattern (per future mutations)

### Types
- `src/types/airtable.ts` - TypeScript types per Airtable schema

---

## 📝 Documentazione Esterna

**Directory**: `docs/`
- `AGENTS.md` - Guida completa per AI agent (regole, patterns, scope)
- `WEBHOOK_SETUP.md` - Setup webhook Airtable per gender inference
- `REBUILD_PLAN.md` - Piano rebuild CRM 2.0 completo (27 giorni)
- `UI_INVENTORY.md` - Spec UI dettagliata (14 pagine)
- `FEATURE_KEEP_DROP_LATER.md` - Scope matrix (MVP vs future)
- `QUESTIONS.md` - 20 domande business logic risolte
- `AUDIT_INSIGHTS.md` - Learnings da CRM 1.0

**Scripts**: `scripts/`
- Setup e manutenzione tabelle Airtable
- Migration scripts
- Test utilities

---

## 🐛 Bug Fix Completati

### Bug: Gender Mancante su Lead da Automazione
**Problema**: Lead creati manualmente hanno Gender popolato, lead da automazione Airtable no.

**Soluzione**: Sistema AI gender inference automatico
- Webhook Airtable chiama endpoint quando nuovo lead creato
- AI inferisce gender dal nome
- Aggiorna Airtable automaticamente

**Status**: ✅ Implementato, pending setup webhook Airtable

---

## ⚙️ Environment Variables Richieste

```bash
# Airtable
AIRTABLE_API_KEY=keyXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=app359c17lK0Ta8Ws
AIRTABLE_LEADS_TABLE_ID=tblKIZ9CDjcQorONA
AIRTABLE_ACTIVITIES_TABLE_ID=tblbcuRXKrWvne0Wy
AIRTABLE_ORDERS_TABLE_ID=tblkqfCMabBpVD1fP
AIRTABLE_PRODUCTS_TABLE_ID=tblEFvr3aT2jQdYUL
AIRTABLE_USERS_TABLE_ID=tbl141xF7ZQskCqGh
AIRTABLE_NOTES_TABLE_ID=tblXXXXXXXXXXXXXX  # Nuovo

# NextAuth
NEXTAUTH_SECRET=your-secret
JWT_SECRET=your-jwt-secret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Redis (Upstash)
KV_URL=...
KV_REST_API_TOKEN=...

# Vercel Blob
VERCEL_BLOB_READ_WRITE_TOKEN=...

# OpenAI
OPENAI_API_KEY=sk-...

# Webhook (per gender inference)
AIRTABLE_WEBHOOK_SECRET=your-webhook-secret
```

---

## 🚀 Comandi Utili

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)

# Build & Production
npm run build            # Production build con type checking
npm start                # Start production server

# Code Quality
npm run lint             # ESLint
npx tsc --noEmit         # Type check

# Scripts Manutenzione
npx tsx scripts/migrate-notes.ts           # Migra note esistenti
npx tsx scripts/fix-missing-gender.ts      # Fix gender mancante
npx tsx scripts/test-notes-table.ts        # Test connessione Notes
```

---

## 🎯 Principi di Sviluppo

1. **Airtable as Source of Truth**: Nessun DB locale, tutto su Airtable
2. **Batch First**: Endpoint aggregati per performance
3. **Fail-Fast**: Env vars validate all'avvio (Zod)
4. **Optimistic UI**: Update immediato + rollback su errore
5. **Cache Granulare**: Redis con invalidazione selettiva
6. **Rate Limiting**: Per-user, per-endpoint
7. **Pixel-Perfect UI**: Identica a CRM 1.0 (screenshot comparison gate)

---

## 🔜 Next Steps (Immediate)

1. **Notes System**:
   - [ ] Aggiungere `AIRTABLE_NOTES_TABLE_ID` a `.env.local`
   - [ ] Definire TypeScript types in `src/types/airtable.ts`
   - [ ] Creare API `/api/notes` (CRUD)
   - [ ] Implementare LeadTimeline component
   - [ ] Modal "Aggiungi Nota"

2. **Gender Inference**:
   - [ ] Setup webhook Airtable seguendo `docs/WEBHOOK_SETUP.md`
   - [ ] Aggiungere `AIRTABLE_WEBHOOK_SECRET` su Vercel
   - [ ] Testare con lead di prova

3. **Testing**:
   - [ ] Verificare dark mode su tutti i componenti
   - [ ] Test pagination con dataset grandi
   - [ ] Validare layout su mobile

---

## 📌 Note per l'AI Agent (Nuovo Computer)

Quando riprendi la conversazione su un altro computer:

1. **Leggi questo file per primo** per capire il contesto
2. **Leggi `docs/AGENTS.md`** per regole e patterns del progetto
3. **Verifica .env.local** - tutte le variabili presenti?
4. **Run `npm run dev`** - app funziona?
5. **Check branch git** - sei su `main`?

**Linguaggio**: Parla sempre in italiano con l'utente.

**Stile**: Conciso, diretto, usa emoji per readability (✅ ❌ 🚀 📋 etc.)

**Rule critiche**:
- Non inventare: se manca info, chiedi
- Fail-safe: env vars validate all'avvio
- UI parity: NESSUNA modifica visiva senza screenshot comparison
- Commit format: `type(scope): description` + `Co-Authored-By: Warp <agent@warp.dev>`

---

## 🆘 Troubleshooting Rapido

**App non parte**:
```bash
# 1. Check env vars
cat .env.local

# 2. Type check
npx tsc --noEmit

# 3. Lint
npm run lint

# 4. Clean build
rm -rf .next node_modules
npm install
npm run build
```

**Airtable errors**:
- Verifica API key valida
- Check rate limits (5 req/sec)
- Logs: `vercel logs --follow`

**Dark mode non funziona**:
- Verifica `<ThemeProvider>` in root layout
- Check `<Toaster />` presente
- localStorage key: `theme`

---

**Fine del documento**. Usa questo come riferimento completo dello stato del progetto.
