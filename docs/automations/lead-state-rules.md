# 🤖 Regole Automazione Cambio Stato Lead

> **Versione**: 3.0 (Funnel Semplificato)  
> **Ultimo aggiornamento**: 13 Gennaio 2026  
> **File sorgente**: `src/components/activities/new-activity-modal.tsx` (funzione `handleLeadStateAutomation`)  
> **Breaking Change**: Rinominati stati 'Attivo'→'Contattato', 'Chiuso'→'Perso', aggiunto 'In Negoziazione'

## 📋 Prerequisito Universale

**Tutte le automazioni si attivano SOLO se:**
```
Stato Attività = "Completata"
```

⚠️ Se l'attività è "In corso", "Pianificata", "Da Pianificare" → **Nessuna automazione**

---

## 🎯 Nuovo Funnel (7 stati)

```
Nuovo → Contattato → Qualificato → In Negoziazione → Cliente
                                            ↓
                                         Sospeso
                                            ↓
                                          Perso
```

---

## 🎯 Regole Attive

### **Regola 1: Nuovo → Contattato** 🟢

**Trigger:**
- Obiettivo = **"Primo contatto"**
- Esito in:
  - ✅ Contatto riuscito
  - ✅ Molto interessato
  - ✅ Interessato
  - ✅ Appuntamento fissato

**Logica Business:**  
*"Hai contattato con successo il lead per la prima volta e ha mostrato interesse → diventa Contattato**Esempio:**
```
Lead: Paolo Rossi (Stato: Contattato)
vo)
Attività: Chiamata
├─ Obiettivo: Primo contatto
├─ Stato: Completata
└─ Esito: Contatto riuscito
Result: Mario Rossi → Contattato ✅
```

---

### **Regola 2: Contattato → Qualificato** 🟡

**Trigger:**
- Obiettivo = **"Qualificazione lead"**
- Esito in:
  - ✅ Informazioni raccolte
  - ✅ Contatto riuscito *(nuovo)*
  - ✅ Molto interessato *(nuovo)*
  - ✅ Interessato *(nuovo)*
  - ✅ Preventivo richiesto *(nuovo)*

**Logica Business:**  
*"Hai qualificato il lead raccogliendo informazioni o confermando il suo interesse → diventa Qualificato"*

**Esempio:**
```
Lead: Laura Bianchi (Stato: Contattato)
Attività: Chiamata
├─ Obiettivo: Qualificazione lead
├─ Stato: Completata
└─ Esito: Contatto riuscito
Result: Laura Bianchi → Qualificato ✅
```

**📌 Nota:** Questa regola risolve il tuo caso! "Contatto riuscito" è ora accettato.

---

### **Regola 3: Contattato → Qualificato (Presentazione)** 🟡

**Trigger:**
- Obiettivo = **"Presentazione prodotto"**
- Esito in:
  - ✅ Molto interessato
  - ✅ Interessato
  - ✅ Preventivo richiesto
  - ✅ Appuntamento fissato

**Logica Business:**  
*"Dopo aver presentato il prodotto, il lead ha mostrato interesse concreto → qualificalo"*

**Esempio:**
```
Lead: Giuseppe Verdi (Stato: Contattato)
Attività: Consulenza
├─ Obiettivo: Presentazione prodotto
├─ Stato: Completata
└─ Esito: Preventivo richiesto
Result: Giuseppe Verdi → Qualificato ✅
```

---

### **Regola 4: Qualificato → In Negoziazione** 🟣 🆕

**Trigger:**
- Obiettivo in:
  - **"Fissare appuntamento"**
  - **"Invio preventivo"**
  - **"Negoziazione"**
- Esito in:
  - ✅ Appuntamento fissato
  - ✅ Preventivo inviato
  - ✅ Preventivo richiesto

**Logica Business:**  
*"Il lead ha un appuntamento fissato o ha richiesto/ricevuto preventivo → è in fase di negoziazione attiva"*

