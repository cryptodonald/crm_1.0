/**
 * 🚀 Leads UI System Clean - Estensione ottimizzata di use-leads-data
 * 
 * Sistema ibrido che combina:
 * - use-leads-data esistente (caching avanzato, sync periodico)  
 * - UI System Clean generico (optimistic updates, queue API)
 * 
 * Mantiene compatibilità completa con componenti esistenti
 * mentre aggiunge capacità ottimistiche enterprise.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLeadsData, useLeadsStats } from '@/hooks/use-leads-data';
import { 
  createUISystemClean, 
  createGenericAPI, 
  GenericUISystemUtils,
  type Entity 
} from '@/lib/ui-system-clean-generic';
import { 
  LeadData, 
  LeadsFilters, 
  LeadFormData,
  LeadsStats 
} from '@/types/leads';

// ===== LEAD ENTITY TYPE =====
interface Lead extends Entity {
  id: string;
  ID: string;
  Data: string;
  Nome: string;
  Telefono?: string;
  Email?: string;
  Indirizzo?: string;
  CAP?: number;
  Città?: string;
  Esigenza?: string;
  Stato: string;
  Provenienza: string;
  Note?: string;
  Allegati?: any[];
  Conversations?: string;
  Avatar?: string;
  Referenza?: string[];
  'Nome referenza'?: string[];
  Assegnatario?: string[];
  Ordini?: string[];
  Attività?: string[];
  'From field: Referenza'?: string[];
  createdTime: string;
}

// ===== LEADS API CLIENT =====
const leadsAPI = createGenericAPI<Lead>({
  baseUrl: '/api/leads',
  entityName: 'leads',
  transform: {
    // Trasforma da LeadFormData a formato API
    request: (data: any) => {
      if ('Nome' in data && typeof data.Nome === 'string') {
        // È una creazione/update - mantieni il formato originale
        return data;
      }
      return data;
    },
    // Trasforma dalla risposta API al formato Lead
    response: (data: any) => {
      return {
        id: data.id,
        ID: data.ID || data.id,
        Data: data.Data,
        Nome: data.Nome,
        Telefono: data.Telefono,
        Email: data.Email,
        Indirizzo: data.Indirizzo,
        CAP: data.CAP,
        Città: data.Città,
        Esigenza: data.Esigenza,
        Stato: data.Stato,
        Provenienza: data.Provenienza,
        Note: data.Note,
        Allegati: data.Allegati,
        Conversations: data.Conversations,
        Avatar: data.Avatar,
        Referenza: data.Referenza,
        'Nome referenza': data['Nome referenza'],
        Assegnatario: data.Assegnatario,
        Ordini: data.Ordini,
        Attività: data.Attività,
        'From field: Referenza': data['From field: Referenza'],
        createdTime: data.createdTime,
      };
    },
  },
});

// ===== UI SYSTEM CLEAN INSTANCE =====
const leadsUISystem = createUISystemClean<Lead>({
  retries: 2,
  timeout: 15000,
  showToasts: true,
  enableQueue: true,
  entityName: 'lead',
  entityNamePlural: 'leads'
});

// ===== HOOK PRINCIPALE =====
interface UseLeadsCleanProps {
  filters?: LeadsFilters; // Può essere omesso: verrà stabilizzato internamente
  pageSize?: number;
  sortField?: keyof LeadData;
  sortDirection?: 'asc' | 'desc';
  loadAll?: boolean;
  enableOptimistic?: boolean; // Nuovo flag per abilitare optimistic updates
}

// 🔒 Oggetto vuoto stabile per evitare nuove identità ad ogni render
const EMPTY_FILTERS: LeadsFilters = Object.freeze({});

export function useLeadsClean({
  filters,
  pageSize = 25,
  sortField = 'Data',
  sortDirection = 'desc',
  loadAll = true,
  enableOptimistic = true, // Default abilitato
}: UseLeadsCleanProps = {}) {
  
  // 🧩 Stabilizza i filtri per evitare re-render/loop
  const stableFilters = useMemo<LeadsFilters>(() => {
    if (!filters) return EMPTY_FILTERS;
    return {
      stato: filters.stato,
      provenienza: filters.provenienza,
      dataInizio: filters.dataInizio,
      dataFine: filters.dataFine,
      città: filters.città,
      search: filters.search,
    };
  }, [
    filters?.stato && filters.stato.join(','),
    filters?.provenienza && filters.provenienza.join(','),
    filters?.dataInizio,
    filters?.dataFine,
    filters?.città,
    filters?.search,
  ]);

  // 🏗️ LAYER 1: Hook originale (caching, sync periodico)
  const originalLeadsHook = useLeadsData({
    filters: stableFilters,
    pageSize,
    sortField,
    sortDirection,
    loadAll,
  });

  // 🚀 LAYER 2: Optimistic UI State (per operazioni immediate)
  const [optimisticLeads, setOptimisticLeads] = useState<Lead[]>([]);
  const [hasPendingOperations, setHasPendingOperations] = useState(false);

  // 🔄 Sync tra hook originale e optimistic state
  useEffect(() => {
    if (!hasPendingOperations) {
      const transformed = originalLeadsHook.leads.map(lead => ({
        ...lead,
        ID: lead.ID || lead.id,
      } as Lead));
      setOptimisticLeads(transformed);
    }
  }, [originalLeadsHook.leads, hasPendingOperations]);

  // 🎯 OPTIMISTIC OPERATIONS
  const createLead = useCallback(async (leadData: LeadFormData): Promise<Lead | null> => {
    if (!enableOptimistic) {
      // Fallback al metodo tradizionale
      try {
        const newLead = await leadsAPI.create(leadData);
        originalLeadsHook.refresh(); // Refresh del hook originale
        return newLead;
      } catch (error) {
        console.error('❌ Create lead failed:', error);
        return null;
      }
    }

    // 🚀 Optimistic creation
    const tempId = GenericUISystemUtils.generateTempId('lead');
    const tempLead: Lead = {
      id: tempId,
      ID: tempId,
      Data: new Date().toISOString().split('T')[0],
      Nome: leadData.Nome,
      Telefono: leadData.Telefono,
      Email: leadData.Email,
      Indirizzo: leadData.Indirizzo,
      CAP: leadData.CAP,
      Città: leadData.Città,
      Esigenza: leadData.Esigenza,
      Stato: leadData.Stato || 'Nuovo',
      Provenienza: leadData.Provenienza || 'Sito',
      Note: leadData.Note,
      Allegati: leadData.Allegati,
      Avatar: leadData.Avatar,
      Referenza: leadData.Referenza,
      Assegnatario: leadData.Assegnatario,
      createdTime: new Date().toISOString(),
    };

    const success = await leadsUISystem.OptimisticManager.execute(
      {
        type: 'create',
        entity: 'leads',
        tempData: tempLead,
      },
      {
        onUIUpdate: (newLead) => {
          console.log('⚡ [LeadsClean] Adding optimistic lead:', newLead.id);
          setOptimisticLeads(prev => GenericUISystemUtils.addItem(prev, newLead));
          setHasPendingOperations(true);
        },
        onRollback: (failedLead) => {
          console.log('🔄 [LeadsClean] Rolling back failed lead:', failedLead.id);
          setOptimisticLeads(prev => GenericUISystemUtils.removeItem(prev, failedLead.id));
          setHasPendingOperations(false);
        },
        apiCall: async () => {
          const result = await leadsAPI.create(leadData);
          
          // 🔄 Sostituisci temporary con real data
          setOptimisticLeads(prev => 
            GenericUISystemUtils.replaceTempItem(prev, tempId, result)
          );
          
          // 🔄 Refresh hook originale in background (non-blocking)
          setTimeout(() => {
            originalLeadsHook.refresh();
            setHasPendingOperations(false);
          }, 1000);
          
          return result;
        },
      },
      leadsUISystem.queueManager
    );

    return success ? tempLead : null;
  }, [enableOptimistic, originalLeadsHook]);

  const updateLead = useCallback(async (leadId: string, updates: Partial<LeadFormData>): Promise<boolean> => {
    if (!enableOptimistic) {
      // Fallback al metodo tradizionale
      try {
        await leadsAPI.update(leadId, updates);
        originalLeadsHook.refresh();
        return true;
      } catch (error) {
        console.error('❌ Update lead failed:', error);
        return false;
      }
    }

    // 🚀 Optimistic update
    const currentLead = optimisticLeads.find(lead => lead.id === leadId);
    if (!currentLead) return false;

    const updatedLead: Lead = { ...currentLead, ...updates };

    const success = await leadsUISystem.OptimisticManager.execute(
      {
        type: 'update',
        entity: 'leads',
        tempData: updatedLead,
        originalData: currentLead,
      },
      {
        onUIUpdate: (updated) => {
          console.log('⚡ [LeadsClean] Updating optimistic lead:', updated.id);
          setOptimisticLeads(prev => 
            GenericUISystemUtils.updateItem(prev, leadId, updates)
          );
          setHasPendingOperations(true);
        },
        onRollback: (original) => {
          console.log('🔄 [LeadsClean] Rolling back failed update:', original.id);
          setOptimisticLeads(prev => 
            GenericUISystemUtils.updateItem(prev, leadId, original)
          );
          setHasPendingOperations(false);
        },
        apiCall: async () => {
          const result = await leadsAPI.update(leadId, updates);
          
          // 🔄 Refresh hook originale in background
          setTimeout(() => {
            originalLeadsHook.refresh();
            setHasPendingOperations(false);
          }, 1000);
          
          return result;
        },
      },
      leadsUISystem.queueManager
    );

    return success;
  }, [enableOptimistic, optimisticLeads, originalLeadsHook]);

  const deleteLead = useCallback(async (leadId: string): Promise<boolean> => {
    if (!enableOptimistic) {
      // Fallback al metodo tradizionale 
      try {
        await leadsAPI.delete(leadId);
        originalLeadsHook.refresh();
        return true;
      } catch (error) {
        console.error('❌ Delete lead failed:', error);
        return false;
      }
    }

    // 🚀 Optimistic deletion
    const leadToDelete = optimisticLeads.find(lead => lead.id === leadId);
    if (!leadToDelete) return false;

    const success = await leadsUISystem.OptimisticManager.execute(
      {
        type: 'delete',
        entity: 'leads',
        tempData: leadToDelete, // Per rollback
        originalData: leadToDelete,
      },
      {
        onUIUpdate: (deleted) => {
          console.log('⚡ [LeadsClean] Deleting optimistic lead:', deleted.id);
          setOptimisticLeads(prev => 
            GenericUISystemUtils.removeItem(prev, leadId)
          );
          setHasPendingOperations(true);
        },
        onRollback: (restored) => {
          console.log('🔄 [LeadsClean] Rolling back failed deletion:', restored.id);
          setOptimisticLeads(prev => 
            GenericUISystemUtils.addItem(prev, restored)
          );
          setHasPendingOperations(false);
        },
        apiCall: async () => {
          await leadsAPI.delete(leadId);
          
          // 🔄 Refresh hook originale in background
          setTimeout(() => {
            originalLeadsHook.refresh();
            setHasPendingOperations(false);
          }, 1000);
          
          return leadToDelete; // Return per tipo consistency
        },
      },
      leadsUISystem.queueManager
    );

    return success;
  }, [enableOptimistic, optimisticLeads, originalLeadsHook]);

  // 🚀 DELETE MULTIPLE LEADS (ottimizzato per eliminazioni in batch)
  const deleteMultipleLeads = useCallback(async (leadIds: string[]): Promise<number> => {
    if (!enableOptimistic) {
      // Fallback al metodo tradizionale
      let successCount = 0;
      for (const leadId of leadIds) {
        try {
          await leadsAPI.delete(leadId);
          successCount++;
        } catch (error) {
          console.error(`❌ Delete lead failed: ${leadId}`, error);
        }
      }
      originalLeadsHook.refresh();
      return successCount;
    }

    // 🚀 Optimistic batch deletion
    const leadsToDelete = optimisticLeads.filter(lead => leadIds.includes(lead.id));
    console.log(`🗑️ [LeadsClean] Batch deleting ${leadsToDelete.length} leads:`, leadIds);
    
    if (leadsToDelete.length === 0) {
      console.log('⚠️ [LeadsClean] No leads found to delete');
      return 0;
    }

    // Remove all leads immediately from UI
    setOptimisticLeads(prev => 
      prev.filter(lead => !leadIds.includes(lead.id))
    );
    setHasPendingOperations(true);

    let successCount = 0;
    const failedLeads: Lead[] = [];

    // Try to delete each lead via API
    for (const leadToDelete of leadsToDelete) {
      try {
        await leadsAPI.delete(leadToDelete.id);
        successCount++;
        console.log(`✅ [LeadsClean] Successfully deleted: ${leadToDelete.id}`);
      } catch (error) {
        console.error(`❌ [LeadsClean] Failed to delete: ${leadToDelete.id}`, error);
        failedLeads.push(leadToDelete);
      }
    }

    // Restore failed leads to optimistic state
    if (failedLeads.length > 0) {
      console.log(`🔄 [LeadsClean] Restoring ${failedLeads.length} failed deletions`);
      setOptimisticLeads(prev => [...failedLeads, ...prev]);
    }

    // Refresh hook originale in background
    setTimeout(() => {
      originalLeadsHook.refresh();
      setHasPendingOperations(false);
    }, 1000);

    return successCount;
  }, [enableOptimistic, optimisticLeads, originalLeadsHook]);

  // 🚀 ADD LEAD (per lead già creati esternamente, come da NewLeadModal)
  const addLead = useCallback((leadData: any): void => {
    if (!enableOptimistic) {
      // Se optimistic è disabilitato, forza refresh
      originalLeadsHook.refresh();
      return;
    }

    console.log('➕ [LeadsClean] Adding external lead to optimistic state:', leadData.Nome);
    
    const transformedLead: Lead = {
      id: leadData.id || leadData.ID,
      ID: leadData.ID || leadData.id,
      Data: leadData.Data || new Date().toISOString().split('T')[0],
      Nome: leadData.Nome,
      Telefono: leadData.Telefono,
      Email: leadData.Email,
      Indirizzo: leadData.Indirizzo,
      CAP: leadData.CAP,
      Città: leadData.Città,
      Esigenza: leadData.Esigenza,
      Stato: leadData.Stato || 'Nuovo',
      Provenienza: leadData.Provenienza || 'Sito',
      Note: leadData.Note,
      Allegati: leadData.Allegati,
      Conversations: leadData.Conversations,
      Avatar: leadData.Avatar,
      Referenza: leadData.Referenza,
      'Nome referenza': leadData['Nome referenza'],
      Assegnatario: leadData.Assegnatario,
      Ordini: leadData.Ordini,
      Attività: leadData.Attività,
      'From field: Referenza': leadData['From field: Referenza'],
      createdTime: leadData.createdTime || new Date().toISOString(),
    };
    
    // Verifica che il lead non esista già
    const exists = optimisticLeads.some(lead => lead.id === transformedLead.id);
    if (exists) {
      console.log('🛡️ [LeadsClean] Lead already exists, skipping:', transformedLead.id);
      return;
    }
    
    setOptimisticLeads(prev => [transformedLead, ...prev]); // Aggiunge in cima
    console.log('✅ [LeadsClean] Lead added to optimistic state:', transformedLead.Nome);
    
    // Refresh hook originale in background (non-blocking)
    setTimeout(() => {
      originalLeadsHook.refresh();
    }, 1000);
  }, [enableOptimistic, optimisticLeads, originalLeadsHook]);

  // 🔄 PASSTHROUGH METHODS (dal hook originale)
  const refresh = useCallback((forceRefresh = false) => {
    setHasPendingOperations(false);
    return originalLeadsHook.refresh(forceRefresh);
  }, [originalLeadsHook]);

  const loadMore = useCallback(() => {
    return originalLeadsHook.loadMore();
  }, [originalLeadsHook]);

  // 📊 STATS (passthrough al hook originale) — usa filtri stabili
  const statsHook = useLeadsStats(stableFilters);

  // 🎯 RETURN INTERFACE (compatibile con use-leads-data + estensioni)
  return {
    // 📊 Data (optimistic se abilitato, altrimenti originale)
    leads: enableOptimistic ? optimisticLeads : originalLeadsHook.leads.map(l => l as Lead),
    loading: originalLeadsHook.loading,
    error: originalLeadsHook.error,
    totalCount: enableOptimistic ? optimisticLeads.length : originalLeadsHook.totalCount,
    hasMore: originalLeadsHook.hasMore,
    
    // 🔄 Original methods
    loadMore,
    refresh,
    
    // 🚀 NEW: Optimistic operations
    createLead,
    updateLead,
    deleteLead,
    deleteMultipleLeads, // 🚀 Per eliminazione ottimistica di più lead
    addLead, // 🚀 Per aggiungere lead già creati esternamente
    
    // 📊 Stats
    stats: statsHook.stats,
    statsLoading: statsHook.loading,
    statsError: statsHook.error,
    refreshStats: statsHook.refresh,
    
    // 🎛️ System status
    hasPendingOperations,
    enableOptimistic,
    queueStatus: leadsUISystem.monitor.getQueueStatus(leadsUISystem.queueManager),
  };
}

// ===== HOOK STATS SEPARATO (per componenti che usano solo stats) =====
export function useLeadsStatsClean(filters: LeadsFilters = {}) {
  return useLeadsStats(filters);
}

// ===== UTILITIES ESPORTATE =====
export const LeadsUISystemUtils = {
  ...GenericUISystemUtils,
  
  /**
   * Converte LeadData in Lead per compatibilità
   */
  transformToLead: (leadData: LeadData): Lead => ({
    ...leadData,
    ID: leadData.ID || leadData.id,
  }),
  
  /**
   * Filtra leads per ricerca client-side
   */
  filterLeadsBySearch: (leads: Lead[], searchTerm: string): Lead[] => {
    if (!searchTerm.trim()) return leads;
    
    const search = searchTerm.toLowerCase();
    return leads.filter(lead =>
      lead.Nome?.toLowerCase().includes(search) ||
      lead.Email?.toLowerCase().includes(search) ||
      lead.Telefono?.includes(search) ||
      lead.Città?.toLowerCase().includes(search) ||
      lead.Note?.toLowerCase().includes(search)
    );
  },
};

console.log('🚀 Leads UI System Clean initialized');
