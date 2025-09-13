import { useState, useEffect, useCallback } from 'react';
import { LeadData, LeadFormData } from '@/types/leads';
import { useFetchWithRetry } from './use-fetch-with-retry';
import { useLeadsCacheInvalidation } from './use-leads-cache';
import { toast } from 'sonner';

interface UseLeadDetailProps {
  leadId: string;
  refreshKey?: number;
}

interface UseLeadDetailReturn {
  lead: LeadData | null;
  loading: boolean;
  error: string | null;
  updating: boolean;
  deleting: boolean;
  refresh: () => Promise<void>;
  updateLead: (data: Partial<LeadFormData>) => Promise<boolean>;
  deleteLead: () => Promise<boolean>;
}

export function useLeadDetail({ leadId, refreshKey }: UseLeadDetailProps): UseLeadDetailReturn {
  const [lead, setLead] = useState<LeadData | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // 🔄 Sistema di cache invalidation condiviso
  const { invalidateCache } = useLeadsCacheInvalidation();

  // 🚀 Sistema di fetch con retry automatico
  const fetchLeadWithRetry = useFetchWithRetry(
    async () => {
      console.log(`🔍 [useLeadDetail] Fetching lead: ${leadId}`);

      // Force cache busting per fresh data + bypass server cache
      const cacheBuster = Date.now();
      const fetchUrl = `/api/leads/${leadId}?_t=${cacheBuster}&skipCache=true`;
      
      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT',
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Lead non trovato');
        }
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.lead) {
        throw new Error('Formato risposta non valido');
      }

      console.log(`✅ [useLeadDetail] Lead loaded successfully:`, data.lead.ID || leadId);
      return data.lead;
    },
    {
      maxRetries: 2,
      baseDelay: 1000,
      timeout: 15000, // 15 secondi per lead API
      onRetry: (attempt, error) => {
        toast.warning(`Tentativo ${attempt} di ricaricamento...`);
        console.warn(`⚠️ [useLeadDetail] Retry ${attempt}:`, error.message);
      }
    }
  );

  // Funzione per aggiornare il lead
  const updateLead = useCallback(async (updateData: Partial<LeadFormData>): Promise<boolean> => {
    try {
      setUpdating(true);
      setError(null);

      console.log(`🔄 [useLeadDetail] Updating lead ${leadId}:`, updateData);

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
        throw new Error('Formato risposta non valido');
      }

      // Aggiorna lo stato locale con i dati aggiornati
      setLead(data.lead);
      
      // Invalida la cache di useLeadsList e passa i dati freschi direttamente
      invalidateCache(leadId, data.lead);

      return true;

    } catch (err) {
      console.error('❌ [useLeadDetail] Error updating lead:', err);
      setError(err instanceof Error ? err.message : 'Errore durante aggiornamento');
      return false;
    } finally {
      setUpdating(false);
    }
  }, [leadId]);

  // Funzione per eliminare il lead
  const deleteLead = useCallback(async (): Promise<boolean> => {
    try {
      setDeleting(true);
      setError(null);

      console.log(`🗑️ [useLeadDetail] Deleting lead: ${leadId}`);

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

      console.log(`✅ [useLeadDetail] Lead deleted successfully: ${leadId}`);
      
      // 🔄 Invalida la cache di useLeadsList (no fresh data per delete)
      invalidateCache(leadId);
      
      return true;

    } catch (err) {
      console.error('❌ [useLeadDetail] Error deleting lead:', err);
      setError(err instanceof Error ? err.message : 'Errore durante eliminazione');
      return false;
    } finally {
      setDeleting(false);
    }
  }, [leadId]);

  // Sincronizza stato del lead con il fetch result
  useEffect(() => {
    if (fetchLeadWithRetry.data) {
      setLead(fetchLeadWithRetry.data);
    } else if (fetchLeadWithRetry.error) {
      setLead(null);
    }
  }, [fetchLeadWithRetry.data, fetchLeadWithRetry.error]);

  // Auto-fetch quando cambia leadId o refreshKey
  useEffect(() => {
    if (leadId) {
      fetchLeadWithRetry.execute();
    }
  }, [leadId, refreshKey]); // Include refreshKey per force refresh

  // Funzioni wrapper
  const refresh = useCallback(async () => {
    await fetchLeadWithRetry.retry();
    // Toast rimosso: gestito dal componente EditLeadModal
  }, [fetchLeadWithRetry]);

  return {
    lead,
    loading: fetchLeadWithRetry.loading,
    error: fetchLeadWithRetry.error,
    updating,
    deleting,
    refresh,
    updateLead,
    deleteLead,
  };
}

// Hook aggiuntivo per gestire attività e cronologia del lead
export function useLeadActivity(leadId: string) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Mapping tra etichette Airtable e tipi UI
  const airtableTipoToUi: Record<string, 'call' | 'email' | 'note' | 'meeting'> = {
    'Chiamata': 'call',
    'Email': 'email',
    'Consulenza': 'meeting',
    'Follow-up': 'note',
  };
  const uiToAirtableTipo: Record<'call' | 'email' | 'note' | 'meeting', string> = {
    call: 'Chiamata',
    email: 'Email',
    meeting: 'Consulenza',
    note: 'Follow-up',
  };

  const mapApiRecordToActivity = (rec: any) => {
    const fields = rec || {};
    const tipo: string | undefined = fields['Tipo'];
    const titolo: string | undefined = fields['Titolo'];
    const note: string | undefined = fields['Note'];
    const data: string | undefined = fields['Data'] || rec.createdTime;

    return {
      id: rec.id,
      type: (tipo && airtableTipoToUi[tipo]) || 'note',
      title: titolo || fields['Obiettivo'] || tipo || 'Attività',
      description: note || '',
      date: data,
    };
  };

  const loadActivities = useCallback(async () => {
    if (!leadId) return;
    setLoadingActivities(true);
    try {
      const params = new URLSearchParams({
        leadId,
        sortField: 'Data',
        sortDirection: 'desc',
        maxRecords: '50',
      });
      const res = await fetch(`/api/activities?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const json = await res.json();
      const records = (json.records || []).map((r: any) => ({ id: r.id, createdTime: r.createdTime, ...r.fields }));
      const mapped = records.map(mapApiRecordToActivity);
      setActivities(mapped);
    } catch (e) {
      console.error('❌ [useLeadActivity] Error loading activities:', e);
      setActivities([]);
    } finally {
      setLoadingActivities(false);
    }
  }, [leadId]);

  const addActivity = useCallback(async (activity: {
    type: 'call' | 'email' | 'note' | 'meeting';
    title: string;
    description?: string;
    result?: string;
  }) => {
    try {
      const payload = {
        leadId,
        type: activity.type,
        title: activity.title,
        description: activity.description,
      };
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      // Ricarica elenco per coerenza
      await loadActivities();
      return true;
    } catch (e) {
      console.error('❌ [useLeadActivity] Error adding activity:', e);
      return false;
    }
  }, [leadId, loadActivities]);

  useEffect(() => {
    if (leadId) {
      loadActivities();
    }
  }, [leadId, loadActivities]);

  return {
    activities,
    loadingActivities,
    addActivity,
    refreshActivities: loadActivities,
  };
}
