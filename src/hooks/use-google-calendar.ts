'use client';

import useSWR, { useSWRConfig } from 'swr';
import type { GoogleAccount, GoogleCalendar, CalendarEvent } from '@/types/database';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

// ============================================================================
// Google Accounts
// ============================================================================

export function useGoogleAccounts() {
  const { data, error, isLoading, mutate } = useSWR<{
    accounts: Array<Pick<GoogleAccount, 'id' | 'google_email' | 'sync_status' | 'sync_error' | 'last_sync_at'> & {
      connected_at: string;
      is_corporate: boolean;
    }>;
  }>('/api/google-calendar/sync', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  return {
    accounts: data?.accounts || [],
    isLoading,
    error,
    mutate,
  };
}

// ============================================================================
// Google Calendars
// ============================================================================

export function useGoogleCalendars(accountId?: string) {
  const url = accountId
    ? `/api/google-calendar/calendars?accountId=${accountId}`
    : '/api/google-calendar/calendars';

  const { data, error, isLoading, mutate } = useSWR<{
    calendars: GoogleCalendar[];
  }>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
  });

  return {
    calendars: data?.calendars || [],
    isLoading,
    error,
    mutate,
  };
}

// ============================================================================
// Calendar Events
// ============================================================================

export function useCalendarEvents(start: string | null, end: string | null) {
  const url = start && end
    ? `/api/google-calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<{
    events: CalendarEvent[];
  }>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000,
  });

  return {
    events: data?.events || [],
    isLoading,
    error,
    mutate,
  };
}

// ============================================================================
// Sync Actions
// ============================================================================

export function useCalendarSync() {
  const { mutate: globalMutate } = useSWRConfig();

  const triggerSync = async (accountId?: string) => {
    const res = await fetch('/api/google-calendar/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accountId ? { accountId } : {}),
    });
    if (!res.ok) throw new Error('Sync failed');
    const data = await res.json();

    // Invalidate all calendar-related caches
    globalMutate((key) => typeof key === 'string' && key.startsWith('/api/google-calendar'));

    return data;
  };

  const disconnectAccount = async (accountId: string) => {
    const res = await fetch('/api/google-calendar/auth/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    });
    if (!res.ok) throw new Error('Disconnect failed');

    // Invalidate caches
    globalMutate((key) => typeof key === 'string' && key.startsWith('/api/google-calendar'));
  };

  const toggleCalendarVisibility = async (calendarId: string, isVisible: boolean) => {
    const res = await fetch(`/api/google-calendar/calendars/${calendarId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_visible: isVisible }),
    });
    if (!res.ok) throw new Error('Toggle failed');

    // Invalidate caches
    globalMutate((key) => typeof key === 'string' && key.startsWith('/api/google-calendar'));
  };

  const refreshCalendars = async (accountId: string) => {
    const res = await fetch('/api/google-calendar/calendars', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    });
    if (!res.ok) throw new Error('Refresh failed');

    globalMutate((key) => typeof key === 'string' && key.startsWith('/api/google-calendar/calendars'));
  };

  return {
    triggerSync,
    disconnectAccount,
    toggleCalendarVisibility,
    refreshCalendars,
  };
}
