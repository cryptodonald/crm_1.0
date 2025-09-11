/**
 * 🚀 UI System Clean - Rewrite Completo
 * 
 * Architettura a 3 layer pulita e semplificata:
 * 1. Data Layer: Simple fetch + minimal cache
 * 2. Optimistic Layer: Immediate UI updates  
 * 3. Sync Layer: Background sync (optional)
 * 
 * Principi:
 * - Single Source of Truth (React state)
 * - Optimistic by default
 * - API calls in queue (no race conditions)
 * - Simple error handling with rollback
 */

import { toast } from 'sonner';

// ===== TYPES =====
export interface OptimisticOperation<T = any> {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  tempData: T;
  originalData?: T;
  apiCall: () => Promise<T>;
  timestamp: number;
}

export interface UISystemConfig {
  retries: number;
  timeout: number;
  showToasts: boolean;
  enableQueue: boolean;
}

// ===== API QUEUE MANAGER =====
class APIQueueManager {
  private queue: OptimisticOperation[] = [];
  private processing = false;
  private config: UISystemConfig = {
    retries: 2,
    timeout: 15000,
    showToasts: true,
    enableQueue: true,
  };

  constructor(config?: Partial<UISystemConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Aggiunge operazione alla coda
   */
  async enqueue<T>(operation: Omit<OptimisticOperation<T>, 'id' | 'timestamp'>): Promise<string> {
    const id = `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullOperation: OptimisticOperation<T> = {
      ...operation,
      id,
      timestamp: Date.now(),
    };

    this.queue.push(fullOperation as OptimisticOperation);
    
    console.log(`📝 [APIQueue] Enqueued ${operation.type} ${operation.entity}:`, id);

    // Avvia processamento se non già in corso
    if (!this.processing) {
      this.processQueue();
    }

    return id;
  }

  /**
   * Processa la coda sequenzialmente
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    console.log(`🔄 [APIQueue] Processing ${this.queue.length} operations...`);

    while (this.queue.length > 0) {
      const operation = this.queue.shift()!;
      await this.processOperation(operation);
    }

    this.processing = false;
    console.log(`✅ [APIQueue] Queue processing completed`);
  }

  /**
   * Processa singola operazione con retry
   */
  private async processOperation(operation: OptimisticOperation): Promise<void> {
    const { id, type, entity, apiCall } = operation;
    
    for (let attempt = 1; attempt <= this.config.retries + 1; attempt++) {
      try {
        console.log(`🚀 [APIQueue] Processing ${type} ${entity} (attempt ${attempt}):`, id);

        // Timeout promise
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.config.timeout)
        );

        // Esegui API call con timeout
        const result = await Promise.race([apiCall(), timeoutPromise]);
        
        // Successo
        console.log(`✅ [APIQueue] Success ${type} ${entity}:`, id);
        
        if (this.config.showToasts) {
          toast.success(`${entity} ${type === 'create' ? 'creata' : type === 'update' ? 'aggiornata' : 'eliminata'} con successo!`);
        }
        
        return; // Esce dal loop di retry

      } catch (error) {
        console.error(`❌ [APIQueue] Attempt ${attempt} failed for ${id}:`, error);
        
        if (attempt < this.config.retries + 1) {
          // Retry con delay esponenziale
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`⏳ [APIQueue] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Tutti i retry falliti
          console.error(`💥 [APIQueue] All retries failed for ${id}`);
          
          if (this.config.showToasts) {
            toast.error(`Errore nel salvataggio. Le modifiche potrebbero non essere sincronizzate.`, {
              action: {
                label: 'Ricarica',
                onClick: () => window.location.reload(),
              },
            });
          }
        }
      }
    }
  }

  /**
   * Info sullo stato della coda
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
    };
  }
}

// ===== SINGLETON QUEUE MANAGER =====
export const apiQueue = new APIQueueManager();

// ===== OPTIMISTIC UPDATES CORE =====
export class OptimisticManager<T> {
  /**
   * Esegue update ottimistico con fallback
   */
  static async execute<T>(
    operation: {
      type: 'create' | 'update' | 'delete';
      entity: string;
      tempData: T;
      originalData?: T;
    },
    callbacks: {
      onUIUpdate: (data: T) => void;
      onRollback: (data: T) => void;
      apiCall: () => Promise<T>;
    }
  ): Promise<boolean> {
    
    const { type, entity, tempData, originalData } = operation;
    const { onUIUpdate, onRollback, apiCall } = callbacks;
    
    const operationId = `${type}-${entity}-${Date.now()}`;
    console.log(`🚀 [Optimistic] Starting ${type} ${entity}:`, operationId);

    try {
      // 1. 🚀 AGGIORNA UI IMMEDIATAMENTE
      onUIUpdate(tempData);
      console.log(`⚡ [Optimistic] UI updated immediately for:`, operationId);

      // 2. 📝 AGGIUNGI ALLA CODA API
      await apiQueue.enqueue({
        type,
        entity,
        tempData,
        originalData,
        apiCall,
      });

      console.log(`✅ [Optimistic] Successfully queued:`, operationId);
      return true;

    } catch (error) {
      console.error(`❌ [Optimistic] Failed:`, operationId, error);
      
      // 3. 🔄 ROLLBACK in caso di errore
      if (originalData && onRollback) {
        console.log(`🔄 [Optimistic] Rolling back:`, operationId);
        onRollback(originalData);
      }
      
      toast.error('Errore nell\'aggiornamento. Modifiche annullate.');
      return false;
    }
  }
}

// ===== UTILITIES =====
export const UISystemUtils = {
  /**
   * Genera ID temporaneo per nuovi elementi
   */
  generateTempId: (prefix = 'temp') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  /**
   * Sostituisce elemento temporaneo con quello reale
   */
  replaceTempItem: <T extends { id: string }>(
    items: T[], 
    tempId: string, 
    realItem: T
  ): T[] => {
    return items.map(item => item.id === tempId ? realItem : item);
  },
  
  /**
   * Rimuove elemento dalla lista
   */
  removeItem: <T extends { id: string }>(items: T[], id: string): T[] => {
    return items.filter(item => item.id !== id);
  },
  
  /**
   * Aggiorna elemento nella lista
   */
  updateItem: <T extends { id: string }>(
    items: T[], 
    id: string, 
    updates: Partial<T>
  ): T[] => {
    return items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
  },
};

/**
 * 📊 Sistema di monitoring per debug
 */
export const UISystemMonitor = {
  getQueueStatus: () => apiQueue.getStatus(),
  
  clearQueue: () => {
    console.warn('⚠️ [Monitor] Clearing API queue (debug only)');
    // Implementa se necessario per debug
  },
  
  getStats: () => ({
    queueStatus: apiQueue.getStatus(),
    timestamp: Date.now(),
  }),
};

console.log('🚀 UI System Clean initialized');
