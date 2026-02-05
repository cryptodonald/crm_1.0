# Setup Webhook Airtable - Auto Gender Inference

Questa guida spiega come configurare un webhook su Airtable che inferisce automaticamente il campo `Gender` quando viene creato un nuovo lead senza quel campo.

---

## 📋 Prerequisiti

1. ✅ Account Airtable con accesso alla base CRM 2.0
2. ✅ Account Vercel con progetto deployato
3. ✅ Variabili environment configurate (vedi sotto)

---

## 🔐 Step 1: Configura Environment Variables

Aggiungi questa variabile in **Vercel** (Dashboard → Settings → Environment Variables):

```bash
AIRTABLE_WEBHOOK_SECRET=your-secret-key-here
```

**Importante**: Genera un secret sicuro (es. UUID o stringa random di 32+ caratteri). Non usare `change-me-in-production`!

Esempio:
```bash
AIRTABLE_WEBHOOK_SECRET=a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

Redeploy l'app dopo aver aggiunto la variabile.

---

## 🔗 Step 2: Trova l'URL del Webhook

L'endpoint webhook è:

```
https://your-domain.vercel.app/api/webhooks/airtable/new-lead
```

Sostituisci `your-domain.vercel.app` con il tuo dominio Vercel (o custom domain).

**Verifica che l'endpoint sia attivo**:
```bash
curl https://your-domain.vercel.app/api/webhooks/airtable/new-lead
```

Dovresti ricevere:
```json
{
  "status": "active",
  "endpoint": "/api/webhooks/airtable/new-lead",
  "description": "Webhook per auto-inferire Gender sui nuovi lead"
}
```

---

## ⚙️ Step 3: Crea Automazione Airtable

### Opzione A: Automazione Airtable (consigliata)

Airtable non ha webhook nativi, ma possiamo usare le **Automazioni** per chiamare il nostro endpoint.

1. **Vai su Airtable** → Base CRM 2.0 → **Automations** (icona fulmine in alto)

2. **Crea nuova automazione**:
   - Nome: `Auto Infer Gender on New Lead`

3. **Trigger**: "When a record is created"
   - Table: `Leads`

4. **Aggiungi condizione** (opzionale ma consigliato):
   - Condition: `Gender is empty`
   - Questo evita di chiamare il webhook se Gender è già popolato

5. **Action**: "Send an HTTP request"
   - URL: `https://your-domain.vercel.app/api/webhooks/airtable/new-lead`
   - Method: `POST`
   - Headers:
     ```json
     {
       "Content-Type": "application/json",
       "x-webhook-secret": "your-secret-key-here"
     }
     ```
   - Body:
     ```json
     {
       "recordId": "{{AIRTABLE_RECORD_ID}}",
       "fields": {
         "Nome": "{{Nome}}",
         "Cognome": "{{Cognome}}",
         "Gender": "{{Gender}}"
       }
     }
     ```

6. **Test** l'automazione:
   - Crea un lead di test con Nome ma senza Gender
   - Verifica che Gender venga popolato automaticamente

7. **Attiva l'automazione** 🚀

---

### Opzione B: Script Airtable (avanzato)

Se hai accesso agli **Airtable Scripts**, puoi usare questo codice:

```javascript
// Script da eseguire quando viene creato un record
const webhookUrl = 'https://your-domain.vercel.app/api/webhooks/airtable/new-lead';
const webhookSecret = 'your-secret-key-here';

const table = base.getTable('Leads');
const record = input.config(); // Record appena creato

if (!record.getCellValue('Gender')) {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-secret': webhookSecret,
    },
    body: JSON.stringify({
      recordId: record.id,
      fields: {
        Nome: record.getCellValue('Nome'),
        Cognome: record.getCellValue('Cognome'),
        Gender: record.getCellValue('Gender'),
      },
    }),
  });

  const result = await response.json();
  console.log('Webhook response:', result);
}
```

---

## 🛠️ Step 4: Fix Lead Esistenti (One-Time)

Per sistemare i lead esistenti che hanno Gender mancante, esegui lo script:

