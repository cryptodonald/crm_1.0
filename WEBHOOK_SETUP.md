# Webhook Airtable → Postgres Sync

## Cosa Fa

Il webhook mantiene **Postgres sincronizzato con Airtable in real-time**:
- ✅ Quando crei/modifichi/elimini un record in Airtable → aggiorna automaticamente Postgres
- ✅ Latenza: ~100-200ms
- ✅ Nessun polling, nessun ritardo
- ✅ Tracciamento sync in `sync_log` table

---

## Setup (15 minuti)

### 1. Genera Webhook Secret

```bash
openssl rand -hex 32
```

Copia l'output (esempio: `a3f5d2c...`) e aggiungilo a **Vercel Environment Variables**:

```
AIRTABLE_WEBHOOK_SECRET=<il_secret_generato>
```

Redeploy dopo aver aggiunto la variabile.

---

### 2. Crea Webhook su Airtable

#### Opzione A: Via API (raccomandato)

```bash
# Sostituisci YOUR_AIRTABLE_PAT con il tuo Personal Access Token
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

**Response**:
```json
{
  "id": "ach00000000000001",
  "macSecretBase64": "<secret_for_verification>",
  "expirationTime": "2026-02-12T16:30:00.000Z"
}
```

Salva il `macSecretBase64` - è il secret da usare per verificare le firme (opzionale).

#### Opzione B: Via UI Airtable

1. Vai su https://airtable.com/create/webhook
2. **Base**: Doctorbed CRM (app359c17lK0Ta8Ws)
3. **URL**: `https://crm.doctorbed.app/api/webhooks/airtable-sync`
4. **Eventi**:
   - ✅ record.created
   - ✅ record.updated  
   - ✅ record.deleted
5. **Tabelle**: Seleziona tutte (Lead, Activity, Notes, Users, etc.)
6. **Headers** (opzionale per signature verification):
   ```
   x-airtable-signature: <mac_secret_from_response>
   ```

---

### 3. Test Webhook

#### Test Manuale via cURL

```bash
curl -X POST "https://crm.doctorbed.app/api/webhooks/airtable-sync" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "record.updated",
    "table": "Lead",
    "recordId": "rec9vtRHJIAknRo0V",
    "fields": {
      "Nome": "Test Webhook",
      "Stato": "Attivo"
    },
    "timestamp": "2026-02-05T16:30:00.000Z"
  }'
```

**Output atteso**:
```json
{
  "status": "ok",
  "event": "record.updated",
  "table": "leads",
  "recordId": "rec9vtRHJIAknRo0V",
  "duration": 45,
  "timestamp": "2026-02-05T16:30:01.234Z"
}
```

#### Test Real: Modifica un Record

1. Apri Airtable → Base CRM
2. Modifica un Lead (es. cambia Nome)
3. Verifica su Postgres che il record sia aggiornato:

```sql
SELECT "Nome", updated_at 
FROM leads 
WHERE airtable_id = 'rec9vtRHJIAknRo0V';
```

L'`updated_at` deve essere recente (~pochi secondi fa).

---

### 4. Verifica Sync Log

Controlla che gli eventi siano tracciati:

```sql
-- Ultimi 10 sync
SELECT * FROM sync_log 
ORDER BY started_at DESC 
LIMIT 10;

-- Sync falliti
SELECT * FROM sync_log 
WHERE status = 'failed' 
ORDER BY started_at DESC;

-- Statistiche per tabella
SELECT 
  table_name,
  COUNT(*) as total_syncs,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
FROM sync_log
WHERE operation LIKE 'record.%'
GROUP BY table_name
ORDER BY total_syncs DESC;
```

---

## Come Funziona

### Flow Sync

```
Airtable Record Change
    ↓
Airtable Webhook Notification
    ↓
POST /api/webhooks/airtable-sync
    ↓
Verify Signature (optional)
    ↓
Parse Event (created/updated/deleted)
    ↓
Map Table Name (Lead → leads)
    ↓
Execute SQL (INSERT/UPDATE/DELETE)
    ↓
Log in sync_log Table
    ↓
Return 200 OK
```

### Eventi Supportati

| Evento Airtable | Azione Postgres | Note |
|-----------------|-----------------|------|
| `record.created` | INSERT (upsert) | Crea nuovo record |
| `record.updated` | UPDATE (upsert) | Aggiorna record esistente |
| `record.deleted` | DELETE | Rimuove record |

### Mapping Tabelle

```typescript
'Lead' → 'leads'
'Activity' → 'activities'
'Notes' → 'notes'
'User' → 'users'
// ... tutte le 23 tabelle
```

### Gestione Errori

