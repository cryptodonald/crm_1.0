import useSWR, { useSWRConfig } from 'swr';
import type {
  LeadAnalysis,
  LeadAnalysisConfig,
  LeadAnalysisCreateInput,
  LeadAnalysisUpdateInput,
} from '@/types/database';

// ============================================================================
// Fetchers
// ============================================================================

const fetchAnalyses = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch analyses');
  const data = await res.json();
  return data.analyses as LeadAnalysis[];
};

const fetchAnalysis = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch analysis');
  const data = await res.json();
  return data.analysis as LeadAnalysis;
};

// ============================================================================
// useLeadAnalyses — lista analisi di un lead
// ============================================================================

interface UseLeadAnalysesReturn {
  analyses: LeadAnalysis[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
  createAnalysis: (data: Omit<LeadAnalysisCreateInput, 'lead_id'>) => Promise<LeadAnalysis>;
  deleteAnalysis: (analysisId: string) => Promise<void>;
  mutate: () => void;
}

export function useLeadAnalyses(leadId: string | undefined): UseLeadAnalysesReturn {
  const { mutate: globalMutate } = useSWRConfig();

  const { data, error, mutate } = useSWR<LeadAnalysis[]>(
    leadId ? `/api/leads/${leadId}/analyses` : null,
    fetchAnalyses,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  );

  // CRITICAL-001: pattern matching per invalidare tutte le cache analyses
  const mutateAllAnalyses = (
    updater: (current: LeadAnalysis[] | undefined) => LeadAnalysis[] | undefined,
    options: { revalidate: boolean } = { revalidate: false },
  ) => {
    globalMutate(
      (key) => typeof key === 'string' && key.startsWith(`/api/leads/${leadId}/analyses`),
      updater,
      { revalidate: options.revalidate },
    );
  };

  const rollback = () => {
    globalMutate(
      (key) => typeof key === 'string' && key.startsWith(`/api/leads/${leadId}/analyses`),
    );
  };

  const createAnalysis = async (
    input: Omit<LeadAnalysisCreateInput, 'lead_id'>,
  ): Promise<LeadAnalysis> => {
    const res = await fetch(`/api/leads/${leadId}/analyses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to create analysis');
    }

    const { analysis } = await res.json();

    // Aggiorna cache: aggiungi in testa
    mutateAllAnalyses((current) => {
      if (!current) return [analysis];
      return [analysis, ...current];
    });

    return analysis;
  };

  const deleteAnalysisById = async (analysisId: string): Promise<void> => {
    // Optimistic: rimuovi immediatamente
    mutateAllAnalyses((current) => {
      if (!current) return current;
      return current.filter((a) => a.id !== analysisId);
    });

    try {
      const res = await fetch(`/api/leads/${leadId}/analyses/${analysisId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to delete analysis');
      }
    } catch (error) {
      rollback();
      throw error;
    }
  };

  return {
    analyses: data,
    isLoading: !error && !data && !!leadId,
    error,
    createAnalysis,
    deleteAnalysis: deleteAnalysisById,
    mutate,
  };
}

// ============================================================================
// useLeadAnalysis — singola analisi con configs
// ============================================================================

interface UseLeadAnalysisReturn {
  analysis: LeadAnalysis | undefined;
  isLoading: boolean;
  error: Error | undefined;
  updateAnalysis: (data: LeadAnalysisUpdateInput) => Promise<LeadAnalysis>;
  updateConfig: (configId: string, updates: Partial<Pick<
    LeadAnalysisConfig,
    'base_density' | 'topper_level' | 'cylinder_shoulders' | 'cylinder_lumbar' | 'cylinder_legs'
  >>) => Promise<LeadAnalysisConfig>;
  mutate: () => void;
}

export function useLeadAnalysis(
  leadId: string | undefined,
  analysisId: string | undefined,
): UseLeadAnalysisReturn {
  const { mutate: globalMutate } = useSWRConfig();

  const { data, error, mutate } = useSWR<LeadAnalysis>(
    leadId && analysisId
      ? `/api/leads/${leadId}/analyses/${analysisId}`
      : null,
    fetchAnalysis,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    },
  );

  const updateAnalysisData = async (
    input: LeadAnalysisUpdateInput,
  ): Promise<LeadAnalysis> => {
    const res = await fetch(`/api/leads/${leadId}/analyses/${analysisId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to update analysis');
    }

    const { analysis } = await res.json();

    // Aggiorna cache singola
    mutate(analysis, { revalidate: false });

    // Invalida anche lista analyses
    globalMutate(
      (key) => typeof key === 'string' && key === `/api/leads/${leadId}/analyses`,
    );

    return analysis;
  };

  const updateConfig = async (
    configId: string,
    updates: Partial<Pick<
      LeadAnalysisConfig,
      'base_density' | 'topper_level' | 'cylinder_shoulders' | 'cylinder_lumbar' | 'cylinder_legs'
    >>,
  ): Promise<LeadAnalysisConfig> => {
    const res = await fetch(
      `/api/leads/${leadId}/analyses/${analysisId}/configs/${configId}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      },
    );

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Failed to update config');
    }

    const { config } = await res.json();

    // Aggiorna config nella cache dell'analisi
    if (data) {
      const updatedConfigs = data.configs?.map((c) =>
        c.id === configId ? config : c,
      );
      mutate({ ...data, configs: updatedConfigs }, { revalidate: false });
    }

    return config;
  };

  return {
    analysis: data,
    isLoading: !error && !data && !!leadId && !!analysisId,
    error,
    updateAnalysis: updateAnalysisData,
    updateConfig,
    mutate,
  };
}
