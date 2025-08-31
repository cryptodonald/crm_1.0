import { useState, useEffect, useCallback } from 'react';
import { ApiKeyData } from '@/lib/kv';

interface ApiKeyStats {
  total: number;
  active: number;
  inactive: number;
  totalUsage: number;
  expired?: number;
  expiringSoon?: number;
}

interface ApiKeyUsageStats {
  date: string;
  count: number;
  lastEndpoint?: string;
}

interface ApiKeyDetailedStats {
  apiKeyId: string;
  name: string;
  usageStats: ApiKeyUsageStats[];
  totalUsage: number;
  dailyAverage: number;
}

interface CreateApiKeyData {
  name: string;
  description?: string;
  permissions?: string[];
  expiresAt?: string;
  ipWhitelist?: string[];
}

interface UpdateApiKeyData {
  name?: string;
  description?: string;
  permissions?: string[];
  isActive?: boolean;
  expiresAt?: string;
  ipWhitelist?: string[];
}

interface UseEnvVarsReturn {
  // State
  apiKeys: ApiKeyData[];
  stats: ApiKeyStats | null;
  loading: boolean;
  error: string | null;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  
  // Actions
  fetchApiKeys: () => Promise<void>;
  fetchStats: () => Promise<void>;
  createApiKey: (data: CreateApiKeyData) => Promise<ApiKeyData | null>;
  updateApiKey: (id: string, data: UpdateApiKeyData) => Promise<ApiKeyData | null>;
  deleteApiKey: (id: string) => Promise<boolean>;
  getApiKeyUsageStats: (keyId: string, days?: number) => Promise<ApiKeyDetailedStats | null>;
  
  // Utilities
  clearError: () => void;
  refresh: () => Promise<void>;
}

/**
 * Custom hook for managing API Keys (Environment Variables)
 * Provides CRUD operations and state management for API keys
 */
export function useEnvVars(): UseEnvVarsReturn {
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [stats, setStats] = useState<ApiKeyStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Handle API errors
   */
  const handleError = useCallback((err: any, context: string) => {
    console.error(`Error in ${context}:`, err);
    const message = err.message || `Failed to ${context.toLowerCase()}`;
    setError(message);
  }, []);

  /**
   * Fetch all API keys
   */
  const fetchApiKeys = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/api-keys');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setApiKeys(data.apiKeys || []);
      
      // Update stats if included
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      handleError(err, 'fetch API keys');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  /**
   * Fetch API key statistics
   */
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/api-keys/stats');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setStats(data.overview || null);
    } catch (err) {
      handleError(err, 'fetch statistics');
    }
  }, [handleError]);

  /**
   * Create a new API key
   */
  const createApiKey = useCallback(async (data: CreateApiKeyData): Promise<ApiKeyData | null> => {
    try {
      setCreating(true);
      setError(null);
      
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create API key');
      }
      
      const result = await response.json();
      
      // Refresh the list to get updated data
      await fetchApiKeys();
      
      return result.apiKey;
    } catch (err) {
      handleError(err, 'create API key');
      return null;
    } finally {
      setCreating(false);
    }
  }, [handleError, fetchApiKeys]);

  /**
   * Update an existing API key
   */
  const updateApiKey = useCallback(async (
    id: string, 
    data: UpdateApiKeyData
  ): Promise<ApiKeyData | null> => {
    try {
      setUpdating(true);
      setError(null);
      
      const response = await fetch(`/api/api-keys/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update API key');
      }
      
      const updatedKey = await response.json();
      
      // Update the local state
      setApiKeys(prev => 
        prev.map(key => key.id === id ? updatedKey : key)
      );
      
      return updatedKey;
    } catch (err) {
      handleError(err, 'update API key');
      return null;
    } finally {
      setUpdating(false);
    }
  }, [handleError]);

  /**
   * Delete an API key
   */
  const deleteApiKey = useCallback(async (id: string): Promise<boolean> => {
    try {
      setDeleting(true);
      setError(null);
      
      const response = await fetch(`/api/api-keys/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete API key');
      }
      
      // Remove from local state
      setApiKeys(prev => prev.filter(key => key.id !== id));
      
      // Refresh stats
      await fetchStats();
      
      return true;
    } catch (err) {
      handleError(err, 'delete API key');
      return false;
    } finally {
      setDeleting(false);
    }
  }, [handleError, fetchStats]);

  /**
   * Get detailed usage statistics for a specific API key
   */
  const getApiKeyUsageStats = useCallback(async (
    keyId: string, 
    days: number = 30
  ): Promise<ApiKeyDetailedStats | null> => {
    try {
      const response = await fetch(
        `/api/api-keys/stats?keyId=${keyId}&days=${days}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (err) {
      handleError(err, 'fetch usage statistics');
      return null;
    }
  }, [handleError]);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    await Promise.all([
      fetchApiKeys(),
      fetchStats(),
    ]);
  }, [fetchApiKeys, fetchStats]);

  // Initial data load
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    // State
    apiKeys,
    stats,
    loading,
    error,
    creating,
    updating,
    deleting,
    
    // Actions
    fetchApiKeys,
    fetchStats,
    createApiKey,
    updateApiKey,
    deleteApiKey,
    getApiKeyUsageStats,
    
    // Utilities
    clearError,
    refresh,
  };
}
