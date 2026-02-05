import useSWR, { useSWRConfig } from 'swr';
import { useState } from 'react';
import type { AirtableActivity } from '@/types/airtable.generated';

interface UseActivitiesReturn {
  activities: AirtableActivity[] | undefined;
  isLoading: boolean;
  error: any;
  mutate: () => void;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch activities');
  }
  const data = await res.json();
  return data.activities as AirtableActivity[];
};

export function useActivities(leadId: string | undefined): UseActivitiesReturn {
  const { data, error, mutate } = useSWR<AirtableActivity[]>(
    leadId ? `/api/activities?leadId=${leadId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true, // ✅ Aggiunto per auto-refresh
      dedupingInterval: 5000,
    }
  );

  return {
    activities: data,
    isLoading: !error && !data && !!leadId,
    error,
    mutate,
  };
}

/**
 * Hook: Update activity mutation with optimistic updates (CRITICAL-001 pattern)
 * 
 * @example
 * const { updateActivity, isUpdating, error } = useUpdateActivity('rec123');
 * await updateActivity({ Stato: 'Completata' });
 */
export function useUpdateActivity(id: string) {
  const { mutate } = useSWRConfig();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateActivity = async (data: any): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);

    // Store original data for rollback (CRITICAL-001)
    let originalActivity: AirtableActivity | null = null;

    try {
      // 1. Fetch current state for rollback
      const currentRes = await fetch(`/api/activities/${id}`);
      if (currentRes.ok) {
        const currentData = await currentRes.json();
        originalActivity = currentData.activity;
      }

      // 2. Optimistic update - update UI immediately
      // Find all cache keys for activities lists that might contain this activity
      mutate(
        (key) => typeof key === 'string' && key.startsWith('/api/activities'),
        async (current: any) => {
          if (!current) return current;
          // Handle array response (from fetcher)
          if (Array.isArray(current)) {
            return current.map((act: AirtableActivity) =>
              act.id === id
                ? {
                    ...act,
                    fields: {
                      ...act.fields,
                      ...data,
                    },
                  }
                : act
            );
          }
          return current;
        },
        false // Don't revalidate yet
      );

      // 3. Actual API call
      const res = await fetch(`/api/activities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update activity');
      }

      // 4. Success: revalidate to get fresh data from server
      mutate((key) => typeof key === 'string' && key.startsWith('/api/activities'));

      return true;
    } catch (err: any) {
      setError(err.message);

      // 5. Rollback on error (CRITICAL-001)
      if (originalActivity) {
        mutate(
          (key) => typeof key === 'string' && key.startsWith('/api/activities'),
          async (current: any) => {
            if (!current) return current;
            if (Array.isArray(current)) {
              return current.map((act: AirtableActivity) =>
                act.id === id ? originalActivity : act
              );
            }
            return current;
          },
          false
        );
      }

      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateActivity, isUpdating, error };
}

/**
 * Hook: Delete activity mutation
 * 
 * @example
 * const { deleteActivity, isDeleting, error } = useDeleteActivity();
 * await deleteActivity('rec123');
 */
export function useDeleteActivity() {
  const { mutate } = useSWRConfig();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteActivity = async (id: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/activities/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete activity');
      }

      // Invalidate all activity caches
      mutate((key) => typeof key === 'string' && key.startsWith('/api/activities'));

      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteActivity, isDeleting, error };
}

/**
 * Hook: Create activity mutation con optimistic updates
 * 
 * @example
 * const { createActivity, isCreating, error } = useCreateActivity();
 * const newActivity = await createActivity({ Tipo: 'Chiamata', ... });
 */
export function useCreateActivity() {
  const { mutate } = useSWRConfig();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createActivity = async (data: any): Promise<AirtableActivity | null> => {
    setIsCreating(true);
    setError(null);

    // Genera ID temporaneo per optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // 1. Optimistic update - aggiungi activity temporanea all'UI
      mutate(
        (key) => typeof key === 'string' && key.startsWith('/api/activities'),
        async (current: any) => {
          if (!current) return current;
          if (Array.isArray(current)) {
            // Aggiungi activity temporanea
            return [
              {
                id: tempId,
                fields: data,
                createdTime: new Date().toISOString(),
                _isOptimistic: true,
                _tempId: tempId,
              },
              ...current,
            ];
          }
          return current;
        },
        { revalidate: false }
      );

      // 2. Chiamata API reale
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create activity');
      }

      const result = await res.json();
      const newActivity = result.data;

      // 3. Sostituisci activity temporanea con quella reale
      mutate(
        (key) => typeof key === 'string' && key.startsWith('/api/activities'),
        async (current: any) => {
          if (!current) return current;
          if (Array.isArray(current)) {
            return current.map((act: any) =>
              act.id === tempId || act._tempId === tempId
                ? {
                    id: newActivity.id,
                    fields: newActivity.fields,
                    createdTime: newActivity.createdTime,
                  }
                : act
            );
          }
          return current;
        },
        { revalidate: true }
      );

      return newActivity;
    } catch (err: any) {
      setError(err.message);

      // 4. Rollback - rimuovi activity temporanea
      mutate(
        (key) => typeof key === 'string' && key.startsWith('/api/activities'),
        async (current: any) => {
          if (!current) return current;
          if (Array.isArray(current)) {
            return current.filter((act: any) => act.id !== tempId && act._tempId !== tempId);
          }
          return current;
        },
        { revalidate: false }
      );

      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return { createActivity, isCreating, error };
}
