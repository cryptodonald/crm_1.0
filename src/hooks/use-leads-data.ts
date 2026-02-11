import useSWR from 'swr';
import type { Lead } from '@/types/database';

interface UseLeadsDataOptions {
  loadAll?: boolean;
}

interface UseLeadsDataReturn {
  leads: Lead[];
  loading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch leads');
  return res.json();
};

/**
 * Hook per caricare i lead (wrapper SWR)
 * Compatibilit\u00e0 con CRM 1.0
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useLeadsData({ loadAll = false }: UseLeadsDataOptions = {}): UseLeadsDataReturn {
  const { data, error, isLoading, mutate } = useSWR<{ leads: Lead[] }>(
    '/api/leads',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  return {
    leads: data?.leads || [],
    loading: isLoading,
    error,
    mutate,
  };
}