- ❌ **Tabella non riconosciuta**: Log warning, ritorna 400
- ❌ **Query SQL fallisce**: Log in sync_log con status 'failed', ritorna 500
- ❌ **Signature invalida**: Ritorna 401 (se signature verification attiva)

---

## Monitoring

### Health Check Webhook

```bash
GET https://crm.doctorbed.app/api/webhooks/airtable-sync
```

**Response**:
```json
{
  "status": "ok",
  "message": "Airtable Webhook Endpoint",
  "endpoint": "/api/webhooks/airtable-sync",
  "methods": ["POST"],
  "requiredEnv": ["AIRTABLE_WEBHOOK_SECRET", "POSTGRES_PASSWORD"]
}
```

### Metriche Chiave

1. **Sync Success Rate**: Target >99.9%
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*) as success_rate
   FROM sync_log
   WHERE operation LIKE 'record.%';
   ```

2. **Sync Latency**: Target <200ms
   ```sql
   SELECT 
     AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000) as avg_latency_ms
   FROM sync_log
   WHERE status = 'completed';
   ```

3. **Failed Syncs**: Target <5/day
   ```sql
   SELECT COUNT(*) as failed_today
   FROM sync_log
   WHERE status = 'failed'
     AND started_at > NOW() - INTERVAL '24 hours';
   ```

---

## Troubleshooting

### Webhook non riceve eventi

1. **Verifica webhook attivo su Airtable**:
   ```bash
   curl -X GET "https://api.airtable.com/v0/bases/app359c17lK0Ta8Ws/webhooks" \
     -H "Authorization: Bearer YOUR_AIRTABLE_PAT"
   ```

2. **Check Vercel logs**:
   - Vai su Vercel Dashboard → Logs
   - Filtra per `/api/webhooks/airtable-sync`
   - Cerca errori

3. **Test endpoint manualmente** (vedi sezione Test sopra)

### Sync falliti ricorrenti

1. **Verifica schema match**:
   ```sql
   -- Controlla che tutte le colonne esistano
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'leads';
   ```

2. **Check error log**:
   ```sql
   SELECT error_message, COUNT(*) 
   FROM sync_log 
   WHERE status = 'failed'
   GROUP BY error_message;
   ```

3. **Verifica connessione Postgres**: Usa health check endpoint

### Signature verification fails

Se usi signature verification e vedi 401 errori:

1. Verifica che `AIRTABLE_WEBHOOK_SECRET` sia configurato
2. Controlla che Airtable invii l'header `x-airtable-signature`
3. Se problemi persistono, disabilita temporaneamente la verifica (commenta righe 151-157 in route.ts)

---

## Performance

### Benchmarks Attesi

| Operazione | Latenza | Note |
|------------|---------|------|
| Webhook receive | ~50ms | Network + parsing |
| SQL upsert (single) | ~20ms | Con indici |
| SQL delete | ~10ms | By airtable_id |
| Total sync time | ~100ms | End-to-end |

### Ottimizzazioni

1. **Connection pooling**: Max 10 connections (configurabile in route.ts)
2. **Indici**: `airtable_id` UNIQUE garantisce upsert veloce
3. **Async logging**: sync_log non blocca response

---

## Sicurezza

✅ **Signature verification**: HMAC SHA256 con secret  
✅ **HTTPS only**: No plain HTTP  
✅ **Environment variables**: Secrets non in codice  
✅ **SQL injection protection**: Parametrized queries  
✅ **Rate limiting**: Vercel default (100 req/10s)

---

## Rollback

Se serve disabilitare il webhook:

### Opzione A: Pause su Airtable
```bash
curl -X PATCH "https://api.airtable.com/v0/bases/app359c17lK0Ta8Ws/webhooks/WEBHOOK_ID" \
  -H "Authorization: Bearer YOUR_AIRTABLE_PAT" \
  -d '{"isHookEnabled": false}'
```

### Opzione B: Delete Webhook
```bash
curl -X DELETE "https://api.airtable.com/v0/bases/app359c17lK0Ta8Ws/webhooks/WEBHOOK_ID" \
  -H "Authorization: Bearer YOUR_AIRTABLE_PAT"
```

### Opzione C: Return 200 immediatamente
Modifica route.ts per return OK senza sync (noop).

---

## Next Steps Dopo Setup

1. ✅ Webhook configurato e testato
2. ⏳ Abilita `USE_POSTGRES=true` per dual-read
3. ⏳ Monitor sync_log per 24h
4. ⏳ Se tutto OK → Postgres diventa source primaria
5. ⏳ Dopo 7 giorni stabili → considera disabilitare Airtable API (solo webhook)

---

## Domande?

Usa `GET /api/webhooks/airtable-sync` per verificare configurazione.
Controlla `sync_log` table per troubleshooting.
