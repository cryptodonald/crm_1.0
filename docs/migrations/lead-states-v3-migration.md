# 🔄 Migration Plan: Stati Lead v3.0

> **Data**: 13 Gennaio 2026  
> **Versione**: 3.0 (Funnel Semplificato)  
> **Tipo**: Breaking Change (rinomina stati esistenti)

## 📋 **Riepilogo Modifiche**

### **Stati Modificati**

| Stato Vecchio | Stato Nuovo | Tipo Cambio | Motivo |
|---------------|-------------|-------------|---------|
| **Attivo** | **Contattato** | Rinominato | Più chiaro e descrittivo |
| **Chiuso** | **Perso** | Rinominato | Distingue esito negativo |
| *(nessuno)* | **In Negoziazione** | Nuovo | Colma gap Qualificato→Cliente |

### **Stati Invariati**

✅ **Nuovo** - rimane uguale  
✅ **Qualificato** - rimane uguale  
✅ **Cliente** - rimane uguale  
✅ **Sospeso** - rimane uguale  

---

## 🎯 **Nuovo Funnel (7 stati)**

```
Nuovo → Contattato → Qualificato → In Negoziazione → Cliente
                                          ↓
                                       Sospeso
                                          ↓
                                        Perso
```

---

## 🛠️ **Strategia di Migrazione**

### **Opzione A: Migrazione Graduale** (Consigliato) ⭐

**Vantaggi:**
- ✅ Zero downtime
- ✅ Rollback facile
- ✅ Dati esistenti preservati

**Fasi:**

#### **Fase 1: Aggiunta Nuovo Stato (Immediato)**
```javascript
// In Airtable: Aggiungi 'In Negoziazione' alle opzioni dello stato
// Stati disponibili: 
// - Nuovo
// - Attivo (mantieni temporaneamente)
// - Contattato (aggiungi)
// - Qualificato
// - In Negoziazione (aggiungi)
// - Cliente
// - Sospeso
// - Chiuso (mantieni temporaneamente)
// - Perso (aggiungi)
```

#### **Fase 2: Deploy Codice (Immediato)**
```bash
# Il codice è già aggiornato e retrocompatibile
# I lead con 'Attivo' continuano a funzionare
git push origin master
```

#### **Fase 3: Migrazione Dati (Schedulato)**

**Script Airtable Automation**:

```javascript
// Automation 1: Migra "Attivo" → "Contattato"
// Trigger: Nightly (00:00)
// Filter: {Stato} = 'Attivo'
// Action: Update records
{
  "Stato": "Contattato"
}

// Automation 2: Migra "Chiuso" → "Perso"  
// Trigger: Nightly (00:05)
// Filter: {Stato} = 'Chiuso'
// Action: Update records
{
  "Stato": "Perso"
}
```

**Oppure Script Manuale**:

```javascript
// Esegui da Airtable Scripting
let table = base.getTable('Leads');

// Migra Attivo → Contattato
let attiviRecords = await table.selectRecordsAsync({
  filterByFormula: "{Stato} = 'Attivo'"
});

for (let record of attiviRecords.records) {
  await table.updateRecordAsync(record.id, {
    "Stato": "Contattato"
  });
}

console.log(`✅ Migrated ${attiviRecords.records.length} leads from Attivo → Contattato`);

// Migra Chiuso → Perso
let chiusiRecords = await table.selectRecordsAsync({
  filterByFormula: "{Stato} = 'Chiuso'"
});

for (let record of chiusiRecords.records) {
  await table.updateRecordAsync(record.id, {
    "Stato": "Perso"
  });
}

console.log(`✅ Migrated ${chiusiRecords.records.length} leads from Chiuso → Perso`);
```

#### **Fase 4: Pulizia (Dopo 7 giorni)**

Dopo aver verificato che tutto funziona:

```javascript
// Rimuovi stati vecchi da Airtable
// 1. Vai su tabella "Leads"
// 2. Click su campo "Stato" → Customize field type
// 3. Rimuovi opzioni:
//    - ❌ Attivo
//    - ❌ Chiuso
```

---

### **Opzione B: Migrazione Immediata** (Rapido ma rischioso)

**Solo se:**
- Database piccolo (<100 lead)
- Puoi permetterti downtime
- Hai backup recente

**Steps:**

1. **Backup Database**
```bash
# Export completo da Airtable
# Bases → ... → Export to CSV
```

2. **Aggiorna Stati in Airtable**
```
- Aggiungi: "Contattato", "In Negoziazione", "Perso"
- Rimuovi: "Attivo", "Chiuso"
```

3. **Migra Tutti i Record**
```javascript
// Esegui script sopra
// Migra tutti immediatamente
```

4. **Deploy Codice**
```bash
git push origin master
```

---

## 📊 **Impatto sui Dati Esistenti**

### **Statistiche Pre-Migrazione**

```sql
-- Query da eseguire prima
SELECT Stato, COUNT(*) as Count
FROM Leads
GROUP BY Stato
ORDER BY Count DESC;

-- Output esempio:
-- Nuovo: 45
-- Attivo: 32  ← Da migrare
-- Qualificato: 23
-- Cliente: 18
-- Sospeso: 5
-- Chiuso: 8  ← Da migrare
```

