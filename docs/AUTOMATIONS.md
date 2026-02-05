# Sistema Automazioni CRM 2.0

## Overview

Il CRM 2.0 include un **sistema di automazioni configurabile** che permette di automatizzare azioni in risposta ad eventi (creazione/modifica/cancellazione di record).

Le automazioni sono configurate nella tabella **Automations** di Airtable e vengono eseguite automaticamente dall'**Automation Engine**.

---

## Architettura

### Componenti

1. **Tabella Automations** (Airtable)
   - Definisce trigger, condizioni e azioni
   - Gestibile tramite interfaccia Airtable (UI configurabile in roadmap v2.1)

2. **Automation Engine** (`src/lib/automation-engine.ts`)
   - Carica automazioni attive da Airtable
   - Valuta condizioni (supporto AND/OR)
   - Esegue azioni
   - Logga esecuzioni (ExecutionCount, LastExecuted)

3. **API Hooks** 
   - `/api/activities` - Trigger onCreate/onUpdate/onDelete
   - `/api/orders` - Trigger onCreate
   - Estendibili ad altre tabelle

---

## Schema Tabella Automations

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| **Metadata** |||
| `Name` | text | Nome dell'automazione |
| `Description` | long text | Descrizione dettagliata |
| `Category` | select | Gestione Lead, Activity, Order, etc. |
| `Priority` | select | Bassa, Media, Alta, Critica |
| `IsActive` | checkbox | ✅ Attiva / ❌ Disattiva |
| **Trigger** |||
| `TriggerTable` | select | Lead, Activity, Order, User |
| `TriggerEvent` | select | Record Created, Record Updated, Record Deleted |
| `TriggerField` | text | Campo da monitorare (es: "Stato") |
| `TriggerOperator` | select | equals, not_equals, contains, is_empty, is_not_empty |
| `TriggerValue` | text | Valore da confrontare (supporta multipli con `|`) |
| `TriggerField2` | text | Secondo campo (opzionale) |
| `TriggerOperator2` | select | Operatore per condizione 2 |
| `TriggerValue2` | text | Valore condizione 2 |
| `TriggerLogic` | select | AND, OR (come combinare condizione 1 e 2) |
| **Action** |||
| `ActionType` | select | update_field, create_activity, send_notification |
| `ActionTargetTable` | select | Lead, Activity, Order, User |
| `ActionTargetField` | text | Campo da modificare (es: "Stato") |
| `ActionValue` | text | Nuovo valore (es: "Cliente") |
| **Tracking** |||
| `LastExecuted` | date | Data ultima esecuzione |
| `ExecutionCount` | number | Contatore esecuzioni |
| `CreatedBy` | link | Utente che ha creato l'automazione |

---

## Automazioni Attive (Seed)

### 1. AUTO_CONTATTATO
**Descrizione**: Lead passa a "Contattato" quando viene creata un'activity di contatto riuscito

**Trigger**:
- Table: `Activity`
- Event: `Record Created`
- Condizioni:
  - `Tipo` **contains** `Chiamata|Email|WhatsApp` **AND**
  - `Esito` **equals** `Contatto riuscito`

**Action**:
- Update `Lead.Stato` → `Contattato`

**Esempio**: Creo activity "Chiamata" con esito "Contatto riuscito" → Lead diventa automaticamente "Contattato"

---

### 2. AUTO_QUALIFICATO
**Descrizione**: Lead passa a "Qualificato" quando c'è interesse concreto

**Trigger**:
- Table: `Activity`
- Event: `Record Created`
- Condizioni:
  - `Esito` **contains** `Molto interessato|Interessato|Appuntamento fissato|Informazioni raccolte`

**Action**:
- Update `Lead.Stato` → `Qualificato`

**Esempio**: Creo activity con esito "Appuntamento fissato" → Lead diventa "Qualificato"

---

### 3. AUTO_IN_NEGOZIAZIONE
**Descrizione**: Lead passa in "In Negoziazione" dopo consulenza/prova completata

