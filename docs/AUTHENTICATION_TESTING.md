# Authentication Testing Documentation

## Overview
Testing completo del sistema di autenticazione CRM 2.0 con NextAuth, Airtable, e protezione route.

**Data test**: 30 Gennaio 2026  
**Versione Next.js**: 16.1.6  
**Versione NextAuth**: Latest

---

## Prerequisiti Test

### 1. Setup Airtable
Prima di testare, assicurati che la tabella Users in Airtable abbia questi campi:
- `Email` (Single line text)
- `Name` (Single line text)
- `PasswordHash` (Single line text)
- `Role` (Single select: admin, manager, user)
- `Status` (Single select: active, inactive, suspended)
- `GoogleId` (Single line text) - Opzionale
- `ProfileImage` (URL) - Opzionale
- `CreatedAt` (Date) - Opzionale
- `LastLogin` (Date) - Opzionale

### 2. Creare Utente Demo
```bash
# Opzione 1: Creare utente automaticamente
npx tsx scripts/create-demo-user.ts

# Opzione 2: Generare solo hash password
npx tsx scripts/create-demo-user.ts --hash-only "tuapassword"
# Poi aggiungi manualmente il record in Airtable
```

**Credenziali utente demo**:
- Email: `demo@crm.local`
- Password: `demo1234`
- Role: `admin`
- Status: `active`

### 3. Environment Variables
Verifica che `.env.local` contenga:
```env
# Airtable
AIRTABLE_API_KEY=your_key
AIRTABLE_BASE_ID=your_base_id
AIRTABLE_USERS_TABLE_ID=your_table_id
# ... altri table IDs

# NextAuth
NEXTAUTH_SECRET=your_secret_32_chars_min
JWT_SECRET=your_jwt_secret_32_chars_min
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (opzionale per questo test)
GOOGLE_OAUTH_CLIENT_ID=your_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_client_secret
```

---

## Test Cases

### Test 1: Accesso alla Home Page
**Obiettivo**: Verificare che la home page sia accessibile senza autenticazione

**Passi**:
1. Aprire browser in modalità incognito
2. Navigare a `http://localhost:3000`
3. Verificare che la pagina si carichi senza redirect

**Risultato atteso**: ✅ Pagina home caricata (o redirect a /login se non esiste home pubblica)

---

### Test 2: Protezione Route Dashboard
**Obiettivo**: Verificare che /dashboard richieda autenticazione

**Passi**:
1. Browser in modalità incognito (sessione pulita)
2. Navigare direttamente a `http://localhost:3000/dashboard`
3. Osservare redirect

**Risultato atteso**: 
- ✅ Redirect a `/login?callbackUrl=%2Fdashboard`
- ✅ Pagina login mostrata
- ✅ callbackUrl presente nell'URL

**Risultato effettivo**: 

---

### Test 3: Login con Credenziali Valide
**Obiettivo**: Verificare login funzionante con email/password corrette

**Passi**:
1. Dalla pagina `/login`
2. Inserire:
   - Email: `demo@crm.local`
   - Password: `demo1234`
3. Click su "Accedi"

**Risultato atteso**:
- ✅ Spinner "Accesso in corso..." mostrato
- ✅ Messaggio successo verde "Login effettuato con successo!"
- ✅ Redirect a `/dashboard` dopo 1.5 secondi
- ✅ Dashboard mostra nome utente e ruolo
- ✅ Pulsante "Esci" visibile

**Risultato effettivo**:

**Console logs attesi**:
```
[NextAuth] Credentials auth success
GET /dashboard 200
```

---

### Test 4: Login con Password Errata
**Obiettivo**: Verificare gestione errore password sbagliata

**Passi**:
1. Pagina `/login`
2. Inserire:
   - Email: `demo@crm.local`
   - Password: `wrongpassword`
3. Click su "Accedi"

**Risultato atteso**:
- ✅ Nessun redirect
- ✅ Alert rosso con messaggio "Email o password non validi"
- ✅ Form non resettato (email rimane compilata)

**Risultato effettivo**:

---

### Test 5: Validazione Client-Side
**Obiettivo**: Verificare validazione form lato client

**Passi**:
1. Pagina `/login`
2. Test A: Submit senza compilare nulla
3. Test B: Email formato invalido (es. "test")
4. Test C: Password troppo corta (< 8 caratteri)

**Risultato atteso**:
- ✅ Test A: Errori "Email obbligatoria" e "Password obbligatoria"
- ✅ Test B: Errore "Formato email non valido"
- ✅ Test C: Errore "La password deve essere di almeno 8 caratteri"
- ✅ Nessuna chiamata API fatta se validazione fallisce
- ✅ Bordi input diventano rossi
- ✅ Errori scompaiono quando si inizia a digitare

**Risultato effettivo**:

---

### Test 6: Login con Account Inattivo
**Obiettivo**: Verificare blocco account con status != active

**Setup**: 
1. In Airtable, creare un secondo utente o modificare quello esistente:
   - Email: `inactive@crm.local`
   - Password hash generato per "test1234"
   - Status: `inactive`

