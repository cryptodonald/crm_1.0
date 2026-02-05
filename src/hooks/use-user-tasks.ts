/**
 * User Tasks React Hooks
 * 
 * Uses SWR for data fetching with optimistic updates
 */

import useSWR, { useSWRConfig } from 'swr';
import { useState } from 'react';
import type { AirtableUserTask, CreateUserTaskInput, UpdateUserTaskInput } from '@/types/developer';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to fetch');
  }
  return res.json();
};

/**
 * Hook: Fetch user tasks with filters
 * 
 * @example
 * const { tasks, isLoading } = useUserTasks({ mine: true, status: ['todo'] });
 */
export function useUserTasks(filters?: {
  status?: string[];
  priority?: string[];
  type?: string[];
  assignedTo?: string;
  mine?: boolean;
}) {
  const params = new URLSearchParams();
  
  if (filters?.status) params.set('status', filters.status.join(','));
  if (filters?.priority) params.set('priority', filters.priority.join(','));
  if (filters?.type) params.set('type', filters.type.join(','));
  if (filters?.assignedTo) params.set('assignedTo', filters.assignedTo);
  if (filters?.mine) params.set('mine', 'true');

  const url = `/api/tasks${params.toString() ? `?${params.toString()}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<{ tasks: AirtableUserTask[]; total: number }>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  return {
    tasks: data?.tasks || [],
    total: data?.total || 0,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook: Fetch single task by ID
 */
export function useUserTask(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{ task: AirtableUserTask }>(
    id ? `/api/tasks/${id}` : null,
    fetcher
  );

  return {
    task: data?.task || null,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook: Create user task
 */
export function useCreateUserTask() {
  const { mutate } = useSWRConfig();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTask = async (data: CreateUserTaskInput): Promise<AirtableUserTask | null> => {
    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create task');
      }

      const result = await res.json();

      // Invalidate tasks cache
      mutate((key) => typeof key === 'string' && key.startsWith('/api/tasks'));

      return result.task;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return { createTask, isCreating, error };
}

/**
 * Hook: Update user task with optimistic updates
 */
export function useUpdateUserTask(id: string) {
  const { mutate } = useSWRConfig();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateTask = async (data: UpdateUserTaskInput): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);

    let originalTask: AirtableUserTask | null = null;

    try {
      // Fetch current for rollback
      const currentRes = await fetch(`/api/tasks/${id}`);
      if (currentRes.ok) {
        const currentData = await currentRes.json();
        originalTask = currentData.task;
      }

      // Optimistic update
      mutate(
        `/api/tasks/${id}`,
        async (current: { task: AirtableUserTask } | undefined) => {
          if (!current) return current;
          return {
            task: {
              ...current.task,
              fields: {
                ...current.task.fields,
                ...data,
              },
            },
          };
        },
        false
      );

      // API call
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update task');
      }

      // Revalidate
      mutate(`/api/tasks/${id}`);
      mutate((key) => typeof key === 'string' && key.startsWith('/api/tasks'));

      return true;
    } catch (err: any) {
      setError(err.message);

      // Rollback
      if (originalTask) {
        mutate(`/api/tasks/${id}`, { task: originalTask }, false);
      }

      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateTask, isUpdating, error };
}

/**
 * Hook: Delete user task
 */
export function useDeleteUserTask() {
  const { mutate } = useSWRConfig();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteTask = async (id: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete task');
      }

      // Invalidate caches
      mutate(`/api/tasks/${id}`, undefined, false);
      mutate((key) => typeof key === 'string' && key.startsWith('/api/tasks'));

      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteTask, isDeleting, error };
}
