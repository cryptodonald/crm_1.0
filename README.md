# Project Operational Index

Questa repository usa documentazione modulare governata da `docs/index.yaml`.

## Documenti chiave
- [rules/global-rules.md](/docs/rules/global-rules.md)
- [rules/api-keys.md](/docs/rules/api-keys.md)
- [rules/repo-rules.md](/docs/rules/repo-rules.md)
- [performance/guidelines.md](/docs/performance/guidelines.md)
- [performance/audit-completo.md](/docs/performance/audit-completo.md)
- [runbooks/lead-performance.md](/docs/runbooks/lead-performance.md)
- [ui-system/clean.md](/docs/ui-system/clean.md)
- [ui-system/migration.md](/docs/ui-system/migration.md)
- [domain/leads.md](/docs/domain/leads.md)
- [domain/avatar-system.md](/docs/domain/avatar-system.md)
- [runbooks/local-dev.md](/docs/runbooks/local-dev.md)
- [runbooks/migrations.md](/docs/runbooks/migrations.md)
- [runbooks/remote-keys-sync.md](/docs/runbooks/remote-keys-sync.md)
- [runbooks/release.md](/docs/runbooks/release.md)
- [runbooks/incident.md](/docs/runbooks/incident.md)
- [validation/mcp-validation.md](/docs/validation/mcp-validation.md)

## Runbook rapidi
- [runbooks/local-dev.md](/docs/runbooks/local-dev.md)
- [runbooks/migrations.md](/docs/runbooks/migrations.md)
- [runbooks/remote-keys-sync.md](/docs/runbooks/remote-keys-sync.md)

---

## Appendice — README originale
# 🚀 CRM 1.0 - Enterprise CRM with Advanced API Key Management

A modern, enterprise-grade CRM system built with Next.js 15, TypeScript, featuring a complete **API Key Management System** with hybrid encryption and advanced UI.

## 🌟 **Latest Features - API Key Management System**

- **🔐 Complete API Keys Dashboard**: Full CRUD operations with advanced UI
- **🔒 Hybrid Encryption**: Support for legacy and modern key formats with safe previews
- **📊 Usage Analytics**: Real-time statistics, tracking, and monitoring
- **🛡️ Permission System**: Granular access control (Read, Write, Delete, Admin)
- **⚡ Advanced UI**: Data tables, dialogs, copy-to-clipboard with visual feedback
- **🔧 Key Management**: IP whitelisting, expiration dates, active/inactive states
- **📋 Legacy Migration**: Seamless migration from old encryption formats

## 🏢 **Core Enterprise Features**

- **Modern Tech Stack**: Next.js 15.5.2, React 19, TypeScript strict mode
- **Enterprise Architecture**: Scalable, maintainable, and type-safe
- **Advanced Data Layer**: Upstash KV + Airtable integration with robust error handling
- **Multiple Integrations**: GitHub, Google Places API, Vercel Blob Storage
- **Security First**: Encrypted storage, webhook verification, input validation
- **Developer Experience**: shadcn/ui, ESLint, comprehensive TypeScript support
- **Production Ready**: Vercel deployment optimized with performance headers

## 🏗️ **Architecture Overview**

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes with validation
│   └── (dashboard)/       # Main application pages
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   ├── layout/           # Layout components
│   ├── features/         # Feature-specific components
│   └── forms/            # Form components
├── lib/                  # Business logic and utilities
│   ├── airtable/        # Airtable abstraction layer
│   ├── github/          # GitHub integration
│   ├── google/          # Google Places API
│   ├── vercel/          # Vercel Blob storage
│   └── validations/     # Zod validation schemas
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── constants/           # Application constants
└── utils/               # Utility functions
```

## 🛠️ **Quick Start**

### Prerequisites

- Node.js 18+ and npm
- Environment variables (see `VERCEL_ENV_LIST.md`)

### Installation

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Environment setup**:

   Create `.env.local` with required variables from [VERCEL_ENV_LIST.md](VERCEL_ENV_LIST.md):

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual API keys
   # Required: AIRTABLE_API_KEY, AIRTABLE_BASE_ID, NEXTAUTH_SECRET, JWT_SECRET, etc.
   ```

3. **Development server**:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Development Workflow

**Type checking:**
```bash
npm run tsc --noEmit  # or: npx tsc --noEmit
```

**Linting:**
```bash
npm run lint
```

**Format code:**
```bash
npm run format
```

**Running tests:**
```bash
npm run test
```

**Full CI checks (before committing):**
```bash
npm run tsc --noEmit && npm run lint && npm run build
```

### Production Build

```bash
npm run build
npm start
```

## 🔒 **Security & Environment Variables**

All sensitive environment variables are managed through **Vercel Project Settings** in production.

**Local development:** Use `.env.local` (git-ignored) — see [VERCEL_ENV_LIST.md](VERCEL_ENV_LIST.md) for complete list.

**CI/CD:** GitHub Actions automatically runs type checking and linting on pull requests (see `.github/workflows/ci.yml`).

⚠️ **Never commit secrets or `.env.local` to git.**

## 📋 **Architecture & Documentation

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed system design.

See [REFACTOR_PLAN.md](REFACTOR_PLAN.md) for ongoing improvements and roadmap.

3. **Development server**:

   ```bash
   npm run dev
   ```

