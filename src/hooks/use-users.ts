'use client';

import { useState, useEffect, useCallback } from 'react';

interface UserData {
  id: string;
  name: string;
  email?: string;
  role: string;
  avatarUrl?: string;
  phone?: string;
}

interface ApiResponse {
  users: Record<string, UserData>;
  count: number;
  success: boolean;
  error?: string;
}

interface UseUsersReturn {
  users: Record<string, UserData> | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getUserByData: (userId: string) => UserData | null;
}

export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<Record<string, UserData> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        );
      }

      const data: ApiResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'API returned unsuccessful response');
      }

      setUsers(data.users);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ [useUsers] Error fetching users:', errorMessage);
      setError(errorMessage);
      setUsers(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Funzione helper per ottenere dati utente per ID
  const getUserByData = useCallback(
    (userId: string): UserData | null => {
      if (!users || !userId) return null;
      return users[userId] || null;
    },
    [users]
  );

  // Fetch iniziale
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
    getUserByData,
  };
}
