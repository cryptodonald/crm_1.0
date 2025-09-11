/**
 * 🚀 Optimistic Updates Hook
 * 
 * Gestisce aggiornamenti UI istantanei con rollback automatico in caso di errore
 * Approccio professionale per UX fluida e responsive
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface OptimisticOperation<T> {
  id: string;
  type: 'create' | 'update' | 'delete';
  data: T;
  originalData?: T;
  apiCall: () => Promise<T | void>;
  rollbackCall?: () => Promise<void>;
}

interface UseOptimisticUpdatesProps<T> {
  /**
   * Funzione per aggiornare immediatamente lo stato locale
   */
  onOptimisticUpdate: (operation: OptimisticOperation<T>) => void;
  
  /**
   * Funzione per fare rollback in caso di errore
   */
  onRollback: (operation: OptimisticOperation<T>) => void;
  
  /**
   * Funzione di refresh completo in caso di errori critici
   */
  onRefresh: () => void;
  
  /**
   * Configurazioni opzionali
   */
  config?: {
    /** Timeout per le operazioni API (default: 15000ms) */
    timeout?: number;
    /** Numero massimo di retry (default: 2) */
    maxRetries?: number;
    /** Delay tra i retry (default: 1000ms) */
    retryDelay?: number;
    /** Mostra toast di successo (default: true) */
    showSuccessToast?: boolean;
    /** Mostra toast di errore (default: true) */
    showErrorToast?: boolean;
  };
}

