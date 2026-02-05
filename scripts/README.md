# Scripts Utility - CRM 2.0

Questa directory contiene script di utilità per gestione Airtable, testing, e debugging.

---

## 📋 Indice Script

### 1. `inspect-airtable-table.ts` ⭐ **PRINCIPALE**
Ispeziona lo schema di qualsiasi tabella Airtable per vedere i nomi campi reali.

**Quando usarlo:**
- Prima di scrivere codice che usa una tabella Airtable
- Quando ci sono errori "Unknown field name"
- Per aggiornare i tipi TypeScript (`src/types/airtable.ts`)
- Per fare debugging di problemi di dati

**Usage:**
```bash
# Sintassi generale
NODE_OPTIONS='--require dotenv/config' DOTENV_CONFIG_PATH=.env.local \
  npx tsx scripts/inspect-airtable-table.ts <table_name>

# Esempi
npx tsx scripts/inspect-airtable-table.ts users
npx tsx scripts/inspect-airtable-table.ts leads
npx tsx scripts/inspect-airtable-table.ts activities
npx tsx scripts/inspect-airtable-table.ts products
npx tsx scripts/inspect-airtable-table.ts orders
```

**Output:**
- Lista primi 5 record
- Tutti i nomi campi con tipi
- Dati esempio
- Summary dei nomi campi

---

### 2. `inspect-airtable-users.ts`
Versione specializzata per tabella Users con controlli specifici per autenticazione.

**Quando usarlo:**
- Debug problemi di login
- Verificare password hash
- Controllare status utenti
- Trovare utente specifico per email

**Usage:**
```bash
NODE_OPTIONS='--require dotenv/config' DOTENV_CONFIG_PATH=.env.local \
  npx tsx scripts/inspect-airtable-users.ts
```

**Output:**
- Lista utenti (max 5)
- Dettagli utente demo@crm.local
- Check status "active" vs "Active"
- Verifica presenza PasswordHash

---

### 3. `create-demo-user.ts`
Crea utente demo per testing autenticazione.

**Quando usarlo:**
- Setup iniziale progetto
- Testing autenticazione
- Creare nuovi utenti test

**Usage:**
```bash
# Crea utente demo completo
NODE_OPTIONS='--require dotenv/config' DOTENV_CONFIG_PATH=.env.local \
  npx tsx scripts/create-demo-user.ts

# Solo genera password hash
NODE_OPTIONS='--require dotenv/config' DOTENV_CONFIG_PATH=.env.local \
  npx tsx scripts/create-demo-user.ts --hash-only "tuapassword"
```

**Credenziali demo:**
- Email: `demo@crm.local`
- Password: `demo1234`
- Role: admin
- Status: active

**Nota:** Attualmente il campo "Name" non corrisponde allo schema Airtable. Usare `--hash-only` e creare manualmente.

---

## 🔧 Setup Comune

Tutti gli script richiedono:

1. **Environment variables** in `.env.local`:
   ```env
   AIRTABLE_API_KEY=...
   AIRTABLE_BASE_ID=...
   AIRTABLE_USERS_TABLE_ID=...
   AIRTABLE_LEADS_TABLE_ID=...
   # etc.
   ```

2. **Dipendenze installate**:
   ```bash
   npm install  # installa tsx, dotenv, etc.
   ```

3. **Sintassi NODE_OPTIONS** (necessaria per caricare .env.local):
   ```bash
   NODE_OPTIONS='--require dotenv/config' DOTENV_CONFIG_PATH=.env.local npx tsx <script>
   ```

---

## 📝 Workflow: Aggiornare Schema TypeScript

Quando scopri che i campi Airtable sono diversi dai tipi TypeScript:

### Step 1: Ispeziona Schema Reale
```bash
npx tsx scripts/inspect-airtable-table.ts users
```

Output esempio:
```
📋 Summary of Field Names:
   1. ID
   2. Nome
   3. Email
   4. Ruolo
   5. Attivo
   6. Password
   7. Avatar_URL
```

### Step 2: Aggiorna `src/types/airtable.ts`
```typescript
export interface AirtableUser {
  id: string;
  fields: {
    ID: string;           // NON "id" minuscolo
    Nome: string;         // NON "Name"
    Email: string;        // OK
    Ruolo: 'Admin' | 'Sales' | 'Manager';  // NON "Role"
    Attivo: boolean;      // NON "Status": "active"
    Password: string;     // NON "PasswordHash"
    Avatar_URL?: string;  // NON "ProfileImage"
    Telefono?: string;
  };
  createdTime: string;
}
```

### Step 3: Aggiorna Codice che Usa la Tabella
```typescript
// ❌ PRIMA (campi inventati)
if (user.fields.Status !== 'active') { ... }

// ✅ DOPO (campi reali Airtable)
if (!user.fields.Attivo) { ... }
```

### Step 4: Type Check
```bash
npx tsc --noEmit
```

---

## 💡 Tips

### Trovare Nome Campo Esatto
```bash
# Ispeziona tabella e cerca il campo
npx tsx scripts/inspect-airtable-table.ts users | grep -i "email"
```

### Vedere Solo Summary Campi
```bash
npx tsx scripts/inspect-airtable-table.ts users | grep "Summary" -A 20
```

### Salvare Output per Reference
```bash
npx tsx scripts/inspect-airtable-table.ts users > schema-users.txt
```

### Debug Errore "Unknown field name"
1. Leggi messaggio errore: `Unknown field name: "Name"`
2. Ispeziona tabella: `npx tsx scripts/inspect-airtable-table.ts users`
3. Trova campo corretto nella lista (es. "Nome")
4. Aggiorna codice per usare "Nome" invece di "Name"

---

## 🚨 Problemi Comuni

### "Environment variable validation failed"
**Causa:** `.env.local` non caricato correttamente  
**Fix:** Usa sempre la sintassi `NODE_OPTIONS='--require dotenv/config'`

### "Cannot find module 'tsx'"
**Causa:** Dipendenze non installate  
**Fix:** `npm install`

### "Table not found" / 404
**Causa:** Table ID errato in `.env.local`  
**Fix:** Verifica Table ID in Airtable e aggiorna `.env.local`

### "Unknown field name: X"
**Causa:** Nome campo nel codice non corrisponde ad Airtable  
**Fix:** Usa `inspect-airtable-table.ts` per vedere nomi reali

---

## 📚 Esempi d'Uso Reali

### Scenario 1: Login non funziona
```bash
# 1. Ispeziona Users per vedere i campi
npx tsx scripts/inspect-airtable-users.ts

# Output mostra: "Attivo" invece di "Status"
# 2. Aggiorna src/app/api/auth/[...nextauth]/route.ts
# 3. Test login
```

### Scenario 2: Creare nuova feature per Orders
```bash
# 1. Prima ispeziona schema Orders
npx tsx scripts/inspect-airtable-table.ts orders

# 2. Copia nomi campi
# 3. Aggiorna src/types/airtable.ts
# 4. Scrivi API route con nomi corretti
# 5. Type check
npx tsc --noEmit
```

### Scenario 3: Import dati Leads da CSV
```bash
# 1. Ispeziona schema attuale
npx tsx scripts/inspect-airtable-table.ts leads > leads-schema.txt

# 2. Scrivi script import che usa nomi campi corretti
# 3. Test su 1 record
# 4. Import completo
```

---

## 🔗 Link Utili

- [Airtable API Docs](https://airtable.com/developers/web/api/introduction)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [bcrypt.js Docs](https://github.com/dcodeIO/bcrypt.js)

---

**Ultimo aggiornamento:** 30 Gennaio 2026  
**Maintainer:** Warp Agent