**Trigger**:
- Table: `Activity`
- Event: `Record Updated`
- Condizioni:
  - `Tipo` **contains** `Consulenza|Prova|Appuntamento` **AND**
  - `Stato Attività` **equals** `Completata`

**Action**:
- Update `Lead.Stato` → `In Negoziazione`

**Esempio**: Activity "Consulenza" viene marcata "Completata" → Lead passa in "In Negoziazione"

---

### 4. AUTO_CLIENTE
**Descrizione**: Lead diventa "Cliente" quando viene confermato un ordine

**Trigger**:
- Table: `Order`
- Event: `Record Created`
- Condizioni:
  - `Stato` **equals** `Confermato`

**Action**:
- Update `Lead.Stato` → `Cliente`

**Esempio**: Creo Order con Stato "Confermato" → Lead collegato diventa "Cliente"

---

## Operatori Condizioni

| Operatore | Descrizione | Esempio |
|-----------|-------------|---------|
| `equals` | Uguaglianza esatta | `Stato = "Confermato"` |
| `not_equals` | Diverso da | `Stato != "Annullato"` |
| `contains` | Contiene (supporta multipli con `|`) | `Tipo contains "Chiamata|Email"` |
| `is_empty` | Campo vuoto | `Note is_empty` |
| `is_not_empty` | Campo non vuoto | `Esito is_not_empty` |

**Multipli valori**: Usa il separatore `|` nel campo `TriggerValue`:
```
TriggerValue: "Molto interessato|Interessato|Appuntamento fissato"
```
L'operatore `contains` matcha se il valore del campo contiene **uno qualsiasi** dei valori separati da `|`.

---

## Logica Condizioni Multiple

Quando specifichi `TriggerField2`, puoi combinare le due condizioni con:

- **AND**: Entrambe le condizioni devono essere vere
- **OR**: Almeno una condizione deve essere vera

**Esempio AND**:
```
TriggerField: "Tipo"
TriggerOperator: "contains"
TriggerValue: "Chiamata|Email"
TriggerField2: "Esito"
TriggerOperator2: "equals"
TriggerValue2: "Contatto riuscito"
TriggerLogic: "AND"
```
→ Matcha solo se: (`Tipo` è Chiamata o Email) **E** (`Esito` è "Contatto riuscito")

---

## Azioni Supportate

### update_field
Aggiorna un campo su una tabella target.

**Relazioni supportate**:
- Activity → Lead (automatico via campo `ID Lead`)
- Order → Lead (automatico via campo `ID_Lead`)
- Stesso record (es: Activity → Activity)

**Campi obbligatori**:
- `ActionTargetTable`: Tabella da aggiornare
- `ActionTargetField`: Nome campo
- `ActionValue`: Nuovo valore

### create_activity
*(Non implementato - v2.1)*
Crea automaticamente una nuova activity.

### send_notification
*(Non implementato - v2.1)*
Invia notifica email/push/Slack.

---

## Logging & Monitoring

Ogni volta che un'automazione viene eseguita con successo:

1. **ExecutionCount** viene incrementato
2. **LastExecuted** viene aggiornato con la data corrente
3. Log in console server: `[AutomationEngine] ✅ Updated Lead.Stato = Cliente`

**Dove vedere i log**:
- Server logs: `npm run dev` output in console
- Airtable: colonne `ExecutionCount` e `LastExecuted` nella tabella Automations

---

## Come Creare una Nuova Automazione

### Via Airtable (Manuale)

1. Apri base Airtable CRM 2.0
2. Vai nella tabella **Automations**
3. Click "+" per nuovo record
4. Compila:
   - **Name**: Nome descrittivo
   - **Description**: Cosa fa l'automazione
   - **Category**: Categoria appropriata
   - **Priority**: Importanza
   - **IsActive**: ✅ Seleziona per attivarla
   - **Trigger fields**: Table, Event, Field, Operator, Value
   - **Action fields**: ActionType, ActionTargetTable, ActionTargetField, ActionValue
