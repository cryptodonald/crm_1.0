/**
 * Notifications React Hooks
 * 
 * Uses SWR with polling for real-time updates
 */

import useSWR, { useSWRConfig } from 'swr';
import { useState } from 'react';
import type { AirtableNotification } from '@/types/developer';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to fetch');
  }
  return res.json();
};

/**
 * Hook: Fetch notifications for current user
 * 
 * Polls every 30 seconds for real-time updates
 * 
 * @example
 * const { notifications, unreadCount, isLoading } = useNotifications();
 */
export function useNotifications(options?: { unreadOnly?: boolean }) {
  const params = new URLSearchParams();
  
  if (options?.unreadOnly) params.set('unread', 'true');

  const url = `/api/notifications${params.toString() ? `?${params.toString()}` : ''}`;

  const { data, error, isLoading, mutate } = useSWR<{
    notifications: AirtableNotification[];
    total: number;
    unreadCount: number;
  }>(
    url,
    fetcher,
    {
      refreshInterval: 30000, // Poll every 30 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  return {
    notifications: data?.notifications || [],
    total: data?.total || 0,
    unreadCount: data?.unreadCount || 0,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Hook: Mark notification as read/unread
 * 
 * @example
 * const { markAsRead, isUpdating } = useMarkNotificationAsRead();
 * await markAsRead('rec123', true);
 */
export function useMarkNotificationAsRead() {
  const { mutate } = useSWRConfig();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markAsRead = async (id: string, read: boolean = true): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);

    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update notification');
      }

      // Invalidate notifications cache
      mutate((key) => typeof key === 'string' && key.startsWith('/api/notifications'));

      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return { markAsRead, isUpdating, error };
}

/**
 * Hook: Mark all notifications as read
 * 
 * @example
 * const { markAllAsRead, isUpdating } = useMarkAllNotificationsAsRead();
 * await markAllAsRead();
 */
export function useMarkAllNotificationsAsRead() {
  const { mutate } = useSWRConfig();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markAllAsRead = async (): Promise<boolean> => {
    setIsUpdating(true);
    setError(null);

    try {
      // Fetch all unread notifications
      const res = await fetch('/api/notifications?unread=true');
      if (!res.ok) throw new Error('Failed to fetch unread notifications');
      
      const { notifications } = await res.json();

      // Mark each as read (parallel)
      const promises = notifications.map((notification: AirtableNotification) =>
        fetch(`/api/notifications/${notification.id}/read`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ read: true }),
        })
      );

      await Promise.all(promises);

      // Invalidate cache
      mutate((key) => typeof key === 'string' && key.startsWith('/api/notifications'));

      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return { markAllAsRead, isUpdating, error };
}
