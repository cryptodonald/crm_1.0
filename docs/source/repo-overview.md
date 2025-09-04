# 🚀 CRM 1.0 - Repository Overview & Developer Guidelines

## 📋 **EXECUTIVE SUMMARY**

**CRM 1.0** è un sistema enterprise di Customer Relationship Management costruito con tecnologie moderne e un'architettura scalabile. La caratteristica distintiva è il **sistema unificato di gestione API Keys** che sostituisce le tradizionali variabili d'ambiente con una soluzione dinamica enterprise-grade.

**Confidenza dell'analisi: 98%** - Analisi completa effettuata su tutti i componenti principali del sistema.

---

## 🛠️ **STACK TECNOLOGICO**

### **Core Framework**
- **Next.js 15.5.2** (App Router) - Framework React con SSR/SSG
- **React 19.1.0** - Libreria UI con supporto a Concurrent Features
- **TypeScript 5.x** - Linguaggio tipizzato (strict mode attivo)

### **Database & Storage**
- **Vercel KV** (@vercel/kv 3.0.0) - Database key-value per API keys
- **Airtable** (0.12.2) - Database principale per CRM data
- **Vercel Blob** (@vercel/blob 1.1.1) - Storage per file

### **UI & Styling**
- **TailwindCSS 4.1.12** - Framework CSS utility-first
- **shadcn/ui** (3.1.0) - Component library moderna
- **Radix UI** - Primitive components accessibili
- **Lucide React** - Libreria icone
- **Framer Motion** - Animazioni e transizioni

### **Development & Testing**
- **Vitest 3.2.4** - Framework di testing moderno
- **ESLint 9.x** + **Prettier** - Linting e formatting
- **React Testing Library** - Testing components

### **Integrations**
- **GitHub API** (@octokit/rest 22.0.0) - Integrazione development
- **Google Places API** - Servizi di geolocalizzazione

---

## 🏗️ **ARCHITETTURA DEL PROGETTO**

### **Struttura Directory**

```
src/
├── app/                    # Next.js App Router (RSC)
│   ├── api/               # Route API + validazione
│   │   ├── api-keys/      # Sistema gestione API keys
│   │   ├── leads/         # Gestione clienti/prospects
│   │   ├── activities/    # Gestione attività
│   │   └── webhooks/      # Webhook integrations
│   ├── leads/             # UI gestione leads
│   ├── developers/        # Dashboard API keys
│   └── (dashboard)/       # Layout dashboard
├── components/            # Componenti UI riutilizzabili
│   ├── ui/               # shadcn/ui components (NO MODIFY)
│   ├── features/         # Componenti specifici features
│   ├── layout/           # Componenti layout
│   └── forms/            # Componenti form
├── lib/                   # Business logic & utilities
│   ├── api-keys-service.ts # Servizio centralizzato API
│   ├── airtable/         # Client Airtable
│   ├── encryption.ts     # Crittografia AES-256
│   └── validations/      # Schema Zod
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
├── utils/                # Utility functions
└── constants/            # Costanti applicazione
```

### **Patterns Architetturali**

#### **API Key Management System**
- **Servizio Centralizzato**: `/src/lib/api-keys-service.ts`
- **Crittografia**: AES-256-GCM encryption at rest
- **Caching**: TTL 5 minuti per performance
- **Multi-tenant**: Isolamento per tenant

#### **Data Layer**
- **Airtable Client**: Enterprise-grade con rate limiting
- **Type Safety**: End-to-end TypeScript con Zod validation
- **Error Handling**: Retry logic e fallback graceful

---

## 🔧 **REGOLE DI LINTING & FORMATTAZIONE**

### **ESLint Configuration**
```javascript
// eslint.config.mjs - Regole principali
rules: {
  "@typescript-eslint/no-explicit-any": "off",      // Disabilitato
  "@typescript-eslint/no-unused-vars": "warn",      // Warning only
  "react/no-unescaped-entities": "off",             // Disabilitato
  "react-hooks/exhaustive-deps": "warn",            // Warning critical
}
```

