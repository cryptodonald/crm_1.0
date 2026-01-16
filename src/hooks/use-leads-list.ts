import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { LeadData, LeadsFilters } from '@/types/leads';
import { useFetchWithRetry } from './use-fetch-with-retry';
import { useLeadsCacheListener } from './use-leads-cache';
import { toast } from 'sonner';

interface UseLeadsListProps {
  filters?: LeadsFilters;
  refreshKey?: number;
  enableSmartCache?: boolean; // Opzione per testare smart caching
  enabled?: boolean; // Flag esplicito per abilitare/disabilitare l'hook
}

interface UseLeadsListReturn {
  leads: LeadData[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  refresh: () => Promise<void>;
  createLead: (data: any) => Promise<boolean>;
  updateLead: (leadId: string, data: any) => Promise<boolean>;
  deleteLead: (leadId: string) => Promise<boolean>;
  deleteMultipleLeads: (leadIds: string[]) => Promise<number>;
}

export function useLeadsList({ 
  filters = {}, 
  refreshKey,
  enableSmartCache = false,
  enabled = true
}: UseLeadsListProps = {}): UseLeadsListReturn {
  
  const router = useRouter();
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  
  // 🔄 Sistema di cache listener per invalidazioni esterne
  const { subscribe } = useLeadsCacheListener();

  // 🔧 Stabilizza i filtri per evitare re-render loops (preso da useLeadsClean)
  const stableFilters = useMemo(() => {
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

  // 🚀 Sistema di fetch con retry automatico (pattern da useLeadDetail)
  const fetchLeadsWithRetry = useFetchWithRetry(
    async () => {
      console.log('🔍 [useLeadsList] Fetching leads with filters:', stableFilters);

      // Costruisci query params
      const queryParams = new URLSearchParams();
      
      // Aggiungi filtri
      if (stableFilters.stato && stableFilters.stato.length > 0) {
        stableFilters.stato.forEach(stato => queryParams.append('stato', stato));
      }
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

      // 🎯 Smart cache vs always fresh (controllabile via prop)
      console.log('🔍 [useLeadsList] Cache decision - enableSmartCache:', enableSmartCache);
      if (!enableSmartCache) {
        // ⚡ IMPORTANT: Genera il cacheBuster AD OGNI CHIAMATA, non una volta sola!
        const cacheBuster = Date.now();
        queryParams.set('_t', cacheBuster.toString());
        queryParams.set('skipCache', 'true');
        queryParams.set('_forceRefresh', cacheBuster.toString());
        console.log('🚀 [useLeadsList] Cache busting enabled - forcing fresh data', {
          cacheBuster,
          skipCache: queryParams.get('skipCache'),
          _forceRefresh: queryParams.get('_forceRefresh'),
          url: `/api/leads?${queryParams.toString()}`
        });
      } else {
        console.log('🧠 [useLeadsList] Smart cache enabled');
      }

      const fetchUrl = `/api/leads?${queryParams.toString()}`;
      
      // 💥 EXTREME cache busting: add timestamp to URL path for non-smart cache
      const finalUrl = enableSmartCache 
        ? fetchUrl 
        : `${fetchUrl}&__cb=${Date.now()}&__r=${Math.random()}&__bust=${Date.now()}-${Math.random()}-${performance.now()}`;
      
      console.log('📡 [useLeadsList] Final URL:', finalUrl);
      
      const response = await fetch(finalUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, private',
          'Pragma': 'no-cache', 
          'Expires': '0',
          'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT',
          'If-None-Match': '*', // Force no ETag matching
          'X-Debug-Source': 'useLeadsList-cache-bust',
          'X-Request-Time': Date.now().toString(),
          'X-Random-Buster': Math.random().toString(),
          'X-Cache-Buster': `${Date.now()}-${Math.random()}`, // Doppio cache buster
        },
        cache: 'no-store',
        // 💥 FORCE reload completo
        mode: 'cors',
        credentials: 'same-origin',
        redirect: 'follow'
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Leads non trovati');
        }
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.records) {
        throw new Error('Formato risposta non valido');
      }

      console.log(`✅ [useLeadsList] Loaded ${data.records.length} leads successfully`);
      return {
        records: data.records,
        totalCount: data.records.length,
        fromCache: data.fromCache || false
      };
    },
    {
      maxRetries: 2,
      baseDelay: 1000,
      timeout: 20000, // Timeout più lungo per bulk data
      onRetry: (attempt, error) => {
        toast.warning(`Tentativo ${attempt} di ricaricamento leads...`);
        console.warn(`⚠️ [useLeadsList] Retry ${attempt}:`, error.message);
      }
    }
  );

  // Sincronizza stato dei leads con il fetch result
  useEffect(() => {
    if (fetchLeadsWithRetry.data) {
      setLeads(fetchLeadsWithRetry.data.records);
      setTotalCount(fetchLeadsWithRetry.data.totalCount);
      
      if (fetchLeadsWithRetry.data.fromCache) {
        console.log('⚡ [useLeadsList] Data served from cache');
      } else {
        console.log('🔄 [useLeadsList] Fresh data from server');
      }
    } else if (fetchLeadsWithRetry.error) {
      setLeads([]);
      setTotalCount(0);
    }
  }, [fetchLeadsWithRetry.data, fetchLeadsWithRetry.error]);

  // 🔧 Usa il flag enabled esplicito per determinare se l'hook è attivo
  const isDisabled = !enabled;

  // Listener per invalidazioni cache esterne (da useLeadDetail)
  useEffect(() => {
    if (!isDisabled && enabled) {
      const unsubscribe = subscribe((leadId, freshData) => {
        if (freshData && leadId) {
          // Usa i dati freschi direttamente da useLeadDetail
          setLeads(prevLeads => 
            prevLeads.map(lead => 
              lead.id === leadId ? { ...lead, ...freshData } : lead
            )
          );
        } else {
          // Fallback: refresh completo se non abbiamo dati freschi
          fetchLeadsWithRetry.execute();
        }
      });
      
      return unsubscribe;
    }
  }, [isDisabled, enabled, subscribe, fetchLeadsWithRetry]);

  // Auto-refresh quando l'utente torna sulla pagina (per catturare modifiche esterne)
  useEffect(() => {
    if (isDisabled || !enabled) return;
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(() => {
          fetchLeadsWithRetry.execute();
        }, 1000);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isDisabled, enabled, fetchLeadsWithRetry]);

  // Auto-fetch quando cambiano filtri o refreshKey (solo se non disabilitato)
  useEffect(() => {
    if (!isDisabled) {
      console.log('🔄 [useLeadsList] Auto-fetch triggered');
      fetchLeadsWithRetry.execute();
    } else {
      console.log('🚫 [useLeadsList] Hook disabled - no fetch');
    }
  }, [
    stableFilters.stato && stableFilters.stato.join(','),
    stableFilters.provenienza && stableFilters.provenienza.join(','),
    stableFilters.dataInizio,
    stableFilters.dataFine,
    stableFilters.città,
    stableFilters.search,
    refreshKey,
    enableSmartCache,
    enabled // Usa enabled invece di isDisabled
  ]);

  // 🚫 IMPORTANTE: NON usiamo periodic sync nel nuovo sistema
  // Il periodic sync usa il vecchio hook useLeadsData che ha il problema cache
  // Nel nuovo sistema facciamo refresh manuale quando necessario

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
      if (fetchLeadsWithRetry.reset) {
        fetchLeadsWithRetry.reset();
      }
      
      await fetchLeadsWithRetry.retry();
      toast.success('Dati aggiornati');
      
    } catch (error) {
      console.error('Refresh failed:', error);
      toast.error('Errore durante aggiornamento');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    }
  }, [fetchLeadsWithRetry]);

  // 🚀 CRUD Operations (pattern semplificato, no optimistic)

  const createLead = useCallback(async (leadData: any): Promise<boolean> => {
    try {
      // 🚀 Se è un lead ottimistico (has temp ID), significa che è già stato aggiunto alla lista
      // Attendi che l'API completi e rimpiazza il temporaneo con il reale
      const isOptimisticLead = leadData.id && leadData.id.startsWith('temp_');
      const tempLeadId = leadData.id;
      
      if (isOptimisticLead) {
        console.log('⚡ [useLeadsList] Handling optimistic lead:', tempLeadId);
        console.log('📝 [useLeadsList] Sending to API to get real record...');
        
        // Estrai i dati necessari dal lead temporaneo (escludi il tempID)
        const { id, createdTime, ...dataToSend } = leadData;
        
        // Invia al server
        const response = await fetch('/api/leads', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dataToSend),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success || !data.lead) {
          throw new Error('Creazione fallita');
        }

        console.log('✅ [useLeadsList] Real lead created on server:', data.lead.id);
        console.log('🔄 [useLeadsList] Replacing temp lead:', tempLeadId, 'with real:', data.lead.id);
        
        // 🚀 RIMPIAZZA il lead temporaneo con quello reale
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === tempLeadId ? data.lead : lead
          )
        );
        
        console.log('✅ [useLeadsList] Temporary lead replaced with real data');
        return true;
      }
      
      console.log('➡️ [useLeadsList] Creating lead:', leadData.Nome);

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.lead) {
        throw new Error('Creazione fallita');
      }

      console.log('✅ [useLeadsList] Lead created successfully:', data.lead.ID);
      console.log('🔍 [useLeadsList] New lead data received from API:', data.lead);
      
      // Aggiungi alla lista se non è un optimistic update
      setLeads(prevLeads => [data.lead, ...prevLeads]);
      setTotalCount(prevCount => prevCount + 1);
      
      console.log('✅ [useLeadsList] New lead added to local state');
      toast.success('Lead creato con successo');
      return true;

    } catch (err) {
      console.error('❌ [useLeadsList] Error creating lead:', err);
      // Se è un lead ottimistico e l'API fallisce, rimuovilo dalla lista
      if (leadData.id && leadData.id.startsWith('temp_')) {
        console.log('🗑️ [useLeadsList] Removing failed temporary lead:', leadData.id);
        setLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadData.id));
        setTotalCount(prevCount => Math.max(0, prevCount - 1));
      }
      toast.error(err instanceof Error ? err.message : 'Errore durante creazione');
      return false;
    }
  }, []); // Rimuove dipendenza da refresh

  const updateLead = useCallback(async (leadId: string, updateData: any): Promise<boolean> => {
    try {
      console.log('🔄 [useLeadsList] Updating lead:', leadId);

      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.lead) {
        throw new Error('Aggiornamento fallito');
      }

      console.log('✅ [useLeadsList] Lead updated successfully:', data.lead.ID);
      console.log('🔍 [useLeadsList] Updated lead data received from API:', data.lead);
      
      // 💡 SOLUZIONE: Aggiorna direttamente lo stato locale invece di fare refresh
      // Questo è quello che fa useLeadDetail e funziona!
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId ? { ...lead, ...data.lead } : lead
        )
      );
      
      console.log('✅ [useLeadsList] Local state updated directly with fresh data');
      
      toast.success('Lead aggiornato con successo');
      return true;

    } catch (err) {
      console.error('❌ [useLeadsList] Error updating lead:', err);
      // In caso di errore, ripristina lo stato precedente
      setLeads(prevLeads => 
        prevLeads.map(lead => 
          lead.id === leadId ? lead : lead // Mantieni stato originale
        )
      );
      toast.error(err instanceof Error ? err.message : 'Errore durante aggiornamento');
      return false;
    }
  }, []); // Rimuove dipendenza da refresh

  const deleteLead = useCallback(async (leadId: string): Promise<boolean> => {
    try {
      console.log('🗑️ [useLeadsList] Deleting lead:', leadId);

      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Eliminazione fallita');
      }

      console.log('✅ [useLeadsList] Lead deleted successfully:', leadId);
      
      // 💡 SOLUZIONE: Rimuovi direttamente dallo stato locale
      setLeads(prevLeads => prevLeads.filter(lead => lead.id !== leadId));
      setTotalCount(prevCount => Math.max(0, prevCount - 1));
      
      console.log('✅ [useLeadsList] Lead removed from local state');
      toast.success('Lead eliminato con successo');
      return true;

    } catch (err) {
      console.error('❌ [useLeadsList] Error deleting lead:', err);
      toast.error(err instanceof Error ? err.message : 'Errore durante eliminazione');
      return false;
    }
  }, []); // Rimuove dipendenza da refresh

  const deleteMultipleLeads = useCallback(async (leadIds: string[]): Promise<number> => {
    try {
      console.log('🗑️ [useLeadsList] Deleting multiple leads:', leadIds.length);

      const response = await fetch('/api/leads', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      console.log(`✅ [useLeadsList] Deleted ${data.deleted}/${data.requested} leads`);
      
      // 💡 SOLUZIONE: Rimuovi i lead eliminati dallo stato locale
      if (data.deletedIds && data.deletedIds.length > 0) {
        setLeads(prevLeads => prevLeads.filter(lead => !data.deletedIds.includes(lead.id)));
        setTotalCount(prevCount => Math.max(0, prevCount - data.deletedIds.length));
        console.log('✅ [useLeadsList] Multiple leads removed from local state');
      }
      
      toast.success(`${data.deleted} lead eliminati con successo`);
      
      if (data.errors && data.errors.length > 0) {
        toast.warning(`Alcuni errori: ${data.errors.length} operazioni fallite`);
      }
      
      return data.deleted;

    } catch (err) {
      console.error('❌ [useLeadsList] Error deleting multiple leads:', err);
      toast.error(err instanceof Error ? err.message : 'Errore durante eliminazione multipla');
      return 0;
    }
  }, []); // Rimuove dipendenza da refresh

  return {
    leads,
    loading: fetchLeadsWithRetry.loading,
    error: fetchLeadsWithRetry.error,
    totalCount,
    refresh,
    createLead,
    updateLead,
    deleteLead,
    deleteMultipleLeads,
  };
}