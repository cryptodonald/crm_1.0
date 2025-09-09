import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ActivityData,
  ActivityStato,
  ActivityTipo,
} from '@/types/activities';
import { useFetchWithRetry } from './use-fetch-with-retry';

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

export function useActivitiesData({
  leadId,
  filters = {},
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

  // Hook per fetch con retry
  const { data, loading: fetchLoading, error: fetchError, retry } = useFetchWithRetry(
    async () => {
      // Costruisci parametri di query
      const queryParams = buildQueryParams(
        leadId,
        filters,
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

      // 🚀 Add cache busting headers when forceRefresh is true
      const fetchOptions: RequestInit = {
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
      };

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
      
      // Reset forceRefresh flag after successful fetch
      if (forceRefresh) {
        setForceRefresh(false);
      }
      
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
  }, [data, fetchLoading, fetchError, loadAll]);

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
    return filterActivities(activities, filters.search, filters.stato);
  }, [activities, filters.search, filters.stato, filterActivities]);

  // 🚀 Trigger initial fetch automatically (like useLeadsData does)
  useEffect(() => {
    console.log('🚀 [Activities Hook] Triggering initial fetch...');
    retry(); // This will start the fetch
  }, [
    leadId,
    filters.stato,
    filters.tipo,
    filters.search,
    filters.dataInizio,
    filters.dataFine,
    filters.assegnatario,
    loadAll,
    pageSize,
    sortField,
    sortDirection,
    forceRefresh, // 🚀 Re-trigger fetch when force refresh is requested
  ]); // Trigger fetch when these dependencies change

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
