import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LeadData,
  LeadsStats,
  LeadsFilters,
  LeadListResponse,
  LeadStato,
  LeadProvenienza,
} from '@/types/leads';
import { usePeriodicSync } from '@/lib/periodic-sync';
// Rimosso import diretto di getAirtableKey per evitare problemi client-side

// Helper function per costruire i parametri di query per l'API
function buildQueryParams(
  filters: LeadsFilters,
  loadAll: boolean = true,
  pageSize?: number,
  offset?: string,
  sortField?: keyof LeadData,
  sortDirection?: 'asc' | 'desc'
): URLSearchParams {
  const params = new URLSearchParams();

  // Filtri di base - supporta valori multipli
  if (filters.stato && filters.stato.length > 0) {
    // Aggiungi ogni stato come parametro separato
    filters.stato.forEach(stato => {
      params.append('stato', stato);
    });
  }

  if (filters.provenienza && filters.provenienza.length > 0) {
    // Aggiungi ogni provenienza come parametro separato
    filters.provenienza.forEach(provenienza => {
      params.append('provenienza', provenienza);
    });
  }

  if (filters.dataInizio) {
    params.set('dataInizio', filters.dataInizio);
  }

  if (filters.dataFine) {
    params.set('dataFine', filters.dataFine);
  }

  if (filters.città) {
    params.set('citta', filters.città);
  }

  if (filters.search) {
    params.set('search', filters.search);
  }

  if (loadAll) {
    // Load ALL records from Airtable
    params.set('loadAll', 'true');
  } else {
    // Parametri di paginazione tradizionale
    if (pageSize) {
      params.set('maxRecords', pageSize.toString());
    }

    if (offset) {
      params.set('offset', offset);
    }
  }

  if (sortField) {
    params.set('sortField', sortField);
  }

  if (sortDirection) {
    params.set('sortDirection', sortDirection);
  }

  return params;
}

interface UseLeadsDataProps {
  filters?: LeadsFilters;
  pageSize?: number;
  sortField?: keyof LeadData;
  sortDirection?: 'asc' | 'desc';
  loadAll?: boolean; // New prop to control whether to load all data
}

// 🔒 Filtri vuoti stabilizzati per evitare dependency loops
const EMPTY_FILTERS_DATA: LeadsFilters = Object.freeze({});

