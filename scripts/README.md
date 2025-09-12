# 🛠️ Scripts Directory

Questa cartella contiene tutti gli script di utilità, test e migrazione per il progetto CRM 1.0, organizzati per tipologia e scopo.

## 📁 Struttura Directory

```
scripts/
├── migrations/          # Script di migrazione database/sistema
├── analysis/           # Script di analisi Airtable e metadata  
├── test/               # Script di test e debug API
├── monitoring/         # Script di monitoring e health check
├── debug/              # Script di debug database e sistema
├── legacy/             # Script per sistemi di crittografia legacy
├── docs/               # Script di generazione documentazione
└── README.md          # Questa documentazione
```

---

## 🔐 Migrations (`migrations/`)

Script di migrazione critici per aggiornamenti del sistema.

### `migrate-to-aes.js`

**Scopo:** Migrazione one-time da crittografia Base64 legacy a AES-256-CBC per le API Keys.

### `migrate-api-keys.js`

**Scopo:** Migrazione base di 5 API keys principali da `.env.local` al database KV.

### `migrate-all-api-keys.js`

**Scopo:** Migrazione completa di TUTTE le API keys (15+) da `.env.local` al database KV.

**Prerequisiti (per tutti i script di migrazione):**
- File `.env.local` configurato con:
  - `KV_REST_API_URL`
  - `KV_REST_API_TOKEN` 
  - `ENCRYPTION_MASTER_KEY`

**Esecuzione:**
```bash
cd scripts/migrations
node migrate-to-aes.js      # Migrazione crittografia AES
node migrate-api-keys.js     # Migrazione API base
node migrate-all-api-keys.js # Migrazione completa
```

**⚠️ ATTENZIONE SICUREZZA:**
- Script modifica dati in produzione (Upstash KV)
- Eseguire solo dopo backup
- Non interrompere durante l'esecuzione
- Testare prima in ambiente di sviluppo

**Output previsto:**
- Report dettagliato delle chiavi migrate
- Conteggio delle operazioni (successi/errori)
- Verifica finale dello stato delle chiavi

---

## 🔍 Analysis (`analysis/`)

Script di analisi dei metadati Airtable e generazione tipi TypeScript.

### `analyze-activities-simple.js`

**Scopo:** Analizza le connessioni Activity dai lead esistenti e suggerisce struttura dati.

**Esecuzione:**
```bash
cd scripts/analysis
node analyze-activities-simple.js
```

### `analyze-activity-metadata.js`

**Scopo:** Analisi completa dei metadata della tabella Activity con accesso diretto ad Airtable.

### `get-activity-fields.js`

**Scopo:** Recupera e genera interfacce TypeScript per i campi Activity.

### `get-real-activity-fields.js` / `get-real-activity-simple.js`

**Scopo:** Script avanzati per accesso diretto ai metadati Airtable con endpoint temporanei.

### `analyze-leads-metadata.js`

**Scopo:** Analisi completa della struttura della tabella Leads e suggerimenti per KPI.

**⚠️ NOTA:**
- Questi script richiedono il server Next.js attivo
- Alcuni creano endpoint temporanei per accesso Airtable
- Generano file JSON di analisi e interfacce TypeScript

---

## 🧪 Test (`test/`)

Script di testing e debugging per le API del sistema.

### `test-create-lead.js`

**Scopo:** Test dell'endpoint `POST /api/leads` con dati mock completi.

**Prerequisiti:**
- Server Next.js in esecuzione su `localhost:3000`
- Database Airtable configurato e accessibile

**Esecuzione:**
```bash
# Assicurati che il server sia in esecuzione
npm run dev

# In un altro terminale:
cd scripts/test
node test-create-lead.js
```

**Output previsto:**
- Status code 200/201 per successo
- ID del lead creato
- Messaggio di errore dettagliato in caso di fallimento

### `test-put-lead.js`

**Scopo:** Test di debug per l'endpoint `PUT /api/leads/[id]` con ID specifico.

**Note importanti:**
- Contiene ID hardcoded: `rec0RzG6UhpF94a64`
- Timeout configurato a 10 secondi
- Debug dettagliato di headers e response chunks

**Esecuzione:**
```bash
cd scripts/test
node test-put-lead.js
```

**⚠️ ATTENZIONE:**
- Modifica dati reali in Airtable
- Verificare che l'ID esista prima dell'esecuzione

### `test-aes-decrypt.js`

**Scopo:** Verifica che la decrittografia AES-256 funzioni correttamente.

**Prerequisiti:**
- File `.env.local` con variabili di crittografia
- Chiavi API migrate ad AES-256

**Esecuzione:**
```bash
cd scripts/test
node test-aes-decrypt.js
```

**Output previsto:**
- Lista delle chiavi testate (max 3)
- Status di decrittografia (successo/errore)
- Preview dei valori decrittografati (primi 20 caratteri)

---

## 📊 Monitoring (`monitoring/`)

Script per il monitoraggio dello stato di produzione.

### `test-production.js`

**Scopo:** Health check completo dell'ambiente di produzione Vercel.

**URL target:** `https://crm-1-0-b11y48geq-doctorbed.vercel.app`