**Esempio:**
```
Lead: Sofia Verdi (Stato: Qualificato)
Attività: Consulenza
├─ Obiettivo: Fissare appuntamento
├─ Stato: Completata
└─ Esito: Appuntamento fissato
Result: Sofia Verdi → In Negoziazione ✅
```

💡 **Nota**: Questo è il **nuovo stato critico** che colma il gap tra Qualificato e Cliente!

---

### **Regola 5: (qualsiasi) → Cliente** 🟢

**Trigger:**
- Obiettivo = *(qualsiasi)*
- Esito = **"Ordine confermato"**

**Logica Business:**  
*"Il lead ha confermato un ordine → è ora un Cliente"*

**Esempio:**
```
Lead: Anna Neri (Stato: Qualificato)
Attività: Consulenza
├─ Obiettivo: Chiusura ordine
├─ Stato: Completata
└─ Esito: Ordine confermato
Result: Anna Neri → Cliente ✅
```

⚠️ **Nota:** Questa regola ha priorità massima - funziona da qualsiasi stato.

---

### **Regola 6: (qualsiasi) → Perso** 🔴 🆕

**Trigger:**
- Esito in:
  - ❌ Non interessato
  - ❌ Opportunità persa

**Logica Business:**  
*"Il lead ha esplicitamente rifiutato o l'opportunità è definitivamente persa → marca come Perso"*

**Esempio:**
```
Lead: Paolo Neri (Stato: In Negoziazione)
Attività: Follow-up
├─ Obiettivo: Follow-up preventivo
├─ Stato: Completata
└─ Esito: Non interessato
Result: Paolo Neri → Perso ❌
```

---

## 📊 Tabella Riepilogativa

| # | Da Stato | A Stato | Obiettivo | Esiti Accettabili | Priorità |
|---|----------|---------|-----------|-------------------|----------|
| 1 | Nuovo | **Contattato** | Primo contatto | Contatto riuscito, Molto interessato, Interessato, Appuntamento fissato | Alta |
| 2 | Contattato | **Qualificato** | Qualificazione lead | Informazioni raccolte, Contatto riuscito, Molto interessato, Interessato, Preventivo richiesto | Alta |
| 3 | Contattato | **Qualificato** | Presentazione prodotto | Molto interessato, Interessato, Preventivo richiesto, Appuntamento fissato | Media |
| 4 | Qualificato | **In Negoziazione** 🆕 | Fissare appuntamento, Invio preventivo, Negoziazione | Appuntamento fissato, Preventivo inviato, Preventivo richiesto | Alta |
| 5 | *(qualsiasi)* | **Cliente** | *(qualsiasi)* | Ordine confermato | Massima |
| 6 | *(qualsiasi)* | **Perso** 🆕 | *(qualsiasi)* | Non interessato, Opportunità persa | Alta |

---

## 🔍 Casi Edge

### **Caso 1: Nessuna Regola Match**

Se nessuna regola si attiva → **Lo stato rimane invariato**

```
Lead: Paolo Rossi (Stato: Attivo)
Attività: Email
├─ Obiettivo: Follow-up preventivo
├─ Stato: Completata
└─ Esito: Nessuna risposta
Result: Paolo Rossi → Attivo (invariato)
```

### **Caso 2: Attività Non Completata**

```
Lead: Sara Blu (Stato: Nuovo)
Attività: Chiamata
├─ Obiettivo: Primo contatto
├─ Stato: In corso ❌
└─ Esito: (non ancora)
Result: Sara Blu → Nuovo (invariato)
```

### **Caso 3: Esito Negativo**

```
Lead: Marco Gialli (Stato: Nuovo)
Attività: Chiamata
├─ Obiettivo: Primo contatto
├─ Stato: Completata
└─ Esito: Numero errato ❌
Result: Marco Gialli → Nuovo (invariato)
```

---

## 🎨 UX e Feedback

### **Toast Notifications**

**1. Loading (Immediato):**
```
⏳ Aggiornamento stato lead a "Qualificato"...
   Aggiornamento automatico in base al risultato dell'attività.
```

