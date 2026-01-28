# WARP.md — Operational Rules
> Fonte: docs/index.yaml (version 1) — generato automaticamente


## Sicurezza & Anti-allucinazioni

<!-- BEGIN:rules/global-rules.md -->
# Regole Operative Globali (Universal Engineering)

## Principi
- Chiarezza, sicurezza, ripetibilità.
- Soluzione più semplice che soddisfa i requisiti.
- Automazioni idempotenti, niente scorciatoie non richieste.

## Anti-allucinazioni
- Non inventare: dichiara i dati mancanti.
- Assunzioni SEMPRE esplicite e verificate prima di agire.
- Output minimo verificabile (dry-run/simulazione) prima di eseguire.
- Cita le verifiche locali (file/righe o comandi).
- Se contesto insufficiente: blocco **Dati mancanti** e nessuna esecuzione.

## Sicurezza
- Conferma obbligatoria per azioni distruttive, DB/credenziali, prod, modifiche >50 file.
- Segreti: mai in chiaro; usa placeholder e secret manager.

**Denylist (chiedi sempre conferma):** `rm`, `rmdir`, `chmod -R`, `chown -R`, `dd`, `mkfs`, `mount`, `umount`, `iptables*`, `systemctl`, `service`, `eval`, `curl|wget` con pipe verso shell/file, `git push --force`, `docker system prune -a`, migrazioni/deploy su prod.

**Allowlist (auto-esecuzione ok):** `ls`, `pwd`, `cat` (non sensibili), `head -n 200`, `tail -n 200`, `grep/rg`, `fd/find` (senza `-delete`), `which`, `git status`, `git diff -U0`, lint/test in locale.

## Pianificazione & Formato Risposte
- Piano 3–7 passi: **Obiettivo → Passi → Rischi → Rollback**.
- Formato anti-errore: Piano → Assunzioni → Verifiche (read-only) → Dry-run → Esecuzione (conferma) → Rollback.
- Confidenza stimata: bassa | media | alta (con comportamento conseguente).

## Git & Qualità
- Commit: `tipo(scope): descrizione` (`feat|fix|refactor|docs|test|chore|perf|ci`).
- Lint/format del linguaggio; test minimi quando si tocca logica.
- Dipendenze ridotte; motivare ogni nuova libreria.

## Observability, Data & Privacy
- Log a livelli, default `info`, nessun segreto/PII nei log.
- Minimizzazione dati, schema documentato, retention definita.

## Container & CI/CD
- Dockerfile minimale; niente segreti in build args; cache.
- Pipeline: `lint → test → build → deploy`; artefatti solo utili.
<!-- END:rules/global-rules.md -->

## API Keys (estratto)

<!-- BEGIN:rules/api-keys.md -->
# API Keys — Linee Guida e Sistema Unificato

> Versione consolidata del 2025-09-04. Fonte: `API_KEYS_GUIDELINES.md`, `API_KEYS_SYSTEM.md`, `UNIFIED_SYSTEM_SUMMARY.md`, `api-keys-permissions-implementation.md`.

## Obiettivi
- Gestione centralizzata delle chiavi (creazione, permessi, rotazione, audit).
- Riduzione esposizione nei repo e nei log.
- Compatibilità con ambienti locali, CI/CD e produzione.

## Linee Guida (estratto)
# 🔑 API Keys Usage Guidelines

## 🚨 **CRITICAL RULES**

### ❌ **NEVER DO THIS**

```typescript
// WRONG - Direct environment variable usage (deprecated system)
const apiKey = process.env.AIRTABLE_API_KEY; // ❌ Legacy approach
const baseId = process.env.AIRTABLE_BASE_ID;  // ❌ Legacy approach

// WRONG - Hardcoded values (security risk)
const USERS_TABLE_ID = 'tbl141xF7ZQskCqGh'; // ❌ Should be dynamic
```

### ✅ **ALWAYS DO THIS**

```typescript
// CORRECT - Use API Key Service
import {
  getAirtableKey,
  getAirtableBaseId,
  getAirtableUsersTableId,
} from '@/lib/api-keys-service';

export async function GET(request: NextRequest) {
  // Get credentials dynamically from KV database
  const [apiKey, baseId, tableId] = await Promise.all([
    getAirtableKey(),
    getAirtableBaseId(),
    getAirtableUsersTableId(),
  ]);

  if (!apiKey || !baseId || !tableId) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 500 });
  }

  // Use them in your API calls
  const response = await fetch(
    `https://api.airtable.com/v0/${baseId}/${tableId}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );
}
```

## 📚 **Available API Key Helpers**

### 🏢 **Airtable**

```typescript
import {
  getAirtableKey, // Main API key
  getAirtableBaseId, // Base ID: app359c17lK0Ta8Ws
  getAirtableLeadsTableId, // tblKIZ9CDjcQorONA
  getAirtableUsersTableId, // tbl141xF7ZQskCqGh
  getAirtableActivitiesTableId, // tblbcuRXKrWvne0Wy
  getAirtableOrdersTableId, // tbl5iiBlaGbj7uHMM
  getAirtableProductsTableId, // tbloI7bXoN4sSvIbw
  getAirtableAutomationsTableId, // tblSd4GAZo9yHQvG0
} from '@/lib/api-keys-service';
```

### 🐙 **GitHub**

```typescript
import {
  getGitHubToken, // Personal access token
  getGitHubKeys, // All GitHub keys at once
} from '@/lib/api-keys-service';

// Get multiple keys at once for performance
const { token, appPrivateKey, webhookSecret } = await getGitHubKeys();
```

### 🗺️ **Google Maps**

```typescript
import { getGoogleMapsKey } from '@/lib/api-keys-service';

