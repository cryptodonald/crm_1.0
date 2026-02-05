# Deployment Checklist - Postgres Migration

## 🎯 Obiettivo

Migrare da Airtable a Postgres per ottenere **50x performance improvement** mantenendo zero downtime.

---

## ✅ Completato (Local)

- [x] Schema Postgres creato (23 tabelle)
- [x] 1006 record migrati da Airtable
- [x] Dual-read layer implementato
- [x] Webhook sync Airtable → Postgres
- [x] Test endpoint `/api/data-source-test`
- [x] Documentation complete (3 files)

---

## 📋 Deployment Steps

### Step 1: Push Code (ORA)

```bash
# Se non hai già fatto push:
git push origin main
```

✅ **Status**: Commit pronti, serve solo push
⏱️ **Tempo**: 1 minuto
🔄 **Vercel auto-deploy**: ~2 minuti dopo push

---

### Step 2: Configure Environment Variables (5 min)

Vai su **Vercel Dashboard** → Progetto **crm-1-0** → Settings → Environment Variables

Aggiungi/verifica queste variabili:

#### Nuove Variabili
```
USE_POSTGRES=false
AIRTABLE_WEBHOOK_SECRET=3facfeaee74f256143a107510dd337979a6cfc50c4d83b7718a31203b70d30b3
```

#### Verifica Esistenti
- `POSTGRES_PASSWORD` (già presente)
- `POSTGRES_URL_NON_POOLING` (già presente)
- `AIRTABLE_API_KEY` (già presente)

**⚠️ IMPORTANTE**: Dopo aver aggiunto le variabili, clicca **"Redeploy"** per applicarle.

---

### Step 3: Verify Deployment (2 min)

#### A. Health Check
```bash
curl "https://crm.doctorbed.app/api/data-source-test?action=health"
```

**Output atteso**:
```json
{
  "status": "ok",
  "usePostgres": false,
  "health": {
    "postgres": {"healthy": true, "latency": 50},
    "airtable": {"healthy": true, "latency": 300}
  }
}
```

✅ Se entrambi `healthy: true` → OK, procedi

❌ Se errori → Check Vercel logs, verifica env variables

#### B. Test Read Airtable (baseline)
```bash
curl "https://crm.doctorbed.app/api/data-source-test?action=leads&limit=10" | jq '.metrics[0]'
```

**Output atteso**:
```json
{
  "source": "airtable",
  "operation": "getLeads",
  "duration": 2500,
  "success": true
}
```

Nota la `duration` (baseline Airtable performance).

---

### Step 4: Setup Webhook Airtable (15 min)

Segui `WEBHOOK_SETUP.md` per configurare sync real-time.

**Quick version**:

1. **Genera secret** (già fatto, vedi env var sopra)

2. **Crea webhook via API**:
```bash
# Sostituisci YOUR_AIRTABLE_PAT
curl -X POST "https://api.airtable.com/v0/bases/app359c17lK0Ta8Ws/webhooks" \
  -H "Authorization: Bearer YOUR_AIRTABLE_PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "notificationUrl": "https://crm.doctorbed.app/api/webhooks/airtable-sync",
    "specification": {
      "options": {
        "filters": {
          "dataTypes": ["tableData"]
        }
      }
    }
  }'
```

3. **Test webhook**:
```bash
curl -X POST "https://crm.doctorbed.app/api/webhooks/airtable-sync" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "record.updated",
    "table": "Lead",
    "recordId": "rec9vtRHJIAknRo0V",
    "fields": {"Nome": "Test"},
    "timestamp": "2026-02-05T17:00:00.000Z"
  }'
```

**Output atteso**: `{"status":"ok",...}`

4. **Verifica sync su Supabase**:
```sql
SELECT * FROM sync_log ORDER BY started_at DESC LIMIT 5;
```

✅ Se vedi entry con status 'completed' → Webhook funziona

---

### Step 5: Enable Postgres (Graduale)

#### Phase 1: Test Mode (Solo Testing)

Su Vercel, **NON cambiare ancora** `USE_POSTGRES`:
- Resta `false` per gli utenti
- Usa solo `/api/data-source-test` per benchmark

**Test Postgres performance**:
```bash
# Temporaneamente imposta USE_POSTGRES=true SOLO per test
# NON farlo su Vercel production ancora!
```

Aspetta Phase 2 per abilitare in prod.

#### Phase 2: Canary (10% Traffico) - DOMANI

Dopo 24h di webhook stabile:

1. Su Vercel → Environment Variables → `USE_POSTGRES=true`
2. Redeploy
3. Monitor per 2-4 ore:
   - Error rate (target: <0.1%)
   - Fallback rate (target: <1%)
   - Latency p99 (target: <100ms)