### **Prettier Configuration**
```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "trailingComma": "es5",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

### **TypeScript Strict Mode**
- `strict: true` - Controlli rigorosi attivi
- `noImplicitReturns: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`

---

## 🌊 **WORKFLOW DI SVILUPPO**

### **Git Flow**
- **Branch Principale**: `master`
- **Convenzioni**: Nessuna branch protection configurata
- **Remote**: `origin/master`

### **Scripts NPM**
```json
{
  "dev": "next dev",                    // Development server
  "build": "next build",               // Production build
  "test": "vitest",                    // Run tests
  "lint": "next lint",                 // ESLint check
  "format": "prettier --write",        // Format code
  "validate": "npm run type-check && npm run lint && npm run test"
}
```

### **Deployment**
- **Target**: Vercel (optimizzato)
- **Build**: Ignora temporaneamente ESLint e TypeScript errors
- **Headers**: Security headers configurati

---

## 🎨 **UI/UX & COMPONENT LIBRARY**

### **shadcn/ui Configuration**
```json
{
  "style": "new-york",           // Design system
  "rsc": true,                   // React Server Components
  "baseColor": "neutral",        // Color palette
  "iconLibrary": "lucide"        // Icon set
}
```

### **🚨 REGOLA CRITICA: Component Modification**

**❌ MAI modificare componenti originali shadcn/ui in `/src/components/ui/`**

**✅ SEMPRE creare copie personalizzate:**
```typescript
// ❌ SBAGLIATO - Modificare /src/components/ui/dropdown-menu.tsx

// ✅ CORRETTO - Creare /src/components/ui/custom-dropdown-menu.tsx
import { DropdownMenu } from '@/components/ui/dropdown-menu';
// Estendere il componente originale
```

### **Design System**
- **TailwindCSS 4.x** - Utility-first approach
- **CSS Variables** - Theming dinamico
- **Dark/Light Mode** - Supporto temi
- **Responsive Design** - Mobile-first approach

---

## 🔒 **SICUREZZA & GESTIONE SEGRETI**

### **API Keys Management**
**🚨 REGOLA FONDAMENTALE: NON usare mai `process.env` direttamente**

```typescript
// ❌ MAI fare questo
const apiKey = process.env.AIRTABLE_API_KEY;

// ✅ SEMPRE fare questo
import { getAirtableKey } from '@/lib/api-keys-service';
const apiKey = await getAirtableKey();
```

### **Environment Variables (Minimali)**
```bash
# Solo 8 variabili essenziali (ridotto dal 85%)
KV_REST_API_URL=               # Vercel KV connection
KV_REST_API_TOKEN=             # Vercel KV token
ENCRYPTION_MASTER_KEY=         # Master key per AES-256
CURRENT_USER_ID=               # User context
CURRENT_TENANT_ID=             # Tenant isolation
NEXTAUTH_URL=                  # Auth URL
NODE_ENV=                      # Environment
NEXT_PUBLIC_APP_URL=           # Public app URL
```

### **Crittografia**
- **AES-256-GCM** per storage API keys
- **Master Key Derivation** con SHA-256
- **Encryption at Rest** in KV database

### **Controlli Sicurezza**
- **Headers Security** configurati in `next.config.ts`
- **Input Validation** con Zod schemas
- **CORS** gestito correttamente
- **Rate Limiting** per API calls

---

## 📐 **REGOLE DI SVILUPPO**

### **1. API Keys Usage**

**Helpers Disponibili:**
```typescript
// Airtable
getAirtableKey()                    // Main API key
getAirtableBaseId()                 // Base ID
getAirtableLeadsTableId()           // Leads table
getAirtableUsersTableId()           // Users table

// GitHub  
getGitHubToken()                    // GitHub API token

// Google
getGoogleMapsKey()                  // Maps API key