export function useLeadsData({
  filters = EMPTY_FILTERS_DATA,
  pageSize = 25,
  sortField = 'Data',
  sortDirection = 'desc',
  loadAll = true, // Default to loading ALL leads
}: UseLeadsDataProps = {}) {
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState<string | undefined>();
  
  // 🔧 Stabilizza filters per evitare re-render loops
  const stableFilters = useMemo(() => {
    if (!filters || Object.keys(filters).length === 0) {
      return EMPTY_FILTERS_DATA;
    }
    return filters;
  }, [
    filters?.stato && filters.stato.join(','),
    filters?.provenienza && filters.provenienza.join(','), 
    filters?.dataInizio,
    filters?.dataFine,
    filters?.città,
    filters?.search,
  ]);

  // buildQueryParams è ora definita globalmente sopra

  // Funzione per recuperare i leads tramite API
  const fetchLeads = useCallback(async (resetData = false) => {
    try {
      setLoading(true);
      setError(null);

      // Costruisci parametri di query con filtri stabili
      const queryParams = buildQueryParams(
        stableFilters,
        loadAll,
        loadAll ? undefined : pageSize, // Se loadAll è true, non limitare la dimensione
        resetData || loadAll ? undefined : offset, // Se loadAll è true, non usare offset
        sortField,
        sortDirection
      );

      // Chiama l'endpoint API
      const response = await fetch(`/api/leads?${queryParams.toString()}`);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // I dati sono già nel formato giusto dall'API
      const mappedLeads = data.records || [];

      // Debug logs
      console.log('🔍 [Frontend] Received data from API:', {
        recordsCount: mappedLeads.length,
        hasOffset: !!data.offset,
        loadAll: loadAll,
        resetData: resetData,
        fromCache: data.fromCache || false, // Indica se i dati vengono dalla cache
      });
      
      if (data.fromCache) {
        console.log('⚡ [FAST LOAD] Data served from server cache!');
      }

      if (loadAll || resetData) {
        // Se loadAll è true, sostituisci sempre tutti i dati
        setLeads(mappedLeads);
        setTotalCount(mappedLeads.length);
        setHasMore(false); // Non c'è paginazione quando si caricano tutti i dati
        setOffset(undefined);

        console.log('✅ [Frontend] Set all leads:', mappedLeads.length);
      } else {
        // Modalità paginazione tradizionale
        setLeads(prev => [...prev, ...mappedLeads]);
        setTotalCount(mappedLeads.length);
        setHasMore(!!data.offset);
        setOffset(data.offset);

        console.log('📄 [Frontend] Added paginated leads:', mappedLeads.length);
      }
    } catch (err) {
      console.error('Errore nel recupero leads:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  }, [stableFilters, loadAll, pageSize, sortField, sortDirection, offset]); // 🔧 Usa stableFilters invece di filters

  // Ricarica solo quando cambiano filtri che richiedono nuova query Airtable
  // I filtri client-side (search) non dovrebbero triggerare nuove chiamate API
  // 🔧 Solo se loadAll è true (disabilitato quando hook è inactive)
  useEffect(() => {
    if (loadAll) {
      console.log('🔄 [useLeadsData] Auto-fetch triggered (loadAll=true)');
      fetchLeads(true);
    } else {
      console.log('🚫 [useLeadsData] Auto-fetch skipped (loadAll=false)');
    }
  }, [
    stableFilters.stato && stableFilters.stato.join(','),
    stableFilters.provenienza && stableFilters.provenienza.join(','), 
    stableFilters.dataInizio,
    stableFilters.dataFine,
    stableFilters.città,
    // ⚠️ NON includiamo stableFilters.search per evitare chiamate API su ogni keystroke
    fetchLeads, // Include fetchLeads per evitare stale closure
    loadAll, // Aggiunta dipendenza loadAll
  ]); // 🔧 Usiamo proprietà specifiche di stableFilters invece di oggetto intero

  // Funzione per caricare più dati (disponibile solo se loadAll=false)
  const loadMore = () => {
    if (!loading && hasMore && !loadAll) {
      fetchLeads(false);
    }
  };

  // Refresh manuale (stabilizzato con useCallback)
  const refresh = useCallback((forceRefresh = false) => {
    setOffset(undefined);
    
    if (forceRefresh) {
      // Force refresh: bypassa la cache facendo una chiamata diretta con parametro cache-busting
      const forceRefreshFetch = async () => {
        try {
          setLoading(true);
          setError(null);

          // Costruisci parametri con force refresh usando filtri stabili
          const queryParams = buildQueryParams(
            stableFilters,
            loadAll,
            loadAll ? undefined : pageSize,
            undefined, // no offset per force refresh
            sortField,
            sortDirection
          );
          
          // Aggiungi parametro per bypassare cache
          queryParams.set('_forceRefresh', Date.now().toString());

          const response = await fetch(`/api/leads?${queryParams.toString()}`);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }

          const data = await response.json();
          const mappedLeads = data.records || [];
          
          console.log('🔄 [FORCE REFRESH] Received fresh data:', mappedLeads.length, 'leads');
          
          setLeads(mappedLeads);
          setTotalCount(mappedLeads.length);
          setHasMore(false);
          setOffset(undefined);
        } catch (err) {
          console.error('Errore nel force refresh:', err);
          setError(err instanceof Error ? err.message : 'Errore sconosciuto');
        } finally {
          setLoading(false);
        }
      };
      
      forceRefreshFetch();
    } else {
      fetchLeads(true);
    }
  }, [fetchLeads, stableFilters, loadAll, pageSize, sortField, sortDirection]); // 🔧 Usa stableFilters

  // 🎆 Enterprise Periodic Sync Registration
  const syncId = useMemo(() => {
    const filtersKey = Object.keys(stableFilters).length > 0 ? JSON.stringify(stableFilters) : '{}';
    return `leads-${filtersKey}`;
  }, [stableFilters]); // 🔧 Usa stableFilters per evitare cambio continuo dell'ID
  
  // 🔧 Reference stabile per periodic sync
  const stableRefresh = useCallback(async () => {
    setOffset(undefined);
    await fetchLeads(true); // Usa fetchLeads direttamente per evitare dependency loop
  }, [fetchLeads]); // Solo fetchLeads come dipendenza
  
  // 🚫 Periodic sync disabilitato quando i filtri sono vuoti
  // (questo succede quando il nuovo sistema è attivo)
  const hasFilters = Object.keys(stableFilters).length > 0 && 
    Object.values(stableFilters).some(value => 
      Array.isArray(value) ? value.length > 0 : Boolean(value)
    );
  
  // Debug logging for periodic sync status
  if (!hasFilters || !loadAll) {
    console.log(`🚫 [useLeadsData] Periodic sync DISABLED - hasFilters: ${hasFilters}, loadAll: ${loadAll}`);
  }
  
  usePeriodicSync(
    syncId,
    'Leads Data',
    stableRefresh,
    {
      interval: 45000, // 45 seconds
      enabled: hasFilters && loadAll, // 🚫 Disabilita se no filtri o loadAll false
    }
  );

  return {
    leads,
    loading,
    error,
    totalCount,
    hasMore,
    loadMore,
    refresh,
  };
}

// Hook per le statistiche dei leads
export function useLeadsStats(filters: LeadsFilters = {}) {
  const [stats, setStats] = useState<LeadsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 🔧 Stabilizza filters per evitare re-render loops nelle stats
  const stableFilters = useMemo(() => {
    if (!filters || Object.keys(filters).length === 0) {
      return EMPTY_FILTERS_DATA;
    }
    return filters;
  }, [
    filters?.stato && filters.stato.join(','),
    filters?.provenienza && filters.provenienza.join(','),
    filters?.dataInizio,
    filters?.dataFine,
    filters?.città,
    filters?.search,
  ]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Recupera tutti i leads per calcolare le statistiche usando l'API
      const queryParams = buildQueryParams(stableFilters, true); // loadAll = true per le stats
      const response = await fetch(`/api/leads?${queryParams.toString()}`);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const leads = data.records || [];

      // Calcola statistiche
      const ora = new Date();
      const setteGiorniFa = new Date(ora.getTime() - 7 * 24 * 60 * 60 * 1000);
      const quarantottoOreFa = new Date(ora.getTime() - 48 * 60 * 60 * 1000);

      const nuoviUltimi7Giorni = leads.filter(
        lead => new Date(lead.Data) >= setteGiorniFa
      ).length;

      // Per "contattati entro 48h" usiamo la logica: hanno attività o conversazioni
      const contattatiEntro48h = leads.filter(lead => {
        const dataCreazione = new Date(lead.Data);
        return (
          dataCreazione >= quarantottoOreFa &&
          (lead.Attività?.length > 0 || lead.Conversations)
        );
      }).length;

      const nuoviLeads = leads.filter(lead => lead.Stato === 'Nuovo');
      const qualificati = leads.filter(lead => lead.Stato === 'Qualificato');
      const clienti = leads.filter(lead => lead.Stato === 'Cliente');

      const tassoQualificazione =
        nuoviLeads.length > 0
          ? (qualificati.length / nuoviLeads.length) * 100
          : 0;

      const tassoConversione =
        nuoviLeads.length > 0 ? (clienti.length / nuoviLeads.length) * 100 : 0;

      // Raggruppa per stato
      const byStato = leads.reduce(
        (acc, lead) => {
          acc[lead.Stato] = (acc[lead.Stato] || 0) + 1;
          return acc;
        },
        {} as Record<LeadStato, number>
      );

      // Raggruppa per provenienza
      const byProvenienza = leads.reduce(
        (acc, lead) => {
          acc[lead.Provenienza] = (acc[lead.Provenienza] || 0) + 1;
          return acc;
        },
        {} as Record<LeadProvenienza, number>
      );

      setStats({
        totale: leads.length,
        nuoviUltimi7Giorni,
        contattatiEntro48h,
        tassoQualificazione: Math.round(tassoQualificazione),
        tassoConversione: Math.round(tassoConversione),
        byStato,
        byProvenienza,
        tendenza: {
          periodo: 'Ultimi 7 giorni',
          nuoviLeads: nuoviUltimi7Giorni,
          conversioni: clienti.length,
          variazione: 0, // TODO: calcolare variazione rispetto al periodo precedente
        },
      });
    } catch (err) {
      console.error('Errore nel calcolo statistiche:', err);
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [stableFilters]); // 🔧 Usa stableFilters al posto di filters

  return { stats, loading, error, refresh: fetchStats };
}
