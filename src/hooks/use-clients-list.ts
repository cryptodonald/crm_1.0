import { useState, useEffect, useCallback, useMemo } from 'react';
import { LeadData, LeadsFilters } from '@/types/leads';
import { useFetchWithRetry } from './use-fetch-with-retry';
import { useLeadsCacheListener } from './use-leads-cache';
import { toast } from 'sonner';

// Alias per maggiore chiarezza semantica
export type ClientData = LeadData;

interface UseClientsListProps {
  filters?: Omit<LeadsFilters, 'stato'>; // Rimuovi stato dai filtri, sarà sempre 'Cliente'
  refreshKey?: number;
  enableSmartCache?: boolean;
  enabled?: boolean;
}

interface UseClientsListReturn {
  clients: ClientData[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refresh: () => Promise<void>;
  updateClient: (clientId: string, data: any) => Promise<boolean>;
  deleteClient: (clientId: string) => Promise<boolean>;
  deleteMultipleClients: (clientIds: string[]) => Promise<number>;
}

/**
 * Hook specializzato per la gestione dei clienti
 * Riutilizza la logica di useLeadsList ma con filtro fisso per stato 'Cliente'
 * 
 * @param filters - Filtri aggiuntivi (esclude 'stato' che è fisso a 'Cliente')
 * @param refreshKey - Key per forzare refresh
 * @param enableSmartCache - Abilita cache intelligente
 * @param enabled - Flag per abilitare/disabilitare l'hook
 */
export function useClientsList({ 
  filters = {}, 
  refreshKey,
  enableSmartCache = false,
  enabled = true
}: UseClientsListProps = {}): UseClientsListReturn {
  
  const [clients, setClients] = useState<ClientData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  
  // 🔄 Sistema di cache listener per invalidazioni esterne
  const { subscribe } = useLeadsCacheListener();

  // 🔧 Stabilizza i filtri e forza sempre stato = 'Cliente'
  const stableFilters = useMemo(() => {
    return {
      stato: ['Cliente'], // ⭐ FILTRO FISSO: Solo clienti
      provenienza: filters.provenienza,
      dataInizio: filters.dataInizio,
      dataFine: filters.dataFine,
      città: filters.città,
      search: filters.search,
    };
  }, [
    filters?.provenienza && filters.provenienza.join(','),
    filters?.dataInizio,
    filters?.dataFine,
    filters?.città,
    filters?.search,
  ]);

  // 🚀 Sistema di fetch con retry automatico specializzato per clienti
  const fetchClientsWithRetry = useFetchWithRetry(
    async () => {
      console.log('🔍 [useClientsList] Fetching clients with filters:', stableFilters);

      // Costruisci query params
      const queryParams = new URLSearchParams();
      
      // ⭐ FILTRO CHIAVE: Sempre solo clienti
      queryParams.append('stato', 'Cliente');
      
      // Aggiungi altri filtri
      if (stableFilters.provenienza && stableFilters.provenienza.length > 0) {
        stableFilters.provenienza.forEach(prov => queryParams.append('provenienza', prov));
      }
      if (stableFilters.dataInizio) queryParams.set('dataInizio', stableFilters.dataInizio);
      if (stableFilters.dataFine) queryParams.set('dataFine', stableFilters.dataFine);
      if (stableFilters.città) queryParams.set('citta', stableFilters.città);
      if (stableFilters.search) queryParams.set('search', stableFilters.search);
      
      // Sempre carica tutto per la lista
      queryParams.set('loadAll', 'true');
      queryParams.set('sortField', 'Data');
      queryParams.set('sortDirection', 'desc');

      // 🎯 Cache decision
      console.log('🔍 [useClientsList] Cache decision - enableSmartCache:', enableSmartCache);
      if (!enableSmartCache) {
        // ⚡ Cache busting per dati sempre freschi
        const cacheBuster = Date.now();
        queryParams.set('_t', cacheBuster.toString());
        queryParams.set('skipCache', 'true');
        queryParams.set('_forceRefresh', cacheBuster.toString());
        console.log('🚀 [useClientsList] Cache busting enabled - forcing fresh data');
      }

      const fetchUrl = `/api/leads?${queryParams.toString()}`;
      
      // 💥 EXTREME cache busting per non-smart cache
      const finalUrl = enableSmartCache 
        ? fetchUrl 
        : `${fetchUrl}&__cb=${Date.now()}&__r=${Math.random()}&__bust=${Date.now()}-${Math.random()}-${performance.now()}`;
      
      console.log('📡 [useClientsList] Final URL:', finalUrl);
      
      const response = await fetch(finalUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, private',
          'Pragma': 'no-cache', 
          'Expires': '0',
          'X-Debug-Source': 'useClientsList-cache-bust',
          'X-Request-Time': Date.now().toString(),
          'X-Random-Buster': Math.random().toString(),
        },
        cache: 'no-store',
        mode: 'cors',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Clienti non trovati');
        }
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.records) {
        throw new Error('Formato risposta non valido');
      }

      // ⚡ VERIFICA AGGIUNTIVA: Filtra lato client per sicurezza
      const clientsOnly = data.records.filter((record: ClientData) => record.Stato === 'Cliente');
      
      console.log(`✅ [useClientsList] Loaded ${clientsOnly.length} clients successfully (filtered from ${data.records.length} total)`);
      
      return {
        records: clientsOnly,
        totalCount: clientsOnly.length,
        fromCache: data.fromCache || false
      };
    },
    {
      maxRetries: 2,
      baseDelay: 1000,
      timeout: 20000,
      onRetry: (attempt, error) => {
        toast.warning(`Tentativo ${attempt} di ricaricamento clienti...`);
        console.warn(`⚠️ [useClientsList] Retry ${attempt}:`, error.message);
      }
    }
  );

  // Sincronizza stato dei clienti con il fetch result
  useEffect(() => {
    if (fetchClientsWithRetry.data) {
      setClients(fetchClientsWithRetry.data.records);
      setTotalCount(fetchClientsWithRetry.data.totalCount);
      
      if (fetchClientsWithRetry.data.fromCache) {
        console.log('⚡ [useClientsList] Data served from cache');
      } else {
        console.log('🔄 [useClientsList] Fresh data from server');
      }
    } else if (fetchClientsWithRetry.error) {
      setClients([]);
      setTotalCount(0);
    }
  }, [fetchClientsWithRetry.data, fetchClientsWithRetry.error]);

  const isDisabled = !enabled;

  // Listener per invalidazioni cache esterne
  useEffect(() => {
    if (!isDisabled && enabled) {
      const unsubscribe = subscribe((leadId, freshData) => {
        // Solo se il lead aggiornato è un cliente
        if (freshData && freshData.Stato === 'Cliente' && leadId) {
          setClients(prevClients => 
            prevClients.map(client => 
              client.id === leadId ? { ...client, ...freshData } : client
            )
          );
        } else if (freshData && freshData.Stato !== 'Cliente' && leadId) {
          // Se il lead non è più un cliente, rimuovilo dalla lista
          setClients(prevClients => prevClients.filter(client => client.id !== leadId));
          setTotalCount(prev => Math.max(0, prev - 1));
        } else {
          // Fallback: refresh completo
          fetchClientsWithRetry.execute();
        }
      });
      
      return unsubscribe;
    }
  }, [isDisabled, enabled, subscribe, fetchClientsWithRetry]);

  // Auto-refresh quando l'utente torna sulla pagina
  useEffect(() => {
    if (isDisabled || !enabled) return;
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(() => {
          fetchClientsWithRetry.execute();
        }, 1000);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isDisabled, enabled, fetchClientsWithRetry]);

  // Auto-fetch quando cambiano filtri o refreshKey
  useEffect(() => {
    if (!isDisabled) {
      console.log('🔄 [useClientsList] Auto-fetch triggered');
      fetchClientsWithRetry.execute();
    } else {
      console.log('🚫 [useClientsList] Hook disabled - no fetch');
    }
  }, [
    stableFilters.provenienza && stableFilters.provenienza.join(','),
    stableFilters.dataInizio,
    stableFilters.dataFine,
    stableFilters.città,
    stableFilters.search,
    refreshKey,
    enableSmartCache,
    enabled
  ]);

  // 🔄 Refresh con cache clearing
  const refresh = useCallback(async () => {
    try {
      // Cancella cache server-side
      await fetch('/api/leads?clearCache=true&_ultraRefresh=true', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        cache: 'no-store'
      }).catch(() => {}); // Ignore cache clear errors
      
      // Reset e execute fresh fetch
      if (fetchClientsWithRetry.reset) {
        fetchClientsWithRetry.reset();
      }
      
      await fetchClientsWithRetry.retry();
      toast.success('Dati clienti aggiornati');
      
    } catch (error) {
      console.error('Refresh clients failed:', error);
      toast.error('Errore durante aggiornamento clienti');
    }
  }, [fetchClientsWithRetry]);

  // 🚀 CRUD Operations specializzate per clienti

  const updateClient = useCallback(async (clientId: string, updateData: any): Promise<boolean> => {
    try {
      console.log('🔄 [useClientsList] Updating client:', clientId);

      // ⚡ IMPORTANTE: Assicurati che lo stato rimanga 'Cliente'
      const safeUpdateData = {
        ...updateData,
        Stato: 'Cliente' // Forza sempre stato Cliente
      };

      const response = await fetch(`/api/leads/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(safeUpdateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.lead) {
        throw new Error('Aggiornamento cliente fallito');
      }

      console.log('✅ [useClientsList] Client updated successfully:', data.lead.ID);
      
      // Aggiorna stato locale
      setClients(prevClients => 
        prevClients.map(client => 
          client.id === clientId ? { ...client, ...data.lead } : client
        )
      );
      
      toast.success('Cliente aggiornato con successo');
      return true;

    } catch (err) {
      console.error('❌ [useClientsList] Error updating client:', err);
      toast.error(err instanceof Error ? err.message : 'Errore durante aggiornamento cliente');
      return false;
    }
  }, []);

  const deleteClient = useCallback(async (clientId: string): Promise<boolean> => {
    try {
      console.log('🗑️ [useClientsList] Deleting client:', clientId);

      const response = await fetch(`/api/leads/${clientId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Eliminazione cliente fallita');
      }

      console.log('✅ [useClientsList] Client deleted successfully:', clientId);
      
      // Rimuovi dallo stato locale
      setClients(prevClients => prevClients.filter(client => client.id !== clientId));
      setTotalCount(prevCount => Math.max(0, prevCount - 1));
      
      toast.success('Cliente eliminato con successo');
      return true;

    } catch (err) {
      console.error('❌ [useClientsList] Error deleting client:', err);
      toast.error(err instanceof Error ? err.message : 'Errore durante eliminazione cliente');
      return false;
    }
  }, []);

  const deleteMultipleClients = useCallback(async (clientIds: string[]): Promise<number> => {
    try {
      console.log('🗑️ [useClientsList] Deleting multiple clients:', clientIds.length);

      const response = await fetch('/api/leads', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadIds: clientIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      console.log(`✅ [useClientsList] Deleted ${data.deleted}/${data.requested} clients`);
      
      // Rimuovi i clienti eliminati dallo stato locale
      if (data.deletedIds && data.deletedIds.length > 0) {
        setClients(prevClients => prevClients.filter(client => !data.deletedIds.includes(client.id)));
        setTotalCount(prevCount => Math.max(0, prevCount - data.deletedIds.length));
      }
      
      toast.success(`${data.deleted} clienti eliminati con successo`);
      
      if (data.errors && data.errors.length > 0) {
        toast.warning(`Alcuni errori: ${data.errors.length} operazioni fallite`);
      }
      
      return data.deleted;

    } catch (err) {
      console.error('❌ [useClientsList] Error deleting multiple clients:', err);
      toast.error(err instanceof Error ? err.message : 'Errore durante eliminazione multipla clienti');
      return 0;
    }
  }, []);

  return {
    clients,
    loading: fetchClientsWithRetry.loading,
    error: fetchClientsWithRetry.error,
    totalCount,
    refresh,
    updateClient,
    deleteClient,
    deleteMultipleClients,
  };
}