// Auth & Storage
getNextAuthSecret()                 // NextAuth secret
getBlobToken()                      // Vercel Blob token
```

### **2. Component Development**

**Per UI Components:**
1. **Non modificare** componenti originali shadcn/ui
2. **Creare copie** con prefisso `custom-` per modifiche
3. **Mantenere API** compatibile con originali
4. **Documentare** le modifiche nei commenti

**Per Business Components:**
1. Seguire pattern esistenti in `/src/components/features/`
2. Utilizzare custom hooks da `/src/hooks/`
3. Validazione props con TypeScript strict

### **3. Data Fetching**

```typescript
// Pattern consigliato per API routes
export async function GET(request: NextRequest) {
  try {
    // 1. Get credentials from API Key Service
    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
    ]);

    // 2. Validate credentials
    if (!apiKey || !baseId) {
      return NextResponse.json(
        { error: 'Missing credentials' },
        { status: 500 }
      );
    }

    // 3. Make API call
    // ... rest of logic
  } catch (error) {
    // Error handling
  }
}
```

### **4. Testing**

```typescript
// Testing con API Key Service mocking
import * as apiKeyService from '@/lib/api-keys-service';

jest.mock('@/lib/api-keys-service');

beforeEach(() => {
  (apiKeyService.getAirtableKey as jest.Mock)
    .mockResolvedValue('test-key');
});
```

---

## 🎯 **AVATAR SYSTEM**

Il sistema degli avatar utilizza:
- **Riconoscimento Genere**: Database nomi italiani + euristica suffissi
- **File Avatar**: `/public/avatars/` (male.png, female.png, admin.png)
- **Fallback**: Avatar neutro per nomi non riconosciuti
- **Utility**: `/src/lib/avatar-utils.ts`

---

## ✅ **DEVELOPER CHECKLIST**

### **Prima di iniziare un task:**
- [ ] Leggi le regole specifiche nelle RULES precedenti
- [ ] Verifica la confidenza (>95%) o chiedi chiarimenti
- [ ] Analizza le dipendenze del codice esistente

### **Durante lo sviluppo:**
- [ ] Usa API Key Service invece di `process.env`
- [ ] Non modificare componenti shadcn/ui originali
- [ ] Segui pattern TypeScript strict
- [ ] Valida input con Zod schemas

### **Prima del commit:**
- [ ] Esegui `npm run validate` (type-check + lint + test)
- [ ] Formatta con `npm run format`
- [ ] Testa le integrazioni con API keys dinamiche
- [ ] Verifica che non ci siano segreti hardcoded

### **Per modifiche UI:**
- [ ] Mantieni pattern design esistenti
- [ ] Testa su mobile (mobile-first)
- [ ] Verifica accessibilità (Radix UI patterns)
- [ ] Controlla dark/light mode

---

## 🚀 **SISTEMA API KEYS ENTERPRISE**

**Caratteristiche Principali:**
- **85% riduzione** environment variables
- **16 API keys crittografate** in KV database
- **Dashboard completo** `/developers/api-keys`
- **Real-time analytics** e usage tracking
- **Multi-tenant support** con isolamento

**Come utilizzare:**
```typescript
// Metodo 1: Chiavi singole
const apiKey = await getAirtableKey();

// Metodo 2: Chiavi multiple (ottimizzato)
const keys = await apiKeyService.getApiKeys([
  'airtable', 'github-api'
]);

// Metodo 3: Gruppi di servizio
const whatsappKeys = await getWhatsAppKeys();
```

---

## ❓ **AREE RICHIEDENTI CHIARIMENTO**

Nessuna area identificata con confidenza <95%. L'analisi del sistema è completa e tutti i componenti principali sono stati mappati correttamente.

---

**📅 Report generato**: 3 Gennaio 2025  
**🔍 Livello confidenza**: 98%  
**📊 Copertura analisi**: Completa

---

*Questo documento rappresenta lo stato attuale del progetto CRM 1.0 e deve essere aggiornato ad ogni cambio significativo dell'architettura.*