4. **Open your browser** to [http://localhost:3000](http://localhost:3000)

5. **Access API Keys Dashboard**: Visit [http://localhost:3000/developers/api-keys](http://localhost:3000/developers/api-keys)

## 🔑 **API Key Management System**

### Dashboard Features

- **📊 Statistics Overview**: Total keys, active keys, usage metrics
- **🗂️ Data Table**: Sortable and filterable key list with actions
- **➕ Create Keys**: Full form with permissions and security settings
- **✏️ Edit Keys**: Update with "Show Current Value" functionality
- **👁️ View Details**: Comprehensive information display
- **🔗 Copy Function**: Secure clipboard operations with visual feedback

### Security Features

- **🔐 Hybrid Encryption**: Modern `ENC:` format + legacy support
- **🛡️ Safe Previews**: Partial display (`d4fa...b946`) without full decryption
- **🔒 Permission Control**: Read, Write, Delete, Admin levels
- **📍 IP Whitelisting**: Restrict usage by IP address/range
- **⏰ Expiration Dates**: Automatic key expiration
- **📈 Usage Tracking**: Monitor API key usage and statistics

### 🚨 **CRITICAL: API Keys Usage Guidelines**

**❌ NEVER use `process.env` directly in API routes**
**✅ ALWAYS use the API Key Service**

```typescript
// ❌ BAD - Never do this
const apiKey = process.env.AIRTABLE_API_KEY;

// ✅ GOOD - Always do this
import { getAirtableKey, getAirtableBaseId } from '@/lib/api-keys-service';

const apiKey = await getAirtableKey();
const baseId = await getAirtableBaseId();
```

#### Available API Key Helpers:

- `getAirtableKey()` - Main Airtable API key
- `getAirtableBaseId()` - Airtable base ID
- `getAirtableLeadsTableId()` - Leads table ID
- `getAirtableUsersTableId()` - Users table ID
- `getAirtableActivitiesTableId()` - Activities table ID
- `getAirtableOrdersTableId()` - Orders table ID
- `getAirtableProductsTableId()` - Products table ID
- `getAirtableAutomationsTableId()` - Automations table ID
- `getGitHubToken()` - GitHub API token
- `getGoogleMapsKey()` - Google Maps API key
- `getNextAuthSecret()` - NextAuth secret
- `getBlobToken()` - Vercel Blob storage token
- `getDatabaseUrl()` - Database connection string

#### All API keys and table IDs are stored in KV database, not environment variables.

### API Endpoints

- `GET /api/api-keys` - List all keys with pagination
- `POST /api/api-keys` - Create new API key
- `GET /api/api-keys/[id]` - Get specific key details
- `PUT /api/api-keys/[id]` - Update existing key
- `DELETE /api/api-keys/[id]` - Delete key
- `GET /api/api-keys/stats` - Usage statistics

## 📋 **Environment Variables**

Required environment variables (see `.env.example`):

```env
# Airtable Configuration
AIRTABLE_API_KEY=your_airtable_api_key_here
AIRTABLE_BASE_ID=your_airtable_base_id_here

# GitHub Integration
GITHUB_TOKEN=your_github_token_here
GITHUB_WEBHOOK_SECRET=your_github_webhook_secret_here

# Google Places API
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here

# Vercel Blob Storage
VERCEL_BLOB_READ_WRITE_TOKEN=your_vercel_blob_token_here
```

## 🧪 **Testing**

```bash
# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🔧 **Development Scripts**

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run type-check       # Check TypeScript types
npm run validate         # Run all checks (type, lint, test)
```

## 📦 **Deployment**

### Vercel (Recommended)

1. **Connect repository** to Vercel
2. **Configure environment variables** in Vercel dashboard
3. **Deploy**:
   ```bash
   npm run deploy          # Production deployment
   npm run deploy:preview  # Preview deployment
   ```

## 🏛️ **Key Architecture Decisions**

### 1. **Data Layer**

- **Airtable Client**: Enterprise-grade with rate limiting, retry logic, and error handling
- **Type Safety**: End-to-end TypeScript with auto-generated schemas
- **Validation**: Zod schemas for runtime type checking

### 2. **Security**

- **Environment Variables**: Type-safe validation with Zod
- **Webhook Security**: Signature verification with timing-safe comparison
- **Input Validation**: All user inputs validated with Zod schemas

### 3. **Developer Experience**

- **TypeScript Strict**: Maximum type safety
- **ESLint + Prettier**: Code consistency
- **Testing**: Vitest with React Testing Library

### 4. **UI Components Guidelines**

#### 🚨 **CRITICAL: shadcn/ui Component Modification Rules**

**❌ NEVER modify original shadcn/ui components directly in `/src/components/ui/`**
**✅ ALWAYS create custom copies for modifications**

```typescript
// ❌ BAD - Never modify original components
// Editing /src/components/ui/dropdown-menu.tsx directly

// ✅ GOOD - Create custom components
// Create /src/components/ui/custom-dropdown-menu.tsx
// Import and extend the original component
```

#### Component Modification Best Practices:

1. **Create Custom Components**: For any modifications, create a new file with `custom-` prefix
2. **Preserve Originals**: Keep original shadcn/ui components untouched for updates
3. **Document Changes**: Add comments explaining why custom version was needed
4. **Maintain Compatibility**: Ensure custom components follow same API patterns
5. **Version Control**: Track custom components separately from library updates

---

**Built with ❤️ using modern web technologies and enterprise architecture patterns.**
