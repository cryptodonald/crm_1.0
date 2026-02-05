/**
 * Leads React Hooks
 * 
 * Uses SWR for data fetching with:
 * - Automatic revalidation
 * - Cache management
 * - Optimistic updates (CRITICAL-001)
 * - Error handling
 */

import useSWR, { useSWRConfig } from 'swr';
import { useState } from 'react';
import type { AirtableLead } from '@/types/airtable';
import type { CreateLeadInput, UpdateLeadInput } from '@/lib/validation/leads';

/**
 * Fetcher function for SWR
 */
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to fetch');
  }
  return res.json();
};

/**
 * Hook: Fetch leads list with filters
 * 
 * @example
 * const { leads, isLoading, error, mutate } = useLeads({ status: ['Nuovo'] });
 */
export function useLeads(filters?: {
  status?: string[];
  fonte?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  
  if (filters?.status) params.set('status', filters.status.join(','));
  if (filters?.fonte) params.set('fonte', filters.fonte);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  if (filters?.limit) params.set('limit', filters.limit.toString());

  const url = `/api/leads${params.toString() ? `?${params.toString()}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<{ leads: AirtableLead[]; total: number }>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // 5 seconds
    }
  );

  return {
    leads: data?.leads || [],
    total: data?.total || 0,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook: Fetch single lead by ID
 * 
 * @example
 * const { lead, isLoading, error, mutate } = useLead('rec123');
 */
export function useLead(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{ lead: AirtableLead }>(
    id ? `/api/leads/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    lead: data?.lead || null,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook: Create lead mutation
 * 
 * @example
 * const { createLead, isCreating, error } = useCreateLead();
 * await createLead({ Nome: 'Test', Telefono: '123' });
 */
export function useCreateLead() {
  const { mutate } = useSWRConfig();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createLead = async (data: CreateLeadInput): Promise<AirtableLead | null> => {
    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create lead');
      }

      const result = await res.json();

      // Invalidate leads list cache
      mutate((key) => typeof key === 'string' && key.startsWith('/api/leads'));

      return result.lead;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return { createLead, isCreating, error };
}

/**
 * Hook: Update lead mutation with optimistic updates (CRITICAL-001)
 * 
 * @example
 * const { updateLead, isUpdating, error } = useUpdateLead('rec123');
 * await updateLead({ Stato: 'Contattato' });
 */
export function useUpdateLead(id: string) {
  const { mutate } = useSWRConfig();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateLead = async (data: UpdateLeadInput): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);

    // Store original data for rollback (CRITICAL-001)
    let originalLead: AirtableLead | null = null;

    try {
      // 1. Fetch current state for rollback
      const currentRes = await fetch(`/api/leads/${id}`);
      if (currentRes.ok) {
        const currentData = await currentRes.json();
        originalLead = currentData.lead;
      }

      // 2. Optimistic update - update UI immediately
      mutate(
        `/api/leads/${id}`,
        (current: any) => {
          if (!current) return current;
          return {
            lead: {
              ...current.lead,
              fields: {
                ...current.lead.fields,
                ...data,
              },
            },
          };
        },
        { revalidate: false }
      );

      // 3. Actual API call
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update lead');
      }

      // 4. Success: revalidate to get fresh data from server
      mutate(`/api/leads/${id}`);
      mutate((key) => typeof key === 'string' && key.startsWith('/api/leads'));

      return true;
    } catch (err: any) {
      setError(err.message);

      // 5. Rollback on error (CRITICAL-001)
      if (originalLead) {
        mutate(`/api/leads/${id}`, { lead: originalLead }, false);
      }

      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateLead, isUpdating, error };
}

/**
 * Hook: Delete lead mutation
 * 
 * @example
 * const { deleteLead, isDeleting, error } = useDeleteLead();
 * await deleteLead('rec123');
 */
export function useDeleteLead() {
  const { mutate } = useSWRConfig();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteLead = async (id: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete lead');
      }

      // Invalidate caches
      mutate(`/api/leads/${id}`, undefined, false);
      mutate((key) => typeof key === 'string' && key.startsWith('/api/leads'));

      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteLead, isDeleting, error };
}

/**
 * Hook: Batch delete leads
 * 
 * @example
 * const { batchDelete, isDeleting, error } = useBatchDeleteLeads();
 * const result = await batchDelete(['rec1', 'rec2', 'rec3']);
 */
export function useBatchDeleteLeads() {
  const { mutate } = useSWRConfig();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const batchDelete = async (ids: string[]): Promise<{
    succeeded: string[];
    failed: Array<{ id: string; error: string }>;
  } | null> => {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch('/api/leads/batch/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete leads');
      }

      const result = await res.json();

      // Invalidate caches
      mutate((key) => typeof key === 'string' && key.startsWith('/api/leads'));

      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsDeleting(false);
    }
  };

  return { batchDelete, isDeleting, error };
}