export function useOptimisticUpdates<T>({
  onOptimisticUpdate,
  onRollback,
  onRefresh,
  config = {},
}: UseOptimisticUpdatesProps<T>) {
  const {
    timeout = 15000,
    maxRetries = 2,
    retryDelay = 1000,
    showSuccessToast = true,
    showErrorToast = true,
  } = config;

  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());
  const [failedOperations, setFailedOperations] = useState<Set<string>>(new Set());
  const operationsRef = useRef<Map<string, OptimisticOperation<T>>>(new Map());

  /**
   * 🚀 Esegue un aggiornamento ottimistico
   */
  const executeOptimistic = useCallback(async (
    operation: Omit<OptimisticOperation<T>, 'id'> & { id?: string }
  ): Promise<{ success: boolean; result?: T }> => {
    
    const operationId = operation.id || `${operation.type}-${Date.now()}-${Math.random()}`;
    const fullOperation: OptimisticOperation<T> = {
      ...operation,
      id: operationId,
    };

    console.log(`🚀 [Optimistic] Starting ${operation.type} operation:`, operationId);

    // 1. Aggiungi alla lista delle operazioni pending
    setPendingOperations(prev => new Set([...prev, operationId]));
    setFailedOperations(prev => {
      const newSet = new Set(prev);
      newSet.delete(operationId);
      return newSet;
    });
    operationsRef.current.set(operationId, fullOperation);

    try {
      // 2. 🚀 AGGIORNA IMMEDIATAMENTE LA UI (Optimistic)
      console.log(`✨ [Optimistic] Applying immediate UI update for:`, operationId);
      onOptimisticUpdate(fullOperation);

      // 3. Esegui chiamata API con retry logic
      let lastError: Error | null = null;
      
      for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
          console.log(`📡 [Optimistic] API attempt ${attempt}/${maxRetries + 1} for:`, operationId);
          
          const apiPromise = fullOperation.apiCall();
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout dopo ${timeout}ms`)), timeout)
          );

          const result = await Promise.race([apiPromise, timeoutPromise]) as T | void;
          
          // 4. ✅ API SUCCESS - Conferma aggiornamento
          console.log(`✅ [Optimistic] API success for:`, operationId);
          
          if (showSuccessToast) {
            toast.success(getSuccessMessage(operation.type), {
              duration: 2000,
            });
          }

          // Rimuovi dalle operazioni pending
          setPendingOperations(prev => {
            const newSet = new Set(prev);
            newSet.delete(operationId);
            return newSet;
          });
          operationsRef.current.delete(operationId);

          return { success: true, result: result as T };

        } catch (error) {
          lastError = error as Error;
          console.error(`❌ [Optimistic] API attempt ${attempt} failed for ${operationId}:`, error);
          
          // Se non è l'ultimo tentativo, aspetta prima del retry
          if (attempt < maxRetries + 1) {
            console.log(`⏱️ [Optimistic] Waiting ${retryDelay}ms before retry ${attempt + 1}...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
        }
      }

      // 5. ❌ TUTTI I TENTATIVI FALLITI - Rollback UI
      console.error(`💥 [Optimistic] All attempts failed for ${operationId}, rolling back UI`);
      
      // Rollback UI
      onRollback(fullOperation);
      
      // Segna come fallita
      setFailedOperations(prev => new Set([...prev, operationId]));
      setPendingOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(operationId);
        return newSet;
      });

      if (showErrorToast) {
        toast.error(`${getErrorMessage(operation.type)}: ${lastError?.message}`, {
          duration: 5000,
          action: {
            label: 'Riprova',
            onClick: () => executeOptimistic(operation),
          },
        });
      }

      return { success: false };

    } catch (error) {
      console.error(`💥 [Optimistic] Unexpected error for ${operationId}:`, error);
      
      // Rollback e cleanup
      onRollback(fullOperation);
      setPendingOperations(prev => {
        const newSet = new Set(prev);
        newSet.delete(operationId);
        return newSet;
      });
      setFailedOperations(prev => new Set([...prev, operationId]));

      return { success: false };
    }
  }, [
    onOptimisticUpdate, 
    onRollback, 
    maxRetries, 
    retryDelay, 
    timeout, 
    showSuccessToast, 
    showErrorToast
  ]);

  /**
   * 🔄 Riprova operazioni fallite
   */
  const retryFailedOperations = useCallback(async () => {
    console.log(`🔄 [Optimistic] Retrying ${failedOperations.size} failed operations...`);
    
    const failures = Array.from(failedOperations);
    setFailedOperations(new Set());
    
    for (const operationId of failures) {
      const operation = operationsRef.current.get(operationId);
      if (operation) {
        await executeOptimistic(operation);
      }
    }
  }, [failedOperations, executeOptimistic]);

  /**
   * 🧹 Cleanup operazioni completate/fallite
   */
  const clearCompletedOperations = useCallback(() => {
    console.log('🧹 [Optimistic] Clearing completed operations');
    setFailedOperations(new Set());
    // Le pending vengono gestite automaticamente
  }, []);

  /**
   * 🆘 Emergency refresh - quando tutto va male
   */
  const emergencyRefresh = useCallback(() => {
    console.log('🆘 [Optimistic] Emergency refresh triggered');
    
    // Clear all operations
    setPendingOperations(new Set());
    setFailedOperations(new Set());
    operationsRef.current.clear();
    
    // Full refresh
    onRefresh();
    
    if (showErrorToast) {
      toast.info('Sincronizzazione dati in corso...', {
        duration: 3000,
      });
    }
  }, [onRefresh, showErrorToast]);

  return {
    // Operazioni principali
    executeOptimistic,
    retryFailedOperations,
    clearCompletedOperations,
    emergencyRefresh,
    
    // Stato
    isPending: (id?: string) => id ? pendingOperations.has(id) : pendingOperations.size > 0,
    isFailed: (id?: string) => id ? failedOperations.has(id) : failedOperations.size > 0,
    pendingCount: pendingOperations.size,
    failedCount: failedOperations.size,
    
    // Helpers per UI
    getPendingOperations: () => Array.from(pendingOperations),
    getFailedOperations: () => Array.from(failedOperations),
  };
}

/**
 * Helper per messaggi di successo
 */
function getSuccessMessage(type: 'create' | 'update' | 'delete'): string {
  switch (type) {
    case 'create': return 'Elemento creato con successo';
    case 'update': return 'Elemento aggiornato con successo';
    case 'delete': return 'Elemento eliminato con successo';
    default: return 'Operazione completata';
  }
}

/**
 * Helper per messaggi di errore
 */
function getErrorMessage(type: 'create' | 'update' | 'delete'): string {
  switch (type) {
    case 'create': return 'Errore durante la creazione';
    case 'update': return 'Errore durante l\'aggiornamento';
    case 'delete': return 'Errore durante l\'eliminazione';
    default: return 'Errore durante l\'operazione';
  }
}

// Types per export
export type { OptimisticOperation, UseOptimisticUpdatesProps };
