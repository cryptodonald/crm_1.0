/**
 * 📚 EXAMPLE: Activity Creation with Automatic Lead State Update
 * 
 * Questo file è un ESEMPIO di come integrare il sistema di aggiornamento automatico
 * dello stato del lead nel modulo di creazione attività.
 * 
 * NON è un componente reale - serve solo come riferimento.
 * Adatta questo codice al tuo modulo di creazione attività specifico.
 */

'use client';

import { useState } from 'react';
import { LeadStateUpdateDialog } from '@/components/activities/lead-state-update-dialog';
import { useActivitiesClean } from '@/hooks/use-activities-clean';
import { toast } from 'sonner';
import type { Activity } from '@/types/activity';
import type { LeadStato } from '@/types/leads';

interface ActivityCreationWithLeadStateProps {
  leadId: string;
  currentLeadState: LeadStato;
  onActivityCreated?: (activity: Activity) => void;
}

/**
 * Componente di esempio che mostra come:
 * 1. Creare un'attività
 * 2. Determinare se lo stato del lead deve essere aggiornato
 * 3. Mostrare un dialogo se necessario
 * 4. Aggiornare lo stato del lead
 */
export function ActivityCreationWithLeadStateExample({
  leadId,
  currentLeadState,
  onActivityCreated,
}: ActivityCreationWithLeadStateProps) {
  // Hook con le nuove utility
  const { createActivity, shouldUpdateLeadState, updateLeadState } = useActivitiesClean(leadId);

  // State per il dialogo di aggiornamento stato lead
  const [showLeadStateDialog, setShowLeadStateDialog] = useState(false);
  const [suggestedLeadState, setSuggestedLeadState] = useState<LeadStato | null>(null);
  const [activityStateForDialog, setActivityStateForDialog] = useState<string>('');
  const [isUpdatingLeadState, setIsUpdatingLeadState] = useState(false);
  const [isCreatingActivity, setIsCreatingActivity] = useState(false);

  /**
   * Gestisce la creazione di un'attività e verifica se aggiornare lo stato del lead
   */
  const handleActivityCreated = async (newActivity: Omit<Activity, 'id'>) => {
    setIsCreatingActivity(true);

    try {
      console.log('🚀 Creating activity:', newActivity);

      // 1. Crea l'attività
      await createActivity(newActivity);
      console.log('✅ Activity created successfully');

      // 2. Determina se aggiornare lo stato del lead
      const activityState = (newActivity.Stato || newActivity.tipo) as string;
      const { shouldUpdate, newLeadState, askUser } = shouldUpdateLeadState(activityState);

      console.log('📊 Lead state check:', {
        shouldUpdate,
        newLeadState,
        askUser,
        currentLeadState,
        activityState,
      });

      if (shouldUpdate && newLeadState) {
        if (askUser) {
          // 3a. Mostra dialogo per chiedere conferma
          console.log('❓ Showing dialog for user confirmation');
          setActivityStateForDialog(activityState);
          setSuggestedLeadState(newLeadState);
          setShowLeadStateDialog(true);
          toast.info('Vuoi aggiornare lo stato del lead?');
        } else {
          // 3b. Auto-update senza chiedere
          console.log('✅ Auto-updating lead state:', newLeadState);
          await updateLeadState(leadId, currentLeadState, newLeadState);
          toast.success(`Lead stato aggiornato a: ${newLeadState}`);
        }
      } else {
        toast.success('Attività creata con successo');
      }

      // 4. Callback (opzionale)
      if (onActivityCreated) {
        onActivityCreated(newActivity as Activity);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Errore sconosciuto';
      console.error('❌ Error creating activity:', errorMsg);
      toast.error(`Errore: ${errorMsg}`);
    } finally {
      setIsCreatingActivity(false);
    }
  };

  /**
   * Gestisce la conferma dell'aggiornamento dello stato del lead
   */
  const handleConfirmLeadStateUpdate = async () => {
    if (!suggestedLeadState) return;

    setIsUpdatingLeadState(true);

    try {
      console.log('🔄 Confirming lead state update:', suggestedLeadState);

      await updateLeadState(leadId, currentLeadState, suggestedLeadState);

      toast.success(`Lead stato aggiornato a: ${suggestedLeadState}`);
      console.log('✅ Lead state updated successfully');

      setShowLeadStateDialog(false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Errore sconosciuto';
      console.error('❌ Error updating lead state:', errorMsg);
      toast.error(`Errore: ${errorMsg}`);
    } finally {
      setIsUpdatingLeadState(false);
    }
  };

  /**
   * Gestisce l'annullamento dell'aggiornamento dello stato del lead
   */
  const handleCancelLeadStateUpdate = () => {
    console.log('❌ Lead state update cancelled');
    setShowLeadStateDialog(false);
    setSuggestedLeadState(null);
    toast.info('Stato del lead non aggiornato');
  };

  return (
    <div className="space-y-4">
      {/* Qui va il tuo form di creazione attività */}
      {/* 
        Esempio di utilizzo:
        
        <form onSubmit={(e) => {
          e.preventDefault();
          const activity = { ... };
          handleActivityCreated(activity);
        }}>
          {/* Form fields */}
        </form>
      */}

      {/* Dialog per aggiornamento stato lead */}
      <LeadStateUpdateDialog
        open={showLeadStateDialog}
        currentLeadState={currentLeadState}
        suggestedNewState={suggestedLeadState || 'Contattato'}
        activityState={activityStateForDialog}
        onConfirm={handleConfirmLeadStateUpdate}
        onCancel={handleCancelLeadStateUpdate}
        isLoading={isUpdatingLeadState}
      />

      {/* Status indicators */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        {isCreatingActivity && <span>🔄 Creating activity...</span>}
        {isUpdatingLeadState && <span>🔄 Updating lead state...</span>}
        {!isCreatingActivity && !isUpdatingLeadState && showLeadStateDialog && (
          <span>❓ Awaiting confirmation...</span>
        )}
      </div>
    </div>
  );
}

/**
 * STEP-BY-STEP INTEGRATION GUIDE
 * ===============================
 *
 * 1. Importa le dipendenze nel tuo componente:
 *    - useActivitiesClean
 *    - LeadStateUpdateDialog
 *    - State per dialogo
 *
 * 2. Ottieni le nuove utility dal hook:
 *    const { shouldUpdateLeadState, updateLeadState } = useActivitiesClean(leadId);
 *
 * 3. Dopo creare l'attività, controlla se aggiornare:
 *    const { shouldUpdate, newLeadState, askUser } = shouldUpdateLeadState(activity.Stato);
 *
 * 4. Se askUser=true, mostra il dialogo:
 *    setShowLeadStateDialog(true);
 *
 * 5. Se askUser=false e shouldUpdate=true, aggiorna direttamente:
 *    await updateLeadState(leadId, currentLeadState, newLeadState);
 *
 * 6. Renderizza il LeadStateUpdateDialog per la conferma utente
 *
 * ===============================
 * RESULT
 * ===============================
 *
 * ✅ Lead stato aggiornato automaticamente per attività "chiare"
 * ✅ Dialogo di conferma per attività "ambigue"
 * ✅ Toast notifications per feedback visuale
 * ✅ Nessuna regressione dello stato
 * ✅ Logging completo per debug
 */
