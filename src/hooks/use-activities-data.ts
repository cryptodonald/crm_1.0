import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ActivityData,
  ActivityStato,
  ActivityTipo,
} from '@/types/activities';
import { useFetchWithRetry } from './use-fetch-with-retry';
import { usePeriodicSync } from '@/lib/periodic-sync';
import { uiUpdates, UpdateStrategy, chooseUpdateStrategy } from '@/lib/ui-updates-professional';

// Helper function per costruire i parametri di query per l'API
function buildQueryParams(
  leadId?: string,
  filters?: {
    stato?: ActivityStato[];
    tipo?: ActivityTipo[];
    search?: string;
    dataInizio?: string;
    dataFine?: string;
    assegnatario?: string;
  },
  loadAll: boolean = true,
  pageSize?: number,
  offset?: string,
  sortField?: keyof ActivityData,
  sortDirection?: 'asc' | 'desc'
): URLSearchParams {
  const params = new URLSearchParams();

  // Filtro per lead specifico
  if (leadId) {
    params.set('leadId', leadId);
  }

  // Filtri di base
  if (filters?.stato && filters.stato.length > 0) {
    filters.stato.forEach(stato => {
      params.append('stato', stato);
    });
  }

  if (filters?.tipo && filters.tipo.length > 0) {
    filters.tipo.forEach(tipo => {
      params.append('tipo', tipo);
    });
  }

  if (filters?.search) {
    params.set('search', filters.search);
  }

  if (filters?.dataInizio) {
    params.set('dataInizio', filters.dataInizio);
  }

  if (filters?.dataFine) {
    params.set('dataFine', filters.dataFine);
  }

  if (filters?.assegnatario) {
    params.set('assegnatario', filters.assegnatario);
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
    params.set('sortField', sortField.toString());
  }

  if (sortDirection) {
    params.set('sortDirection', sortDirection);
  }

  return params;
}

interface ActivityFilters {
  stato?: ActivityStato[];
  tipo?: ActivityTipo[];
  search?: string;
  dataInizio?: string;
  dataFine?: string;
  assegnatario?: string;
}

interface UseActivitiesDataProps {
  leadId?: string; // Per filtrare le attività di uno specifico lead
  filters?: ActivityFilters;
  pageSize?: number;
  sortField?: keyof ActivityData;
  sortDirection?: 'asc' | 'desc';
  loadAll?: boolean;
}

// 🔒 Filtri vuoti stabilizzati per evitare dependency loops
const EMPTY_FILTERS_ACTIVITIES: ActivityFilters = Object.freeze({});