5. Salva

L'automazione sarà attiva immediatamente (caricata al prossimo evento).

### Via Script (Seed Data)

Vedi `scripts/create-automations-seed.ts` per esempi di creazione programmatica.

---

## Performance & Best Practices

### ✅ Best Practices

1. **Specifiche condizioni**: Usa condizioni precise per evitare esecuzioni indesiderate
2. **IsActive toggle**: Disattiva automazioni durante debug/manutenzione
3. **Priority**: Usa priorità "Critica" solo per azioni business-critical
4. **Idempotenza**: Le automazioni dovrebbero essere sicure da eseguire più volte

### ⚠️ Attenzione

- **No loop infiniti**: Non creare automazioni che si triggano a vicenda in loop
  - ❌ BAD: Activity onCreate → Update Lead → Lead onUpdate → Create Activity
  - ✅ GOOD: Activity onCreate → Update Lead (fine)
  
- **Performance**: Automazioni complesse possono rallentare le API
  - Le automazioni sono eseguite **async non-blocking** per minimizzare impatto
  - Usa `Priority` per indicare automazioni critiche vs. opzionali

---

## Troubleshooting

### L'automazione non viene eseguita

1. **Verifica `IsActive` = TRUE** nella tabella Automations
2. **Check condizioni**: Stampa in console `[AutomationEngine]` mostra se condizioni matchano
3. **Check TriggerEvent**: Assicurati che l'evento sia quello giusto (Created vs Updated)
4. **Field names**: Nomi campi devono matchare esattamente (case-sensitive)

### Automazione eseguita più volte

- Normal se l'evento viene triggato più volte (es: update multipli)
- Check `ExecutionCount` per vedere quante volte è stata eseguita

### Errori in console

```
[AutomationEngine] Error executing action: ...
```
→ Controlla che `ActionTargetField` sia un campo valido nella tabella target

---

## Roadmap

### v2.0 (MVP) - ✅ Implementato
- [x] Tabella Automations configurabile
- [x] Engine con supporto condizioni AND/OR
- [x] Trigger onCreate/onUpdate per Activity e Order
- [x] Azione `update_field`
- [x] Logging esecuzioni
- [x] 4 automazioni seed per gestione stati Lead

### v2.1 (Planned)
- [ ] UI gestione automazioni (sezione Developer)
- [ ] Azione `create_activity`
- [ ] Azione `send_notification`
- [ ] Trigger onDelete
- [ ] Dashboard monitoring esecuzioni
- [ ] Test automatici automazioni
- [ ] Simulazione dry-run
- [ ] Rollback automazioni

### v2.2 (Future)
- [ ] Condizioni avanzate (3+ condizioni, operatori complessi)
- [ ] Azioni concatenate (workflow)
- [ ] Scheduling (trigger time-based)
- [ ] Webhook trigger esterni
- [ ] AI-suggested automations

---

## FAQ

**Q: Posso disattivare temporaneamente un'automazione?**  
A: Sì, togli il flag `IsActive` nella tabella Automations.

**Q: Le automazioni sono retroattive?**  
A: No, si applicano solo a nuovi eventi dopo l'attivazione.

**Q: Posso testare un'automazione senza attivarla?**  
A: Per ora no (dry-run in roadmap v2.1). Usa un Lead di test.

**Q: Cosa succede se più automazioni matchano lo stesso evento?**  
A: Vengono eseguite tutte in sequenza (ordinamento per Priority opzionale in v2.1).

**Q: Le automazioni funzionano anche tramite import bulk?**  
A: No, solo via API. Import diretto in Airtable bypassa l'engine.

---

## Riferimenti

- Codice engine: `src/lib/automation-engine.ts`
- API hooks: `src/app/api/activities/`, `src/app/api/orders/`
- Seed automazioni: `scripts/create-automations-seed.ts`
- Schema tabella: TypeScript types in `src/types/airtable.generated.ts`