### **Statistiche Post-Migrazione Attese**

```sql
-- Dopo migrazione:
-- Nuovo: 45
-- Contattato: 32  ← Migrato da Attivo
-- Qualificato: 23
-- In Negoziazione: 0  ← Nuovo stato (popolato manualmente)
-- Cliente: 18
-- Sospeso: 5
-- Perso: 8  ← Migrato da Chiuso
```

---

## ⚠️ **Considerazioni Importanti**

### **Retrocompatibilità**

Il codice è **retrocompatibile**:

```typescript
// ❌ Se Airtable ha ancora "Attivo"
lead.Stato === "Attivo" 
// ✅ TypeScript darà warning ma non blocca runtime
// ⚠️ Il colore sarà undefined (fallback a default)

// Soluzione: Migra prima possibile
```

### **API Esterne**

Se hai integrazioni esterne che leggono lo stato:

```javascript
// ⚠️ Aggiorna mapping nelle integrazioni
const statusMapping = {
  // Vecchio → Nuovo
  "Attivo": "Contattato",
  "Chiuso": "Perso",
  // Nuovi rimangono invariati
  "Nuovo": "Nuovo",
  "Qualificato": "Qualificato",
  "Cliente": "Cliente",
  "Sospeso": "Sospeso",
};
```

### **Report e Dashboard**

Aggiorna filtri esistenti:

```javascript
// Prima
{Stato} = 'Attivo'

// Dopo
{Stato} = 'Contattato'
```

---

## 🧪 **Testing**

### **Checklist Pre-Migrazione**

- [ ] Backup completo database Airtable
- [ ] Export CSV di tutti i lead
- [ ] Verifica conteggio per ogni stato
- [ ] Testa creazione lead con nuovi stati
- [ ] Verifica automazioni attive

### **Checklist Post-Migrazione**

- [ ] Verifica conteggi stati (prima vs dopo)
- [ ] Testa tutte le automazioni cambio stato
- [ ] Verifica dashboard e report
- [ ] Controlla filtri nelle viste Airtable
- [ ] Test end-to-end creazione/modifica lead

---

## 📅 **Timeline Consigliata**

### **Giorno 1 (Oggi)**
- ✅ Deploy codice aggiornato
- ✅ Aggiungi nuovi stati in Airtable (senza rimuovere vecchi)
- ✅ Test ambiente dev/staging

### **Giorno 2-7**
- 🔄 Monitora comportamento sistema
- 🔄 Identifica lead "Qualificato" che dovrebbero essere "In Negoziazione"
- 🔄 Migra manualmente alcuni lead per test

### **Giorno 8**
- 🚀 Esegui script migrazione automatica (Attivo→Contattato, Chiuso→Perso)
- 📊 Verifica metriche e report

### **Giorno 15**
- 🧹 Rimuovi stati vecchi da Airtable
- ✅ Migrazione completata

---

## 🔧 **Script di Verifica**

### **Conta Lead per Stato**

```javascript
// Esegui prima e dopo migrazione
let table = base.getTable('Leads');
let query = await table.selectRecordsAsync();

let counts = {};
for (let record of query.records) {
  let stato = record.getCellValue('Stato');
  counts[stato] = (counts[stato] || 0) + 1;
}

console.table(counts);
```

### **Trova Lead "Orfani"**

```javascript
// Lead che usano stati vecchi
let orphans = await table.selectRecordsAsync({
  filterByFormula: "OR({Stato} = 'Attivo', {Stato} = 'Chiuso')"
});

console.log(`⚠️ Found ${orphans.records.length} leads with old states`);
```

---

## 🆘 **Rollback Plan**

Se qualcosa va storto:

### **1. Rollback Codice**
```bash
git revert HEAD
git push origin master
```

### **2. Rollback Dati Airtable**

```javascript
// Ripristina stati originali
// Contattato → Attivo
let contattiRecords = await table.selectRecordsAsync({
  filterByFormula: "{Stato} = 'Contattato'"
});

for (let record of contattiRecords.records) {
  await table.updateRecordAsync(record.id, {
    "Stato": "Attivo"
  });
}

// Perso → Chiuso
let persiRecords = await table.selectRecordsAsync({
  filterByFormula: "{Stato} = 'Perso'"
});

for (let record of persiRecords.records) {
  await table.updateRecordAsync(record.id, {
    "Stato": "Chiuso"
  });
}
```

### **3. Ripristina da Backup**

Se hai esportato CSV:
1. Vai su Airtable
2. Import CSV backup
3. Sovrascrivi record esistenti

---

## 📞 **Supporto**

**Domande?**  
- 📧 Email: dev-team@example.com  
- 💬 Slack: #crm-dev  
- 📖 Docs: `/docs/automations/lead-state-rules.md`

---

**Stato Migrazione**: 🟡 In Attesa  
**Responsabile**: Dev Team  
**Review da**: Product Owner  
**Deadline**: 20 Gennaio 2026
