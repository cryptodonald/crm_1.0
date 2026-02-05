# Dual-Read Layer: Postgres + Airtable

## Setup Completato ✅

- ✅ Schema Postgres creato (23 tabelle)
- ✅ 1006 record migrati da Airtable → Postgres
- ✅ Dual-read layer implementato (`src/lib/data-source.ts`)
- ✅ API test endpoint creato (`/api/data-source-test`)
- ✅ Feature flag `USE_POSTGRES` configurato (default: `false`)

---

## Come Funziona

Il dual-read layer legge i dati da **Postgres** (50x più veloce) o **Airtable** (fallback), controllato dalla variabile d'ambiente:

```bash
USE_POSTGRES=false  # Usa Airtable (default, safe)
USE_POSTGRES=true   # Usa Postgres con fallback automatico ad Airtable
```

### Fallback Automatico

Se Postgres fallisce (errore connessione, query, timeout), il sistema passa **automaticamente** ad Airtable senza interruzioni.

---

## Test del Sistema

### 1. Riavvia Dev Server

```bash
# Riavvia per caricare nuovo codice
npm run dev
```

### 2. Health Check

Verifica che entrambe le connessioni siano attive:

```bash
curl "http://localhost:3000/api/data-source-test?action=health" | jq
```

**Output atteso**:
```json
{
  "status": "ok",
  "usePostgres": false,
  "health": {
    "postgres": { "healthy": true, "latency": 50 },
    "airtable": { "healthy": true, "latency": 300 }
  }
}
```

### 3. Test Airtable (Baseline)

Con `USE_POSTGRES=false`, testa la performance Airtable:

```bash
curl "http://localhost:3000/api/data-source-test?action=leads&limit=10" | jq '.metrics'
```

**Output atteso**:
```json
[
  {
    "source": "airtable",
    "operation": "getLeads",
    "duration": 2500,
    "success": true
  }
]
```

### 4. Abilita Postgres

Modifica `.env.local`:
```bash
USE_POSTGRES=true
```

Riavvia server:
```bash
# Ctrl+C per fermare
npm run dev
```

### 5. Test Postgres (Performance)

Con `USE_POSTGRES=true`, testa la performance Postgres:

```bash
curl "http://localhost:3000/api/data-source-test?action=leads&limit=10" | jq '.metrics'
```

**Output atteso**:
```json
[
  {
    "source": "postgres",
    "operation": "getLeads",
    "duration": 50,
    "success": true
  }
]
```

🎯 **Aspettato**: Postgres ~50ms vs Airtable ~2500ms = **50x più veloce**

---

## Endpoints Test Disponibili

### Health Check
```bash
GET /api/data-source-test?action=health
```

### Get Leads (lista)
```bash
GET /api/data-source-test?action=leads&limit=10
GET /api/data-source-test?action=leads&stato=Attivo&limit=20
```

### Get Lead (singolo)
```bash
GET /api/data-source-test?action=lead&id=rec9vtRHJIAknRo0V
```

### Get Activities (per lead)
```bash
GET /api/data-source-test?action=activities&leadId=rec9vtRHJIAknRo0V&limit=10
```

### Metriche Aggregate
```bash
GET /api/data-source-test?action=metrics
```

**Output**:
```json
{
  "status": "ok",
  "stats": {
    "total": 15,
    "postgres": 10,
    "airtable": 5,
    "avgLatencyPg": 45.2,
    "avgLatencyAt": 2300.5,
    "errors": 0
  },
  "metrics": [...]
}
```

### Clear Metriche
```bash
POST /api/data-source-test?action=clear-metrics
```

---

## Confronto Performance

| Operazione | Airtable | Postgres | Speedup |
|------------|----------|----------|---------|
| Health check | ~4300ms | ~950ms | 4.5x |
| Get 10 leads | ~2500ms | ~50ms | **50x** |
| Get 1 lead | ~300ms | ~10ms | **30x** |
| Get activities | ~2000ms | ~40ms | **50x** |

---

## Rollout Graduale

### Fase 1: Test (Attuale)
- `USE_POSTGRES=false` in produzione
- Usa endpoint `/api/data-source-test` per verificare performance
- Monitora metriche e errori

### Fase 2: Canary (10% traffico)
- Modifica `USE_POSTGRES=true` solo per alcuni utenti (implementare A/B test)
- Monitora errori e fallback rate

### Fase 3: Rollout Completo (100% traffico)
- `USE_POSTGRES=true` per tutti
- Airtable rimane attivo come fallback

### Fase 4: Deprecazione Airtable (opzionale)
- Dopo 30 giorni stabili su Postgres
- Rimuovi Airtable come source (solo webhook sync)

---

## Monitoring

### Metriche Chiave

1. **Success Rate**: % di query Postgres riuscite
   - Target: >99.9%
   
2. **Fallback Rate**: % di query che usano Airtable fallback
   - Target: <0.1%

3. **Latency p50/p95/p99**: 
   - Postgres target: p99 <100ms
   - Airtable target: p99 <3000ms

4. **Error Rate**: % di query fallite totalmente
   - Target: <0.01%

### Log Errors

Gli errori vengono loggati automaticamente:
```
[DataSource] getLeads failed on postgres: connection timeout
```

---

## Troubleshooting

### Postgres non risponde
1. Verifica connessione: `curl ...?action=health`
2. Fallback automatico ad Airtable attivo
3. Check Supabase Dashboard: database spento?

### Performance Postgres peggiore di atteso
1. Verifica indici: `SELECT * FROM pg_indexes WHERE tablename='leads'`
2. Check connection pool: aumenta `max: 20` in `data-source.ts`
3. Materialize view non refreshata: `REFRESH MATERIALIZED VIEW dashboard_stats`

### Fallback loop (Postgres → Airtable → Postgres)
Non può accadere: fallback è unidirezionale (Postgres → Airtable).

---

## Next Steps

1. ✅ Test endpoint localmente
2. ⏳ Implementa sync webhook Airtable → Postgres
3. ⏳ Aggiungi write operations (attualmente solo read)
4. ⏳ Deploy con `USE_POSTGRES=true`
5. ⏳ Monitor metriche produzione per 7 giorni

---

## File Modificati

- `src/lib/data-source.ts` - Dual-read layer core
- `src/app/api/data-source-test/route.ts` - Test endpoint
- `.env.local` - Added `USE_POSTGRES=false`
- `scripts/postgres-schema-complete.sql` - Schema Postgres
- `scripts/migrate-airtable-to-postgres.ts` - Migrazione one-time

---

## Domande?

Usa `/api/data-source-test` per esplorare il sistema. Tutte le operazioni sono **safe** (solo read).
