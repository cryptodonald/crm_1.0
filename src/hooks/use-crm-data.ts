/**
 * CRM Data Management Hooks
 * Custom React hooks for managing CRM data with SWR
 */

'use client';

import useSWR, { mutate } from 'swr';
import { useState, useCallback } from 'react';
import type {
  Lead,
  Activity,
  Contact,
  Company,
  Opportunity,
  LeadInput,
  ActivityInput,
  ContactInput,
  CompanyInput,
  OpportunityInput,
  PaginationParams,
  FilterParams,
  SortParams,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

// API fetch wrapper
async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

// Generic CRUD operations
interface CrudOperations<T, TInput> {
  data: T[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
  create: (input: TInput) => Promise<T>;
  update: (id: string, input: Partial<TInput>) => Promise<T>;
  delete: (id: string) => Promise<void>;
  refresh: () => Promise<T[] | undefined>;
}

// ============ LEADS HOOKS ============

export function useLeads(params?: {
  pagination?: PaginationParams;
  filters?: FilterParams;
  sort?: SortParams;
}): CrudOperations<Lead, LeadInput> {
  const queryParams = new URLSearchParams();

  if (params?.filters?.status) {
    queryParams.append('status', params.filters.status.join(','));
  }
  if (params?.filters?.source) {
    queryParams.append('source', params.filters.source.join(','));
  }
  if (params?.filters?.search) {
    queryParams.append('search', params.filters.search);
  }
  if (params?.sort) {
    queryParams.append('sort', `${params.sort.field}:${params.sort.direction}`);
  }

  const url = `/api/leads${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const { data, error, isLoading } = useSWR<
    ApiResponse<PaginatedResponse<Lead>>
  >(url, fetcher);

  const create = useCallback(
    async (input: LeadInput): Promise<Lead> => {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`Failed to create lead: ${response.status}`);
      }

      const result = (await response.json()) as ApiResponse<Lead>;
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create lead');
      }

      // Revalidate the list
      await mutate(url);

      return result.data;
    },
    [url]
  );

  const update = useCallback(
    async (id: string, input: Partial<LeadInput>): Promise<Lead> => {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`Failed to update lead: ${response.status}`);
      }

      const result = (await response.json()) as ApiResponse<Lead>;
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update lead');
      }

      // Revalidate the list and individual item
      await Promise.all([mutate(url), mutate(`/api/leads/${id}`)]);

      return result.data;
    },
    [url]
  );

  const deleteItem = useCallback(
    async (id: string): Promise<void> => {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete lead: ${response.status}`);
      }

      // Revalidate the list
      await mutate(url);
    },
    [url]
  );

  const refresh = useCallback(async () => {
    return mutate(url);
  }, [url]);

  return {
    data: data?.data?.items,
    isLoading,
    error: error || (data && !data.success ? new Error(data.error) : undefined),
    create,
    update,
    delete: deleteItem,
    refresh,
  };
}

export function useLead(id: string) {
  const { data, error, isLoading } = useSWR<ApiResponse<Lead>>(
    id ? `/api/leads/${id}` : null,
    fetcher
  );

  return {
    lead: data?.data,
    isLoading,
    error: error || (data && !data.success ? new Error(data.error) : undefined),
  };
}

// ============ ACTIVITIES HOOKS ============

