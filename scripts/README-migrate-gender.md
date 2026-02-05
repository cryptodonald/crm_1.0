# Script di Migrazione Gender Lead

Script per rilevare automaticamente il gender di tutti i lead esistenti usando AI (OpenRouter).

## Prerequisiti

### 1. Campo Gender su Airtable
Prima di eseguire lo script, **devi creare manualmente il campo Gender** sulla tabella Lead in Airtable:

1. Apri Airtable → Base CRM → Tabella **Lead**
2. Aggiungi nuovo campo:
   - **Nome campo**: `Gender`
   - **Tipo campo**: Single Select
   - **Opzioni**:
     - `male` (colore blu)
     - `female` (colore rosa)
     - `unknown` (colore grigio)

### 2. Variabili d'ambiente
Assicurati che `.env.local` contenga:
```env
AIRTABLE_API_KEY=pat...
AIRTABLE_BASE_ID=app...
AIRTABLE_LEADS_TABLE_ID=tbl...
OPENROUTER_API_KEY=sk-or-v1-...
```

## Utilizzo

### Test (Dry Run)
Prima di modificare Airtable, esegui un test per vedere cosa farebbe lo script:

```bash
npm run migrate:gender -- --dry-run
```

Questo mostrerà:
- Quanti lead verranno processati
- Quale gender sarebbe assegnato a ciascun lead
- Statistiche finali (male/female/unknown)
- **NON scrive su Airtable**

### Test con limite
Per testare solo sui primi 10 lead:

```bash
npm run migrate:gender -- --dry-run --limit=10
```

### Esecuzione reale
⚠️ **Attenzione**: Questo modificherà i record su Airtable!

```bash
npm run migrate:gender
```

Lo script:
1. Ti avvisa che sta per scrivere su Airtable
2. Aspetta 5 secondi (puoi premere Ctrl+C per annullare)
3. Processa tutti i lead uno alla volta
4. Mostra statistiche finali

## Cosa fa lo script

1. **Fetch**: Legge tutti i lead da Airtable
2. **Filtra**: Salta i lead che:
   - Non hanno un nome
   - Hanno già un gender impostato (diverso da "unknown")
3. **AI Detection**: Per ogni lead rimanente:
   - Chiama OpenRouter API (gpt-3.5-turbo)
   - Rileva il gender basandosi sul nome
   - Aspetta 500ms tra ogni chiamata (rate limiting)
4. **Update**: Aggiorna Airtable con il gender rilevato
5. **Report**: Mostra statistiche finali

## Esempio Output

```
🚀 Lead Gender Migration Script
==================================================
Mode: ✍️  WRITE MODE
Limit: All leads
==================================================

📥 Fetching leads from Airtable...
✅ Fetched 248 leads

📊 Statistics:
   Total leads: 248
   Already have gender: 0
   No name: 3
   To process: 245

⚠️  WRITE MODE: This will update Airtable records!
   Press Ctrl+C to cancel, or wait 5 seconds to proceed...

🔄 Processing leads...

[1/245] Processing: Marco Rossi
   → Detected: male
   ✅ Updated in Airtable

[2/245] Processing: Laura Bianchi
   → Detected: female
   ✅ Updated in Airtable

...

==================================================
📊 MIGRATION SUMMARY
==================================================
Processed: 245 leads
Updated: 245 leads
Errors: 0

Gender Distribution:
   Male: 128
   Female: 103
   Unknown: 14
==================================================

✅ Migration completed successfully!
```

## Troubleshooting

### Errore "Missing required environment variables"
- Verifica che `.env.local` contenga tutte le chiavi necessarie
- Usa `cat .env.local | grep -E "(AIRTABLE|OPENROUTER)"` per controllare

### Errore "Field 'Gender' does not exist"
- Il campo Gender non esiste ancora su Airtable
- Crealo manualmente (vedi prerequisiti sopra)

### Rate limit OpenRouter
- Lo script ha un delay di 500ms tra ogni chiamata
- Se usi il piano free, potrebbe essere necessario aumentare il delay
- Modifica `delay(500)` a `delay(1000)` nello script se necessario

### Lead con nomi strani
- L'AI potrebbe non riconoscere nomi rari o stranieri
- Questi verranno marcati come `unknown`
- Puoi modificarli manualmente su Airtable dopo

## Costi

- **OpenRouter (gpt-3.5-turbo)**: ~$0.0015 per 1000 token
- Ogni nome = ~20 token (input + output)
- 250 lead = ~5000 token = **~$0.01 totale** 💰

Economico! 🎉

## Sicurezza

- Lo script **NON cancella** mai dati esistenti
- Aggiorna solo il campo Gender
- Se un lead ha già un gender diverso da "unknown", lo SALTA
- Usa `--dry-run` per testare prima di applicare modifiche

## Supporto

Per domande o problemi, contatta il team di sviluppo.