**Rollback immediato** se:
- Error rate >1%
- Fallback rate >10%
- Latency degrada

#### Phase 3: Full Rollout - TRA 3 GIORNI

Se Phase 2 OK per 48h:

1. `USE_POSTGRES=true` definitivo
2. Monitor per 7 giorni
3. Se stabile → considera disabilitare Airtable API (solo webhook)

---

## 📊 Monitoring Post-Deployment

### Metriche da Tracciare

#### 1. Endpoint `/api/data-source-test?action=metrics`

Chiama ogni ora per i primi 3 giorni:
```bash
curl "https://crm.doctorbed.app/api/data-source-test?action=metrics" | jq '.stats'
```

**Target**:
```json
{
  "total": 1000,
  "postgres": 950,
  "airtable": 50,
  "avgLatencyPg": 45,
  "avgLatencyAt": 2300,
  "errors": 0
}
```

- `avgLatencyPg < 100ms` ✅
- `errors == 0` ✅
- Fallback rate `(airtable/total) < 5%` ✅

#### 2. Sync Log su Supabase

Query giornaliera:
```sql
-- Sync successo rate
SELECT 
  COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as success_rate,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count
FROM sync_log
WHERE started_at > NOW() - INTERVAL '24 hours'
  AND operation LIKE 'record.%';
```

**Target**: `success_rate > 99.9%`, `failed_count < 5`

#### 3. Vercel Logs

Check ogni giorno per:
- `[DataSource]` errori
- `[Webhook]` errori
- Response time spikes

---

## 🚨 Rollback Plan

### Scenario A: Postgres Non Risponde

**Sintomo**: Molti log `[DataSource] Postgres fallito, uso Airtable fallback`

**Azione**: Nessuna - fallback automatico funziona

**Long-term fix**: 
1. Check Supabase Dashboard (database down?)
2. Verifica connection pool settings
3. Se persistente → `USE_POSTGRES=false` temporaneamente

### Scenario B: Webhook Sync Fallisce

**Sintomo**: `sync_log` mostra status 'failed' ripetuti

**Azione**:
1. Query error messages: `SELECT error_message, COUNT(*) FROM sync_log WHERE status='failed' GROUP BY error_message`
2. Se schema mismatch → Fix schema su Postgres
3. Se rate limit → Pause webhook temporaneamente

### Scenario C: Performance Degrada

**Sintomo**: Latency p99 >500ms (peggio di Airtable)

**Azione**:
1. Check indici: `SELECT * FROM pg_indexes WHERE tablename='leads'`
2. Analizza query lente: Vercel logs
3. Se non risolvibile → `USE_POSTGRES=false` + investigate

### Rollback Completo

Se necessario tornare 100% Airtable:

```bash
# 1. Vercel → Environment Variables
USE_POSTGRES=false

# 2. Redeploy
# 3. Verifica: curl .../health deve mostrare usePostgres: false

# 4. Pause webhook (opzionale)
curl -X PATCH "https://api.airtable.com/v0/bases/.../webhooks/WEBHOOK_ID" \
  -H "Authorization: Bearer YOUR_PAT" \
  -d '{"isHookEnabled": false}'
```

**Recovery time**: ~2 minuti (instant con flag flip)

---

## 📅 Timeline Raccomandato

| Giorno | Fase | Azione |
|--------|------|--------|
| **Oggi** | Deploy | Push code, configure env vars, setup webhook |
| **Domani** | Test | Verifica webhook stabile 24h, test `/api/data-source-test` |
| **Giorno 3** | Canary | `USE_POSTGRES=true`, monitor 48h |
| **Giorno 5** | Full Rollout | Conferma stabile, monitor 7 giorni |
| **Giorno 12** | Cleanup | (Opzionale) Disabilita Airtable API, solo webhook |

---

## ✅ Success Criteria

Deployment considerato **SUCCESSO** se:

- [ ] Health check `postgres.healthy: true`
- [ ] Webhook sync rate >99.9%
- [ ] Postgres latency p99 <100ms (vs Airtable ~2500ms)
- [ ] Error rate <0.1%
- [ ] Fallback rate <1%
- [ ] Zero downtime utenti
- [ ] 7 giorni consecutivi stabili

Se tutti ✅ → **Migrazione completata!** 🎉

---

## 📞 Support

- **Health check**: `curl ...?action=health`
- **Metrics**: `curl ...?action=metrics`
- **Sync log**: Query Supabase `sync_log` table
- **Vercel logs**: Dashboard → Runtime Logs
- **Docs**: `DUAL_READ_SETUP.md`, `WEBHOOK_SETUP.md`

---

**Ready to deploy?** 🚀

Inizia da Step 1: `git push origin main`