export function useActivities(params?: {
  leadId?: string;
  pagination?: PaginationParams;
  filters?: FilterParams;
  sort?: SortParams;
}): CrudOperations<Activity, ActivityInput> {
  const queryParams = new URLSearchParams();

  if (params?.leadId) {
    queryParams.append('leadId', params.leadId);
  }
  if (params?.filters?.status) {
    queryParams.append('status', params.filters.status.join(','));
  }
  if (params?.sort) {
    queryParams.append('sort', `${params.sort.field}:${params.sort.direction}`);
  }

  const url = `/api/activities${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const { data, error, isLoading } = useSWR<
    ApiResponse<PaginatedResponse<Activity>>
  >(url, fetcher);

  const create = useCallback(
    async (input: ActivityInput): Promise<Activity> => {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`Failed to create activity: ${response.status}`);
      }

      const result = (await response.json()) as ApiResponse<Activity>;
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create activity');
      }

      await mutate(url);
      return result.data;
    },
    [url]
  );

  const update = useCallback(
    async (id: string, input: Partial<ActivityInput>): Promise<Activity> => {
      const response = await fetch(`/api/activities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`Failed to update activity: ${response.status}`);
      }

      const result = (await response.json()) as ApiResponse<Activity>;
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update activity');
      }

      await Promise.all([mutate(url), mutate(`/api/activities/${id}`)]);

      return result.data;
    },
    [url]
  );

  const deleteItem = useCallback(
    async (id: string): Promise<void> => {
      const response = await fetch(`/api/activities/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete activity: ${response.status}`);
      }

      await mutate(url);
    },
    [url]
  );

  const refresh = useCallback(async () => {
    return mutate(url);
  }, [url]);

  return {
    data: data?.data?.items,
    isLoading,
    error: error || (data && !data.success ? new Error(data.error) : undefined),
    create,
    update,
    delete: deleteItem,
    refresh,
  };
}

// ============ CONTACTS HOOKS ============

export function useContacts(params?: {
  leadId?: string;
  pagination?: PaginationParams;
  filters?: FilterParams;
}): CrudOperations<Contact, ContactInput> {
  const queryParams = new URLSearchParams();

  if (params?.leadId) {
    queryParams.append('leadId', params.leadId);
  }
  if (params?.filters?.search) {
    queryParams.append('search', params.filters.search);
  }

  const url = `/api/contacts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

  const { data, error, isLoading } = useSWR<
    ApiResponse<PaginatedResponse<Contact>>
  >(url, fetcher);

  const create = useCallback(
    async (input: ContactInput): Promise<Contact> => {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`Failed to create contact: ${response.status}`);
      }

      const result = (await response.json()) as ApiResponse<Contact>;
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create contact');
      }

      await mutate(url);
      return result.data;
    },
    [url]
  );

  const update = useCallback(
    async (id: string, input: Partial<ContactInput>): Promise<Contact> => {
      const response = await fetch(`/api/contacts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error(`Failed to update contact: ${response.status}`);
      }

      const result = (await response.json()) as ApiResponse<Contact>;
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to update contact');
      }

      await mutate(url);
      return result.data;
    },
    [url]
  );

  const deleteItem = useCallback(
    async (id: string): Promise<void> => {
      const response = await fetch(`/api/contacts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete contact: ${response.status}`);
      }

      await mutate(url);
    },
    [url]
  );

  const refresh = useCallback(async () => {
    return mutate(url);
  }, [url]);

  return {
    data: data?.data?.items,
    isLoading,
    error: error || (data && !data.success ? new Error(data.error) : undefined),
    create,
    update,
    delete: deleteItem,
    refresh,
  };
}

// ============ BULK OPERATIONS HOOK ============

export function useBulkOperations() {
  const [isLoading, setIsLoading] = useState(false);

  const bulkDelete = useCallback(
    async (
      type: 'leads' | 'activities' | 'contacts',
      ids: string[]
    ): Promise<void> => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/${type}/bulk-delete`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
          throw new Error(`Failed to bulk delete ${type}: ${response.status}`);
        }

        // Revalidate relevant endpoints
        await mutate(`/api/${type}`);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const bulkUpdate = useCallback(
    async (
      type: 'leads' | 'activities' | 'contacts',
      ids: string[],
      updates: Record<string, unknown>
    ): Promise<void> => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/${type}/bulk-update`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids, updates }),
        });

        if (!response.ok) {
          throw new Error(`Failed to bulk update ${type}: ${response.status}`);
        }

        // Revalidate relevant endpoints
        await mutate(`/api/${type}`);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    bulkDelete,
    bulkUpdate,
    isLoading,
  };
}
