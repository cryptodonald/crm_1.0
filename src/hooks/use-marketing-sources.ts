import useSWR from 'swr';

interface MarketingSource {
  id: string;
  name: string;
  color?: string;
  description?: string;
  active?: boolean;
}

interface MarketingSourcesResponse {
  sources: MarketingSource[];
  lookup: Record<string, string>; // id -> name
  colorLookup: Record<string, string | undefined>; // id -> color hex
}

const fetcher = async (url: string): Promise<MarketingSourcesResponse> => {
  const res = await fetch(url);
  
  if (!res.ok) {
    throw new Error('Failed to fetch marketing sources');
  }
  
  const data = await res.json();
  
  // Crea lookup maps per accesso O(1)
  const lookup: Record<string, string> = {};
  const colorLookup: Record<string, string | undefined> = {};
  
  if (data.sources) {
    data.sources.forEach((source: MarketingSource) => {
      lookup[source.id] = source.name;
      colorLookup[source.id] = source.color;
    });
  }
  
  return {
    sources: data.sources || [],
    lookup,
    colorLookup,
  };
};

export function useMarketingSources() {
  const { data, error, isLoading } = useSWR<MarketingSourcesResponse>(
    '/api/marketing-sources',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // 1 minuto
    }
  );

  return {
    sources: data?.sources || [],
    lookup: data?.lookup || {},
    colorLookup: data?.colorLookup || {},
    isLoading,
    error,
  };
}

/**
 * Helper per ottenere il nome di una fonte dato l'ID
 */
export function getSourceName(sourceId: string | undefined, lookup: Record<string, string>): string | null {
  if (!sourceId) return null;
  return lookup[sourceId] || null;
}
