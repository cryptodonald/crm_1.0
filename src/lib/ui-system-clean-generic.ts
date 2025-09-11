/**
 * 🚀 UI System Clean Generic - Sistema unificato per tutte le entità
 * 
 * Architettura a 3 layer estendibile per qualsiasi tipo di entità:
 * - Data Layer: Simple React state + fetch
 * - Optimistic Layer: Immediate UI updates  
 * - Queue Layer: API calls in background
 * 
 * Generico per: Leads, Users, Orders, Activities, etc.
 */

import { toast } from 'sonner';

// ===== GENERIC TYPES =====
export interface Entity {
  id: string;
  [key: string]: any;
}

export interface GenericOperation<T extends Entity = Entity> {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  tempData: T;
  originalData?: T;
  apiCall: () => Promise<T>;
  timestamp: number;
}

export interface GenericUISystemConfig {
  retries: number;
  timeout: number;
  showToasts: boolean;
  enableQueue: boolean;
  entityName: string; // Nome dell'entità per i toast
  entityNamePlural: string; // Nome plurale per i toast
}

// ===== GENERIC API QUEUE MANAGER =====
class GenericAPIQueueManager<T extends Entity = Entity> {
  private queue: GenericOperation<T>[] = [];
  private processing = false;
  private config: GenericUISystemConfig;

  constructor(config: Partial<GenericUISystemConfig> = {}) {
    this.config = {
      retries: 2,
      timeout: 15000,
      showToasts: true,
      enableQueue: true,
      entityName: 'elemento',
      entityNamePlural: 'elementi',
      ...config,
    };
  }

