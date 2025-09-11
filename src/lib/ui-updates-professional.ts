/**
 * 🚀 Sistema di Aggiornamento UI Professionale
 * 
 * Si integra con il sistema esistente di cache per fornire:
 * 1. Optimistic Updates (istantanei)
 * 2. Smart Refresh (coordinato)
 * 3. Real-time Sync (tramite API polling ottimizzato)
 * 4. Fallback Strategy (robust)
 */

import { toast } from 'sonner';
import { invalidateActivitiesCache } from './cache';

export type UpdateStrategy = 'optimistic' | 'refresh' | 'sync' | 'emergency';

interface UpdateOperation<T = any> {
  id: string;
  type: 'create' | 'update' | 'delete' | 'state-change';
  entity: 'activity' | 'lead' | 'order' | 'user';
  data: T;
  originalData?: T;
  strategy: UpdateStrategy;
}

interface UIUpdateConfig {
  /** Mostra toast di conferma (default: true) */
  showToast?: boolean;
  /** Timeout operazione API (default: 15000ms) */
  timeout?: number;
  /** Numero di retry (default: 2) */
  maxRetries?: number;
  /** Delay tra retry (default: 1000ms) */
  retryDelay?: number;
  /** Disabilita fallback refresh (default: false) */
  noFallback?: boolean;
}

/**
 * 🎯 Strategia 1: OPTIMISTIC UPDATES
 * La più veloce - aggiorna UI immediatamente, poi chiama API
 */
export async function updateUIOptimistic<T>(
  operation: Omit<UpdateOperation<T>, 'id' | 'strategy'>,
  onUIUpdate: (data: T, type: UpdateOperation['type']) => void,
  apiCall: () => Promise<T | void>,
  onRollback: (originalData: T) => void,
  config: UIUpdateConfig = {}
): Promise<{ success: boolean; data?: T }> {
  
  const operationId = `opt-${Date.now()}-${Math.random()}`;
  const fullOperation: UpdateOperation<T> = {
    ...operation,
    id: operationId,
    strategy: 'optimistic',
  };

  console.log(`🚀 [UI Update] OPTIMISTIC: ${operation.type} ${operation.entity}`, {
    id: operationId,
    title: (operation.data as any)?.Titolo || (operation.data as any)?.id,
  });

  try {
    // 1. 🚀 AGGIORNA IMMEDIATAMENTE LA UI
    onUIUpdate(operation.data, operation.type);
    
    if (config.showToast !== false) {
      toast.loading(`Aggiornamento ${operation.entity}...`, {
        id: operationId,
        duration: 3000,
      });
    }

    // 2. Chiama API con retry
    const result = await executeWithRetry(apiCall, config);
    
    // 3. ✅ SUCCESS: Conferma l'aggiornamento
    if (config.showToast !== false) {
      toast.success(`${operation.entity} aggiornata!`, {
        id: operationId,
        duration: 2000,
      });
    }

    // 4. 🚀 CORREZIONE: Invalida SEMPRE la cache dopo optimistic update
    // Questo garantisce che il prossimo fetch abbià dati freschi
    console.log('🚀 [Cache] Invalidating cache for optimistic update:', operation.entity);
    await invalidateRelevantCache(operation.entity);
    
    console.log(`✅ [UI Update] OPTIMISTIC SUCCESS:`, operationId);
    return { success: true, data: result as T };

  } catch (error) {
    console.error(`❌ [UI Update] OPTIMISTIC FAILED:`, operationId, error);
    
    // 5. 🔄 ROLLBACK: Ripristina UI originale
    if (operation.originalData) {
      onRollback(operation.originalData);
    }
    
    if (config.showToast !== false) {
      toast.error(`Errore: ${(error as Error).message}`, {
        id: operationId,
        duration: 5000,
        action: {
          label: 'Riprova',
          onClick: () => updateUIOptimistic(operation, onUIUpdate, apiCall, onRollback, config),
        },
      });
    }

    return { success: false };
  }
}

/**
 * ⚡ Strategia 2: SMART REFRESH
 * Bilanciata - chiama API prima, poi aggiorna UI con feedback visivo
 */