export function useActivitiesData({
  leadId,
  filters = EMPTY_FILTERS_ACTIVITIES,
  pageSize = 100,
  sortField = 'Data',
  sortDirection = 'desc',
  loadAll = true,
}: UseActivitiesDataProps = {}) {
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState<string | undefined>();
  const [forceRefresh, setForceRefresh] = useState(false);
  
  // 🔧 Stabilizza filters per evitare re-render loops
  const stableFilters = useMemo(() => {
    if (!filters || Object.keys(filters).length === 0) {
      return EMPTY_FILTERS_ACTIVITIES;
    }
    return filters;
  }, [
    filters?.stato && filters.stato.join(','),
    filters?.tipo && filters.tipo.join(','),
    filters?.search,
    filters?.dataInizio,
    filters?.dataFine,
    filters?.assegnatario,
  ]);
  
  // 🔧 Connection quality detection per strategia automatica
  const [connectionQuality, setConnectionQuality] = useState<'fast' | 'slow' | 'unstable'>('fast');
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const connection = (navigator as any).connection;
      if (connection) {
        setConnectionQuality(
          connection.effectiveType === '4g' ? 'fast' : 
          connection.effectiveType === '3g' ? 'slow' : 'unstable'
        );
      }
    }
  }, []);
  
  // 🚀 Memoizza fetchOptions fuori dalla callback
  const fetchOptions = useMemo(() => ({
    method: 'GET',
    ...(forceRefresh ? {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
        'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT',
      },
      cache: 'no-store' as RequestCache
    } : {})
  }), [forceRefresh]);

  // Hook per fetch con retry
  const { data, loading: fetchLoading, error: fetchError, retry } = useFetchWithRetry(
    async () => {
      // Costruisci parametri di query
      const queryParams = buildQueryParams(
        leadId,
        stableFilters,
        loadAll,
        loadAll ? undefined : pageSize,
        loadAll ? undefined : offset,
        sortField,
        sortDirection
      );
      
      // 🚀 Add cache busting parameters when forceRefresh is true
      if (forceRefresh) {
        queryParams.set('_t', Date.now().toString());
        queryParams.set('skipCache', 'true');
        console.log('🚀 [Activities Hook] Cache busting enabled');
      }

      const apiUrl = `/api/activities?${queryParams.toString()}`;
      console.log('🔍 [Activities Hook] Fetching from:', apiUrl);

      // Chiama l'endpoint API
      const response = await fetch(apiUrl, fetchOptions);
      console.log('🔍 [Activities Hook] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: 'Unknown error' }));
        console.error('❌ [Activities Hook] API Error:', errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('🔍 [Activities Hook] API Response:', {
        success: data.success,
        count: data.count,
        dataLength: data.data?.length || 0,
        sampleRecord: data.data?.[0],
        forceRefresh: forceRefresh,
        fromCache: data._timing?.cached || false
      });
      
      // Non resettiamo forceRefresh qui - lo facciamo dopo aver processato i dati
      // in modo che l'effetto sappia se i dati provengono da una chiamata forzata
      
      return data;
    },
    {
      maxRetries: 2,
      baseDelay: 1000,
      timeout: 15000,
    }
  );

  // Effetto per processare i dati quando arrivano dall'API
  useEffect(() => {
    console.log('🔍 [Activities Hook] Processing effect triggered:', { data: !!data, fetchLoading, fetchError });
    
    setLoading(fetchLoading);
    setError(fetchError);

    if (data && data.success) {
      const mappedActivities = data.data || [];
      
      console.log('🔍 [Activities] Received data from API:', {
        recordsCount: mappedActivities.length,
        hasOffset: !!data.offset,
        loadAll: loadAll,
        fromCache: data._timing?.cached || false,
        sampleActivity: mappedActivities[0],
      });

      if (data._timing?.cached) {
        console.log('⚡ [FAST LOAD] Activities served from server cache!');
      }

      if (loadAll) {
        // Se loadAll è true, sostituisci sempre tutti i dati
        setActivities(mappedActivities);
        setTotalCount(mappedActivities.length);
        setHasMore(false);
        setOffset(undefined);
        console.log('✅ [Activities] Set all activities:', mappedActivities.length);
      } else {
        // Modalità paginazione tradizionale
        setActivities(prev => [...prev, ...mappedActivities]);
        setTotalCount(mappedActivities.length);
        setHasMore(!!data.offset);
        setOffset(data.offset);
        console.log('📄 [Activities] Added paginated activities:', mappedActivities.length);
      }
    } else if (data && !data.success) {
      console.error('❌ [Activities Hook] API returned error:', data);
      setError(data.error || 'API returned unsuccessful response');
    } else if (!data && !fetchLoading && !fetchError) {
      console.log('🔍 [Activities Hook] No data yet, still waiting...');
    }
    
    // Ora che abbiamo processato i dati, possiamo resettare forceRefresh
    if (forceRefresh) {
      console.log('🧹 [Activities Hook] Resetting forceRefresh flag after processing');
      setForceRefresh(false);
    }
  }, [data, fetchLoading, fetchError, loadAll, forceRefresh]);

  // Funzione per caricare più dati (disponibile solo se loadAll=false)
  const loadMore = useCallback(() => {
    if (!loading && hasMore && !loadAll) {
      // Implementare logica per caricare più dati
      retry();
    }
  }, [loading, hasMore, loadAll, retry]);

  // Refresh manuale
  const refresh = useCallback((shouldForceRefresh = false) => {
    setOffset(undefined);
    console.log('🔄 [Activities] Manual refresh triggered', { forceRefresh: shouldForceRefresh });
    
    // 🚀 Set force refresh flag if requested
    if (shouldForceRefresh) {
      console.log('🚀 [Activities] Enabling cache busting for next fetch');
      setForceRefresh(true);
    }
    
    retry();
  }, [retry]);

  // Helper per filtrare le attività client-side
  const filterActivities = useCallback((
    activitiesData: ActivityData[],
    searchQuery?: string,
    statusFilter?: ActivityStato[]
  ): ActivityData[] => {
    let filtered = activitiesData;

    // Filtro per ricerca
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(activity =>
        activity.Titolo?.toLowerCase().includes(query) ||
        activity.Note?.toLowerCase().includes(query) ||
        activity['Nome Lead']?.[0]?.toLowerCase().includes(query) ||
        activity.Tipo?.toLowerCase().includes(query) ||
        activity.Obiettivo?.toLowerCase().includes(query)
      );
    }

    // Filtro per stato
    if (statusFilter && statusFilter.length > 0) {
      filtered = filtered.filter(activity => statusFilter.includes(activity.Stato));
    }

    return filtered;
  }, []);

  // Memoized filtered activities for performance
  const filteredActivities = useMemo(() => {
    return filterActivities(activities, stableFilters.search, stableFilters.stato);
  }, [activities, stableFilters.search, stableFilters.stato, filterActivities]);
  
  // 🔄 Helper per aggiornamento locale UI (Optimistic Updates)
  const updateLocalActivities = useCallback((updater: (activities: ActivityData[]) => ActivityData[]) => {
    setActivities(current => updater(current));
  }, []);

  // 🚀 Trigger initial fetch automatically (RIPRISTINATO)
  useEffect(() => {
    console.log('🚀 [Activities Hook] Triggering initial fetch...');
    retry(); // This will start the fetch
  }, [
    leadId,
    stableFilters.stato && stableFilters.stato.join(','),
    stableFilters.tipo && stableFilters.tipo.join(','),
    stableFilters.search,
    stableFilters.dataInizio,
    stableFilters.dataFine,
    stableFilters.assegnatario,
    loadAll,
    pageSize,
    sortField,
    sortDirection,
    retry, // Include retry per evitare stale closure
    // 🚀 RIMOSSO forceRefresh dalle dipendenze per evitare loop infiniti
    // Il forceRefresh viene gestito direttamente nella funzione refresh()
  ]); // 🔧 Usa stableFilters per evitare loop

  // 🎆 Enterprise Periodic Sync Registration (RIABILITATO MA MENO AGGRESSIVO)
  const syncId = useMemo(() => {
    const filtersKey = Object.keys(stableFilters).length > 0 ? JSON.stringify(stableFilters) : '{}';
    return `activities-${leadId || 'all'}-${filtersKey}`;
  }, [leadId, stableFilters]); // 🔧 Usa stableFilters per evitare loop
  
  const stableRefresh = useCallback(() => {
    // 🚀 OTTIMIZZAZIONE: Evita refresh se già in loading per evitare loop
    if (loading) {
      console.log('⚠️ [Activities] Skipping periodic refresh - already loading');
      return;
    }
    console.log('🚀 [Activities] Periodic refresh triggered');
    refresh(true);
  }, [refresh, loading]);
  
  const syncName = useMemo(() => 
    leadId ? `Activities (Lead ${leadId})` : 'All Activities'
  , [leadId]);
  
  usePeriodicSync(
    syncId,
    syncName,
    stableRefresh,
    {
      interval: 120000, // 🚀 2 minuti invece di 30s (meno aggressivo)
      enabled: true,     // 🚀 RIABILITATO ma meno frequente
    }
  );

  // 🚀 FUNZIONI OPTIMISTIC UPDATES PROFESSIONALI
  const updateActivityOptimistic = useCallback(async (
    activityId: string, 
    updates: Partial<ActivityData>, 
    strategy?: UpdateStrategy
  ): Promise<boolean> => {
    const chosenStrategy = strategy || chooseUpdateStrategy('update', 'activity', {
      isOnline: navigator.onLine,
      connectionQuality,
    });
    
    const originalActivity = activities.find(a => a.id === activityId);
    if (!originalActivity) {
      console.error('🚫 [Optimistic] Activity not found for update:', activityId);
      return false;
    }
    
    const updatedActivity = { ...originalActivity, ...updates };
    
    // 🚀 SEMPRE OPTIMISTIC per le attività - no refresh
    const result = await uiUpdates.optimistic(
      {
        type: 'update',
        entity: 'activity',
        data: updatedActivity,
        originalData: originalActivity,
      },
      (data) => {
        updateLocalActivities(acts => 
          acts.map(a => a.id === activityId ? data : a)
        );
      },
      async () => {
        const response = await fetch(`/api/activities/${activityId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        return response.json();
      },
      (originalData) => {
        updateLocalActivities(acts => 
          acts.map(a => a.id === activityId ? originalData : a)
        );
      }
    );
    return result.success;
  }, [activities, connectionQuality, updateLocalActivities]);
  
  const createActivityOptimistic = useCallback(async (
    newActivity: Partial<ActivityData>, 
    strategy?: UpdateStrategy
  ): Promise<boolean> => {
    const tempId = `temp-${Date.now()}`;
    const activityWithId = { 
      ...newActivity, 
      id: tempId,
      Data: new Date().toISOString().split('T')[0],
    } as ActivityData;
    
    // 🚀 SEMPRE OPTIMISTIC per creazione - no refresh
    const result = await uiUpdates.optimistic(
      {
        type: 'create',
        entity: 'activity',
        data: activityWithId,
      },
      (data) => {
        updateLocalActivities(acts => [data, ...acts]);
      },
      async () => {
        const response = await fetch('/api/activities', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newActivity),
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const created = await response.json();
        // Sostituisci l'elemento temporaneo con quello reale
        updateLocalActivities(acts => 
          acts.map(a => a.id === tempId ? created.data : a)
        );
        return created.data;
      },
      () => {
        updateLocalActivities(acts => acts.filter(a => a.id !== tempId));
      }
    );
    return result.success;
  }, [updateLocalActivities]);
  
  const deleteActivityOptimistic = useCallback(async (
    activityId: string, 
    strategy?: UpdateStrategy
  ): Promise<boolean> => {
    const originalActivity = activities.find(a => a.id === activityId);
    if (!originalActivity) {
      console.error('🚫 [Optimistic] Activity not found for delete:', activityId);
      return false;
    }
    
    // 🚀 SEMPRE OPTIMISTIC per delete - no refresh
    const result = await uiUpdates.optimistic(
      {
        type: 'delete',
        entity: 'activity',
        data: originalActivity,
        originalData: originalActivity,
      },
      () => {
        updateLocalActivities(acts => acts.filter(a => a.id !== activityId));
      },
      async () => {
        const response = await fetch(`/api/activities/${activityId}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error(`API Error: ${response.status}`);
      },
      (originalData) => {
        updateLocalActivities(acts => [...acts, originalData]);
      }
    );
    return result.success;
  }, [activities, updateLocalActivities]);
  
  const changeActivityStateOptimistic = useCallback(async (
    activityId: string, 
    newState: ActivityStato, 
    strategy?: UpdateStrategy
  ): Promise<boolean> => {
    return updateActivityOptimistic(activityId, { Stato: newState }, strategy || 'optimistic');
  }, [updateActivityOptimistic]);
  
  const emergencyRecovery = useCallback(async (): Promise<boolean> => {
    const result = await uiUpdates.emergency('activity', refresh);
    return result.success;
  }, [refresh]);

  return {
    activities: filteredActivities,
    allActivities: activities, // Unfiltered data
    loading,
    error,
    totalCount,
    hasMore,
    loadMore,
    refresh,
    filterActivities, // Export helper function
    retry,
    // 🚀 Funzioni Optimistic Updates Professionali
    updateActivityOptimistic,
    createActivityOptimistic,
    deleteActivityOptimistic,
    changeActivityStateOptimistic,
    emergencyRecovery,
  };
}

// Helper function per invalidare la cache delle attività
export const invalidateActivitiesCache = () => {
  // Questa funzione può essere chiamata dopo operazioni di update/delete
  // per forzare il refresh dei dati
  console.log('🗑️ [Activities] Cache invalidation requested');
  
  // In futuro potremmo implementare una cache locale più sofisticata
  // Per ora facciamo affidamento sul retry del hook
};

export type { ActivityFilters, UseActivitiesDataProps };
