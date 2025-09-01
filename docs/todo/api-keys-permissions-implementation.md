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