```bash
npx tsx scripts/fix-missing-gender.ts
```

Questo script:
- Trova tutti i lead senza Gender
- Raggruppa per nome (per efficienza)
- Chiama OpenAI per inferire il genere
- Aggiorna Airtable con i risultati

**Nota**: Lo script usa crediti OpenAI, quindi verrà eseguito una sola volta.

---

## 🧪 Testing

### Test 1: Crea nuovo lead manualmente su Airtable

1. Vai su Airtable → Leads
2. Crea nuovo record:
   - Nome: `Marco`
   - Cognome: `Rossi`
   - Gender: (lascia vuoto)
3. Attendi 5-10 secondi
4. Ricarica la pagina
5. Verifica che Gender sia stato popolato con `Uomo`

### Test 2: Crea lead via automazione Airtable

Se hai automazioni che creano lead (es. da form esterni), verifica che il webhook venga chiamato e Gender venga inferito correttamente.

### Test 3: Verifica logs

Controlla i logs Vercel per vedere le chiamate al webhook:

```bash
vercel logs --follow
```

Dovresti vedere:
```
📥 Webhook ricevuto per lead: recXXXXXXXXXXXXXX
🤖 Inferisco gender per nome: "Marco"
✅ Gender inferito: Uomo (confidence: high)
✅ Gender aggiornato su Airtable per lead recXXXXXXXXXXXXXX
```

---

## 🔒 Sicurezza

### Validazione Secret

Il webhook valida che la richiesta provenga da Airtable verificando l'header `x-webhook-secret`.

Se il secret non corrisponde:
```json
{
  "error": "Unauthorized"
}
```

### Rate Limiting

Airtable Automations ha limiti:
- **Free plan**: 100 automazioni/mese
- **Pro plan**: 25,000 automazioni/mese
- **Enterprise**: illimitato

Se superi il limite, dovrai upgradare il piano Airtable o usare lo script manuale periodicamente.

---

## 🐛 Troubleshooting

### Webhook non viene chiamato

1. Verifica che l'automazione Airtable sia **attiva**
2. Controlla che l'URL webhook sia corretto (copia-incolla da Vercel)
3. Verifica che il secret sia uguale in Vercel e Airtable
4. Controlla Airtable Automation History per errori

### Gender non viene aggiornato

1. Verifica logs Vercel: `vercel logs`
2. Controlla che `OPENAI_API_KEY` sia configurata
3. Verifica che il nome sia valido (non vuoto)
4. Testa manualmente:
   ```bash
   curl -X POST https://your-domain.vercel.app/api/webhooks/airtable/new-lead \
     -H "Content-Type: application/json" \
     -H "x-webhook-secret: your-secret" \
     -d '{"recordId":"recXXX","fields":{"Nome":"Marco"}}'
   ```

### Errore "Unauthorized"

Il secret non corrisponde. Verifica che:
- Secret in Vercel sia uguale a quello in Airtable
- Nessuno spazio extra all'inizio/fine del secret
- Redeploy dopo aver cambiato la variabile

---

## 📊 Costi

### OpenAI API

- Modello: `gpt-4o-mini`
- Costo stimato: ~$0.0001 per inferenza
- 1000 lead nuovi/mese ≈ $0.10

### Airtable Automations

- Incluso nel piano Pro/Enterprise
- Free plan limitato a 100 automazioni/mese

---

## ✅ Checklist Finale

- [ ] `AIRTABLE_WEBHOOK_SECRET` configurato su Vercel
- [ ] Endpoint webhook raggiungibile e attivo
- [ ] Automazione Airtable creata e attiva
- [ ] Test con lead manuale: Gender inferito correttamente
- [ ] Script `fix-missing-gender.ts` eseguito per lead esistenti
- [ ] Logs Vercel monitorati per verificare funzionamento

---

## 📝 Note

- Il webhook inferisce Gender **solo se mancante**
- Se Gender è già popolato, il webhook non fa nulla
- L'AI può restituire "Altro" per nomi ambigui/stranieri
- Lo script one-time va eseguito solo una volta per sistemare i lead esistenti