  /**
   * Aggiunge operazione alla coda
   */
  async enqueue(operation: Omit<GenericOperation<T>, 'id' | 'timestamp'>): Promise<string> {
    const id = `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const fullOperation: GenericOperation<T> = {
      ...operation,
      id,
      timestamp: Date.now(),
    };

    this.queue.push(fullOperation);
    
    console.log(`📝 [GenericQueue:${this.config.entityName}] Enqueued ${operation.type}:`, id);

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
    console.log(`🔄 [GenericQueue:${this.config.entityName}] Processing ${this.queue.length} operations...`);

    while (this.queue.length > 0) {
      const operation = this.queue.shift()!;
      await this.processOperation(operation);
    }

    this.processing = false;
    console.log(`✅ [GenericQueue:${this.config.entityName}] Queue processing completed`);
  }

  /**
   * Processa singola operazione con retry
   */
  private async processOperation(operation: GenericOperation<T>): Promise<void> {
    const { id, type, entity, apiCall } = operation;
    
    for (let attempt = 1; attempt <= this.config.retries + 1; attempt++) {
      try {
        console.log(`🚀 [GenericQueue:${this.config.entityName}] Processing ${type} (attempt ${attempt}):`, id);

        // Timeout promise
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), this.config.timeout)
        );

        // Esegui API call con timeout
        const result = await Promise.race([apiCall(), timeoutPromise]);
        
        // Successo
        console.log(`✅ [GenericQueue:${this.config.entityName}] Success ${type}:`, id);
        
        if (this.config.showToasts) {
          const actionName = type === 'create' ? 'creato' : type === 'update' ? 'aggiornato' : 'eliminato';
          toast.success(`${this.config.entityName} ${actionName} con successo!`);
        }
        
        return; // Esce dal loop di retry

      } catch (error) {
        console.error(`❌ [GenericQueue:${this.config.entityName}] Attempt ${attempt} failed:`, error);
        
        if (attempt < this.config.retries + 1) {
          // Retry con delay esponenziale
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`⏳ [GenericQueue:${this.config.entityName}] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Tutti i retry falliti
          console.error(`💥 [GenericQueue:${this.config.entityName}] All retries failed:`, id);
          
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

// ===== GENERIC OPTIMISTIC MANAGER =====
export class GenericOptimisticManager<T extends Entity = Entity> {
  /**
   * Esegue update ottimistico con fallback
   */
  static async execute<T extends Entity>(
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
    },
    queueManager: GenericAPIQueueManager<T>
  ): Promise<boolean> {
    
    const { type, entity, tempData, originalData } = operation;
    const { onUIUpdate, onRollback, apiCall } = callbacks;
    
    const operationId = `${type}-${entity}-${Date.now()}`;
    console.log(`🚀 [GenericOptimistic:${entity}] Starting ${type}:`, operationId);

    try {
      // 1. 🚀 AGGIORNA UI IMMEDIATAMENTE
      onUIUpdate(tempData);
      console.log(`⚡ [GenericOptimistic:${entity}] UI updated immediately:`, operationId);

      // 2. 📝 AGGIUNGI ALLA CODA API
      await queueManager.enqueue({
        type,
        entity,
        tempData,
        originalData,
        apiCall,
      });

      console.log(`✅ [GenericOptimistic:${entity}] Successfully queued:`, operationId);
      return true;

    } catch (error) {
      console.error(`❌ [GenericOptimistic:${entity}] Failed:`, operationId, error);
      
      // 3. 🔄 ROLLBACK in caso di errore
      if (originalData && onRollback) {
        console.log(`🔄 [GenericOptimistic:${entity}] Rolling back:`, operationId);
        onRollback(originalData);
      }
      
      toast.error('Errore nell\'aggiornamento. Modifiche annullate.');
      return false;
    }
  }
}

// ===== GENERIC UTILITIES =====
export const GenericUISystemUtils = {
  /**
   * Genera ID temporaneo per nuovi elementi
   */
  generateTempId: (prefix = 'temp') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  /**
   * Sostituisce elemento temporaneo con quello reale
   */
  replaceTempItem: <T extends Entity>(
    items: T[], 
    tempId: string, 
    realItem: T
  ): T[] => {
    return items.map(item => item.id === tempId ? realItem : item);
  },
  
  /**
   * Rimuove elemento dalla lista
   */
  removeItem: <T extends Entity>(items: T[], id: string): T[] => {
    return items.filter(item => item.id !== id);
  },
  
  /**
   * Aggiorna elemento nella lista
   */
  updateItem: <T extends Entity>(
    items: T[], 
    id: string, 
    updates: Partial<T>
  ): T[] => {
    return items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
  },

  /**
   * Aggiunge elemento alla lista (con controllo duplicati)
   */
  addItem: <T extends Entity>(items: T[], newItem: T): T[] => {
    const exists = items.find(item => item.id === newItem.id);
    if (exists) return items;
    return [...items, newItem];
  },
};

// ===== GENERIC API FUNCTIONS FACTORY =====
export interface GenericAPIConfig {
  baseUrl: string;
  entityName: string;
  transform?: {
    request?: (data: any) => any;
    response?: (data: any) => any;
  };
}

export function createGenericAPI<T extends Entity>(config: GenericAPIConfig) {
  return {
    async fetch(params?: Record<string, any>): Promise<T[]> {
      const url = new URL(config.baseUrl, window.location.origin);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach(v => url.searchParams.append(key, v));
            } else {
              url.searchParams.set(key, value.toString());
            }
          }
        });
      }
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch ${config.entityName}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const items = data.data || data.records || data;
      
      return config.transform?.response 
        ? items.map(config.transform.response) 
        : items;
    },

    async create(item: Omit<T, 'id'>): Promise<T> {
      const payload = config.transform?.request 
        ? config.transform.request(item) 
        : item;
        
      const response = await fetch(config.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create ${config.entityName}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const result = data.data || data;
      
      return config.transform?.response 
        ? config.transform.response(result)
        : result;
    },

    async update(id: string, updates: Partial<T>): Promise<T> {
      const payload = config.transform?.request 
        ? config.transform.request(updates) 
        : updates;
        
      const response = await fetch(`${config.baseUrl}/${id}`, {
        method: 'PUT', // 🔧 Cambiato da PATCH a PUT per allinearsi con l'API route
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update ${config.entityName}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const result = data.data || data;
      
      return config.transform?.response 
        ? config.transform.response(result)
        : result;
    },

    async delete(id: string): Promise<void> {
      const response = await fetch(`${config.baseUrl}/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete ${config.entityName}: ${response.statusText}`);
      }
    },
  };
}

// ===== GENERIC MONITOR =====
export const GenericUISystemMonitor = {
  getQueueStatus: <T extends Entity>(queueManager: GenericAPIQueueManager<T>) => queueManager.getStatus(),
  
  getStats: <T extends Entity>(queueManager: GenericAPIQueueManager<T>) => ({
    queueStatus: queueManager.getStatus(),
    timestamp: Date.now(),
  }),
};

console.log('🚀 Generic UI System Clean initialized');

// ===== EXPORT FACTORY FUNCTION =====
export function createUISystemClean<T extends Entity>(config: GenericUISystemConfig) {
  return {
    queueManager: new GenericAPIQueueManager<T>(config),
    OptimisticManager: GenericOptimisticManager<T>,
    utils: GenericUISystemUtils,
    monitor: GenericUISystemMonitor,
  };
}