export async function updateUISmart<T>(
  operation: Omit<UpdateOperation<T>, 'id' | 'strategy'>,
  onUIUpdate: (data: T, type: UpdateOperation['type']) => void,
  apiCall: () => Promise<T | void>,
  config: UIUpdateConfig = {}
): Promise<{ success: boolean; data?: T }> {
  
  const operationId = `smart-${Date.now()}`;
  console.log(`⚡ [UI Update] SMART: ${operation.type} ${operation.entity}`, operationId);

  if (config.showToast !== false) {
    toast.loading(`Aggiornamento ${operation.entity}...`, {
      id: operationId,
    });
  }

  try {
    // 1. ⚡ CHIAMA API PRIMA
    const result = await executeWithRetry(apiCall, config);
    
    // 2. ✅ AGGIORNA UI DOPO SUCCESSO
    onUIUpdate(operation.data, operation.type);
    
    // 3. Invalida cache
    await invalidateRelevantCache(operation.entity);
    
    if (config.showToast !== false) {
      toast.success(`${operation.entity} aggiornata!`, {
        id: operationId,
        duration: 2000,
      });
    }

    console.log(`✅ [UI Update] SMART SUCCESS:`, operationId);
    return { success: true, data: result as T };

  } catch (error) {
    console.error(`❌ [UI Update] SMART FAILED:`, operationId, error);
    
    if (config.showToast !== false) {
      toast.error(`Errore: ${(error as Error).message}`, {
        id: operationId,
        duration: 5000,
      });
    }

    return { success: false };
  }
}

/**
 * 🔄 Strategia 3: SYNC REFRESH  
 * La più affidabile - forza refresh completo bypassando cache
 */
export async function updateUISync(
  entityType: 'activity' | 'lead' | 'order' | 'user',
  refreshFunction: (forceRefresh?: boolean) => void,
  config: UIUpdateConfig = {}
): Promise<{ success: boolean }> {
  
  const operationId = `sync-${Date.now()}`;
  console.log(`🔄 [UI Update] SYNC REFRESH: ${entityType}`, operationId);

  try {
    if (config.showToast !== false) {
      toast.loading('Sincronizzazione dati...', {
        id: operationId,
        duration: 2000,
      });
    }

    // 1. 🔄 INVALIDA CACHE
    await invalidateRelevantCache(entityType);
    
    // 2. 🔄 FORCE REFRESH
    refreshFunction(true); // forceRefresh = true bypassa completamente la cache
    
    // 3. Feedback positivo
    setTimeout(() => {
      if (config.showToast !== false) {
        toast.success('Dati sincronizzati!', {
          id: operationId,
          duration: 1500,
        });
      }
    }, 500);

    console.log(`✅ [UI Update] SYNC SUCCESS:`, operationId);
    return { success: true };

  } catch (error) {
    console.error(`❌ [UI Update] SYNC FAILED:`, operationId, error);
    
    if (config.showToast !== false) {
      toast.error('Errore di sincronizzazione', {
        id: operationId,
        duration: 3000,
      });
    }

    return { success: false };
  }
}

/**
 * 🆘 Strategia 4: EMERGENCY RECOVERY
 * Quando tutto va male - refresh multiplo con retry
 */
export async function emergencyUIRecovery(
  entityType: 'activity' | 'lead' | 'order' | 'user',
  refreshFunction: (forceRefresh?: boolean) => void,
  config: UIUpdateConfig = {}
): Promise<{ success: boolean }> {
  
  const operationId = `emergency-${Date.now()}`;
  console.log(`🆘 [UI Update] EMERGENCY RECOVERY: ${entityType}`, operationId);

  if (config.showToast !== false) {
    toast.error('Recupero dati in corso...', {
      id: operationId,
      duration: 5000,
    });
  }

  try {
    // 1. 🧹 CLEAR CACHE COMPLETO
    await invalidateRelevantCache(entityType);
    
    // 2. 🔄 TRIPLE REFRESH STRATEGY (dal tuo sistema attuale!)
    console.log(`🆘 [Emergency] Immediate refresh attempt...`);
    refreshFunction(true); 
    
    setTimeout(() => {
      console.log(`🆘 [Emergency] Second refresh (300ms delay)...`);
      refreshFunction(true);
    }, 300);
    
    setTimeout(() => {
      console.log(`🆘 [Emergency] Final refresh (800ms delay)...`);
      refreshFunction(true);
    }, 800);

    if (config.showToast !== false) {
      toast.success('Recupero completato!', {
        id: operationId,
        duration: 2000,
      });
    }

    console.log(`✅ [UI Update] EMERGENCY SUCCESS:`, operationId);
    return { success: true };

  } catch (error) {
    console.error(`💥 [UI Update] EMERGENCY FAILED:`, operationId, error);
    
    if (config.showToast !== false) {
      toast.error('Recupero fallito - ricarica la pagina', {
        id: operationId,
        duration: 10000,
        action: {
          label: 'Ricarica',
          onClick: () => window.location.reload(),
        },
      });
    }

    return { success: false };
  }
}

