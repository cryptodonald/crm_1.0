/**
 * DEPRECATED: notifications table eliminata
 * Stub per evitare errori di compilazione
 */

export function useNotifications() {
  return {
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
    markAsRead: () => Promise.resolve(),
    markAllAsRead: () => Promise.resolve(),
    mutate: () => Promise.resolve(),
  };
}
