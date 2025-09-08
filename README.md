# Project Operational Index

Questa repository usa documentazione modulare governata da `docs/index.yaml`.

## Documenti chiave
- [rules/global-rules.md](/docs/rules/global-rules.md)
- [rules/api-keys.md](/docs/rules/api-keys.md)
- [rules/repo-rules.md](/docs/rules/repo-rules.md)
- [domain/leads.md](/docs/domain/leads.md)
- [domain/avatar-system.md](/docs/domain/avatar-system.md)
- [runbooks/local-dev.md](/docs/runbooks/local-dev.md)
- [runbooks/migrations.md](/docs/runbooks/migrations.md)
- [runbooks/release.md](/docs/runbooks/release.md)
- [runbooks/incident.md](/docs/runbooks/incident.md)
- [validation/mcp-validation.md](/docs/validation/mcp-validation.md)

## Runbook rapidi
- [runbooks/local-dev.md](/docs/runbooks/local-dev.md)
- [runbooks/migrations.md](/docs/runbooks/migrations.md)

---

## Appendice — README originale
# 🚀 CRM 1.0 - Enterprise CRM with Advanced API Key Management

A modern, enterprise-grade CRM system built with Next.js 15, TypeScript, featuring a complete **API Key Management System** with hybrid encryption and advanced UI.

## 🌟 **Latest Features - Performance & API Management**

### 🚀 **Performance Optimizations (NEW)**
- **⚡ Ultra-Fast Loading**: Lead pages load in ~100ms (99% faster than before)
- **🗄️ Smart Caching**: KV-based caching with TTL (60s leads, 300s users)
- **🔄 Intelligent Retry**: Exponential backoff for network resilience
- **📈 Real-time Monitoring**: Performance metrics with automatic alerts
- **🎯 Cache Intelligence**: 85-90% hit rates with automatic invalidation
- **📊 Performance Dashboard**: Latency tracking, error monitoring, health checks

### 🔐 **API Key Management System**
- **🔐 Complete API Keys Dashboard**: Full CRUD operations with advanced UI
- **🔒 Hybrid Encryption**: Support for legacy and modern key formats with safe previews
- **📈 Usage Analytics**: Real-time statistics, tracking, and monitoring
- **🛡️ Permission System**: Granular access control (Read, Write, Delete, Admin)
- **⚡ Advanced UI**: Data tables, dialogs, copy-to-clipboard with visual feedback
- **🔧 Key Management**: IP whitelisting, expiration dates, active/inactive states
- **📋 Legacy Migration**: Seamless migration from old encryption formats

## 🏢 **Core Enterprise Features**

- **Modern Tech Stack**: Next.js 15.5.2, React 19, TypeScript strict mode
- **Enterprise Architecture**: Scalable, maintainable, and type-safe
- **Advanced Data Layer**: Upstash KV + Airtable integration with robust error handling
- **Performance-First**: <200ms API responses with intelligent caching
- **Multiple Integrations**: GitHub, Google Places API, Vercel Blob Storage
- **Security First**: Encrypted storage, webhook verification, input validation
- **Developer Experience**: shadcn/ui, ESLint, comprehensive TypeScript support
- **Production Ready**: Vercel deployment optimized with performance headers
- **Resilience**: Circuit breakers, retry logic, graceful degradation

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
- Environment variables (see `.env.example`)

### Installation

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Environment setup**:

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual API keys
   ```

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

## 🚀 **Performance Guidelines**

### 🎯 **Current Performance Metrics**

- **Lead Detail API**: ~100ms (cached) / ~800ms (uncached)
- **Users API**: ~110ms (cached) / ~600ms (uncached)  
- **Cache Hit Rate**: 85-90% typical
- **Error Rate**: <2% with automatic retry

### 📋 **Performance Best Practices**

#### ✅ **DO: Leverage Caching System**
```typescript
// Automatic caching with TTL
import { getCachedLead, getCachedUsers } from '@/lib/cache';

// Lead data cached for 60 seconds
const lead = await getCachedLead(leadId, fetchFunction);

// Users data cached for 300 seconds (5 minutes)
const users = await getCachedUsers(fetchFunction);
```

#### ✅ **DO: Use Performance Monitoring**
```typescript
import { recordApiLatency, recordError } from '@/lib/performance-monitor';

// Record performance metrics
recordApiLatency('my_api', latency, wasCached);
recordError('my_api', errorMessage, statusCode);
```

#### ✅ **DO: Implement Retry Logic**
```typescript
import { useFetchWithRetry } from '@/hooks/use-fetch-with-retry';

// Automatic retry with exponential backoff
const { data, loading, error, retry } = useFetchWithRetry(
  fetchFunction,
  { maxRetries: 2, baseDelay: 1000 }
);
```

#### ❌ **DON'T: Skip Error Handling**
```typescript
// ❌ BAD - No error handling
const data = await fetch('/api/data');

// ✅ GOOD - Proper error handling with retry
const { data, error } = useFetchWithRetry(fetchData);
if (error) {
  // Handle error gracefully
}
```

#### 📊 **Monitoring & Troubleshooting**

- **Performance Dashboard**: [See /docs/runbooks/lead-performance.md](docs/runbooks/lead-performance.md)
- **Cache Status**: Monitor hit/miss rates in development console
- **Alert Thresholds**: Warning >1.5s, Critical >5s for lead APIs
- **Health Checks**: Built-in monitoring with automatic alerts

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