/**
 * 🔧 Utility: Esegue chiamata API con retry
 */
async function executeWithRetry<T>(
  apiCall: () => Promise<T>,
  config: UIUpdateConfig
): Promise<T> {
  const { timeout = 15000, maxRetries = 2, retryDelay = 1000 } = config;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const apiPromise = apiCall();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout dopo ${timeout}ms`)), timeout)
      );

      return await Promise.race([apiPromise, timeoutPromise]);

    } catch (error) {
      if (attempt < maxRetries + 1) {
        console.log(`⏱️ [Retry] Waiting ${retryDelay}ms before retry ${attempt + 1}...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('All retry attempts failed');
}

/**
 * 🗑️ Utility: Invalida cache rilevante per entità
 */
async function invalidateRelevantCache(entityType: string): Promise<void> {
  switch (entityType) {
    case 'activity':
      console.log('🚀 [Cache] Invalidating activities cache...');
      
      // Invalida tutte le cache delle attività
      await invalidateActivitiesCache();
      
      // 🚀 AGGIUNTO: Invalidazione cache pattern-based per activities
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const cacheNames = await caches.keys();
          const activitiesCaches = cacheNames.filter(name => 
            name.includes('activities') || name.includes('activity')
          );
          
          for (const cacheName of activitiesCaches) {
            console.log(`🗑️ [Cache] Clearing cache: ${cacheName}`);
            await caches.delete(cacheName);
          }
        } catch (error) {
          console.warn('⚠️ [Cache] Browser cache clearing failed:', error);
        }
      }
      break;
      
    case 'lead':
      console.log('🔄 [Cache] Lead cache invalidation requested (no specific cache to clear)');
      break;
      
    // Aggiungi altre invalidazioni se necessario
    default:
      console.log(`⚠️ [Cache] Unknown entity type for invalidation: ${entityType}`);
  }
}

/**
 * 🎯 Hook di convenienza per scegliere strategia automaticamente
 */
export function chooseUpdateStrategy(
  operation: 'create' | 'update' | 'delete' | 'state-change',
  entityType: 'activity' | 'lead' | 'order' | 'user',
  context: {
    isOnline: boolean;
    connectionQuality: 'fast' | 'slow' | 'unstable';
    userPreference?: 'speed' | 'reliability';
  }
): UpdateStrategy {
  
  // Se offline, non fare nulla
  if (!context.isOnline) {
    return 'emergency';
  }
  
  // Preferenza utente esplicita
  if (context.userPreference === 'speed') {
    return 'optimistic';
  }
  if (context.userPreference === 'reliability') {
    return 'sync';
  }
  
  // Logica automatica basata su operazione e contesto
  if (operation === 'delete') {
    // Delete è irreversibile - meglio essere sicuri
    return context.connectionQuality === 'fast' ? 'refresh' : 'sync';
  }
  
  if (operation === 'create') {
    // Create beneficia di feedback immediato
    return context.connectionQuality === 'unstable' ? 'refresh' : 'optimistic';
  }
  
  if (operation === 'state-change') {
    // Cambio stato (come Kanban drag) deve essere immediato
    return 'optimistic';
  }
  
  // Default per update
  return context.connectionQuality === 'fast' ? 'optimistic' : 'refresh';
}

// Export delle utility principali
export const uiUpdates = {
  optimistic: updateUIOptimistic,
  smart: updateUISmart,
  sync: updateUISync,
  emergency: emergencyUIRecovery,
  chooseStrategy: chooseUpdateStrategy,
};