const mapsKey = await getGoogleMapsKey();
```

### 🔐 **Authentication & Storage**

```typescript
import {
  getNextAuthSecret, // NextAuth JWT secret
  getBlobToken, // Vercel Blob storage
  getDatabaseUrl, // Database connection
} from '@/lib/api-keys-service';
```

## 📋 **Complete Example: Creating an API Route**

```typescript
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getAirtableKey,
  getAirtableBaseId,
  getAirtableLeadsTableId,
} from '@/lib/api-keys-service';

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [Example API] Starting request');

    // 1. Get credentials from KV database (NOT environment variables)
    const [apiKey, baseId, tableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableLeadsTableId(),
    ]);

    // 2. Validate all credentials are available
    if (!apiKey || !baseId || !tableId) {
      console.error('❌ Missing Airtable credentials:', {
        hasApiKey: !!apiKey,
        hasBaseId: !!baseId,
        hasTableId: !!tableId,
      });
      return NextResponse.json(
        { error: 'Missing Airtable credentials' },
        { status: 500 }
      );
    }

    // 3. Use credentials in your API call
    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/${tableId}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const data = await response.json();

    console.log('✅ [Example API] Success');
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('❌ [Example API] Error:', error);
    return NextResponse.json(
      {
        error: 'API request failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

## 🔄 **Migration Guide**

### Migrating from Legacy System:

1. **Import the API Key Service:**

   ```typescript
   import { getAirtableKey, getAirtableBaseId } from '@/lib/api-keys-service';
   ```

2. **Replace deprecated environment variable usage:**

   ```typescript
   // ❌ Before (Legacy - deprecated)
   const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
   const AIRTABLE_BASE_ID = 'app359c17lK0Ta8Ws';

   // ✅ After (Modern - current system)
   const [apiKey, baseId] = await Promise.all([
     getAirtableKey(),
     getAirtableBaseId(),
   ]);
   ```

3. **Add error handling:**
   ```typescript
   if (!apiKey || !baseId) {
     return NextResponse.json(
       { error: 'Missing credentials' },
       { status: 500 }
     );
   }
   ```

## ⚡ **Performance Tips**

### 1. **Use Promise.all for multiple keys:**

```typescript
// Good - Parallel execution
const [apiKey, baseId, tableId] = await Promise.all([
  getAirtableKey(),
  getAirtableBaseId(),
  getAirtableUsersTableId(),
]);

// Bad - Sequential execution
const apiKey = await getAirtableKey();
const baseId = await getAirtableBaseId(); // Waits for previous
const tableId = await getAirtableUsersTableId(); // Waits for previous
```

### 2. **Use batch helpers when available:**

```typescript
// Use specialized batch helpers
const githubKeys = await getGitHubKeys(); // Gets all GitHub keys at once
```

## 🧪 **Testing with Dynamic Keys**

```typescript
// In tests, you can mock the API key service
import * as apiKeyService from '@/lib/api-keys-service';

jest.mock('@/lib/api-keys-service');

beforeEach(() => {
  (apiKeyService.getAirtableKey as jest.Mock).mockResolvedValue('test-api-key');
  (apiKeyService.getAirtableBaseId as jest.Mock).mockResolvedValue(
    'test-base-id'
  );
});
```

## 🎯 **Why This System?**

1. **🔐 Security**: Keys are encrypted and stored securely in KV database
2. **🔄 Dynamic**: Keys can be updated without code changes or redeployment
3. **📊 Tracking**: Usage statistics and monitoring built-in
4. **🛡️ Permissions**: Granular access control per key
5. **⚡ Performance**: Built-in caching reduces KV database calls
6. **🧪 Testing**: Easy to mock and test different scenarios

---

**Remember: The database KV contains all the real values. Environment variables are only used for KV connection details and user context.**

## Sistema & Architettura (estratto)
# API Keys Management System

This document describes the complete API Keys management system implemented in CRM 1.0.

## Overview

The API Keys system provides secure authentication and authorization for the CRM API, with features including:

- Encrypted API key storage using Vercel KV
- Comprehensive permission management
- Usage tracking and analytics
- IP whitelisting for enhanced security
- Expiration date management
- Real-time statistics and monitoring

## Architecture

### Backend Components

#### 1. Encryption Service (`/src/lib/encryption.ts`)

- **AES-256-GCM encryption** for secure API key storage
- Key derivation using SHA-256
- Utility functions for API key generation and masking

#### 2. KV Storage Service (`/src/lib/kv.ts`)

- **Vercel KV integration** for fast Redis-based storage
- Comprehensive CRUD operations for API keys
- Usage statistics tracking
- Efficient data organization with key prefixes

#### 3. API Routes

- **`/api/api-keys`** - GET (list) and POST (create)
- **`/api/api-keys/[id]`** - GET, PUT (update), DELETE
- **`/api/api-keys/stats`** - Statistics and usage analytics

### Frontend Components

#### 1. Custom Hook (`/src/hooks/use-env-vars.ts`)

- Centralized state management for API keys
- Error handling and loading states
- Automatic data refresh and caching

#### 2. UI Components (`/src/components/api-keys/`)

- **ApiKeysStats** - Dashboard statistics cards
- **ApiKeysDataTable** - Interactive data table with actions
- **ApiKeysEditDialog** - Create/edit form with advanced settings
- **CreateApiKeyButton** - Simple action button

#### 3. Main Page (`/src/app/developers/api-keys/page.tsx`)

- Complete integration of all components
- Real-time updates and error handling
- Responsive layout and user experience

## Features

### Security Features

- **Encryption at Rest**: All API keys are encrypted using AES-256-GCM
- **IP Whitelisting**: Restrict API access to specific IP ranges
- **Permission-based Access**: Granular permission system (read, write, delete, admin)
- **Secure Key Generation**: Cryptographically secure random key generation
- **One-time Key Display**: API keys are shown only once during creation

### Management Features

- **CRUD Operations**: Full create, read, update, delete functionality
- **Bulk Actions**: Multi-select operations for efficiency
- **Search and Filter**: Find API keys quickly
- **Active/Inactive Status**: Enable/disable keys without deletion
- **Expiration Management**: Set automatic expiry dates

### Analytics and Monitoring

- **Usage Statistics**: Track API calls per key
- **Historical Data**: 30-day usage history
- **Trend Analysis**: Week-over-week usage comparison
- **Alert System**: Notifications for expired or expiring keys
- **Real-time Metrics**: Live dashboard statistics

## Environment Variables

The system requires the following environment variables:

```bash
# Encryption
ENCRYPTION_MASTER_KEY=your-256-bit-encryption-key

# Vercel KV
KV_REST_API_URL=your-vercel-kv-rest-api-url
KV_REST_API_TOKEN=your-vercel-kv-rest-api-token

# Development Context
CURRENT_USER_ID=user_dev_001
CURRENT_TENANT_ID=tenant_dev
```

## Usage

### Creating API Keys

1. Navigate to `/developers/api-keys`
2. Click "Create API Key"
3. Configure name, description, permissions
4. Set optional advanced settings (expiration, IP whitelist)
5. Copy the generated key (shown only once)

### Managing API Keys

- **View Details**: Click on any key in the table
- **Edit Settings**: Use the dropdown menu → Edit
- **Delete Keys**: Use the dropdown menu → Delete (with confirmation)
- **Monitor Usage**: View statistics cards and usage metrics

### API Authentication

Include the API key in request headers:

```http
Authorization: Bearer crm_your-api-key-here
```

## Data Model

### ApiKeyData Interface

```typescript
interface ApiKeyData {
  id: string; // Unique identifier
  name: string; // Human-readable name
  key: string; // Encrypted API key
  userId: string; // Owner user ID
  tenantId: string; // Tenant/organization ID
  permissions: string[]; // Permission array ['read', 'write', etc.]
  isActive: boolean; // Active status
  lastUsed?: Date; // Last usage timestamp
  usageCount: number; // Total usage counter
  createdAt: Date; // Creation timestamp
  updatedAt: Date; // Last update timestamp
  expiresAt?: Date; // Optional expiration date
  description?: string; // Optional description
  ipWhitelist?: string[]; // Optional IP restrictions
}
```

## Storage Schema

### KV Key Patterns

- `api_key:{id}` - Individual API key data
- `user_api_keys:{userId}` - User's API key list (set)
- `tenant_api_keys:{tenantId}` - Tenant's API key list (set)
- `api_key_usage:{id}:{date}` - Daily usage counters
- `api_key_usage:{id}:last_endpoint` - Last used endpoint

## Security Considerations

1. **Encryption Keys**: Store encryption master keys securely
2. **Environment Isolation**: Use different keys per environment
3. **Access Logging**: Monitor API key usage for anomalies
4. **Regular Rotation**: Encourage periodic key rotation
5. **Principle of Least Privilege**: Grant minimum necessary permissions

## Development Notes

### Testing

The system includes mock data and development contexts. For production:

1. Implement proper authentication middleware
2. Add rate limiting and abuse detection
3. Set up monitoring and alerting
4. Configure proper logging and auditing

### Scaling Considerations

- KV storage handles high-frequency operations efficiently
- Usage statistics are automatically cleaned up (30-day retention)
- Consider implementing key hashing for faster lookups at scale

## Future Enhancements

Potential improvements:

- **API Key Rotation**: Automatic key rotation features
- **Usage Quotas**: Rate limiting per API key
- **Webhook Integration**: Real-time usage notifications
- **Advanced Analytics**: More detailed usage patterns
- **Multi-tenant Management**: Enhanced organization features
- **SSO Integration**: Enterprise authentication options

## Support

For issues or questions about the API Keys system:

1. Check the application logs for error details
2. Verify environment variable configuration
3. Ensure Vercel KV is properly configured
4. Review the API documentation for usage examples

## Implementazione permessi (estratto)
# API Keys Permissions System - Implementation Plan

## Panoramica

Il sistema di gestione delle chiavi API attualmente implementato ha una solida base per la gestione dei permessi, ma necessita di implementazioni aggiuntive per diventare completamente funzionale con controlli granulari e sicurezza avanzata.

## Stato Attuale

### ✅ Già Implementato

- [x] Definizione dei 4 permessi base (`read`, `write`, `delete`, `admin`)
- [x] UI per selezione permessi nel dialog di creazione/modifica
- [x] Memorizzazione permessi nel database KV
- [x] Crittografia delle chiavi API
- [x] Controllo ownership (solo proprietario può modificare)
- [x] Supporto per scadenza e IP whitelist
- [x] Audit log basico per creazione/modifica/eliminazione
- [x] Interfaccia utente completa con date picker italiano
- [x] Visualizzazione permessi nel dialog dettagli
- [x] Sistema di caching per performance

### ❌ Da Implementare

- [ ] Middleware di autenticazione API per verificare permessi
- [ ] Mapping granulare permessi → endpoints
- [ ] Controlli runtime sui permessi
- [ ] Rate limiting basato sui permessi
- [ ] Audit log dettagliato per ogni operazione
- [ ] Sistema di notifiche per violazioni di sicurezza
- [ ] Monitoraggio e metriche di utilizzo permessi

---

## Implementazioni Future

### 1. Middleware di Autenticazione API

**Priorità: Alta**  
**Stima: 2-3 giorni**

#### Obiettivo

Creare un middleware che intercetti tutte le richieste API e verifichi i permessi della chiave utilizzata.

#### File da creare/modificare

- `src/middleware/api-auth.ts` - Middleware principale
- `src/lib/permissions.ts` - Logica di verifica permessi
- `middleware.ts` (root) - Configurazione Next.js middleware

#### Implementazione

```typescript
// src/middleware/api-auth.ts
export class ApiAuthMiddleware {
  async validateRequest(request: NextRequest): Promise<{
    valid: boolean;
    apiKey?: ApiKeyData;
    error?: string;
  }> {
    // 1. Estrarre API key dall'header Authorization
    // 2. Decriptare e validare la chiave
    // 3. Verificare scadenza e stato attivo
    // 4. Controllare IP whitelist
    // 5. Verificare permessi per l'endpoint richiesto
    // 6. Aggiornare usage statistics
  }
}
```

#### Punti di Attenzione

- Performance: caching delle validazioni
- Security: rate limiting per tentativi non validi
- Logging: audit trail dettagliato
- Compatibilità: non rompere API esistenti

---

### 2. Mapping Permessi → Endpoints

**Priorità: Alta**  
**Stima: 1-2 giorni**

#### Obiettivo

Definire quali permessi sono necessari per ogni endpoint API del CRM.

#### File da creare

- `src/config/api-permissions.ts` - Configurazione mapping

#### Struttura del Mapping

```typescript
export const API_PERMISSIONS_MAP: Record<
  string,
  {
    path: string;
    methods: Record<HttpMethod, PermissionRequirement>;
  }
> = {
  '/api/leads': {
    path: '/api/leads',
    methods: {
      GET: { permissions: ['read'], description: 'Visualizzare leads' },
      POST: { permissions: ['write'], description: 'Creare leads' },
      PUT: { permissions: ['write'], description: 'Modificare leads' },
      DELETE: { permissions: ['delete'], description: 'Eliminare leads' },
    },
  },
  '/api/admin/*': {
    path: '/api/admin/*',
    methods: {
      '*': { permissions: ['admin'], description: 'Operazioni amministrative' },
    },
  },
};
```

#### Categorie di Endpoint

1. **Read-only**: `['read']`
   - GET /api/leads, /api/clients, /api/orders
   - GET /api/reports (dashboard stats)

2. **Write operations**: `['read', 'write']`
   - POST, PUT /api/leads, /api/clients, /api/orders
   - POST /api/activities, /api/notes

3. **Delete operations**: `['read', 'write', 'delete']`
   - DELETE /api/leads, /api/clients, /api/orders

4. **Admin operations**: `['admin']`
   - Tutto sotto /api/admin/\*
   - Operazioni di sistema e configurazione
   - Gestione utenti e tenant

---

### 3. Rate Limiting Basato sui Permessi

**Priorità: Media**  
**Stima: 2-3 giorni**

#### Obiettivo

Implementare rate limiting differenziato in base ai permessi della chiave API.

#### File da creare

- `src/lib/rate-limiter.ts`
- `src/config/rate-limits.ts`

#### Logica di Rate Limiting

```typescript
export const RATE_LIMITS: Record<Permission, RateLimit> = {
  read: { requests: 1000, window: 3600 }, // 1000 req/ora
  write: { requests: 500, window: 3600 }, // 500 req/ora
  delete: { requests: 100, window: 3600 }, // 100 req/ora
  admin: { requests: 2000, window: 3600 }, // 2000 req/ora
};
```

#### Implementazione

- Redis/KV per contatori
- Finestre temporali scorrevoli
- Headers di risposta con limite/rimanenti
- Graceful degradation

---

### 4. Sistema di Audit Avanzato

**Priorità: Media**  
**Stima: 3-4 giorni**

#### Obiettivo

Creare un sistema completo di audit logging per ogni operazione API.

#### File da estendere/creare

- `src/lib/audit-logger.ts` (estendere esistente)
- `src/types/audit.ts`
- `src/app/api/audit/route.ts` (per consultazione logs)

#### Informazioni da Tracciare

```typescript
interface AuditLogEntry {
  id: string;
  timestamp: Date;
  apiKeyId: string;
  endpoint: string;
  method: string;
  permissionsUsed: string[];
  ipAddress: string;
  userAgent: string;
  responseStatus: number;
  responseTime: number;
  dataAccessed?: {
    resource: string;
    recordIds: string[];
    fields: string[];
  };
  rateLimitHit?: boolean;
  securityFlags?: string[];
}
```

#### Dashboard di Audit

- Visualizzazione logs in tempo reale
- Filtri per chiave API, endpoint, permessi
- Alerts per comportamenti sospetti
- Export per compliance

---

### 5. Sistema di Notifiche di Sicurezza

**Priorità: Bassa**  
**Stima: 2-3 giorni**

#### Obiettivo

Notificare automaticamente violazioni di sicurezza e comportamenti anomali.

#### Trigger per Notifiche

- Tentativi di accesso con chiavi non valide
- Uso di chiavi scadute
- Rate limiting superato
- Accesso da IP non in whitelist
- Tentativi di escalation privilegi
- Pattern di uso anomali

#### Canali di Notifica

- Email agli amministratori
- Webhook verso sistemi esterni
- Dashboard alerts
- Slack/Discord integration

---

### 6. Metriche e Monitoraggio

**Priorità: Bassa**  
**Stima: 3-4 giorni**

#### Obiettivo

Sistema completo di metriche per monitoraggio delle chiavi API.

#### Metriche da Tracciare

```typescript
interface ApiKeyMetrics {
  // Utilizzo
  requestsPerHour: number;
  requestsPerDay: number;
  successRate: number;
  averageResponseTime: number;

  // Permessi
  permissionsUsageBreakdown: Record<Permission, number>;
  endpointsAccessed: string[];

  // Sicurezza
  failedAuthAttempts: number;
  ipAddressesUsed: string[];
  securityViolations: number;

  // Performance
  slowestEndpoints: Array<{ endpoint: string; avgTime: number }>;
  errorRates: Record<string, number>;
}
```

#### Dashboard Metriche

- Grafici di utilizzo in tempo reale
- Heatmap degli endpoint più utilizzati
- Trend di sicurezza
- Performance analytics

---

## Fasi di Implementazione

### Fase 1: Sicurezza Core (Settimana 1-2)

1. Middleware di autenticazione API
2. Mapping permessi → endpoints
3. Controlli runtime sui permessi

### Fase 2: Performance e Monitoring (Settimana 3)

1. Rate limiting basato sui permessi
2. Sistema di audit avanzato
3. Ottimizzazioni performance

### Fase 3: UX e Analytics (Settimana 4)

1. Dashboard per audit logs
2. Sistema di notifiche
3. Metriche e monitoraggio

### Fase 4: Features Avanzate (Future)

1. Permessi granulari per risorsa
2. Gestione gruppi e ruoli
3. Integrazione con sistemi external auth
4. API versioning con permessi

---

## Considerazioni Tecniche

### Performance

- **Caching**: Redis/KV per validazioni frequenti
- **Async Processing**: Audit logging non-blocking
- **Connection Pooling**: Ottimizzazioni database
- **CDN**: Static assets per dashboard

### Sicurezza

- **Encryption**: Tutti i dati sensibili crittografati
- **Zero Trust**: Verifica continua, non fiducia implicita
- **Principle of Least Privilege**: Permessi minimi necessari
- **Defense in Depth**: Multipli livelli di controllo

### Scalabilità

- **Horizontal Scaling**: Middleware stateless
- **Database Partitioning**: Sharding per tenant
- **Event Sourcing**: Per audit trail immutabile
- **Microservices Ready**: Architettura modulare

### Compliance

- **GDPR**: Right to be forgotten, data portability
- **SOC 2**: Audit controls e monitoring
- **ISO 27001**: Security management system
- **PCI DSS**: Se si gestiscono dati di pagamento

---

## Metriche di Successo

### Sicurezza

- ✅ 0 violazioni di permessi non autorizzate
- ✅ 100% delle richieste API autenticate
- ✅ < 1% di tentativi di accesso fraudolenti
- ✅ Tempo medio di detection < 30 secondi

### Performance

- ✅ Latenza aggiuntiva middleware < 50ms
- ✅ Cache hit rate > 90%
- ✅ API availability > 99.9%
- ✅ Rate limiting accuracy > 95%

### User Experience

- ✅ Dashboard caricamento < 2 secondi
- ✅ Audit logs ricerca < 500ms
- ✅ Setup nuova chiave API < 60 secondi
- ✅ Notifiche consegnate entro 1 minuto

---

## Note di Implementazione

### Testing Strategy

- Unit tests per ogni componente
- Integration tests per workflows completi
- Performance tests sotto carico
- Security penetration testing
- End-to-end testing automato

### Deployment Strategy

- Feature flags per rollout graduale
- Blue-green deployment per zero downtime
- Database migration scripts
- Rollback procedures documentate
- Monitoring per ogni release

### Documentation

- API documentation aggiornata
- Runbook per operations team
- Security playbook per incidents
- Developer guides per extension
- User guides per dashboard

---

**Documento creato**: 2025-09-01  
**Ultima revisione**: 2025-09-01  
**Revisione successiva**: 2025-09-15  
**Owner**: Team Development  
**Stakeholders**: Security Team, DevOps Team, Product Team

## Sommario Unificato (estratto)
# 🚀 Sistema API Keys Unificato - Completato!

## 🎯 **Trasformazione Epocale Completata**

Abbiamo successfully evoluto il CRM da un sistema basato su variabili d'ambiente statiche a un **sistema unificato enterprise-grade** con gestione dinamica delle API keys.

---

## 📊 **Confronto: Prima vs Dopo**

### **❌ PRIMA (Sistema Obsoleto)**

```bash
# ❌ OBSOLETE: Previous system (55+ environment variables)
# Example of what we replaced:
# AIRTABLE_API_KEY=patKEe4q8UeW13rVL...
# WHATSAPP_ACCESS_TOKEN=EAAK4HqeL9VkBPb...
# GITHUB_TOKEN=github_pat_11AXMP4NQ...
# ... +50+ other static variables (now dynamically managed)
```

**Problemi del Sistema Legacy:**

- 🚫 Chiavi statiche (redeploy richiesto per modifiche)
- 🚫 Nessun tracking dell'utilizzo
- 🚫 Nessuna scadenza automatica
- 🚫 Nessun controllo granulare dei permessi
- 🚫 Nessuna crittografia (plain text storage)
- 🚫 Nessuna interfaccia di gestione

### **✅ DOPO (Sistema Unificato)**

#### **File Environment (8 righe essenziali)**

```bash
# .env.local - SOLO infrastruttura essenziale
KV_REST_API_URL="https://mint-mammal-42977.upstash.io"
KV_REST_API_TOKEN="AafhAAIncDFlNjljMGI2..."
ENCRYPTION_MASTER_KEY="CRM1.0-SecureMasterKey..."
CURRENT_USER_ID=user_admin_001
CURRENT_TENANT_ID=tenant_doctorbed
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### **API Keys (16 chiavi nel database KV)**

```typescript
// Accesso dinamico tramite servizio centralizzato
import { getAirtableKey, getWhatsAppToken } from '@/lib/api-keys-service';

const airtableKey = await getAirtableKey(); // ✨ Dinamico!
const whatsappToken = await getWhatsAppToken(); // ✨ Con tracking!
```

---

## 🏗️ **Architettura del Sistema Unificato**

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Application   │    │  API Key Service │    │  KV Database    │
│                 │────│                  │────│  (Encrypted)    │
│ getAirtableKey()│    │  • Caching       │    │  16 API Keys    │
│ getWhatsAppKeys()│   │  • Decryption    │    │  • Categories   │
│ getGitHubToken() │    │  • Usage Tracking│    │  • Permissions  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │              ┌──────────────────┐               │
         └──────────────│   Dashboard UI   │───────────────┘
                       │ /developers/     │
                       │  api-keys        │
                       └──────────────────┘
```

---

## 📈 **Risultati Ottenuti**

### **🔧 Componenti Implementati:**

1. **✅ Servizio Centralizzato** (`/src/lib/api-keys-service.ts`)
   - Caching intelligente (5 minuti TTL)
   - Decryption sicura
   - Usage tracking automatico
   - Health check integrati

2. **✅ Dashboard Completo** (`/developers/api-keys`)
   - 16 API keys migrate e gestibili
   - Statistiche in tempo reale
   - CRUD operations complete
   - Categorizzazione per servizio

3. **✅ Environment Minimale** (`.env.local`)
   - Da 55 variabili → 8 variabili essenziali
   - Riduzione del 85% delle configurazioni statiche

4. **✅ Migrazione Completa**
   - Infrastructure: 3 keys (Vercel, Database)
   - CRM: 2 keys (Airtable)
   - Communication: 4 keys (WhatsApp)
   - Development: 3 keys (GitHub)
   - Authentication: 1 key (NextAuth)
   - Location: 1 key (Google Maps)
   - Webhooks: 2 keys (URLs)

### **🎯 Benefici Raggiunti:**

| Caratteristica    | Prima              | Dopo                   |
| ----------------- | ------------------ | ---------------------- |
| **Aggiornamenti** | Redeploy richiesto | Real-time              |
| **Tracking**      | Nessuno            | Automatico             |
| **Sicurezza**     | Testo in chiaro    | AES-256 crittografato  |
| **Scadenze**      | Nessuna            | Programmabili          |
| **Multi-tenant**  | No                 | Sì                     |
| **Dashboard**     | Nessuna            | Completa               |
| **Performance**   | Lettura diretta    | Cache + ottimizzazioni |
| **Monitoraggio**  | Nessuno            | Analytics complete     |

---

## 🛠️ **Come Usare il Nuovo Sistema**

### **Metodo 1: Chiavi Singole**

```typescript
import {
  getAirtableKey,
  getWhatsAppToken,
  getGitHubToken,
} from '@/lib/api-keys-service';

// Nel tuo componente/API
const airtableKey = await getAirtableKey();
const whatsappToken = await getWhatsAppToken();
const githubToken = await getGitHubToken();
```

### **Metodo 2: Chiavi Multiple (Ottimizzato)**

```typescript
import { apiKeyService } from '@/lib/api-keys-service';

const keys = await apiKeyService.getApiKeys([
  'airtable',
  'whatsapp-api',
  'github-api',
]);
const airtableKey = keys['airtable'];
const whatsappToken = keys['whatsapp-api'];
```

### **Metodo 3: Gruppi di Servizio**

```typescript
import { getWhatsAppKeys, getGitHubKeys } from '@/lib/api-keys-service';

const whatsapp = await getWhatsAppKeys();
// { accessToken, webhookSecret, appSecret, webhookVerifyToken }

const github = await getGitHubKeys();
// { token, appPrivateKey, webhookSecret }
```

---

## 🎮 **Gestione tramite Dashboard**

### **Funzionalità Disponibili:**

- 🔍 **Visualizza** tutte le API keys in un posto
- ➕ **Crea** nuove API keys con wizard guidato
- ✏️ **Modifica** permessi e scadenze
- 🗑️ **Elimina** chiavi compromesse
- 📊 **Monitora** utilizzo in tempo reale
- 🔔 **Alert** automatici per scadenze
- 📈 **Analytics** dettagliate per ogni chiave
- 🏷️ **Categorizza** per tipo di servizio
- 🛡️ **IP Whitelist** per sicurezza avanzata

### **URL Dashboard:**

http://localhost:3001/developers/api-keys

---

## 🔒 **Sicurezza Enterprise**

### **Crittografia:**

- **AES-256-GCM** per storage sicuro
- **Master key** derivation con SHA-256
- **Encryption at rest** in KV database

### **Controlli Accesso:**

- **Multi-tenant isolation**
- **Permission-based access** (read, write, delete, admin)
- **IP whitelisting** opzionale
- **Automatic expiration** support

### **Monitoring:**

- **Usage tracking** per ogni chiamata
- **Audit trail** completo
- **Health checks** automatici
- **Error logging** centralizzato

---

## 📋 **File di Migrazione Creati**

### **Core System:**

- `src/lib/api-keys-service.ts` - Servizio centralizzato
- `.env.infrastructure` - Configurazione minimale
- `.env.local` - Environment di produzione (8 variabili)

### **Migration Tools:**

- `scripts/migrate-all-api-keys.js` - Script di migrazione completa
- `src/app/api/example-migration/route.ts` - Esempio di utilizzo

### **Documentation:**

- `docs/MIGRATION_EXAMPLES.md` - Guide di migrazione
- `docs/UNIFIED_SYSTEM_SUMMARY.md` - Questo documento
- `docs/API_KEYS_SYSTEM.md` - Documentazione tecnica

### **Backup:**

- `.env.local.backup` - Backup del sistema precedente

---

## 🚀 **Status Finale**

### **✅ Completato al 100%:**

- [x] Sistema centralizzato implementato
- [x] 16 API keys migrate e crittografate
- [x] Dashboard completo e funzionante
- [x] Environment variables ridotte del 85%
- [x] Caching e performance ottimizzate
- [x] Security enterprise-grade
- [x] Multi-tenant ready
- [x] Documentazione completa

### **🎯 Il Risultato:**

Il CRM ora ha un **sistema di gestione API Keys di livello enterprise** che è:

- 🔄 **Dinamico** - Aggiornamenti real-time
- 🛡️ **Sicuro** - Crittografia e controlli avanzati
- 📊 **Monitorabile** - Analytics e tracking completi
- 🎛️ **Gestibile** - Dashboard intuitivo
- ⚡ **Performante** - Caching intelligente
- 🏢 **Enterprise** - Multi-tenant e scalabile

---

## 🎉 **Conclusione**

**TRASFORMAZIONE COMPLETATA CON SUCCESSO! 🎯**

Da un sistema di environment variables statiche siamo evoluti a un **sistema enterprise unificato** che gestisce dinamicamente 16 API keys con funzionalità avanzate di sicurezza, monitoraggio e gestione.

Il CRM è ora pronto per la produzione con un sistema di API key management degno delle migliori piattaforme enterprise! 🚀

---

_Sistema implementato il 31 Agosto 2025 - CRM 1.0 Enterprise Edition_

## Migrazione da .env
- Vedi runbook: [/docs/runbooks/migrations.md](../runbooks/migrations.md)
<!-- END:rules/api-keys.md -->

## Performance & Caching (estratto)

<!-- BEGIN:performance/guidelines.md -->
# 🚀 Performance Guidelines - CRM Enterprise

> **Versione 2.0** - Aggiornato 2025-01-07  
> Implementate ottimizzazioni che riducono il tempo di caricamento pagine da **10+ secondi** a **~100ms**

---

## 🎯 **Performance Targets & SLA**

### Target Operativi
- **Lead Detail API**: <100ms (cached) / <800ms (uncached)
- **Users API**: <110ms (cached) / <600ms (uncached)
- **Cache Hit Rate**: >85% per dati stabili
- **Error Rate**: <2% con retry automatico
- **Page Load Time**: <200ms per pagine già in cache

### SLA di Produzione
- **P95 Latency**: <1.5s per qualsiasi pagina
- **Availability**: >99.9%
- **MTTR**: <5 minuti per performance issues

---

## 🗄️ **Sistema di Caching Intelligente**

### 🔥 Pattern Obbligatorio per API Routes

```typescript
// src/app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCachedLead, invalidateLeadCache } from '@/lib/cache';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';
import { getAirtableKey, getAirtableBaseId, getAirtableLeadsTableId } from '@/lib/api-keys-service';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const requestStart = performance.now();
  const { id } = await params;
  
  try {
    console.log(`🔍 [API] Starting request for: ${id}`);

    // 🚀 SEMPRE usa il sistema di caching
    const result = await getCachedLead(id, async () => {
      // Get credentials in parallel
      const [apiKey, baseId, tableId] = await Promise.all([
        getAirtableKey(),
        getAirtableBaseId(),
        getAirtableLeadsTableId(),
      ]);

      if (!apiKey || !baseId || !tableId) {
        throw new Error('Missing Airtable credentials');
      }

      // Direct Airtable call with compression
      const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${id}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br', // 🚀 Compressione
        },
      });

      if (!response.ok) {
        throw new Error(`Airtable API error: ${response.status}`);
      }

      const record = await response.json();
      return {
        id: record.id,
        createdTime: record.createdTime,
        ...record.fields, // 🚀 Tutti i campi disponibili
      };
    });

    const totalTime = performance.now() - requestStart;
    const wasCached = totalTime < 100; // Cache threshold
    
    // 📊 SEMPRE registra metriche
    recordApiLatency('lead_api', totalTime, wasCached);
    
    console.log(`✅ [API] Completed: ${id} in ${totalTime.toFixed(2)}ms (cached: ${wasCached})`);
    
    return NextResponse.json({
      success: true,
      lead: result,
      _timing: {
        total: Math.round(totalTime),
        cached: wasCached,
      }
    });

  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // 📊 SEMPRE registra errori
    recordError('lead_api', errorMessage);
    recordApiLatency('lead_api', totalTime, false);
    
    console.error(`❌ [API] Error in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch lead',
        _timing: { total: Math.round(totalTime), cached: false }
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  // ... update logic ...
  
  // 🚀 SEMPRE invalida cache dopo modifiche
  await invalidateLeadCache(id);
  
  return NextResponse.json({ success: true });
}
```

### 🎯 TTL Configuration

```typescript
// Cache TTL per tipo di dato
const CACHE_CONFIG = {
  // Dati che cambiano frequentemente
  leads: 60,        // 1 minuto (modificati spesso)
  activities: 30,   // 30 secondi (nuove attività)
  
  // Dati stabili
  users: 300,       // 5 minuti (cambiano raramente)
  products: 600,    // 10 minuti (molto stabili)
  
  // Configurazioni
  apiKeys: 300,     // 5 minuti (gestite centralmente)
};
```

---

## 🔄 **Retry Logic & Resilienza**

### Pattern Hook Ottimizzato

```typescript
// src/hooks/use-optimized-lead.ts
import { useFetchWithRetry } from '@/hooks/use-fetch-with-retry';
import { toast } from 'sonner';

export function useOptimizedLead(leadId: string) {
  const { data: lead, loading, error, retry } = useFetchWithRetry(
    async () => {
      console.log(`🔄 [Hook] Fetching lead: ${leadId}`);
      
      const response = await fetch(`/api/leads/${leadId}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'API returned unsuccessful response');
      }
      
      return data.lead;
    },
    {
      maxRetries: 2,
      baseDelay: 1000,    // 1s, 2s, 4s progression
      timeout: 15000,     // 15s timeout per Airtable
      onRetry: (attempt, error) => {
        toast.warning(`Tentativo ${attempt} di ricaricamento...`);
        console.warn(`⚠️ [Hook] Retry ${attempt} per ${leadId}:`, error.message);
      }
    }
  );

  return { lead, loading, error, retry };
}
```

### Configurazione Retry Avanzata

```typescript
// Configurazione retry per diversi scenari
const RETRY_CONFIGS = {
  // API critiche (lead, users)
  critical: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 8000,
    timeout: 15000,
  },
  
  // API secondarie (analytics, logs)
  secondary: {
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 4000,
    timeout: 10000,
  },
  
  // Background tasks
  background: {
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    timeout: 30000,
  },
};
```

---

## 📊 **Performance Monitoring Automatico**

### Metriche Obbligatorie

```typescript
// Ogni API route deve implementare questo pattern
import { recordApiLatency, recordError, recordCacheEvent } from '@/lib/performance-monitor';

// In ogni API call
recordApiLatency('api_name', latency, wasCached);
recordError('api_name', errorMessage, statusCode);
recordCacheEvent('hit' | 'miss', 'service_name');
```

### Dashboard & Alert

```typescript
// Accesso dashboard in development
import { performanceMonitor } from '@/lib/performance-monitor';

// Console debug
console.log('Performance Stats:', performanceMonitor.getDashboardData());

// Health check automatico
const isHealthy = await performanceMonitor.healthCheck();
```

### Alert Thresholds

```typescript
// Configurazione alert automatici
const ALERT_THRESHOLDS = {
  lead_api_latency: { warning: 1500, error: 3000, critical: 5000 },
  users_api_latency: { warning: 1000, error: 2000, critical: 3000 },
  cache_hit_rate: { warning: 80, error: 60, critical: 40 },
  error_rate: { warning: 5, error: 10, critical: 20 },
};
```

---

## 🎨 **UI Performance Best Practices**

### Suspense & Loading States

```typescript
// src/components/optimized-lead-page.tsx
import { LeadDetailSuspense } from '@/components/ui/suspense-wrapper';

export function OptimizedLeadPage({ leadId }: { leadId: string }) {
  return (
    <LeadDetailSuspense 
      onRetry={() => console.log('Retry triggered by user')}
    >
      <LeadDetailContent leadId={leadId} />
    </LeadDetailSuspense>
  );
}

// Componente con hook ottimizzato
function LeadDetailContent({ leadId }: { leadId: string }) {
  const { lead, loading, error, retry } = useOptimizedLead(leadId);
  
  if (error) {
    return (
      <div className="error-state">
        <p>Errore: {error}</p>
        <button onClick={retry}>Riprova</button>
      </div>
    );
  }
  
  return <div>{/* Contenuto lead */}</div>;
}
```

### Smart Loading (300ms Delay)

```typescript
// Previene flash di loading per richieste veloci
function SmartSkeleton({ showAfter = 300 }: { showAfter?: number }) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShouldShow(true), showAfter);
    return () => clearTimeout(timer);
  }, [showAfter]);

  if (!shouldShow) return null;
  return <Skeleton />;
}
```

---

## 🚨 **Troubleshooting Common Issues**

### Issue: Cache Miss Rate Alta (>40%)

**Cause:**
- TTL troppo basso per il tipo di dato
- Invalidazione troppo frequente
- Chiavi cache non ottimizzate

**Soluzioni:**
```typescript
// ✅ Aumenta TTL per dati stabili
getCachedUsers(fetchFn); // TTL 300s vs 60s

// ✅ Invalidazione specifica
invalidateLeadCache(leadId); // Solo questo lead
// vs
cacheService.clearAll(); // ❌ Troppo aggressivo
```

### Issue: API Latency >5s

**Diagnosi:**
```bash
# Test manuale
curl -w "Total: %{time_total}s\n" -s -o /dev/null "http://localhost:3000/api/leads/recXXX"

# Check logs
npm run dev 2>&1 | grep -E "(TIMING|Cache|Perf)"
```

**Soluzioni:**
- Verifica credentials Airtable
- Check connettività KV database
- Review query complexity

### Issue: Memory Leaks nei Hook

**Prevenzione:**
```typescript
// ✅ Cleanup automatico
useEffect(() => {
  const controller = new AbortController();
  
  fetchData({ signal: controller.signal });
  
  return () => controller.abort(); // 🚀 Cleanup
}, [dependency]);
```

---

## ✅ **Performance Checklist**

### Per Nuove API Routes

- [ ] Implementato `getCached*` wrapper
- [ ] Gestione errori con `recordError`
- [ ] Timing logs con `recordApiLatency`
- [ ] Invalidazione cache su update/delete
- [ ] Compressione gzip negli headers
- [ ] Timeout appropriato (15s+ per Airtable)

### Per Nuovi Hook

- [ ] Uso di `useFetchWithRetry` 
- [ ] Configurazione retry appropriata
- [ ] Cleanup su unmount
- [ ] Toast notifications per UX
- [ ] Error boundary compatibility

### Per Componenti UI

- [ ] Suspense wrapper con skeleton intelligente
- [ ] Loading states con 300ms delay
- [ ] Error states con retry
- [ ] Accessibility maintained

---

## 📈 **Performance Testing**

### Load Testing

```bash
# Test basic performance
ab -n 100 -c 10 "http://localhost:3000/api/leads/recXXX"

# Cache performance
for i in {1..10}; do
  curl -w "Run $i: %{time_total}s\n" -s -o /dev/null "http://localhost:3000/api/users"
done
```

### Monitoring Production

```typescript
// Health checks automatici
setInterval(async () => {
  const health = await performanceMonitor.getDashboardData();
  if (health.systemHealth === 'critical') {
    // Alert system
    sendSlackAlert('Performance degradation detected');
  }
}, 60000); // Check ogni minuto
```

---

## 🔮 **Future Improvements**

### Planned Optimizations

1. **GraphQL Layer**: Single endpoint per query complesse
2. **Edge Caching**: Vercel Edge per cache geografica
3. **Prefetching**: Preload data per navigation prevedibili
4. **Service Worker**: Offline-first per dati critici

### Experimental Features

- **Streaming Responses**: Per dataset grandi
- **Real-time Updates**: WebSocket per cache invalidation
- **AI Prefetching**: ML per predire next page loads

---

**Mantainer**: Dev Team  
**Last Updated**: 2025-01-07  
**Next Review**: 2025-02-07  

> 📖 Per troubleshooting dettagliato: [/docs/runbooks/lead-performance.md](runbooks/lead-performance.md)
<!-- END:performance/guidelines.md -->

## Regole di Repo

<!-- BEGIN:rules/repo-rules.md -->
# Regole di Repository & Convenzioni

> Fonte consolidata: `repo-overview.md` (originale in /docs/source).

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
<!-- END:rules/repo-rules.md -->

## Runbook rapidi

<!-- BEGIN:runbooks/local-dev.md -->
# Runbook: Sviluppo Locale

## Setup rapido
- Clona repo e crea `.env` a partire da `.env.example`.
- Installa dipendenze (es: `pnpm i` / `npm ci` / `uv sync`).
- Avvia: `make dev` o script equivalente.

## Test & Lint
- `make lint`, `make test` (o script npm).
- Soglia minima test: garantire almeno i test di fumo.

## Troubleshooting
- Verifica versione runtime (`node -v` / `python --version`).
- Controlla variabili mancanti: `grep -n "process.env" -R src`.
<!-- END:runbooks/local-dev.md -->

<!-- BEGIN:runbooks/migrations.md -->
# Runbook: Migrazioni

> Fonte: `MIGRATION_EXAMPLES.md` (originale in /docs/source).

# Migration Examples: From process.env to API Key Service

This document shows how to migrate from static environment variables to the dynamic API Key service.

## Before (Old Way with .env)

```typescript
// ❌ Old: Static environment variables
const airtableKey = process.env.AIRTABLE_API_KEY;
const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
const githubToken = process.env.GITHUB_TOKEN;
```

## After (New Way with KV Service)

```typescript
// ✅ New: Dynamic API keys from KV database
import {
  getAirtableKey,
  getWhatsAppToken,
  getGitHubToken,
} from '@/lib/api-keys-service';

const airtableKey = await getAirtableKey();
const whatsappToken = await getWhatsAppToken();
const githubToken = await getGitHubToken();
```

## Common Migration Patterns

### 1. Single API Key

```typescript
// Before
const key = process.env.AIRTABLE_API_KEY;

// After
import { getAirtableKey } from '@/lib/api-keys-service';
const key = await getAirtableKey();
```

### 2. Multiple API Keys

```typescript
// Before
const airtable = process.env.AIRTABLE_API_KEY;
const whatsapp = process.env.WHATSAPP_ACCESS_TOKEN;
const github = process.env.GITHUB_TOKEN;

// After (Optimized - single KV call)
import { apiKeyService } from '@/lib/api-keys-service';
const keys = await apiKeyService.getApiKeys([
  'airtable',
  'whatsapp-api',
  'github-api',
]);
const airtable = keys['airtable'];
const whatsapp = keys['whatsapp-api'];
const github = keys['github-api'];
```

### 3. Service-Specific Groups

```typescript
// Before
const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
const whatsappSecret = process.env.WHATSAPP_APP_SECRET;
const whatsappWebhook = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

// After (Optimized - single call for related keys)
import { getWhatsAppKeys } from '@/lib/api-keys-service';
const whatsappKeys = await getWhatsAppKeys();
const { accessToken, appSecret, webhookVerifyToken } = whatsappKeys;
```

## API Route Examples

### Before (API Route with env vars)

```typescript
// pages/api/airtable/sync.ts
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const airtableKey = process.env.AIRTABLE_API_KEY;

  if (!airtableKey) {
    return res.status(500).json({ error: 'Airtable key not configured' });
  }

  // Use the key...
}
```

### After (API Route with KV service)

```typescript
// pages/api/airtable/sync.ts
import { getAirtableKey } from '@/lib/api-keys-service';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const airtableKey = await getAirtableKey();

  if (!airtableKey) {
    return res.status(500).json({ error: 'Airtable key not found or expired' });
  }

  // Use the key...
}
```

## Server Component Examples

### Before

```typescript
// app/dashboard/page.tsx
async function DashboardPage() {
  const airtableKey = process.env.AIRTABLE_API_KEY;
  // Fetch data with static key
}
```

### After

```typescript
// app/dashboard/page.tsx
import { getAirtableKey } from '@/lib/api-keys-service';

async function DashboardPage() {
  const airtableKey = await getAirtableKey();
  // Fetch data with dynamic key
  // Usage is automatically tracked!
}
```

## Error Handling

```typescript
import { getAirtableKey } from '@/lib/api-keys-service';

try {
  const airtableKey = await getAirtableKey();

  if (!airtableKey) {
    // Key not found, expired, or inactive
    throw new Error('Airtable integration not available');
  }

  // Use the key
} catch (error) {
  console.error('Failed to get Airtable key:', error);
  // Handle gracefully
}
```

## Benefits of the New System

1. **Real-time Management**: Keys can be updated without redeployment
2. **Usage Tracking**: Automatic tracking of when and how keys are used
3. **Security**: Encrypted storage and automatic expiration
4. **Multi-tenant**: Different keys per user/tenant
5. **Caching**: 5-minute cache reduces KV calls
6. **Monitoring**: Built-in health checks and error handling

## Migration Checklist

- [ ] Replace `process.env.AIRTABLE_API_KEY` with `getAirtableKey()`
- [ ] Replace `process.env.WHATSAPP_ACCESS_TOKEN` with `getWhatsAppToken()`
- [ ] Replace `process.env.GITHUB_TOKEN` with `getGitHubToken()`
- [ ] Replace `process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` with `getGoogleMapsKey()`
- [ ] Replace `process.env.BLOB_READ_WRITE_TOKEN` with `getBlobToken()`
- [ ] Replace `process.env.NEXTAUTH_SECRET` with `getNextAuthSecret()`
- [ ] Update error handling to account for async key retrieval
- [ ] Test all integrations work with dynamic keys
- [ ] Remove old environment variables from deployment

## Performance Tips

1. **Batch requests**: Use `getApiKeys(['service1', 'service2'])` for multiple keys
2. **Cache-friendly**: Keys are cached for 5 minutes to reduce KV calls
3. **Non-blocking usage tracking**: Usage recording doesn't slow down requests
4. **Health checks**: Use `apiKeyService.healthCheck()` for monitoring
<!-- END:runbooks/migrations.md -->

<!-- BEGIN:runbooks/remote-keys-sync.md -->
# 🔑 Sincronizzazione API Keys Remote per Sviluppo Locale

Questa guida spiega come configurare l'ambiente di sviluppo locale utilizzando le API keys remote dal sistema di produzione, senza dover mantenere un `.env.local` completo.

## 🎯 **Vantaggi del Sistema**

- ✅ **Chiavi sempre aggiornate**: Usa le chiavi da produzione in tempo reale
- ✅ **Configurazione minima**: Solo 2 credenziali da inserire
- ✅ **Sicurezza**: Le chiavi sono crittografate nel database
- ✅ **Semplicità**: Un comando per sincronizzare tutto

## 🛠️ **Setup Rapido**

### **Passo 1: Configura lo Script**

```bash
# Copia il template sicuro
cp scripts/migrations/sync-remote-keys.template.js scripts/migrations/sync-remote-keys.js
```

### **Passo 2: Inserisci le Credenziali**

Modifica il file `scripts/migrations/sync-remote-keys.js` e inserisci le tue credenziali:

```javascript
const CONFIG = {
  REMOTE_KV_URL: 'https://mint-mammal-42977.upstash.io',
  REMOTE_KV_TOKEN: 'IL_TUO_TOKEN_KV_QUI', // 🔑 Inserire qui
  ENCRYPTION_KEY: 'LA_TUA_MASTER_KEY_QUI', // 🔐 Inserire qui
  USER_ID: 'user_admin_001',
  TENANT_ID: 'tenant_doctorbed',
};
```

**⚠️ IMPORTANTE**: Il file `scripts/migrations/sync-remote-keys.js` è nel `.gitignore` per proteggere le tue credenziali!

### **Passo 2: Sincronizza le Chiavi**

```bash
npm run sync-keys
```

### **Passo 3: Avvia il Server di Sviluppo**

```bash
npm run dev
```

## 🔧 **Come Ottenere le Credenziali**

### **KV Token**
Vai su [Vercel Dashboard](https://vercel.com/dashboard) → KV Database → Settings → REST API

### **Encryption Master Key**
Puoi trovarla nell'attuale `.env.local` alla riga:
```bash
ENCRYPTION_MASTER_KEY="CRM1.0-SecureMasterKey-2025-Enterprise-ScalableArchitecture"
```

## 📊 **Cosa Fa lo Script**

1. **Si connette** al database KV di produzione
2. **Recupera** tutte le API keys del tuo utente
3. **Decripta** le chiavi usando la master key
4. **Crea** un file `.env.local` completo
5. **Mappa** i servizi alle variabili d'ambiente

## 🔑 **Chiavi Sincronizzate**

Lo script recupera automaticamente:

- **Airtable**: API key, Base ID, tutte le tabelle
- **GitHub**: Token, private key, webhook secret  
- **Google Maps**: API key
- **NextAuth**: Secret
- **Webhook URLs**: Airtable, WhatsApp
- **Configurazioni di base**: KV, user context

## ⚡ **Output di Esempio**

```bash
$ npm run sync-keys

🔄 Sincronizzazione chiavi API remote...
📊 Trovate 19 chiavi per l'utente
✅ airtable -> AIRTABLE_API_KEY
✅ airtable-base-id -> AIRTABLE_BASE_ID  
✅ airtable-leads-table -> AIRTABLE_LEADS_TABLE_ID
✅ github-token -> GITHUB_TOKEN
✅ google-maps-api -> NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
...

🎉 Sincronizzazione completata!
📊 16 API keys recuperate e decriptate
📝 File .env.local aggiornato
🚀 Ora puoi eseguire: npm run dev
```

## 🛡️ **Sicurezza**

- ✅ **Credenziali locali**: Conservate solo nel file di script  
- ✅ **Crittografia**: Tutte le chiavi sono crittografate AES-256
- ✅ **Isolamento**: Ogni developer ha il suo user context
- ✅ **Accesso controllato**: Solo le chiavi del tuo utente/tenant

## 🔄 **Workflow di Sviluppo**

1. **Prima sessione**: Configura script con credenziali
2. **Ogni avvio**: Esegui `npm run sync-keys`
3. **Sviluppo**: Lavora normalmente con `npm run dev`
4. **Aggiornamenti**: Le chiavi sono sempre sincronizzate con produzione

## 🔍 **Troubleshooting**

### **Errore: Token KV non configurato**
```
⛔️ Errore: REMOTE_KV_TOKEN non configurato
🔧 Modifica il file scripts/sync-remote-keys.js
```
**Soluzione**: Inserisci il token KV nel CONFIG

### **Errore: Master Key non configurata**
```
⛔️ Errore: ENCRYPTION_KEY non configurata  
🔧 Modifica il file scripts/sync-remote-keys.js
```
**Soluzione**: Inserisci la master key nel CONFIG

### **Errore: Impossibile decriptare**
```
⚠️ Impossibile decriptare: airtable
```
**Soluzione**: Verifica che la ENCRYPTION_KEY sia corretta

### **Errore: KV API Error**
```  
❌ KV API Error: 401
```
**Soluzione**: Verifica che REMOTE_KV_TOKEN sia valido

## 🆚 **Confronto: Metodi di Setup**

| Metodo | Pro | Contro |
|--------|-----|--------|
| **`.env.local` manuale** | Completo controllo | Devi mantenere sincronizzato |
| **Sync script** | Sempre aggiornato | Setup iniziale richiesto |
| **Solo produzione** | Nessun setup locale | Devi testare su prod |

## 🚀 **Workflow Consigliato**

Per nuovo sviluppatore:

```bash
# 1. Clona repository
git clone https://github.com/cryptodonald/crm_1.0.git
cd crm_1.0

# 2. Installa dipendenze  
npm install

# 3. Crea script di sincronizzazione
cp scripts/migrations/sync-remote-keys.template.js scripts/migrations/sync-remote-keys.js

# 4. Configura credenziali (modifica il file)
# Inserisci KV_TOKEN e ENCRYPTION_KEY in scripts/migrations/sync-remote-keys.js

# 5. Sincronizza chiavi
npm run sync-keys

# 6. Avvia sviluppo
npm run dev
```

Per aggiornamento periodico:

```bash
# Sincronizza chiavi (se cambiate su prod)
npm run sync-keys

# Riavvia server
npm run dev
```

---

**💡 Suggerimento**: Puoi aggiungere `npm run sync-keys` al tuo script di setup o pre-dev hook per automatizzare completamente il processo.

## 🔒 **Sicurezza Critica**

### **⚠️ File Protetti dal Git**
- `scripts/migrations/sync-remote-keys.js` è nel **`.gitignore`** - NON sarà mai committato
- `.env.local` è nel **`.gitignore`** - Le variabili locali sono protette
- Solo `scripts/migrations/sync-remote-keys.template.js` è versionato (senza credenziali)

### **🛡️ Regole di Sicurezza**
1. **MAI committare** il file `scripts/migrations/sync-remote-keys.js` con le credenziali
2. **Condividi solo** il template file (`.template.js`) con il team
3. **Ogni sviluppatore** deve creare la sua copia locale con le sue credenziali
4. **Verifica sempre** che `.gitignore` contenga i file sensibili

### **🔍 Verifica Sicurezza**
```bash
# Verifica che i file sensibili non siano tracciati
git status --ignored | grep sync-remote-keys.js
# Dovrebbe mostrare: scripts/migrations/sync-remote-keys.js (ignored)
```
<!-- END:runbooks/remote-keys-sync.md -->
