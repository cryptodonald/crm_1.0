import { useCallback } from 'react';

/**
 * 🔄 Sistema di cache busting condiviso per i leads
 * 
 * Questo hook permette di invalidare la cache di useLeadsList
 * quando useLeadDetail aggiorna un lead
 */

// Event emitter globale per la comunicazione tra hook
class LeadsCacheManager {
  private listeners: ((leadId?: string, freshData?: any) => void)[] = [];

  subscribe(listener: (leadId?: string, freshData?: any) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  invalidate(leadId?: string, freshData?: any) {
    this.listeners.forEach(listener => listener(leadId, freshData));
  }
}

// Istanza globale del cache manager
const leadsCacheManager = new LeadsCacheManager();

/**
 * Hook per invalidare la cache dei leads
 */
export function useLeadsCacheInvalidation() {
  const invalidateCache = useCallback((leadId?: string, freshData?: any) => {
    leadsCacheManager.invalidate(leadId, freshData);
  }, []);

  return { invalidateCache };
}

/**
 * Hook per ascoltare le invalidazioni della cache
 */
export function useLeadsCacheListener() {
  const subscribe = useCallback((callback: (leadId?: string, freshData?: any) => void) => {
    return leadsCacheManager.subscribe(callback);
  }, []);

  return { subscribe };
}
