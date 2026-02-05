/**
 * Dev Issues React Hooks
 * 
 * Uses SWR for data fetching with:
 * - Automatic revalidation
 * - Cache management
 * - Optimistic updates
 * - Error handling
 */

import useSWR, { useSWRConfig } from 'swr';
import { useState } from 'react';
import type { AirtableDevIssue, CreateDevIssueInput, UpdateDevIssueInput } from '@/types/developer';

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
 * Hook: Fetch dev issues list with filters
 * 
 * @example
 * const { issues, isLoading, error, mutate } = useDevIssues({ status: ['backlog'] });
 */
export function useDevIssues(filters?: {
  status?: string[];
  priority?: string[];
  type?: string[];
  assignedTo?: string;
}) {
  const params = new URLSearchParams();
  
  if (filters?.status) params.set('status', filters.status.join(','));
  if (filters?.priority) params.set('priority', filters.priority.join(','));
  if (filters?.type) params.set('type', filters.type.join(','));
  if (filters?.assignedTo) params.set('assignedTo', filters.assignedTo);

  const url = `/api/dev-issues${params.toString() ? `?${params.toString()}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<{ issues: AirtableDevIssue[]; total: number }>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  return {
    issues: data?.issues || [],
    total: data?.total || 0,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook: Fetch single dev issue by ID
 * 
 * @example
 * const { issue, isLoading, error, mutate } = useDevIssue('rec123');
 */
export function useDevIssue(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{ issue: AirtableDevIssue }>(
    id ? `/api/dev-issues/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  return {
    issue: data?.issue || null,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook: Create dev issue mutation
 * 
 * @example
 * const { createIssue, isCreating, error } = useCreateDevIssue();
 * await createIssue({ Title: 'Bug fix', Type: 'bug' });
 */
export function useCreateDevIssue() {
  const { mutate } = useSWRConfig();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createIssue = async (data: CreateDevIssueInput): Promise<AirtableDevIssue | null> => {
    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch('/api/dev-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create issue');
      }

      const result = await res.json();

      // Invalidate issues list cache
      mutate((key) => typeof key === 'string' && key.startsWith('/api/dev-issues'));

      return result.issue;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return { createIssue, isCreating, error };
}

/**
 * Hook: Update dev issue mutation with optimistic updates
 * 
 * @example
 * const { updateIssue, isUpdating, error } = useUpdateDevIssue('rec123');
 * await updateIssue({ Status: 'done' });
 */
export function useUpdateDevIssue(id: string) {
  const { mutate } = useSWRConfig();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateIssue = async (data: UpdateDevIssueInput): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);

    // Store original data for rollback
    let originalIssue: AirtableDevIssue | null = null;

    try {
      // 1. Fetch current state for rollback
      const currentRes = await fetch(`/api/dev-issues/${id}`);
      if (currentRes.ok) {
        const currentData = await currentRes.json();
        originalIssue = currentData.issue;
      }

      // 2. Optimistic update - update UI immediately
      mutate(
        `/api/dev-issues/${id}`,
        async (current: { issue: AirtableDevIssue } | undefined) => {
          if (!current) return current;
          return {
            issue: {
              ...current.issue,
              fields: {
                ...current.issue.fields,
                ...data,
              },
            },
          };
        },
        false
      );

      // 3. Actual API call
      const res = await fetch(`/api/dev-issues/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update issue');
      }

      // 4. Success: revalidate
      mutate(`/api/dev-issues/${id}`);
      mutate((key) => typeof key === 'string' && key.startsWith('/api/dev-issues'));

      return true;
    } catch (err: any) {
      setError(err.message);

      // 5. Rollback on error
      if (originalIssue) {
        mutate(`/api/dev-issues/${id}`, { issue: originalIssue }, false);
      }

      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateIssue, isUpdating, error };
}

/**
 * Hook: Delete dev issue mutation
 * 
 * @example
 * const { deleteIssue, isDeleting, error } = useDeleteDevIssue();
 * await deleteIssue('rec123');
 */
export function useDeleteDevIssue() {
  const { mutate } = useSWRConfig();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteIssue = async (id: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/dev-issues/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete issue');
      }

      // Invalidate caches
      mutate(`/api/dev-issues/${id}`, undefined, false);
      mutate((key) => typeof key === 'string' && key.startsWith('/api/dev-issues'));

      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return { deleteIssue, isDeleting, error };
}

/**
 * Hook: Fetch comments for an issue
 * 
 * @example
 * const { comments, isLoading, mutate } = useIssueComments('rec123');
 */
export function useIssueComments(issueId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<{ comments: any[]; total: number }>(
    issueId ? `/api/dev-issues/${issueId}/comments` : null,
    fetcher
  );

  return {
    comments: data?.comments || [],
    total: data?.total || 0,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook: Create comment mutation
 */
export function useCreateComment(issueId: string) {
  const { mutate } = useSWRConfig();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createComment = async (content: string): Promise<boolean> => {
    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch(`/api/dev-issues/${issueId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create comment');
      }

      // Revalidate comments
      mutate(`/api/dev-issues/${issueId}/comments`);

      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  return { createComment, isCreating, error };
}
