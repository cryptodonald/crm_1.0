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
