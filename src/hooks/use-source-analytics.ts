'use client';

import { useState, useEffect } from 'react';
import type { SourcePerformance, AnalyticsSummary } from '@/types/analytics';

interface UseSourceAnalyticsResult {
  data: SourcePerformance[];
  summary: AnalyticsSummary | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useSourceAnalytics(filters?: {
  dateStart?: string;
  dateEnd?: string;
  fonte?: string;
}): UseSourceAnalyticsResult {
  const [data, setData] = useState<SourcePerformance[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      if (filters?.dateStart) params.append('dateStart', filters.dateStart);
      if (filters?.dateEnd) params.append('dateEnd', filters.dateEnd);
      if (filters?.fonte) params.append('fonte', filters.fonte);

      const response = await fetch(`/api/analytics/source-performance?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setData(result.data || []);
        setSummary(result.summary || null);
      } else {
        throw new Error(result.error || 'Failed to fetch analytics');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error fetching source analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters?.dateStart, filters?.dateEnd, filters?.fonte]);

  return {
    data,
    summary,
    loading,
    error,
    refresh: fetchData,
  };
}