**Passi**:
1. Tentare login con `inactive@crm.local` / `test1234`

**Risultato atteso**:
- ✅ Errore: "Account non attivo. Contatta l'amministratore."
- ✅ Nessun redirect

**Risultato effettivo**:

---

### Test 7: Persistenza Sessione
**Obiettivo**: Verificare che la sessione persista tra refresh

**Passi**:
1. Effettuare login valido
2. Essere nella dashboard
3. Refresh pagina (F5)
4. Chiudere e riaprire tab (mantiene cookies)

**Risultato atteso**:
- ✅ Dopo refresh: rimani nella dashboard, dati utente visibili
- ✅ Dopo chiusura/riapertura tab: sessione ancora attiva (se entro 30 giorni)

**Risultato effettivo**:

---

### Test 8: Logout
**Obiettivo**: Verificare funzionalità logout

**Passi**:
1. Da dashboard (autenticato)
2. Click pulsante "Esci" in header
3. Osservare comportamento

**Risultato atteso**:
- ✅ Redirect a `/login`
- ✅ Sessione rimossa
- ✅ Tentare di tornare a `/dashboard` → redirect a `/login`

**Risultato effettivo**:

---

### Test 9: Callback URL dopo Login
**Obiettivo**: Verificare redirect alla pagina originale dopo login

**Passi**:
1. Browser non autenticato
2. Navigare a `http://localhost:3000/dashboard`
3. Viene redirected a `/login?callbackUrl=%2Fdashboard`
4. Effettuare login valido

**Risultato atteso**:
- ✅ Dopo login, redirect a `/dashboard` (non a una pagina generica)

**Risultato effettivo**:

---

### Test 10: Protezione API Routes
**Obiettivo**: Verificare che API routes siano protette

**Passi**:
1. Browser non autenticato
2. Tentare `GET http://localhost:3000/api/leads` (quando sarà implementato)

**Risultato atteso**:
- ✅ 401 Unauthorized o redirect a login

**Risultato effettivo**:
_Da testare quando API /api/leads sarà implementata_

---

### Test 11: Health Check Accessibile
**Obiettivo**: Verificare che /api/health sia pubblico

**Passi**:
1. Browser non autenticato
2. Navigare a `http://localhost:3000/api/health`

**Risultato atteso**:
- ✅ 200 OK
- ✅ JSON con status check

**Risultato effettivo**:

---

## Test Google OAuth (Opzionale)

### Setup Google OAuth
1. Configurare Google Cloud Console
2. Aggiungere redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Ottenere Client ID e Client Secret

### Test 12: Login con Google
**Passi**:
1. Pagina `/login`
2. Click "Accedi con Google" (quando implementato)
3. Completare OAuth flow

**Risultato atteso**:
- ✅ Redirect a Google OAuth
- ✅ Dopo autorizzazione, redirect a dashboard
- ✅ Se utente non esiste in Airtable: errore "Account non trovato"

**Risultato effettivo**:
_Da testare se Google OAuth è configurato_

---

## Checklist Finale

### Funzionalità Core
- [ ] Login con credenziali valide funziona
- [ ] Errori password/email mostrati correttamente
- [ ] Validazione client-side attiva
- [ ] Dashboard protetta (redirect a login)
- [ ] Logout funziona
- [ ] Sessione persiste tra refresh
- [ ] callbackUrl gestito correttamente

### Sicurezza
- [ ] Password hashate con bcrypt
- [ ] JWT secret configurato e sicuro (min 32 caratteri)
- [ ] Route protette da proxy.ts
- [ ] API routes protette (eccetto /api/auth e /api/health)
- [ ] Account inattivi bloccati

### UI/UX
- [ ] Loading states mostrati durante login
- [ ] Messaggi errore chiari e localizzati in italiano
- [ ] Successo login con feedback visivo
- [ ] Form accessibile (label, autofocus, autocomplete)
- [ ] Toggle mostra/nascondi password funziona
- [ ] UI pixel-perfect con CRM 1.0

### Performance
- [ ] Login < 2 secondi
- [ ] Redirect istantaneo dopo auth
- [ ] Nessun flash di contenuto protetto prima del redirect

---

## Issues Trovati

### Issue #1: [Titolo]
**Severità**: Critical / High / Medium / Low  
**Descrizione**:  
**Passi per riprodurre**:  
**Soluzione**:  

---

## Note Aggiuntive

### Limitazioni Attuali
- Google OAuth richiede configurazione manuale in Google Cloud Console
- Auto-registrazione via Google disabilitata (require admin per creare utenti)

### Miglioramenti Futuri
- [ ] 2FA (Two-Factor Authentication)
- [ ] Password reset flow
- [ ] Email verification
- [ ] Rate limiting su login attempts
- [ ] Audit log per login failures
- [ ] Remember me functionality (estende sessione)

---

## Conclusioni

**Status complessivo**: ✅ PASS / ❌ FAIL / ⚠️ PARTIAL

**Test passati**: X/12  
**Test falliti**: X/12  
**Test skipped**: X/12

**Pronto per produzione**: SÌ / NO

**Note finali**:
