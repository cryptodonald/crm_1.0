# 🎯 Sistema di Aggiornamento Automatico dello Stato del Lead

## Panoramica

Quando viene creata o modificata un'attività, il sistema determina automaticamente se lo stato del lead associato deve essere aggiornato. Questo evita che un lead rimanga "Nuovo" quando in realtà è stato contattato o qualificato.

## Architettura

Il sistema è diviso in 3 componenti:

### 1. **Helper di Logica** (`/src/lib/activity-lead-state-helper.ts`)

Contiene la logica di determinazione dello stato:

- `shouldAutoUpdateLeadState()` - Determina se aggiornare automaticamente o chiedere all'utente
- `getNewLeadState()` - Calcola il nuovo stato senza regredire quello attuale
- `promptLeadStateUpdate()` - Prepara il dialogo per chiedere conferma

### 2. **Dialog Component** (`/src/components/activities/lead-state-update-dialog.tsx`)

Un componente AlertDialog che chiede all'utente se aggiornare lo stato del lead quando necessario.

### 3. **Hook Integration** (`/src/hooks/use-activities-clean.ts`)

L'hook `useActivitiesClean` espone due nuove utility:

```typescript
// Funzione di utilità per determinare se aggiornare
shouldUpdateLeadState: (activityState: string) => {
  shouldUpdate: boolean;
  newLeadState?: LeadStato;
  askUser: boolean;
}

// Funzione per aggiornare lo stato del lead tramite API
updateLeadState: (leadId: string, currentLeadState: LeadStato, newLeadState: LeadStato) => Promise<void>
```

## Logica di Aggiornamento

### Stati che richiedono aggiornamento automatico

Questi stati aggiornano automaticamente il lead senza chiedere conferma:

| Stato Attività | Stato Lead Risultante | Motivo |
|---|---|---|
| Completata | Contattato | L'attività è completata = contatto avvenuto |
| Contatto riuscito | Contattato | Chiaro contatto riuscito |
| Molto interessato | Qualificato | Lead mostrato interesse |
| Interessato | Qualificato | Lead interessato |
| Informazioni raccolte | Qualificato | Informazioni raccolte = qualificazione |
| Preventivo richiesto | Qualificato | Preventivo richiesto = qualificazione |
| Appuntamento fissato | Qualificato | Appuntamento = interesse confermato |
| Ordine confermato | Cliente | Ordine confermato = diventato cliente |

### Stati ambigui (richiede conferma)

Questi stati mostrano un dialogo all'utente per chiedere conferma:

| Stato Attività | Suggerimento | Perché è ambiguo |
|---|---|---|
| In attesa | Qualificato | In attesa di cosa? |
| Rimandata | Contattato | Contattato ma rimandato |
| Annullata | Sospeso | Fallimento o rimandato? |
| Non disponibile | Contattato | Tentativo senza successo |
| Numero errato | Nuovo | Non contattato realmente |
| Nessuna risposta | Contattato | Tentativo effettuato |
| Poco interessato | Contattato | Contattato ma non qualificato |
| Non interessato | Perso | Chiaramente fallito |

### Stati neutri (nessun aggiornamento)

Questi stati non causano aggiornamento:

- Da Pianificare
- Pianificata
- In corso

## Regola di Non-Regressione

Il sistema non regredisce mai lo stato del lead. Quindi:

- Un lead "Qualificato" rimane "Qualificato" anche se viene creata attività "Contattato"
- Un lead "Cliente" non torna a "Qualificato"
- Un lead "Perso" non progredisce (rimane Perso)

Gerarchia degli stati (dal più basso al più alto):

```
Nuovo (0) → Contattato (1) → Qualificato (2) → In Negoziazione (3) → Cliente (4)
```

## Utilizzo nel Codice

### Controllo automatico durante creazione attività

```typescript
// Nel componente di creazione attività
const { shouldUpdateLeadState, updateLeadState } = useActivitiesClean(leadId);

// Dopo creare l'attività
const { shouldUpdate, newLeadState, askUser } = shouldUpdateLeadState(activity.Stato);

if (shouldUpdate && !askUser) {
  // Auto-update senza chiedere
  await updateLeadState(leadId, currentLeadState, newLeadState);
} else if (askUser) {
  // Mostra dialogo per chiedere conferma
  setShowLeadStateDialog(true);
}
```

### Implementazione completa

```typescript
'use client';

import { useState } from 'react';
import { LeadStateUpdateDialog } from '@/components/activities/lead-state-update-dialog';
import { useActivitiesClean } from '@/hooks/use-activities-clean';
import type { Activity, LeadStato } from '@/types';

function ActivityCreator({ leadId, currentLeadState }: Props) {
  const { createActivity, shouldUpdateLeadState, updateLeadState } = useActivitiesClean(leadId);
  const [showLeadStateDialog, setShowLeadStateDialog] = useState(false);
  const [suggestedLeadState, setSuggestedLeadState] = useState<LeadStato | null>(null);
  const [isUpdatingLeadState, setIsUpdatingLeadState] = useState(false);

  const handleActivityCreated = async (activity: Activity) => {
    try {
      // Aggiungi l'attività
      await createActivity(activity);

      // Verifica se aggiornare lo stato del lead
      const { shouldUpdate, newLeadState, askUser } = shouldUpdateLeadState(activity.Stato);

      if (shouldUpdate) {
        if (askUser && newLeadState) {
          // Mostra dialogo
          setSuggestedLeadState(newLeadState);
          setShowLeadStateDialog(true);
        } else if (newLeadState) {
          // Auto-update
          await updateLeadState(leadId, currentLeadState, newLeadState);
        }
      }
    } catch (error) {
      console.error('Error creating activity:', error);
    }
  };

  const handleConfirmLeadStateUpdate = async () => {
    if (!suggestedLeadState) return;

    setIsUpdatingLeadState(true);
    try {
      await updateLeadState(leadId, currentLeadState, suggestedLeadState);
      setShowLeadStateDialog(false);
    } finally {
      setIsUpdatingLeadState(false);
    }
  };

  return (
    <>
      {/* Componenti per creare attività */}

      <LeadStateUpdateDialog
        open={showLeadStateDialog}
        currentLeadState={currentLeadState}
        suggestedNewState={suggestedLeadState || 'Contattato'}
        activityState="..."
        onConfirm={handleConfirmLeadStateUpdate}
        onCancel={() => setShowLeadStateDialog(false)}
        isLoading={isUpdatingLeadState}
      />
    </>
  );
}
```

## Logging e Debug

Il sistema registra automaticamente tutte le operazioni:

```
🎯 [ActivityHelper] Suggested lead state update: {
  from: 'Nuovo',
  to: 'Contattato',
  activity: 'Completata'
}

🔄 [LeadStateUpdate] Lead rec123:
  from: 'Nuovo'
  to: 'Contattato'
  reason: 'Activity completion'
```

## Considerazioni di Sicurezza

1. **Validazione dei Dati**: Il sistema valida che currentLeadState e newLeadState siano stati validi
2. **No Regressione**: Implementazione rigorosa della gerarchia degli stati
3. **Error Handling**: Fallimento dell'aggiornamento del lead non blocca la creazione dell'attività
4. **Logging Completo**: Tutti gli aggiornamenti sono loggati per audit trail

## Flusso Completo

```
User crea Attività
    ↓
Activity creata con successo
    ↓
shouldAutoUpdateLeadState() determina l'azione
    ↓
┌─────────────────────────────────────┐
│                                     │
↓ (shouldUpdate=true, askUser=false)  ↓ (askUser=true)    ↓ (shouldUpdate=false)
│                                     │                   │
Auto-aggiorna              Mostra Dialog         Nessun aggiornamento
    ↓                           ↓                       ↓
updateLeadState()        User sceglie         Lead rimane com'era
    ↓                      ↓         ↓
✅ Lead State Updated   Si     No  → Confermato / Cancellato
```

## Endpoint API Coinvolti

### Creare Attività
```
POST /api/activities
Body: { ...activity, 'ID Lead': [leadId] }
```

### Aggiornare Stato Lead
```
PATCH /api/leads/{leadId}
Body: { Stato: newLeadState }
```

## Future Enhancements

1. **Feedback visuale**: Toast notification quando lead state è aggiornato
2. **Undo**: Possibilità di annullare l'aggiornamento dello stato
3. **Batch operations**: Aggiornare più lead basato su attività bulk
4. **Analytics**: Tracciare pattern di aggiornamento per insights
5. **Customization**: Permettere configurazione per-team della logica di aggiornamento

---

**Creato**: Gennaio 2025  
**Versione**: 1.0  
**Owner**: Development Team
