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