**2. Success (Conferma API):**
```
✅ Stato lead aggiornato automaticamente
   Il lead è stato spostato in stato "Qualificato" in base al risultato dell'attività.
```

**3. Error (Fallimento):**
```
❌ Errore nell'aggiornamento dello stato lead
   Lo stato del lead non è stato aggiornato automaticamente. Puoi modificarlo manualmente.
```

### **Aggiornamenti Ottimistici**

Il sistema usa **aggiornamenti ottimistici**:
1. ⚡ **Immediato**: Badge stato cambia istantaneamente
2. 🌐 **API Call**: Conferma con server in background
3. ✅ **Confirm**: Conferma definitiva
4. ❌ **Rollback**: Se errore, ripristina stato precedente

---

## 🛠️ Testing

### **Test Regola 2 (Fix tuo caso)**

```bash
# Test manuale
1. Vai su lead con stato "Nuovo" o "Attivo"
2. Crea attività: Chiamata
3. Imposta:
   - Obiettivo: Qualificazione lead
   - Stato: Completata
   - Esito: Contatto riuscito ← NUOVO ESITO ACCETTATO
4. Salva
5. ✅ Verifica: Lead passa a "Qualificato"
6. ✅ Verifica console: "🟡 [LEAD STATE] Qualificazione (Contatto riuscito) → Qualificato"
```

---

## 🔮 Roadmap Future

### **Fase 2: Sistema Configurabile (Q1 2026)**

Obiettivo: Spostare le regole in una **tabella Airtable "Automazioni"**

**Benefits:**
- ✅ Configurazione senza redeploy
- ✅ Regole personalizzabili per tenant
- ✅ UI di gestione nel CRM
- ✅ Analytics attivazioni
- ✅ A/B testing regole

**Schema Tabella Proposto:**

| Campo | Tipo | Esempio |
|-------|------|---------|
| Nome | Text | "Qualifica con Contatto" |
| Attivo | Checkbox | ✓ |
| Obiettivo | Select | "Qualificazione lead" |
| Esiti | Multi-Select | ["Contatto riuscito", "Interessato"] |
| Stato Da | Select | "Attivo" |
| Stato A | Select | "Qualificato" |
| Priorità | Number | 10 |

### **Fase 3: Editor Visuale (Q2 2026)**

Obiettivo: UI drag-and-drop per creare regole

```
┌─────────────────────────────────────┐
│ SE                                  │
│ ├─ Obiettivo = Qualificazione lead │
│ └─ Esito in [Contatto, Interessato]│
│                                     │
│ ALLORA                              │
│ └─ Cambia Stato Lead → Qualificato │
└─────────────────────────────────────┘
```

---

## 📏 Changelog

### v3.0 (13 Gen 2026) 🆕 BREAKING
- 🔄 **Rinominato**: 'Attivo' → 'Contattato' (più chiaro)
- 🔄 **Rinominato**: 'Chiuso' → 'Perso' (esito negativo esplicito)
- ✨ **Nuovo Stato**: 'In Negoziazione' (colma gap Qualificato→Cliente)
- ✨ **Nuova Regola 4**: Qualificato → In Negoziazione
- ✨ **Nuova Regola 6**: (qualsiasi) → Perso
- 📝 Migration plan completo per Airtable
- 🎯 Funnel vendita ottimizzato a 7 stati

### v2.0 (13 Gen 2026)
- ✨ **Ampliata Regola 2**: Aggiunto "Contatto riuscito" per qualificazione
- ✨ **Nuova Regola 3**: Presentazione prodotto → Qualificato
- 📝 Documentazione completa regole
- 🐛 Fix: Risolto caso edge "Qualificazione + Contatto riuscito"

### v1.0 (9 Set 2025)
- 🎉 Release iniziale con 3 regole base
- 🚀 Sistema aggiornamenti ottimistici
- 🎨 Toast notifications

---

**Maintainer**: Dev Team CRM  
**Feedback**: Segnala casi non gestiti per migliorare le regole
