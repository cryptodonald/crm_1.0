# 🎯 Proposta Organizzazione Steps - NewActivityModal

## Situazione Attuale
Il dialog delle attività ha **troppi campi in un unico step**, rendendolo lungo e confuso:
- 15+ campi tutti visibili insieme
- Scroll verticale eccessivo
- UX non ottimale per l'utente

## 📋 Proposta: 3 Steps Logici

### **Step 1: Informazioni Base** 📝
*Dati essenziali per identificare l'attività*

**Campi:**
- ✅ **Tipo Attività** (obbligatorio) - Chiamata, WhatsApp, Email, etc.
- ✅ **Lead** (collegamento) - A chi è riferita l'attività  
- ✅ **Obiettivo** - Primo contatto, Follow-up, etc.
- ✅ **Priorità** - Bassa, Media, Alta, Urgente

**Validazione:** Tipo obbligatorio + almeno un Lead selezionato

---

### **Step 2: Programmazione** 🗓️
*Quando e come organizzare l'attività*

**Campi:**
- ✅ **Data e Ora** - Quando programmare l'attività
- ✅ **Durata Stimata** - Tempo previsto (es. 1:30)
- ✅ **Stato** - Da Pianificare, Pianificata, In corso, etc.
- ✅ **Assegnatario** - Chi deve eseguire l'attività

**Validazione:** Nessun campo obbligatorio (tutto opzionale)

---

### **Step 3: Risultati & Allegati** 📊
*Esito e documentazione dell'attività*

**Campi:**
- ✅ **Note** - Dettagli e commenti sull'attività (1000 char)
- ✅ **Esito** - Contatto riuscito, Nessuna risposta, etc.
- ✅ **Prossima Azione** - Follow-up, Chiamata, etc.
- ✅ **Data Prossima Azione** - Quando fare il follow-up
- ✅ **Allegati** - File e documenti (max 10, 10MB ciascuno)

**Validazione:** Tutto opzionale

---

## 🎨 Vantaggi della Nuova Organizzazione

### **User Experience:**
- ✅ **Progressione logica** - da informazioni base a dettagli
- ✅ **Steps digestibili** - massimo 4-5 campi per step
- ✅ **Meno scroll** - ogni step in vista senza scrolling  
- ✅ **Barra progresso** - feedback visivo avanzamento

### **Workflow Naturale:**
1. **Chi/Cosa** → Definisci tipo attività e lead collegato
2. **Quando/Come** → Programma timing e responsabile  
3. **Risultati** → Documenta esito e follow-up

### **Flessibilità:**
- ✅ **Creazione rapida** - Solo Step 1 obbligatorio per casi urgenti
- ✅ **Completamento graduale** - Possibile tornare per completare
- ✅ **Edit mode** - Mantiene step per modifiche esistenti

---

## 🏗️ Implementazione Proposta

### **File da Creare:**
```
src/components/activities/new-activity-steps/
├── informazioni-base-step.tsx        # Step 1: Tipo, Lead, Obiettivo, Priorità  
├── programmazione-step.tsx            # Step 2: Data, Durata, Stato, Assegnatario
└── risultati-allegati-step.tsx       # Step 3: Note, Esito, Follow-up, Allegati
```

### **File da Modificare:**
- `new-activity-modal.tsx` - Logica steps come NewLeadModal
- `activity-step.tsx` - Deprecare o rimuovere (sostituito dai 3 nuovi)

### **Validazione per Step:**
```typescript
// Step 1 - Obbligatoria
const validateStep1 = await trigger(['Tipo', 'ID Lead']);

// Step 2 - Opzionale (ma valida formato date/durata se presente)  
const validateStep2 = await trigger(['Data', 'Durata stimata']);

// Step 3 - Opzionale (ma valida lunghezza note/date se presente)
const validateStep3 = await trigger(['Note', 'Data prossima azione']);
```

---

## 📱 Layout Steps (Desktop/Mobile)

### **Step 1 - Informazioni Base** 
```
┌─────────────────────────────────────┐
│ [Tipo Attività] [Lead]              │  
│ [Obiettivo]     [Priorità]          │
└─────────────────────────────────────┘
```

### **Step 2 - Programmazione**
```
┌─────────────────────────────────────┐
│ [Data e Ora]    [Durata]            │
│ [Stato]         [Assegnatario]      │  
└─────────────────────────────────────┘
```

### **Step 3 - Risultati & Allegati**
```  
┌─────────────────────────────────────┐
│ [Note - Area estesa]                │
│ [Esito]         [Prossima Azione]   │
│ [Data Follow-up]                    │
│ [Allegati - Upload area]            │
└─────────────────────────────────────┘
```

---

## 🎯 Conclusione

**Questa organizzazione rispecchia il flusso mentale dell'utente:**
1. **"Che tipo di attività devo fare e per chi?"** → Step 1
2. **"Quando e chi la deve fare?"** → Step 2  
3. **"Come è andata e cosa fare dopo?"** → Step 3

**Risultato:** UX più fluida, meno errori, form completion rate più alto!

---

**Vuoi procedere con questa implementazione?** ✅
