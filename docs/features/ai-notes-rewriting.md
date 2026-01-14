# 🤖 AI-Powered Notes Rewriting

## Overview

Questo documento descrive la funzionalità di riscrittura intelligente delle note delle attività tramite **OpenAI GPT-5.2**.

GPT-5.2 è il modello flagship di OpenAI (rilasciato dicembre 2025) per coding, reasoning e task agentici.

La funzionalità trasforma note disordinate o incomplete in **report professionali strutturati** con:
- 📊 Sezioni organizzate automaticamente
- 📅 Date e numeri formattati correttamente
- • Bullet points per maggiore leggibilità
- 🎯 Enfasi su informazioni chiave (nomi, date, importi)
- 💼 Tono professionale e neutro
- 🧠 Ragionamento avanzato e comprensione del contesto

---

## Setup

### 1. API Key Configuration

Aggiungi la chiave API di OpenAI al file `.env.local`:

```bash
OPENAI_API_KEY=sk-proj-your-key-here
```

**Come ottenere la chiave:**
1. Vai su [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Crea un account o effettua il login
3. Clicca "Create new secret key"
4. Copia la chiave e aggiungila al `.env.local`
5. Assicurati di avere crediti disponibili nel tuo account

### 2. Installazione

Le dipendenze sono già installate nel progetto:

```bash
npm install openai
```

### 3. Costi

**Modello utilizzato:** GPT-5.2 (modello flagship più avanzato)
- **Input:** ~$1.75 per milione di token
- **Output:** ~$14.00 per milione di token
- **Context Window:** 400,000 token
- **Max Output:** 128,000 token
- **Knowledge Cutoff:** Agosto 2025

**Stima per riscrittura media:**
- Input: ~200 token (note originali)
- Output: ~250 token (note riscritte strutturate)
- **Costo per riscrittura: ~$0.0039** (meno di mezzo centesimo)

**Perché GPT-5.2?**
- 🧠 Ragionamento avanzato e logica multi-step
- 🌍 Comprensione superiore del contesto italiano
- 📊 Strutturazione più accurata delle informazioni
- 💰 Formattazione precisa di date, numeri e importi
- ✨ Qualità professionale del testo generato
- 🚀 Migliore comprensione di task agentici e CRM

---

## Come Funziona

### Frontend

1. L'utente inserisce note nel campo "Note" di un'attività
2. Se le note superano i 10 caratteri, appare il pulsante **"Riscrivi con AI"** con icona ✨
3. Il pulsante è cliccabile sia come icona (top-right) che come pulsante completo (sotto il campo)
4. Durante la riscrittura:
   - Il campo viene disabilitato
   - Appare uno spinner di caricamento
   - Viene mostrato un toast di conferma
5. Le note vengono sostituite con la versione riscritta

### Backend

L'API `/api/ai/rewrite-notes` processa la richiesta:

1. **Validazione**: Controlla che le note siano fornite
2. **AI Processing**: Chiama OpenAI GPT-4o-mini
3. **Response**: Restituisce le note riscritte (max length rispettato)
4. **Error Handling**: Gestisce errori in modo graceful

---

## Componenti

### AINotesField

**File**: `/src/components/activities/ai-notes-field.tsx`

Componente React che gestisce il campo note con AI:

```tsx
<AINotesField
  value={notes}
  onChange={setNotes}
  placeholder="Inserisci note..."
  maxLength={1000}
/>
```

**Props:**
- `value`: Valore corrente delle note
- `onChange`: Callback per aggiornare le note
- `placeholder`: Testo placeholder (opzionale)
- `className`: Classi CSS aggiuntive (opzionale)
- `maxLength`: Lunghezza massima (default: 1000)

**Features:**
- ✅ Mostra pulsante AI solo se note > 10 caratteri
- ✅ Disabilita campo durante riscrittura
- ✅ Spinner di caricamento
- ✅ Toast di successo/errore
- ✅ Contatore caratteri

---

## API Route

**File**: `/src/app/api/ai/rewrite-notes/route.ts`

### Request

```json
POST /api/ai/rewrite-notes

{
  "notes": "note originali disordinate",
  "maxLength": 1000
}
```

### Response Success

```json
{
  "rewrittenNotes": "Note riscritte in modo professionale",
  "originalLength": 145,
  "newLength": 112
}
```

### Response Error

```json
{
  "error": "Messaggio di errore",
  "details": "Dettagli opzionali"
}
```

---

## Utilizzo

### Flusso Utente

1. Apri il modale di creazione/modifica attività
2. Vai alla sezione "Note"
3. Scrivi note in formato libero (anche disordinate)
4. Clicca sul pulsante **"Riscrivi con AI"** (icona ✨)
5. Attendi 2-3 secondi per il processing
6. Le note vengono automaticamente riscritte

### Integrazione nel Form

Il componente è già integrato in `activity-step.tsx`:

```tsx
<FormField
  control={control}
  name="Note"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Note</FormLabel>
      <FormControl>
        <AINotesField
          value={field.value || ''}
          onChange={field.onChange}
          placeholder="Inserisci note o dettagli sull'attività..."
          maxLength={1000}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

## Esempi di Riscrittura

### Esempio 1: Note Disordinate

**Input:**
```
chiamato cliente ore 15 non risposto richiamato ore 16:30 parlato con mario 
interessato preventivo per 3 materassi matrimoniali consegna giugno 
budget circa 3000 euro da richiamare settimana prossima per conferma
```

**Output (GPT-4o):**
```
**Contatto Cliente:**
• Ore 15:00 - Primo tentativo: nessuna risposta
• Ore 16:30 - Secondo tentativo: contatto riuscito con Mario

**Dettagli Richiesta:**
• Prodotto: 3 materassi matrimoniali
• Consegna: Giugno 2025
• Budget: € 3.000

**Prossimi Passi:**
• Follow-up settimana prossima per conferma ordine
```

### Esempio 2: Note Tecniche

**Input:**
```
problema tecnico segnalato malfunzionamento rete elettrica testbed 
verificato con tecnico impianto ok sostituito interruttore difettoso 
cliente soddisfatto nessun costo aggiuntivo garanzia copre
```

**Output (GPT-4o):**
```
**Intervento Tecnico:**
• Problema: Malfunzionamento rete elettrica testbed
• Verifica: Impianto risultato OK dopo controllo tecnico
• Azione: Sostituito interruttore difettoso

**Esito:**
• Cliente soddisfatto del servizio
• Costo: € 0 (coperto da garanzia)
```

### Esempio 3: Note Meeting

**Input:**
```
meeting con responsabile acquisti parlato di nuovo progetto hotel 
necessitano 150 materassi + 150 reti per apertura marzo 2025
interessati anche a cuscini e accessori chiesto preventivo dettagliato
fissato appuntamento showroom 15 febbraio ore 10
```

**Output (GPT-4o):**
```
**Meeting con Responsabile Acquisti:**

**Progetto:**
• Nuovo hotel in apertura - Marzo 2025

**Fornitura Richiesta:**
• 150 materassi
• 150 reti
• Cuscini e accessori (quantità da definire)

**Prossimi Passi:**
• Preparare preventivo dettagliato completo
• Appuntamento showroom: 15/02/2025 ore 10:00
```

---

## Troubleshooting

### Errore: "Servizio AI non configurato"

**Causa:** `OPENAI_API_KEY` non configurata

**Soluzione:**
```bash
# Aggiungi al .env.local
OPENAI_API_KEY=sk-proj-your-key-here
```

### Errore: "Errore servizio AI"

**Cause possibili:**
1. Chiave API non valida o scaduta
2. Crediti esauriti
3. Rate limit raggiunto
4. Problemi di connessione

**Soluzioni:**
1. Verifica la chiave su [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Controlla i crediti disponibili nel tuo account OpenAI
3. Attendi qualche minuto se hai raggiunto il rate limit
4. Verifica la connessione internet

### Pulsante AI non appare

**Causa:** Note troppo corte (< 10 caratteri)

**Soluzione:** Scrivi almeno 10 caratteri per attivare il pulsante

### Note troppo lunghe

**Causa:** L'AI ha generato note che superano `maxLength`

**Soluzione:** Il sistema tronca automaticamente al limite. Se necessario, aumenta `maxLength` nel componente.

---

## Prompt AI Avanzato

L'AI utilizza un prompt sofisticato per garantire output di qualità professionale:

### System Message (Ruolo dell'AI)
```
Sei un assistente esperto specializzato nella gestione di CRM aziendali. 
Il tuo compito è trasformare note disordinate in report professionali strutturati.

CARATTERISTICHE DEL TUO OUTPUT:
- Linguaggio professionale e conciso in italiano
- Struttura chiara con sezioni e bullet points
- Enfasi su informazioni chiave: nomi, date, numeri, impegni, azioni
- Formato leggibile e scannable
- Tono neutro e oggettivo

NON aggiungere MAI:
- Introduzioni o saluti
- Commenti meta sul processo
- Informazioni non presenti nelle note originali
- Interpretazioni o supposizioni
```

### User Message (Istruzioni Specifiche)
```
Trasforma queste note in un report professionale seguendo questa struttura:

**STRUTTURA RICHIESTA:**
1. Se ci sono informazioni di contatto o timing → Sezione "Contatto" o "Cronologia"
2. Se ci sono richieste o esigenze → Sezione "Dettagli Richiesta" o "Esigenze"
3. Se ci sono decisioni o accordi → Sezione "Accordi" o "Decisioni"
4. Se ci sono prossimi step → Sezione "Prossimi Passi" o "Follow-up"

**REGOLE FONDAMENTALI:**
✓ Mantieni TUTTI i dettagli: nomi propri, numeri, date, orari, importi, quantità
✓ Usa bullet points (•) per liste e informazioni multiple
✓ Formatta numeri e date in modo standard italiano (es: € 1.500, 15/01/2025)
✓ Rimani sotto i {maxLength} caratteri
✓ Non inventare informazioni non presenti
✓ Se le note sono già ben strutturate, migliora solo leggermente

Note originali:
"""
{notes}
"""
```

### Parametri di Generazione
- **Model:** `gpt-5.2` (flagship model, dicembre 2025)
- **Temperature:** 0.3 (bassa per maggiore coerenza e precisione)
- **Max Tokens:** 2000 (per supportare output più strutturati e dettagliati)
- **Context Window:** 400K token (molto superiore a GPT-4)

---

## Performance

### Response Time
- **Medio**: 3-6 secondi
- **Range**: 2-10 secondi (GPT-5.2 è più potente e accurato)

### Ottimizzazioni
- **Caching**: Non implementato (note sempre uniche)
- **Timeout**: 15 secondi
- **Retry**: Non implementato (fallisce al primo errore)

### Monitoring
```typescript
console.log('🤖 [AI Rewrite] Riscrittura note in corso...');
console.log('📝 [AI Rewrite] Lunghezza originale:', notes.length);
console.log('✅ [AI Rewrite] Completata in Xms');
console.log('📊 [AI Rewrite] Nuova lunghezza:', rewrittenNotes.length);
```

---

## Considerazioni di Sicurezza

### Privacy
- ⚠️ Le note vengono inviate a OpenAI per il processing
- ⚠️ OpenAI può usare i dati per training (se non opt-out)
- ✅ Nessuna informazione identificativa viene loggata lato server

### Best Practices
1. Non includere dati sensibili (password, dati bancari, etc.)
2. Informare gli utenti che le note vengono processate da AI
3. Considerare opt-out per utenti sensibili
4. Implementare rate limiting per prevenire abusi

---

## Future Improvements

### Planned
- [ ] Stili di riscrittura selezionabili (formale, conciso, dettagliato)
- [ ] History delle riscritture con undo
- [ ] Suggerimenti automatici mentre si scrive
- [ ] Integrazione con altri campi (descrizione, obiettivi)

### Advanced
- [ ] Fine-tuning del modello su dati CRM specifici
- [ ] Multi-lingua support
- [ ] Batch processing per multiple note
- [ ] Analytics su utilizzo e qualità riscritture

---

## Testing

### Manual Testing
1. Crea un'attività
2. Inserisci note disordinate
3. Clicca "Riscrivi con AI"
4. Verifica che le note siano riscritte correttamente
5. Verifica che tutte le informazioni siano mantenute

### Edge Cases
- ✅ Note molto corte (< 20 caratteri)
- ✅ Note molto lunghe (> 800 caratteri)
- ✅ Note con emoji, caratteri speciali
- ✅ Note in lingue diverse (IT, EN)
- ✅ Note con formattazione esistente

---

**Maintainer:** Dev Team  
**Last Updated:** 2025-01-14  
**Version:** 4.0 (OpenAI GPT-5.2)  
**AI Model:** gpt-5.2 (flagship model, dicembre 2025)
