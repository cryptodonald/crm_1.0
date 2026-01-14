# 📊 Sistema Gestione Spese Campagne Marketing

Documentazione completa del sistema di tracciamento delle spese per le campagne marketing.

---

## 🎯 Panoramica

Il sistema permette di:
- ✅ Creare e gestire campagne marketing con budget
- ✅ Registrare spese effettive per ogni campagna
- ✅ Supportare range di date flessibili (giorno, settimana, mese, anno, custom)
- ✅ Visualizzare, modificare ed eliminare tutte le spese per campagna
- ✅ Calcolare automaticamente totali e durata

---

## 🗂️ Struttura Airtable

### Tabella: **Marketing Costs** (Campagne)
Campi:
- `Nome` (Single line text) - Nome campagna
- `Fonte` (Single select) - Fonte marketing (Meta, Google, etc.)
- `Budget Totale` (Currency) - Budget allocato
- `Costo Mensile` (Currency) - Costo medio mensile stimato
- `Data Inizio` (Date) - Inizio campagna
- `Data Fine` (Date) - Fine campagna (opzionale, null = continua)
- `Note` (Long text) - Note aggiuntive

### Tabella: **Spese Mensili** (Spese Effettive)
Campi:
- `Nome` (Single line text) - **Primary field** - Auto-generato (es: "Dicembre 2024", "5 dic - 18 dic 2024")
- `Campagna` (Link to Marketing Costs) - Link alla campagna
- `Data Inizio` (Date) - Inizio periodo di spesa
- `Data Fine` (Date) - Fine periodo di spesa
- `Importo Speso` (Currency) - Importo effettivo speso
- `Note` (Long text) - Dettagli della spesa

---

## 🚀 Funzionalità

### 1. **Gestione Campagne** (`/marketing/campaigns`)

#### Visualizzazione
- Tabella con tutte le campagne
- Cards riassuntive:
  - Budget Totale allocato
  - Campagne Attive (senza data fine o in corso)
  - Budget Medio per campagna

#### Azioni per Campagna
- 🟢 **DollarSign (verde)**: Visualizza tutte le spese → apre dialog spese
- ✏️ **Pencil**: Modifica campagna
- 🗑️ **Trash**: Elimina campagna

---

### 2. **Dialog Spese Campagna** (clic su 💰)

Quando clicchi sull'icona DollarSign verde, si apre un dialog che mostra:

#### Se nessuna spesa registrata:
- Messaggio vuoto state
- Pulsante "Aggiungi Spesa" centrale

#### Se ci sono spese:
Tabella completa con colonne:
- **Periodo**: Nome auto-generato (es: "Dicembre 2024")
- **Data Inizio**: Data di inizio (formato: "22 dic 2024")
- **Data Fine**: Data di fine
- **Giorni**: Badge con durata in giorni (es: "13g")
- **Importo**: Importo formattato (es: "€1.300,00")
- **Note**: Dettagli della spesa
- **Azioni**: 
  - ✏️ Modifica spesa
  - 🗑️ Elimina spesa

#### Footer:
- Totale Spese con conteggio registrazioni
- Pulsante "Nuova Spesa"
- Pulsante "Chiudi"

---

### 3. **Registra/Modifica Spesa** (clic su "Nuova Spesa" o ✏️)

Dialog con campi:

#### Campi Input:
1. **Data Inizio** (DatePicker) - Obbligatorio
   - Default: primo giorno del mese corrente
2. **Data Fine** (DatePicker) - Obbligatorio
   - Default: oggi
3. **Importo Speso (€)** - Obbligatorio
   - Tipo number, min 0, step 0.01
4. **Note** - Opzionale
   - Textarea multiriga

#### Calcolo Automatico:
- **Durata in giorni**: Calcolata in tempo reale
  - Mostrata sotto il titolo: "Periodo: 13 giorni"

#### Generazione Nome Automatica:
Il nome della spesa viene generato automaticamente in base al periodo:
- **1 giorno**: "22 dicembre 2024"
- **Stesso mese (≤31 giorni)**: "Dicembre 2024"
- **Range custom**: "5 dic - 18 dic 2024"

---

## 📋 Workflow Completo

### Scenario 1: Campagna Meta con spese mensili variabili

1. **Crea Campagna**
   - Nome: "Meta Acquisition 2024"
   - Fonte: Meta
   - Budget: €10.000
   - Costo Mensile: €1.500 (stimato)
   - Data Inizio: 01/01/2024
   - Data Fine: (lascia vuoto per campagna continua)

2. **Registra Spese Effettive**
   - **Novembre 2024**: €1.300
     - Data Inizio: 01/11/2024
     - Data Fine: 30/11/2024
     - Importo: 1300
     - Note: "Facebook Ads + Instagram Ads"
   
   - **Dicembre 2024**: €2.500
     - Data Inizio: 01/12/2024
     - Data Fine: 31/12/2024
     - Importo: 2500
     - Note: "Boost natalizio"

3. **Visualizza Storico**
   - Clicca 💰 sulla campagna
   - Vedi tutte le spese ordinate per data
   - Totale: €3.800 su 2 registrazioni

---

### Scenario 2: Campagna Google con periodi custom

1. **Crea Campagna**
   - Nome: "Google Search Q1 2024"
   - Fonte: Google
   - Budget: €5.000
   - Data: 01/01/2024 → 31/03/2024

