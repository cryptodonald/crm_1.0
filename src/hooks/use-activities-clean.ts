/**
 * 🚀 Hook Activities Clean - Rewrite Completo
 * 
 * Hook semplificato con architettura a 3 layer:
 * - Data Layer: Simple React state + fetch
 * - Optimistic Layer: Immediate UI updates
 * - Queue Layer: API calls in background
 * 
 * Zero cache complexity, zero race conditions, zero refresh loops
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { OptimisticManager, UISystemUtils } from '@/lib/ui-system-clean';
import type { Activity } from '@/types/activity';

// ===== TYPES =====
interface UseActivitiesCleanReturn {
  // Data
  activities: Activity[];
  loading: boolean;
  error: string | null;

  // Actions - stessa API del vecchio hook per compatibility
  createActivity: (activity: Omit<Activity, 'id'>) => Promise<void>;
  updateActivity: (id: string, updates: Partial<Activity>) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  moveActivity: (id: string, newStatus: Activity['status']) => Promise<void>;
  
  // Utility
  refresh: () => Promise<void>;
  getActivityById: (id: string) => Activity | undefined;
  addActivity: (activity: Activity) => void; // Per aggiungere attività create esternamente
}

interface UseActivitiesCleanOptions {
  enableBackgroundSync?: boolean;
  syncIntervalMs?: number;
  showToasts?: boolean;
  loadAll?: boolean; // Per compatibilità con il vecchio hook
}

// ===== API FUNCTIONS =====
const activitiesAPI = {
  async fetchActivities(leadId?: string): Promise<Activity[]> {
    // 🚀 Usa l'endpoint corretto con query parameter
    const url = new URL('/api/activities', window.location.origin);
    console.log(`🔍 [API] fetchActivities called with leadId: ${leadId}`);
    
    if (leadId && leadId.trim() !== '') {
      url.searchParams.set('leadId', leadId);
      console.log(`🔍 [API] Added leadId filter: ${leadId}`);
    } else {
      console.log(`🔍 [API] No leadId filter - loading ALL activities`);
    }
    // Se leadId non è fornito, carica tutte le attività
    url.searchParams.set('loadAll', 'true');
    
    console.log(`🔍 [API] Final URL: ${url.toString()}`);
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to fetch activities: ${response.statusText}`);
    }
    const data = await response.json();
    const activities = data.data || [];
    console.log(`🔍 [API] Fetched ${activities.length} activities`);
    return activities;
  },

  async createActivity(leadId: string, activity: Omit<Activity, 'id'>): Promise<Activity> {
    // 🚀 Aggiungi leadId all'activity data se fornito
    const activityData = leadId ? { ...activity, 'ID Lead': [leadId] } : activity;
    
    const response = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activityData),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create activity: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      // Trasforma la risposta Airtable in formato Activity
      id: data.data.id,
      createdTime: data.data.createdTime,
      ...data.data.fields,
    };
  },

  async updateActivity(leadId: string, activityId: string, updates: Partial<Activity>): Promise<Activity> {
    // 🚀 Filtra solo i campi EDITABILI per Airtable
    // ESCLUSI: id, createdTime, ID (formula), Titolo (formula), Nome Lead/Assegnatario (lookup), date automatiche
    const validFields = [
      // Campi base editabili
      'Tipo', 'Stato', 'Obiettivo', 'Priorità',
      // Timing editabile
      'Data', 'Durata stimata',
      // Collegamenti editabili (ID, non i nomi che sono lookup)
      'ID Lead', 'Assegnatario',
      // Contenuto editabile
      'Note', 'Esito', 'Prossima azione', 'Data prossima azione',
      // File
      'Allegati'
    ];
    
    const cleanedUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => validFields.includes(key))
    );
    
    console.log(`📤 [API] PATCH /api/activities/${activityId} (filtered):`, cleanedUpdates);
    
    const response = await fetch(`/api/activities/${activityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanedUpdates),
    });
    
    console.log(`📡 [API] Response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      let errorDetails = 'Unknown error';
      try {
        const errorData = await response.json();
        errorDetails = errorData.details || errorData.error || response.statusText;
        console.error(`❌ [API] Error details:`, errorData);
      } catch (parseError) {
        console.error(`❌ [API] Could not parse error response:`, parseError);
        errorDetails = `${response.status} ${response.statusText}`;
      }
      throw new Error(`Failed to update activity: ${errorDetails}`);
    }
    
    const data = await response.json();
    console.log(`✅ [API] Success response:`, data);
    
    return {
      id: data.data.id,
      createdTime: data.data.createdTime,
      ...data.data.fields,
    };
  },

  async deleteActivity(leadId: string, activityId: string): Promise<void> {
    const response = await fetch(`/api/activities/${activityId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete activity: ${response.statusText}`);
    }
  },
};

// ===== MAIN HOOK =====
export const useActivitiesClean = (
  leadId?: string, // Ora può essere undefined per caricare tutte le attività
  options: UseActivitiesCleanOptions = {}
): UseActivitiesCleanReturn => {
  
  const {
    enableBackgroundSync = false,
    syncIntervalMs = 120000, // 2 minuti
    showToasts = true,
  } = options;

  // ===== STATE =====
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs per cleanup
  const syncIntervalRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  // ===== CORE FETCH FUNCTION =====
  const fetchActivities = useCallback(async (): Promise<Activity[]> => {
    console.log(`🔍 [ActivitiesClean] Fetching activities for lead: ${leadId || 'ALL'}`);
    
    // 🚀 Se leadId è undefined, carichi tutte le attività
    
    try {
      const fetchedActivities = await activitiesAPI.fetchActivities(leadId || '');
      console.log(`✅ [ActivitiesClean] Fetched ${fetchedActivities.length} activities`);
      return fetchedActivities;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`❌ [ActivitiesClean] Fetch failed:`, errorMsg);
      throw new Error(errorMsg);
    }
  }, [leadId]);

  // ===== REFRESH FUNCTION =====
  const refresh = useCallback(async (): Promise<void> => {
    if (!mountedRef.current) {
      console.log(`⏭️ [ActivitiesClean] Skipping refresh (unmounted)`);
      return;
    }

    // 🚀 Evita refresh multipli paralleli
    if (loading) {
      console.log(`⏭️ [ActivitiesClean] Skipping refresh (already loading)`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fetchedActivities = await fetchActivities();
      
      if (mountedRef.current) {
        setActivities(fetchedActivities);
        console.log(`🔄 [ActivitiesClean] Refreshed with ${fetchedActivities.length} activities`);
      }
    } catch (err) {
      if (mountedRef.current) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to refresh activities';
        setError(errorMsg);
        console.error(`❌ [ActivitiesClean] Refresh failed:`, errorMsg);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchActivities]); // 🚀 Rimosso loading dalla dependency per evitare loop

  // ===== OPTIMISTIC ACTIONS =====
  const createActivity = useCallback(async (newActivity: Omit<Activity, 'id'>): Promise<void> => {
    console.log(`🚀 [ActivitiesClean] Creating activity:`, newActivity.title);

    // Genera ID temporaneo e crea l'attività temporanea
    const tempId = UISystemUtils.generateTempId('activity');
    const tempActivity: Activity = {
      ...newActivity,
      id: tempId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await OptimisticManager.execute(
      {
        type: 'create',
        entity: 'Activity',
        tempData: tempActivity,
        originalData: undefined,
      },
      {
        // 1. Aggiorna UI immediatamente
        onUIUpdate: (data) => {
          setActivities(prev => [...prev, data]);
        },
        
        // 2. Rollback se necessario
        onRollback: () => {
          setActivities(prev => UISystemUtils.removeItem(prev, tempId));
        },
        
        // 3. API call reale
        apiCall: async () => {
          const realActivity = await activitiesAPI.createActivity(leadId, newActivity);
          
          // Sostituisci l'elemento temp con quello reale
          if (mountedRef.current) {
            setActivities(prev => UISystemUtils.replaceTempItem(prev, tempId, realActivity));
          }
          
          return realActivity;
        },
      }
    );
  }, [leadId]);

  const updateActivity = useCallback(async (id: string, updates: Partial<Activity>): Promise<void> => {
    console.log(`🔄 [ActivitiesClean] Updating activity: ${id}`);

    // Trova l'attività originale
    const originalActivity = activities.find(a => a.id === id);
    if (!originalActivity) {
      console.error(`❌ [ActivitiesClean] Activity not found: ${id}`);
      return;
    }

    // Crea l'attività aggiornata
    const updatedActivity: Activity = {
      ...originalActivity,
      ...updates,
      updatedAt: new Date(),
    };

    await OptimisticManager.execute(
      {
        type: 'update',
        entity: 'Activity',
        tempData: updatedActivity,
        originalData: originalActivity,
      },
      {
        // 1. Aggiorna UI immediatamente
        onUIUpdate: (data) => {
          setActivities(prev => UISystemUtils.updateItem(prev, id, data));
        },
        
        // 2. Rollback all'originale
        onRollback: (original) => {
          setActivities(prev => UISystemUtils.updateItem(prev, id, original));
        },
        
        // 3. API call reale
        apiCall: async () => {
          try {
            console.log(`📤 [UpdateActivity] Sending PATCH request for ${id}:`, updates);
            const realActivity = await activitiesAPI.updateActivity(leadId, id, updates);
            
            console.log(`✅ [UpdateActivity] Server response:`, realActivity);
            
            // Aggiorna con i dati reali dal server
            if (mountedRef.current) {
              setActivities(prev => UISystemUtils.updateItem(prev, id, realActivity));
            }
            
            return realActivity;
          } catch (error) {
            console.error(`❌ [UpdateActivity] API call failed for ${id}:`, error);
            throw error; // Re-throw per gestione upstream
          }
        },
      }
    );
  }, [activities, leadId]);

  const deleteActivity = useCallback(async (id: string): Promise<void> => {
    console.log(`🗑️ [ActivitiesClean] Deleting activity: ${id}`);

    // Trova l'attività da eliminare
    const activityToDelete = activities.find(a => a.id === id);
    if (!activityToDelete) {
      console.error(`❌ [ActivitiesClean] Activity not found: ${id}`);
      return;
    }

    await OptimisticManager.execute(
      {
        type: 'delete',
        entity: 'Activity',
        tempData: activityToDelete,
        originalData: activityToDelete,
      },
      {
        // 1. Rimuovi dalla UI immediatamente
        onUIUpdate: () => {
          setActivities(prev => UISystemUtils.removeItem(prev, id));
        },
        
        // 2. Rollback: riaggiungila
        onRollback: (original) => {
          setActivities(prev => [...prev, original]);
        },
        
        // 3. API call reale
        apiCall: async () => {
          await activitiesAPI.deleteActivity(leadId, id);
          return activityToDelete; // Ritorna l'attività eliminata
        },
      }
    );
  }, [activities, leadId]);

  const moveActivity = useCallback(async (id: string, newStatus: Activity['status']): Promise<void> => {
    console.log(`📋 [ActivitiesClean] Moving activity ${id} to ${newStatus}`);
    
    // 🚀 Usa il campo corretto 'Stato' invece di 'status'
    await updateActivity(id, { Stato: newStatus });
  }, [updateActivity]);

  // ===== UTILITY =====
  const getActivityById = useCallback((id: string): Activity | undefined => {
    return activities.find(a => a.id === id);
  }, [activities]);

  // 🚀 Funzione per aggiungere attività create esternamente (es. da NewActivityModal)
  const addActivity = useCallback((activity: Activity): void => {
    console.log(`➥ [ActivitiesClean] Adding external activity: ${activity.id}`, {
      Titolo: activity.Titolo || activity.Tipo,
      Stato: activity.Stato,
      _tempId: activity._tempId,
      _isOptimistic: activity._isOptimistic,
      _isNextActivity: activity._isNextActivity,
      _isMainActivity: activity._isMainActivity,
      _shouldRemove: activity._shouldRemove,
      type: activity.type,
    });
    
    setActivities(prev => {
      // 🔴 CASO 1: Rimuovi attività ottimistica fallita
      if (activity._shouldRemove) {
        console.log(`🗑️ [ActivitiesClean] Removing failed optimistic activity: ${activity.id}`);
        return prev.filter(a => a.id !== activity.id);
      }
      
      // 🔴 CASO 2: Replace di attività ottimistica con quella reale
      if (activity._tempId && !activity._isOptimistic) {
        const tempIndex = prev.findIndex(a => a.id === activity._tempId);
        if (tempIndex !== -1) {
          console.log(`🔄 [ActivitiesClean] Replacing temp activity ${activity._tempId} with real ${activity.id}`);
          const updated = [...prev];
          updated[tempIndex] = activity;
          return updated;
        } else {
          console.warn(`⚠️ [ActivitiesClean] Temp activity ${activity._tempId} not found, adding as new`);
        }
      }
      
      // 🔴 CASO 3: Verifica duplicati per ID
      const existsById = prev.find(a => a.id === activity.id);
      if (existsById) {
        // SEMPRE aggiorna se arriva una versione non ottimistica (conferma)
        if (!activity._isOptimistic) {
          console.log(`🔄 [ActivitiesClean] Updating existing activity with confirmed data: ${activity.id}`);
          return prev.map(a => a.id === activity.id ? activity : a);
        }
        // Se invece arriva un'attività ottimistica ma esiste già, skippala
        console.log(`🛡️ [ActivitiesClean] Optimistic activity already exists, skipping: ${activity.id}`);
        return prev;
      }
      
      console.log(`✅ [ActivitiesClean] Added external activity: ${activity.Titolo || activity.id}`);
      return [...prev, activity];
    });
  }, []);

  // ===== EFFECTS =====

  // Initial fetch quando cambia leadId
  useEffect(() => {
    // 🚀 FIXED: Ora supporta anche leadId = undefined per caricare TUTTE le attività
    console.log(`🔄 [ActivitiesClean] Initial fetch for lead: ${leadId || 'ALL ACTIVITIES'}`);
    
    // 🚀 Evita loop chiamando fetchActivities direttamente invece di refresh
    const performInitialFetch = async () => {
      if (!mountedRef.current || loading) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const fetchedActivities = await fetchActivities();
        
        if (mountedRef.current) {
          setActivities(fetchedActivities);
          console.log(`🔄 [ActivitiesClean] Initial fetch completed: ${fetchedActivities.length} activities`);
        }
      } catch (err) {
        if (mountedRef.current) {
          const errorMsg = err instanceof Error ? err.message : 'Failed to fetch activities';
          setError(errorMsg);
          console.error(`❌ [ActivitiesClean] Initial fetch failed:`, errorMsg);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };
    
    performInitialFetch();
  }, [leadId, fetchActivities]); // 🚀 Dipende da leadId e fetchActivities, non da refresh

  // Background sync (opzionale)
  useEffect(() => {
    if (!enableBackgroundSync) return;

    console.log(`🔄 [ActivitiesClean] Setting up background sync every ${syncIntervalMs}ms`);
    
    syncIntervalRef.current = setInterval(() => {
      if (mountedRef.current && !loading) {
        console.log(`🔄 [ActivitiesClean] Background sync triggered`);
        refresh();
      }
    }, syncIntervalMs);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        console.log(`🛑 [ActivitiesClean] Background sync cleared`);
      }
    };
  }, [enableBackgroundSync, syncIntervalMs, loading, refresh]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // ===== RETURN =====
  return {
    // Data
    activities,
    loading,
    error,

    // Actions
    createActivity,
    updateActivity,
    deleteActivity,
    moveActivity,
    
    // Utility
    refresh,
    getActivityById,
    addActivity, // 🚀 Per aggiungere attività create esternamente
  };
};

console.log('🚀 useActivitiesClean hook initialized');
