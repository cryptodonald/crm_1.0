/**
 * 🚀 Activities Optimistic Updates Hook
 * 
 * Hook specializzato per gestire aggiornamenti ottimistici delle attività
 * con integrazione diretta nel sistema esistente
 */

import { useCallback, useMemo } from 'react';
import { useOptimisticUpdates } from './use-optimistic-updates';
import type { ActivityData } from '@/types/activities';

interface UseActivitiesOptimisticProps {
  /**
   * Funzione per aggiornare lo stato locale delle attività
   */
  updateLocalActivities: (updater: (activities: ActivityData[]) => ActivityData[]) => void;
  
  /**
   * Funzione di refresh completo
   */
  refreshActivities: () => void;
  
  /**
   * Lead ID per filtrare le attività (opzionale)
   */
  leadId?: string;
}

export function useActivitiesOptimistic({
  updateLocalActivities,
  refreshActivities,
  leadId,
}: UseActivitiesOptimisticProps) {
  
  // Gestione degli aggiornamenti ottimistici
  const handleOptimisticUpdate = useCallback((operation: any) => {
    const { type, data } = operation;
    
    updateLocalActivities((currentActivities) => {
      switch (type) {
        case 'create':
          console.log('✨ [Activities Optimistic] Adding new activity to UI:', data.Titolo);
          return [...currentActivities, data];
          
        case 'update':
          console.log('✨ [Activities Optimistic] Updating activity in UI:', data.Titolo);
          return currentActivities.map(activity =>
            activity.id === data.id ? { ...activity, ...data } : activity
          );
          
        case 'delete':
          console.log('✨ [Activities Optimistic] Removing activity from UI:', data.Titolo);
          return currentActivities.filter(activity => activity.id !== data.id);
          
        default:
          console.warn('❓ [Activities Optimistic] Unknown operation type:', type);
          return currentActivities;
      }
    });
  }, [updateLocalActivities]);
  
  // Gestione del rollback
  const handleRollback = useCallback((operation: any) => {
    const { type, data, originalData } = operation;
    
    updateLocalActivities((currentActivities) => {
      switch (type) {
        case 'create':
          console.log('🔄 [Activities Optimistic] Rolling back create - removing from UI:', data.Titolo);
          return currentActivities.filter(activity => activity.id !== data.id);
          
        case 'update':
          console.log('🔄 [Activities Optimistic] Rolling back update - restoring original:', originalData?.Titolo);
          if (!originalData) {
            console.warn('⚠️ [Activities Optimistic] No original data for rollback, refreshing instead');
            refreshActivities();
            return currentActivities;
          }
          return currentActivities.map(activity =>
            activity.id === data.id ? originalData : activity
          );
          
        case 'delete':
          console.log('🔄 [Activities Optimistic] Rolling back delete - restoring activity:', data.Titolo);
          // Se l'attività era stata eliminata, la aggiungiamo di nuovo
          const exists = currentActivities.some(activity => activity.id === data.id);
          return exists ? currentActivities : [...currentActivities, data];
          
        default:
          console.warn('❓ [Activities Optimistic] Unknown rollback operation type:', type);
          return currentActivities;
      }
    });
  }, [updateLocalActivities, refreshActivities]);
  
  // Configurazione dell'hook optimistic
  const optimisticConfig = useMemo(() => ({
    timeout: 15000,
    maxRetries: 2,
    retryDelay: 1000,
    showSuccessToast: true,
    showErrorToast: true,
  }), []);
  
  // Hook principale per optimistic updates
  const {
    executeOptimistic,
    retryFailedOperations,
    clearCompletedOperations,
    emergencyRefresh,
    isPending,
    isFailed,
    pendingCount,
    failedCount,
  } = useOptimisticUpdates<ActivityData>({
    onOptimisticUpdate: handleOptimisticUpdate,
    onRollback: handleRollback,
    onRefresh: refreshActivities,
    config: optimisticConfig,
  });

  /**
   * 🚀 Crea una nuova attività con aggiornamento ottimistico
   */
  const createActivityOptimistic = useCallback(async (
    newActivityData: Partial<ActivityData>
  ): Promise<{ success: boolean; result?: ActivityData }> => {
    
    // Genera un ID temporaneo per l'ottimismo
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticActivity: ActivityData = {
      // Dati di base
      id: tempId,
      Titolo: newActivityData.Titolo || 'Nuova Attività',
      Stato: newActivityData.Stato || 'Da Pianificare',
      ...newActivityData,
      
      // Metadati temporanei
      createdTime: new Date().toISOString(),
      'Ultima modifica': new Date().toISOString(),
    } as ActivityData;
    
    return executeOptimistic({
      type: 'create',
      data: optimisticActivity,
      apiCall: async () => {
        const response = await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newActivityData),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ [Activities API] Created activity:', result);
        return result.data || result;
      },
    });
  }, [executeOptimistic]);

  /**
   * ✏️ Aggiorna un'attività esistente con aggiornamento ottimistico
   */
  const updateActivityOptimistic = useCallback(async (
    activityId: string,
    updates: Partial<ActivityData>,
    originalActivity: ActivityData
  ): Promise<{ success: boolean; result?: ActivityData }> => {
    
    const optimisticActivity: ActivityData = {
      ...originalActivity,
      ...updates,
      'Ultima modifica': new Date().toISOString(),
    };
    
    return executeOptimistic({
      type: 'update',
      data: optimisticActivity,
      originalData: originalActivity,
      apiCall: async () => {
        const response = await fetch(`/api/activities/${activityId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ [Activities API] Updated activity:', result);
        return result.data || result;
      },
    });
  }, [executeOptimistic]);

  /**
   * 🗑️ Elimina un'attività con aggiornamento ottimistico
   */
  const deleteActivityOptimistic = useCallback(async (
    activity: ActivityData
  ): Promise<{ success: boolean }> => {
    
    return executeOptimistic({
      type: 'delete',
      data: activity,
      originalData: activity,
      apiCall: async () => {
        const response = await fetch(`/api/activities/${activity.id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        console.log('✅ [Activities API] Deleted activity:', activity.Titolo);
        return undefined; // Delete non restituisce dati
      },
    });
  }, [executeOptimistic]);

  /**
   * 🔄 Cambia stato di un'attività (specializzato per Kanban)
   */
  const changeActivityStateOptimistic = useCallback(async (
    activity: ActivityData,
    newState: ActivityData['Stato']
  ): Promise<{ success: boolean; result?: ActivityData }> => {
    
    return updateActivityOptimistic(
      activity.id,
      { Stato: newState },
      activity
    );
  }, [updateActivityOptimistic]);

  return {
    // Operazioni ottimistiche
    createActivityOptimistic,
    updateActivityOptimistic,
    deleteActivityOptimistic,
    changeActivityStateOptimistic,
    
    // Gestione operazioni
    retryFailedOperations,
    clearCompletedOperations,
    emergencyRefresh,
    
    // Stato operazioni
    isPending,
    isFailed,
    pendingCount,
    failedCount,
    
    // Metodi di utilità
    isActivityPending: (activityId: string) => isPending(activityId),
    isActivityFailed: (activityId: string) => isFailed(activityId),
  };
}

export type { UseActivitiesOptimisticProps };
