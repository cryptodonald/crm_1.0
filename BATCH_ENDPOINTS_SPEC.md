# 🚀 Batch Endpoints Specification

## Problema Attuale

Ogni pagina fa **multiple richieste** in cascata:
- Leads page: 2-3 fetch (leads + activities + ...)
- Orders page: 2-3 fetch (orders + products + ...)
- Activities page: 2-3 fetch (activities + leads + ...)
- Products page: 2 fetch (products + variants)

**Risultato:** 20+ richieste, 4-5 secondi di caricamento

---

## Soluzione: Batch Endpoints

Un endpoint per pagina che ritorna TUTTO in una sola richiesta.

---

## 1. Leads Page Batch

### Endpoint
```
GET /api/batch/leads-page?[filters]
```

### Response
```json
{
  "leads": {
    "records": [...],
    "count": 560,
    "fromCache": true
  },
  "activities": {
    "records": [...],
    "count": 1234
  },
  "marketingSources": [...],
  "stats": {
    "totale": 560,
    "nuoviUltimi7Giorni": 45,
    "contattatiEntro48h": 78,
    "tassoQualificazione": 25,
    "tassoConversione": 12
  },
  "_timing": {
    "leads": 50,
    "activities": 45,
    "stats": 2,
    "total": 97
  }
}
```

### Implementazione Backend
- Fetch leads (con cache Redis)
- Fetch activities in parallelo
- Calcola stats LATO SERVER (più veloce)
- Return tutto insieme

**Performance:** ~100ms invece di 4-5s

---

## 2. Orders Page Batch

### Endpoint
```
GET /api/batch/orders-page?[filters]
```

### Response
```json
{
  "orders": {
    "records": [...],
    "count": 245
  },
  "products": [...],
  "customers": [...],
  "stats": {
    "totalOrders": 245,
    "totalRevenue": 125000,
    "avgOrderValue": 510,
    "pendingOrders": 12
  },
  "_timing": {
    "orders": 45,
    "products": 30,
    "stats": 2,
    "total": 77
  }
}
```

---

## 3. Activities Page Batch

### Endpoint
```
GET /api/batch/activities-page?[filters]
```

### Response
```json
{
  "activities": {
    "records": [...],
    "count": 1234
  },
  "leads": [...],
  "users": [...],
  "stats": {
    "totalActivities": 1234,
    "completedToday": 45,
    "pendingActions": 89,
    "byType": {...}
  }
}
```

---

## 4. Products Page Batch

### Endpoint
```
GET /api/batch/products-page?[filters]
```

### Response
```json
{
  "products": {
    "records": [...],
    "count": 156
  },
  "variants": [...],
  "categories": [...],
  "stats": {
    "totalProducts": 156,
    "activeProducts": 145,
    "outOfStock": 11
  }
}
```

---

## Architettura Batch

### File Structure
```
src/app/api/batch/
├── leads-page/
│   └── route.ts
├── orders-page/
│   └── route.ts
├── activities-page/
│   └── route.ts
└── products-page/
    └── route.ts
```

### Pattern Comune
```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Fetch TUTTO in parallelo
  const [leads, activities, sources] = await Promise.all([
    fetchLeadsWithCache(searchParams),
    fetchActivities(),
    fetchMarketingSources()
  ]);
  
  // Calcola stats lato server
  const stats = calculateLeadsStats(leads, activities);
  
  // Return everything
  return NextResponse.json({
    leads,
    activities,
    marketingSources: sources,
    stats,
    _meta: { cached: true }
  });
}
```

---

## Performance Attesa

### Prima (Current)
```
Leads Page:
- /api/leads: 4000ms
- /api/activities: 1500ms
- /api/marketing/sources: 2000ms (9 requests!)
- /api/users: 500ms
= TOTALE: ~8s in cascata
```

### Dopo (Batch)
```
Leads Page:
- /api/batch/leads-page: 500ms (tutto in parallelo)
= TOTALE: ~500ms

SPEEDUP: 16x più veloce! ⚡
```

---

## Vantaggi

✅ **1 richiesta invece di 20+**
✅ **Fetch in parallelo lato server** (più veloce)
✅ **Stats calcolate server-side** (no calcoli pesanti client)
✅ **Cache Redis condivisa** per tutti i dati
✅ **Meno overhead network** (1 handshake invece di 20)
✅ **Più semplice da debuggare** (1 response invece di 20)

---

## Migration Plan

### Phase 1: Implementazione (1-2 ore)
1. ✅ Creare `/api/batch/leads-page/route.ts`
2. ✅ Creare `/api/batch/orders-page/route.ts`
3. ✅ Creare `/api/batch/activities-page/route.ts`
4. ✅ Creare `/api/batch/products-page/route.ts`

### Phase 2: Frontend Update (30 min)
1. ✅ Modificare `src/app/leads/page.tsx`
2. ✅ Modificare `src/app/orders/page.tsx`
3. ✅ Modificare `src/app/activities/page.tsx`
4. ✅ Modificare `src/app/products/page.tsx`

### Phase 3: Testing (15 min)
1. ✅ Test performance con Network tab
2. ✅ Verify data integrity
3. ✅ Check error handling

### Phase 4: Cleanup (opzionale)
- Rimuovere vecchi endpoint non usati
- Aggiornare documentazione

---

## Implementazione Priorità

**Priority 1 (NOW):** Leads Page
- Più critica (560 records)
- Più lenta attualmente (8s)
- Più richieste (20+)

**Priority 2:** Orders Page
- Business critical
- Revenue data

**Priority 3:** Activities & Products
- Nice to have
- Meno traffico

---

## Note Tecniche

### Caching Strategy
- Usare Redis KV per tutto
- TTL: 5 minuti (come esistente)
- Invalidazione su POST/DELETE

### Error Handling
- Graceful degradation
- Se un fetch fallisce, return partial data
- Client può gestire missing data

### Response Size
- Batch response ~500KB (accettabile)
- Compression abilitata (br)
- HTTP/2 multiplexing

---

## Conclusione

Batch endpoints = **16x performance improvement** con sforzo minimo!

**READY TO IMPLEMENT!** 🚀
