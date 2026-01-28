# 🔐 ENVIRONMENT VARIABLES RICHIESTE

Questo documento elenca **TUTTE** le variabili d'ambiente necessarie per far funzionare il CRM.

---

## ✅ VARIABILI OBBLIGATORIE

### 1. Airtable Configuration
```bash
# API Key (da Airtable Personal Access Token)
AIRTABLE_API_KEY=patxxxxxxxxxxxxxxxxx

# Base ID (dalla URL di Airtable: https://airtable.com/appXXXXXXXXXX/...)
AIRTABLE_BASE_ID=appxxxxxxxxxx

# Table IDs (i nomi delle tabelle in Airtable)
AIRTABLE_USERS_TABLE_ID=tblUsers
AIRTABLE_LEADS_TABLE_ID=tblLeads  
AIRTABLE_ACTIVITIES_TABLE_ID=tblActivities
AIRTABLE_ORDERS_TABLE_ID=tblOrders
AIRTABLE_PRODUCTS_TABLE_ID=tblProducts
AIRTABLE_AUTOMATIONS_TABLE_ID=tblAutomazioni
```

### 2. Authentication
```bash
# JWT Secret (stringa random sicura, minimo 32 caratteri)
JWT_SECRET=your-super-secret-jwt-key-here-min-32-chars

# NextAuth Secret (stringa random sicura)
NEXTAUTH_SECRET=your-nextauth-secret-here
NEXTAUTH_URL=https://crm.doctorbed.app
```

### 3. Email (Opzionale ma consigliato)
```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@doctorbed.app
```

---

## 🔧 VARIABILI OPZIONALI

### Upstash KV (Solo per cache/rate-limiting, NON per secrets)
```bash
KV_REST_API_URL=https://xxxx.upstash.io
KV_REST_API_TOKEN=AxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxA
```

**⚠️ IMPORTANTE:** KV è ora OPZIONALE. Se non configurato:
- Rate limiting è disabilitato (funziona comunque)
- Nessuna cache (funziona comunque, solo più lento)

### Google APIs
```bash
GOOGLE_MAPS_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_CALENDAR_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CALENDAR_CLIENT_SECRET=xxxxxx-xxxxxxxxxxxxxxxxxxxxxx
```

### WhatsApp API
```bash
WHATSAPP_API_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Vercel Blob Storage
```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 📋 CHECKLIST CONFIGURAZIONE

### Locale (.env.local):
- [ ] AIRTABLE_API_KEY
- [ ] AIRTABLE_BASE_ID
- [ ] AIRTABLE_USERS_TABLE_ID
- [ ] AIRTABLE_LEADS_TABLE_ID
- [ ] AIRTABLE_ACTIVITIES_TABLE_ID
- [ ] AIRTABLE_ORDERS_TABLE_ID
- [ ] AIRTABLE_PRODUCTS_TABLE_ID
- [ ] JWT_SECRET
- [ ] NEXTAUTH_SECRET

### Vercel Production:
- [ ] AIRTABLE_API_KEY (Environment: Production, Preview, Development)
- [ ] AIRTABLE_BASE_ID (Environment: Production, Preview, Development)
- [ ] AIRTABLE_USERS_TABLE_ID (Environment: Production, Preview, Development)
- [ ] AIRTABLE_LEADS_TABLE_ID (Environment: Production, Preview, Development)
- [ ] AIRTABLE_ACTIVITIES_TABLE_ID (Environment: Production, Preview, Development)
- [ ] AIRTABLE_ORDERS_TABLE_ID (Environment: Production, Preview, Development)
- [ ] AIRTABLE_PRODUCTS_TABLE_ID (Environment: Production, Preview, Development)
- [ ] JWT_SECRET (Environment: Production, Preview, Development)
- [ ] NEXTAUTH_SECRET (Environment: Production, Preview, Development)
- [ ] NEXTAUTH_URL = https://crm.doctorbed.app (Environment: Production)

---

## 🚨 ERRORI COMUNI

### "Missing Airtable credentials"
**Causa:** Manca una delle variabili AIRTABLE_*
**Fix:** Verifica che TUTTE le variabili AIRTABLE_* siano configurate

### "401 Unauthorized" da Airtable
**Causa:** Token errato o scaduto
**Fix:** Rigenera token su https://airtable.com/create/tokens

### "429 Too Many Requests"
**Causa:** Rate limiting attivo ma KV non configurato
**Fix:** Rate limiting è ora disabilitato, non dovrebbe succedere

### "ByteString error"
**Causa:** Caratteri speciali in JWT_SECRET
**Fix:** Usa solo caratteri ASCII standard (lettere, numeri, -)

---

## 🎯 COME OTTENERE I VALORI

### AIRTABLE_API_KEY:
1. Vai su https://airtable.com/create/tokens
2. Create new token
3. Scopes: data.records:read, data.records:write, schema.bases:read
4. Access: All bases
5. Copia il token (inizia con "pat")

### AIRTABLE_BASE_ID:
1. Apri la tua base CRM su Airtable
2. Guarda l'URL: `https://airtable.com/app359c17lK0Ta8Ws/...`
3. Il BASE_ID è `app359c17lK0Ta8Ws`

### Table IDs:
I nomi esatti delle tabelle in Airtable (es: tblUsers, tblLeads, etc.)

### JWT_SECRET:
Genera una stringa random sicura:
```bash
openssl rand -base64 32
```

---

## ✅ CONFIGURAZIONE COMPLETA ESEMPIO

```bash
# Airtable
AIRTABLE_API_KEY=patPzpnIJExzhRQN2...
AIRTABLE_BASE_ID=app359c17lK0Ta8Ws
AIRTABLE_USERS_TABLE_ID=tblUsers
AIRTABLE_LEADS_TABLE_ID=tblLeads
AIRTABLE_ACTIVITIES_TABLE_ID=tblActivities
AIRTABLE_ORDERS_TABLE_ID=tblOrders
AIRTABLE_PRODUCTS_TABLE_ID=tblProducts  
AIRTABLE_AUTOMATIONS_TABLE_ID=tblAutomazioni

# Auth
JWT_SECRET=super-secret-jwt-key-minimum-32-characters-long
NEXTAUTH_SECRET=another-secret-for-nextauth
NEXTAUTH_URL=https://crm.doctorbed.app

# Email (opzionale)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@doctor bed.app
```

---

Creato: 2026-01-28
Versione: 1.0
