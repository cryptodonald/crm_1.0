'use client';

import { useState, useEffect, useCallback } from 'react';
import { ActivityData, ActivityFilters, ActivitiesApiResponse } from '@/types/activities';
import { ActivityStats } from '@/types/activity';

interface UseActivitiesDataOptions {
  filters?: ActivityFilters;
}

interface UseActivitiesDataReturn {
  activities: ActivityData[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => void;
}

export function useActivitiesData({ 
  filters = {} 
}: UseActivitiesDataOptions = {}): UseActivitiesDataReturn {
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Build query parameters from filters
  const buildQueryParams = useCallback((filters: ActivityFilters) => {
    const params = new URLSearchParams();

    if (filters.search) {
      params.set('search', filters.search);
    }
    if (filters.stato) {
      if (Array.isArray(filters.stato)) {
        // Aggiungi ogni stato come parametro separato
        filters.stato.forEach(stato => {
          params.append('stato', stato);
        });
      } else {
        params.set('stato', filters.stato);
      }
    }
    if (filters.tipo) {
      if (Array.isArray(filters.tipo)) {
        // Aggiungi ogni tipo come parametro separato
        filters.tipo.forEach(tipo => {
          params.append('tipo', tipo);
        });
      } else {
        params.set('tipo', filters.tipo);
      }
    }
    if (filters.obiettivo) {
      if (Array.isArray(filters.obiettivo)) {
        // Aggiungi ogni obiettivo come parametro separato
        filters.obiettivo.forEach(obiettivo => {
          params.append('obiettivo', obiettivo);
        });
      } else {
        params.set('obiettivo', filters.obiettivo);
      }
    }
    if (filters.priorita) {
      if (Array.isArray(filters.priorita)) {
        // Aggiungi ogni priorità come parametro separato
        filters.priorita.forEach(priorita => {
          params.append('priorita', priorita);
        });
      } else {
        params.set('priorita', filters.priorita);
      }
    }
    if (filters.dataInizio) {
      params.set('dataInizio', filters.dataInizio);
    }
    if (filters.dataFine) {
      params.set('dataFine', filters.dataFine);
    }
    if (filters.assegnatario) {
      params.set('assegnatario', filters.assegnatario);
    }

    return params;
  }, []);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = buildQueryParams(filters);
      queryParams.set('loadAll', 'true'); // Load all activities for now
      
      const url = `/api/activities?${queryParams.toString()}`;
      console.log('🔄 [useActivitiesData] Fetching from:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: ActivitiesApiResponse = await response.json();
      console.log('📦 [useActivitiesData] Received:', data.records?.length, 'activities');
      
      // Map new API field names to old component field names for compatibility
      const mappedActivities = (data.records || []).map(activity => ({
        // Keep original fields
        ...activity,
        // Map new field names to old component names
        titolo: activity.Titolo,
        tipo: activity.Tipo,
        stato: activity.Stato,
        priorita: activity.Priorità || null,
        data: activity.Data,
        durataStimata: activity['Durata stimata'],
        obiettivo: activity.Obiettivo,
        esito: activity.Esito,
        idLead: activity['ID Lead'],
        nomeLead: activity['Nome Lead'],
        nomeAssegnatario: activity['Nome Assegnatario'],
        prossimaAzione: activity['Prossima azione'],
        dataProssimaAzione: activity['Data prossima azione'],
        note: activity.Note,
        allegati: activity.Allegati,
      }));
      
      setActivities(mappedActivities as any);
      setTotalCount(data.records?.length || 0);
      setHasMore(false); // For now, we load all records
    } catch (err) {
      console.error('Error loading activities:', err);
      setError(`Errore nel caricamento delle attività: ${err instanceof Error ? err.message : 'Errore sconosciuto'}`);
    } finally {
      setLoading(false);
    }
  }, [filters, buildQueryParams]);

  const loadMore = useCallback(async () => {
    // TODO: Implementare caricamento dati aggiuntivi
    console.log('Load more activities');
  }, []);

  const refresh = useCallback(() => {
    loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  return {
    activities,
    loading,
    error,
    totalCount,
    hasMore,
    loadMore,
    refresh,
  };
}

interface UseActivitiesStatsReturn {
  stats: ActivityStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useActivitiesStats(
  filters?: ActivityFilters
): UseActivitiesStatsReturn {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Simula caricamento API
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // TODO: Sostituire con chiamata API reale
      const mockStats: ActivityStats = {
        totali: 156,
        completate: 89,
        inCorso: 34,
        scadute: 12,
        pianificate: 21,
        tassoCompletamento: 57.1,
        tempoMedioCompletamento: 2.5,
        distribuzionePerTipo: {
          'Chiamata': 45,
          'WhatsApp': 23,
          'Email': 32,
          'SMS': 15,
          'Consulenza': 28,
          'Follow-up': 13,
          'Altro': 0
        } as any,
        distribuzionePerPriorita: {
          'Bassa': 34,
          'Media': 67,
          'Alta': 43,
          'Urgente': 12
        } as any,
        trendSettimanale: [
          { data: '2025-08-26', completate: 12, create: 15 },
          { data: '2025-08-27', completate: 8, create: 11 },
          { data: '2025-08-28', completate: 15, create: 13 },
          { data: '2025-08-29', completate: 11, create: 9 },
          { data: '2025-08-30', completate: 9, create: 12 },
          { data: '2025-08-31', completate: 13, create: 16 },
          { data: '2025-09-01', completate: 7, create: 8 }
        ]
      };
      
      setStats(mockStats);
    } catch (err) {
      console.error('Error loading activities stats:', err);
      setError('Errore nel caricamento delle statistiche');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const refresh = useCallback(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return {
    stats,
    loading,
    error,
    refresh,
  };
}
