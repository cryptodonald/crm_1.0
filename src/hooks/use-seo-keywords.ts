/**
 * SEO Keywords React Hooks
 *
 * SWR hooks per keyword list, detail, create mutation.
 * Pattern identico a use-leads.ts (CRITICAL-001/004).
 */

import useSWR, { useSWRConfig } from 'swr';
import { useState } from 'react';
import type { SeoKeyword, SeoKeywordFilters, SeoKeywordMetrics } from '@/types/seo-ads';
import type { PaginatedResponse } from '@/types/database';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to fetch');
  }
  return res.json();
};

/**
 * Hook: Fetch SEO keywords list with filters
 */
export function useSeoKeywords(filters?: SeoKeywordFilters) {
  const params = new URLSearchParams();
  if (filters?.cluster) params.set('cluster', filters.cluster);
  if (filters?.priority) params.set('priority', filters.priority);
  if (filters?.is_active !== undefined) params.set('is_active', String(filters.is_active));
  if (filters?.search) params.set('search', filters.search);
  if (filters?.page) params.set('page', filters.page.toString());
  if (filters?.limit) params.set('limit', filters.limit.toString());
  if (filters?.sort_by) params.set('sort_by', filters.sort_by);
  if (filters?.sort_order) params.set('sort_order', filters.sort_order);

  const url = `/api/seo-ads/keywords${params.toString() ? `?${params}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<{
    keywords: SeoKeyword[];
    total: number;
    pagination: PaginatedResponse<SeoKeyword>['pagination'];
  }>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  return {
    keywords: data?.keywords || [],
    total: data?.total || 0,
    pagination: data?.pagination,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook: Fetch single keyword with latest metrics
 */
export function useSeoKeyword(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{
    keyword: SeoKeyword;
    metrics: SeoKeywordMetrics | null;
  }>(id ? `/api/seo-ads/keywords/${id}` : null, fetcher, {
    revalidateOnFocus: false,
  });

  return {
    keyword: data?.keyword || null,
    metrics: data?.metrics || null,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook: Create keyword mutation (CRITICAL-001)
 */
export function useCreateSeoKeyword() {
  const { mutate } = useSWRConfig();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createKeyword = async (data: {
    keyword: string;
    cluster: string;
    landing_page?: string;
    priority?: string;
  }): Promise<SeoKeyword | null> => {
    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/seo-ads/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create keyword');
      }

      const result = await res.json();

      // Invalidate all keyword caches (CRITICAL-004)
      mutate((key) => typeof key === 'string' && key.startsWith('/api/seo-ads/keywords'));

      return result.keyword;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return { createKeyword, isCreating, error };
}

/**
 * Hook: Update keyword mutation
 */
export function useUpdateSeoKeyword(id: string) {
  const { mutate } = useSWRConfig();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateKeyword = async (data: Partial<{
    keyword: string;
    cluster: string;
    landing_page: string | null;
    priority: string;
    is_active: boolean;
  }>): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);

    try {
      const res = await fetch(`/api/seo-ads/keywords/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update keyword');
      }

      // Invalidate keyword caches
      mutate((key) => typeof key === 'string' && key.startsWith('/api/seo-ads/keywords'));

      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateKeyword, isUpdating, error };
}

/**
 * Hook: Delete keyword mutation
 */
export function useDeleteSeoKeyword() {
  const { mutate } = useSWRConfig();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteKeyword = async (id: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/seo-ads/keywords/${id}`, { method: 'DELETE' });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete keyword');
      }

      mutate((key) => typeof key === 'string' && key.startsWith('/api/seo-ads/keywords'));

      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteKeyword, isDeleting, error };
}
