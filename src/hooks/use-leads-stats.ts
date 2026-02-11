import useSWR from 'swr';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to fetch');
  }
  return res.json();
};

/**
 * Hook to fetch aggregated lead counts by status and source
 * Used for filter badges count display
 * Accepts filters to calculate counts on filtered subset
 */
export function useLeadsStats(filters?: {
  status?: string[];
  source_id?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  
  if (filters?.status) params.set('status', filters.status.join(','));
  if (filters?.source_id) params.set('source_id', filters.source_id);
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  if (filters?.search) params.set('search', filters.search);

  const url = `/api/leads/stats${params.toString() ? `?${params.toString()}` : ''}`;
  
  const { data, error, isLoading } = useSWR<{
    byStatus: Record<string, number>;
    bySource: Record<string, number>;
  }>(url, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 5000, // Cache for 5 seconds (shorter since filters change)
  });

  return {
    byStatus: data?.byStatus || {},
    bySource: data?.bySource || {},
    isLoading,
    error,
  };
}
