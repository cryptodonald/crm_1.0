# Quick Test Guide - Sistema Autenticazione

## Setup Rapido (5 minuti)

### 1. Verifica Environment
```bash
# Controlla che .env.local sia configurato
cat .env.local | grep -E "(AIRTABLE|NEXTAUTH|JWT)"
```

Devi avere:
- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_USERS_TABLE_ID`
- `NEXTAUTH_SECRET` (min 32 caratteri)
- `JWT_SECRET` (min 32 caratteri)
- `NEXTAUTH_URL=http://localhost:3000`

### 2. Crea Utente Demo
```bash
npx tsx scripts/create-demo-user.ts
```

Output atteso:
```
✅ Demo user created successfully!

📋 Login Credentials:
   Email: demo@crm.local
   Password: demo1234
   Role: admin
```

### 3. Avvia Server
```bash
npm run dev
```

Attendi: `✓ Ready in XXXms`

---

## Test Veloci (2 minuti)

### ✅ Test 1: Protezione Route
1. Apri **modalità incognito**
2. Vai a: `http://localhost:3000/dashboard`
3. **Risultato**: Devi vedere redirect a `/login?callbackUrl=%2Fdashboard`

### ✅ Test 2: Login Valido
1. Nella pagina login, inserisci:
   - Email: `demo@crm.local`
   - Password: `demo1234`
2. Click "Accedi"
3. **Risultato**: 
   - Messaggio verde "Login effettuato con successo!"
   - Dopo 1.5s redirect a `/dashboard`
   - Vedi "Demo User" e "admin" in header

### ✅ Test 3: Logout
1. Dalla dashboard, click "Esci"
2. **Risultato**: Redirect a `/login`
3. Prova a tornare a `/dashboard` → redirected ancora a login

### ✅ Test 4: Validazione
1. Pagina login, lascia tutto vuoto
2. Click "Accedi"
3. **Risultato**: Errori rossi "Email obbligatoria" e "Password obbligatoria"

### ✅ Test 5: Password Errata
1. Email: `demo@crm.local`
2. Password: `wrongpassword`
3. **Risultato**: Alert rosso "Email o password non validi"

---

## Troubleshooting

### ❌ Errore: "Cannot find module tsx"
```bash
npm install -D tsx
```

### ❌ Errore: "AIRTABLE_API_KEY is required"
Verifica `.env.local` e assicurati che contenga tutte le variabili necessarie.

### ❌ Script crea utente fallisce
1. Controlla che la tabella "Users" esista in Airtable
2. Controlla che abbia questi campi:
   - Email (Single line text)
   - Name (Single line text)  
   - PasswordHash (Single line text)
   - Role (Single select: admin, manager, user)
   - Status (Single select: active, inactive, suspended)
   - CreatedAt (Date)

### ❌ Login non funziona
1. Verifica che l'utente sia stato creato in Airtable
2. Controlla console browser per errori
3. Verifica che Status = "active"

### ❌ "Debug mode enabled" warning
È normale in development. NextAuth mostra log dettagliati.

---

## Prossimi Step

Una volta completati questi test base, consulta `AUTHENTICATION_TESTING.md` per:
- Test approfonditi (11 casi d'uso)
- Google OAuth setup
- Test sicurezza avanzati
- Performance testing

---

## Comandi Utili

```bash
# Genera hash password per utente manuale
npx tsx scripts/create-demo-user.ts --hash-only "tuapassword"

# Verifica type check
npx tsc --noEmit

# Build produzione
npm run build

# Lint
npm run lint
```

---

**Durata totale test**: ~7 minuti  
**Test passati minimi per OK**: 5/5 ✅