**Prerequisiti:**
- File `.env.local` per test database (opzionale)
- Accesso internet per raggiungere produzione

**Esecuzione:**
```bash
cd scripts/monitoring
node test-production.js
```

**Controlli eseguiti:**
1. **Homepage** - Status code e contenuto base
2. **API Stats** - Endpoint `/api/api-keys/stats`
3. **API Keys List** - Endpoint `/api/api-keys`
4. **Database Connection** - Test connessione KV con credenziali locali

**Output previsto:**
- Status di ciascun endpoint
- Conteggi di chiavi e statistiche
- Report finale sullo stato generale

---

## 🐛 Debug (`debug/`)

Script di debugging per il database KV e il sistema.

### `debug-kv.js`

**Scopo:** Esplorazione completa del database Upstash KV per debug.

**Prerequisiti:**
- File `.env.local` con credenziali KV
- Connessione al database KV

**Esecuzione:**
```bash
cd scripts/debug
node debug-kv.js
```

**Output previsto:**
- Lista completa delle chiavi nel database
- Dettagli delle prime 3 API keys
- Chiavi dell'utente di sviluppo
- Statistiche di utilizzo

---

## 🔐 Legacy (`legacy/`)

Script per gestire sistemi di crittografia legacy (Base64).

### `decrypt-key.js`

**Scopo:** Decrittografia di una singola chiave API specifica.

**Esecuzione:**
```bash
cd scripts/legacy
node decrypt-key.js api_key:YOUR_KEY_ID
```

### `decrypt-all.js`

**Scopo:** Decrittografia di tutte le API keys nel sistema.

**Esecuzione:**
```bash
cd scripts/legacy
node decrypt-all.js
```

### `decrypt-advanced.js`

**Scopo:** Analisi avanzata di una chiave con informazioni complete.

**Esecuzione:**
```bash
cd scripts/legacy
node decrypt-advanced.js api_key:YOUR_KEY_ID
```

### `verify-encryption.js`

**Scopo:** Verifica corrispondenza tra valori in KV e `.env.local`.

**Esecuzione:**
```bash
cd scripts/legacy
node verify-encryption.js
```

**⚠️ NOTA LEGACY:**
- Questi script funzionano con formato Base64 legacy
- Non compatibili con AES-256-CBC moderno
- Da usare solo per debug di sistemi pre-migrazione

---

## 📝 Docs (`docs/`)

Script per la generazione automatica di documentazione.

### `generate-docs.mjs`

**Scopo:** Genera automaticamente `WARP.md` e `README.md` da `docs/index.yaml`.

**Prerequisiti:**
- File `docs/index.yaml` configurato
- Dipendenza: `js-yaml` installata

**Esecuzione:**
```bash
cd scripts/docs
node generate-docs.mjs
```

**Output:**
- Aggiorna `/WARP.md` con regole operative
- Aggiorna `/README.md` con indice modulare
- Combina documentazione da fonti multiple

---

## 🚀 Best Practices

### Esecuzione Sicura

1. **Sempre testare in locale prima della produzione**
2. **Verificare prerequisiti prima dell'esecuzione**
3. **Monitorare output per errori o anomalie**
4. **Fare backup prima di script di migrazione**

### Variabili d'Ambiente

Gli script richiedono le seguenti variabili in `.env.local`:

```env
# Crittografia (per migrations e test AES)
ENCRYPTION_MASTER_KEY=your-256-bit-encryption-key

# Database KV (per migrations e monitoring)
KV_REST_API_URL=your-vercel-kv-rest-api-url
KV_REST_API_TOKEN=your-vercel-kv-rest-api-token

# Airtable (utilizzato indirettamente dalle API)
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_airtable_base_id
```

### Troubleshooting

| Errore | Causa Probabile | Soluzione |
|--------|----------------|-----------|
| `ECONNREFUSED` | Server non in esecuzione | Avvia `npm run dev` |
| `Missing environment variables` | .env.local mancante | Verifica configurazione env |
| `Airtable API error: 404` | Record/tabella non trovata | Controlla ID e permessi |
| `Decryption failed` | Chiave master errata | Verifica ENCRYPTION_MASTER_KEY |

---

## 📝 Note per Sviluppatori

- **Path relativi:** Tutti gli script usano `../../.env.local` per il file di configurazione
- **Timeout:** Script con timeout configurabili per evitare hang infiniti
- **Logging:** Output dettagliato con emoji e timestamp per debugging
- **Error Handling:** Gestione robusta degli errori con messaggi informativi

---

## 🔄 Manutenzione

### Aggiornamento Script

Quando modifichi uno script:
1. Testa in ambiente locale
2. Aggiorna questa documentazione se necessario
3. Verifica che i path relativi siano corretti
4. Controlla che le dipendenze siano installate

### Pulizia Periodica

- Rimuovi output temporanei o log files
- Aggiorna URL di produzione se cambiano
- Verifica che ID hardcoded siano ancora validi
- Controlla che le variabili d'ambiente siano aggiornate

---

**Ultimo aggiornamento:** Dicembre 2024  
**Versione:** 1.0.0