2. **Registra Spese Custom**
   - **Prima settimana gennaio**:
     - Data: 01/01/2024 → 07/01/2024
     - Importo: €450
   
   - **13 giorni metà gennaio**:
     - Data: 08/01/2024 → 20/01/2024
     - Importo: €890
   
   - **Resto mese**:
     - Data: 21/01/2024 → 31/01/2024
     - Importo: €660

---

## 🔧 API Endpoints

### GET `/api/marketing/expenses?campaignId={id}`
Recupera tutte le spese per una campagna specifica.

**Query Params:**
- `campaignId` (required): ID della campagna

**Response:**
```json
{
  "success": true,
  "expenses": [
    {
      "id": "recXXX",
      "nome": "Dicembre 2024",
      "campaignId": "recCampaign",
      "dataInizio": "2024-12-01",
      "dataFine": "2024-12-31",
      "amount": 2500,
      "note": "Boost natalizio"
    }
  ]
}
```

---

### POST `/api/marketing/expenses`
Crea una nuova spesa.

**Body:**
```json
{
  "campaignId": "recCampaign",
  "dataInizio": "2024-12-01",
  "dataFine": "2024-12-31",
  "amount": 2500,
  "note": "Boost natalizio"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "recXXX",
    "nome": "Dicembre 2024",
    "campaignId": "recCampaign",
    "dataInizio": "2024-12-01",
    "dataFine": "2024-12-31",
    "amount": 2500,
    "note": "Boost natalizio"
  }
}
```

---

### PATCH `/api/marketing/expenses/{id}`
Modifica una spesa esistente.

**Body:** (stesso formato del POST, senza campaignId)
```json
{
  "dataInizio": "2024-12-01",
  "dataFine": "2024-12-31",
  "amount": 3000,
  "note": "Boost natalizio aumentato"
}
```

---

### DELETE `/api/marketing/expenses/{id}`
Elimina una spesa.

**Response:**
```json
{
  "success": true,
  "message": "Spesa eliminata"
}
```

---

## 💡 Best Practices

### 1. **Registrazione Periodica**
- Registra le spese settimanalmente o mensilmente
- Mantieni traccia dei periodi esatti
- Aggiungi note dettagliate per chiarezza

### 2. **Range di Date Consigliati**
- **Mensile**: 1° → ultimo giorno del mese
- **Settimanale**: Lunedì → Domenica
- **Custom**: Solo quando necessario (es: promozione 5 giorni)

### 3. **Note Utili**
Includi nelle note:
- Tipo di ads (Facebook Ads, Google Search, etc.)
- Obiettivo campagna (acquisizione, retention, etc.)
- Eventi speciali (Black Friday, Natale, etc.)

### 4. **Budget vs Spese**
- **Budget Totale**: Quanto hai allocato
- **Costo Mensile**: Stima per confronto
- **Spese Effettive**: Importo reale speso (tracciato nel dialog)

---

## 🔍 Troubleshooting

### Problema: Non vedo le spese
**Causa**: Filtro campagna non corretto
**Soluzione**: Verifica che il campo `Campagna` nella tabella `Spese Mensili` sia linkato correttamente

### Problema: Nome spesa non formattato correttamente
**Causa**: Formato date non riconosciuto
**Soluzione**: Assicurati che i campi `Data Inizio` e `Data Fine` siano in formato YYYY-MM-DD

### Problema: Eliminazione non funziona
**Causa**: Record in uso o permessi Airtable
**Soluzione**: Verifica i permessi API e che il record esista

---

## 📊 Metriche Calcolate

Attualmente disponibili nel dialog spese:
- **Totale Spese**: Somma di tutti gli importi registrati
- **Conteggio Registrazioni**: Numero di spese registrate
- **Durata Periodo**: Giorni per ogni singola spesa

### Metriche Future (in pianificazione):
- Budget Residuo = Budget Totale - Totale Spese
- % Budget Utilizzato
- Spesa Media Giornaliera
- Proiezione Fine Mese

---

## 🎨 UI/UX Features

### Stati Visuali
- **Empty State**: Icona DollarSign + messaggio vuoto + CTA
- **Loading**: Spinner centrato con testo
- **Table**: Dati completi con formattazione italiana

### Formattazione
- **Date**: "22 dic 2024" (giorno abbreviato)
- **Valute**: "€1.300,00" (formato italiano)
- **Durata**: Badge "13g" (compatto)

### Colori & Icone
- 🟢 DollarSign verde: Gestione spese
- ✏️ Pencil: Modifica
- 🗑️ Trash: Eliminazione
- Badge muted: Durata in giorni

---

## 🚀 Prossimi Sviluppi

### Priorità Alta
- [ ] Dashboard Analytics con grafici spese nel tempo
- [ ] Export CSV delle spese
- [ ] Confronto Budget vs Spese Effettive

### Priorità Media
- [ ] Alert automatici quando spesa supera budget
- [ ] Categorizzazione spese (Ads, Content, Tools, etc.)
- [ ] Tag personalizzati per spese

### Priorità Bassa
- [ ] Previsioni spesa basate su storico
- [ ] Integrazione con sistemi contabilità
- [ ] Report PDF automatici mensili

---

**Versione**: 1.0  
**Data**: 22 Dicembre 2024  
**Autore**: CRM Team  
**Status**: ✅ Completato
