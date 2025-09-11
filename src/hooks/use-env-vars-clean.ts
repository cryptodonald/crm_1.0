/**
 * 🚀 API Keys UI System Clean - Estensione ottimizzata di useEnvVars
 * 
 * Sistema ibrido che combina:
 * - useEnvVars esistente (CRUD operations complete)
 * - UI System Clean generico (optimistic updates, queue API)
 * 
 * Mantiene compatibilità completa con pagina API Keys esistente
 * mentre aggiunge capacità ottimistiche enterprise.
 */

import { useState, useEffect, useCallback } from 'react';
import { useEnvVars } from '@/hooks/use-env-vars';
import { 
  createUISystemClean, 
  createGenericAPI, 
  GenericUISystemUtils,
  type Entity 
} from '@/lib/ui-system-clean-generic';

// ===== API KEY ENTITY TYPE =====
interface ApiKey extends Entity {
  id: string;
  name: string;
  description?: string;
  permissions?: string[];
  isActive: boolean;
  expiresAt?: string;
  ipWhitelist?: string[];
  usageCount: number;
  lastUsed?: Date;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  tenantId: string;
}

// ===== API KEY FORM DATA =====
interface ApiKeyFormData {
  name: string;
  description?: string;
  permissions?: string[];
  expiresAt?: string;
  ipWhitelist?: string[];
}

// ===== UPDATE DATA =====
interface ApiKeyUpdateData {
  name?: string;
  description?: string;
  permissions?: string[];
  isActive?: boolean;
  expiresAt?: string;
  ipWhitelist?: string[];
}

// ===== API STATS =====
interface ApiKeyStats {
  total: number;
  active: number;
  inactive: number;
  totalUsage: number;
  expired?: number;
  expiringSoon?: number;
}

// ===== API KEYS CLIENT =====
const apiKeysAPI = createGenericAPI<ApiKey>({
  baseUrl: '/api/api-keys',
  entityName: 'api-keys',
  transform: {
    request: (data: any) => data,
    response: (data: any) => ({
      id: data.id,
      name: data.name,
      description: data.description,
      permissions: data.permissions || [],
      isActive: data.isActive ?? true,
      expiresAt: data.expiresAt,
      ipWhitelist: data.ipWhitelist || [],
      usageCount: data.usageCount || 0,
      lastUsed: data.lastUsed ? new Date(data.lastUsed) : undefined,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      userId: data.userId,
      tenantId: data.tenantId,
    }),
  },
});

// ===== UI SYSTEM CLEAN INSTANCE =====
const apiKeysUISystem = createUISystemClean<ApiKey>({
  retries: 2,
  timeout: 15000,
  showToasts: true,
  enableQueue: true,
  entityName: 'API key',
  entityNamePlural: 'API keys'
});

// ===== HOOK PRINCIPALE =====
interface UseEnvVarsCleanProps {
  enableOptimistic?: boolean;
}

export function useEnvVarsClean({
  enableOptimistic = true,
}: UseEnvVarsCleanProps = {}) {
  
  // 🏗️ LAYER 1: Hook originale (CRUD operations complete)
  const originalEnvVarsHook = useEnvVars();

  // 🚀 LAYER 2: Optimistic UI State (per operazioni immediate)
  const [optimisticApiKeys, setOptimisticApiKeys] = useState<ApiKey[]>([]);
  const [hasPendingOperations, setHasPendingOperations] = useState(false);

  // 🔄 Sync tra hook originale e optimistic state
  useEffect(() => {
    if (!hasPendingOperations) {
      const transformed = originalEnvVarsHook.apiKeys.map(key => ({
        ...key,
        createdAt: new Date(key.createdAt),
        updatedAt: new Date(key.updatedAt),
        lastUsed: key.lastUsed ? new Date(key.lastUsed) : undefined,
      } as ApiKey));
      setOptimisticApiKeys(transformed);
    }
  }, [originalEnvVarsHook.apiKeys, hasPendingOperations]);

  // 🎯 OPTIMISTIC OPERATIONS
  const createApiKey = useCallback(async (keyData: ApiKeyFormData): Promise<ApiKey | null> => {
    if (!enableOptimistic) {
      // Fallback al metodo tradizionale
      const result = await originalEnvVarsHook.createApiKey(keyData);
      return result ? result as ApiKey : null;
    }

    // 🚀 Optimistic creation
    const tempId = GenericUISystemUtils.generateTempId('apikey');
    const now = new Date();
    const tempApiKey: ApiKey = {
      id: tempId,
      name: keyData.name,
      description: keyData.description,
      permissions: keyData.permissions || [],
      isActive: true,
      expiresAt: keyData.expiresAt,
      ipWhitelist: keyData.ipWhitelist || [],
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
      userId: 'user_dev_001', // Placeholder per dev
      tenantId: 'tenant_dev', // Placeholder per dev
    };

    const success = await apiKeysUISystem.OptimisticManager.execute(
      {
        type: 'create',
        entity: 'api-keys',
        tempData: tempApiKey,
      },
      {
        onUIUpdate: (newKey) => {
          console.log('⚡ [ApiKeysClean] Adding optimistic API key:', newKey.id);
          setOptimisticApiKeys(prev => GenericUISystemUtils.addItem(prev, newKey));
          setHasPendingOperations(true);
        },
        onRollback: (failedKey) => {
          console.log('🔄 [ApiKeysClean] Rolling back failed API key:', failedKey.id);
          setOptimisticApiKeys(prev => GenericUISystemUtils.removeItem(prev, failedKey.id));
          setHasPendingOperations(false);
        },
        apiCall: async () => {
          const result = await originalEnvVarsHook.createApiKey(keyData);
          if (!result) throw new Error('Failed to create API key');
          
          const transformedResult = apiKeysAPI.transform?.response ? 
            apiKeysAPI.transform.response(result) : result as ApiKey;
          
          // 🔄 Sostituisci temporary con real data
          setOptimisticApiKeys(prev => 
            GenericUISystemUtils.replaceTempItem(prev, tempId, transformedResult)
          );
          
          // 🔄 Refresh hook originale in background (non-blocking)
          setTimeout(() => {
            originalEnvVarsHook.refresh();
            setHasPendingOperations(false);
          }, 1000);
          
          return transformedResult;
        },
      },
      apiKeysUISystem.queueManager
    );

    return success ? tempApiKey : null;
  }, [enableOptimistic, originalEnvVarsHook]);

  const updateApiKey = useCallback(async (keyId: string, updates: ApiKeyUpdateData): Promise<boolean> => {
    if (!enableOptimistic) {
      // Fallback al metodo tradizionale
      const result = await originalEnvVarsHook.updateApiKey(keyId, updates);
      return !!result;
    }

    // 🚀 Optimistic update
    const currentKey = optimisticApiKeys.find(key => key.id === keyId);
    if (!currentKey) return false;

    const updatedKey: ApiKey = { 
      ...currentKey, 
      ...updates,
      updatedAt: new Date(),
    };

    const success = await apiKeysUISystem.OptimisticManager.execute(
      {
        type: 'update',
        entity: 'api-keys',
        tempData: updatedKey,
        originalData: currentKey,
      },
      {
        onUIUpdate: (updated) => {
          console.log('⚡ [ApiKeysClean] Updating optimistic API key:', updated.id);
          setOptimisticApiKeys(prev => 
            GenericUISystemUtils.updateItem(prev, keyId, updates)
          );
          setHasPendingOperations(true);
        },
        onRollback: (original) => {
          console.log('🔄 [ApiKeysClean] Rolling back failed update:', original.id);
          setOptimisticApiKeys(prev => 
            GenericUISystemUtils.updateItem(prev, keyId, original)
          );
          setHasPendingOperations(false);
        },
        apiCall: async () => {
          const result = await originalEnvVarsHook.updateApiKey(keyId, updates);
          if (!result) throw new Error('Failed to update API key');
          
          const transformedResult = apiKeysAPI.transform?.response ? 
            apiKeysAPI.transform.response(result) : result as ApiKey;
          
          // 🔄 Refresh hook originale in background
          setTimeout(() => {
            originalEnvVarsHook.refresh();
            setHasPendingOperations(false);
          }, 1000);
          
          return transformedResult;
        },
      },
      apiKeysUISystem.queueManager
    );

    return success;
  }, [enableOptimistic, optimisticApiKeys, originalEnvVarsHook]);

  const deleteApiKey = useCallback(async (keyId: string): Promise<boolean> => {
    if (!enableOptimistic) {
      // Fallback al metodo tradizionale 
      return await originalEnvVarsHook.deleteApiKey(keyId);
    }

    // 🚀 Optimistic deletion
    const keyToDelete = optimisticApiKeys.find(key => key.id === keyId);
    if (!keyToDelete) return false;

    const success = await apiKeysUISystem.OptimisticManager.execute(
      {
        type: 'delete',
        entity: 'api-keys',
        tempData: keyToDelete,
        originalData: keyToDelete,
      },
      {
        onUIUpdate: (deleted) => {
          console.log('⚡ [ApiKeysClean] Deleting optimistic API key:', deleted.id);
          setOptimisticApiKeys(prev => 
            GenericUISystemUtils.removeItem(prev, keyId)
          );
          setHasPendingOperations(true);
        },
        onRollback: (restored) => {
          console.log('🔄 [ApiKeysClean] Rolling back failed deletion:', restored.id);
          setOptimisticApiKeys(prev => 
            GenericUISystemUtils.addItem(prev, restored)
          );
          setHasPendingOperations(false);
        },
        apiCall: async () => {
          const success = await originalEnvVarsHook.deleteApiKey(keyId);
          if (!success) throw new Error('Failed to delete API key');
          
          // 🔄 Refresh hook originale in background
          setTimeout(() => {
            originalEnvVarsHook.refresh();
            setHasPendingOperations(false);
          }, 1000);
          
          return keyToDelete; // Return per tipo consistency
        },
      },
      apiKeysUISystem.queueManager
    );

    return success;
  }, [enableOptimistic, optimisticApiKeys, originalEnvVarsHook]);

  // 🔄 PASSTHROUGH METHODS (dal hook originale)
  const refresh = useCallback(async () => {
    setHasPendingOperations(false);
    return originalEnvVarsHook.refresh();
  }, [originalEnvVarsHook]);

  const clearError = useCallback(() => {
    return originalEnvVarsHook.clearError();
  }, [originalEnvVarsHook]);

  const getApiKeyUsageStats = useCallback(async (keyId: string, days = 30) => {
    return originalEnvVarsHook.getApiKeyUsageStats(keyId, days);
  }, [originalEnvVarsHook]);

  // 🎯 RETURN INTERFACE (compatibile con useEnvVars + estensioni)
  return {
    // 📊 Data (optimistic se abilitato, altrimenti originale)
    apiKeys: enableOptimistic ? optimisticApiKeys : originalEnvVarsHook.apiKeys.map(k => k as ApiKey),
    stats: originalEnvVarsHook.stats,
    loading: originalEnvVarsHook.loading,
    error: originalEnvVarsHook.error,
    creating: originalEnvVarsHook.creating,
    updating: originalEnvVarsHook.updating,
    deleting: originalEnvVarsHook.deleting,
    
    // 🔄 Original methods (passthrough)
    fetchApiKeys: originalEnvVarsHook.fetchApiKeys,
    fetchStats: originalEnvVarsHook.fetchStats,
    clearError,
    refresh,
    getApiKeyUsageStats,
    
    // 🚀 NEW: Optimistic operations
    createApiKey,
    updateApiKey, 
    deleteApiKey,
    
    // 🎛️ System status
    hasPendingOperations,
    enableOptimistic,
    queueStatus: apiKeysUISystem.monitor.getQueueStatus(apiKeysUISystem.queueManager),
  };
}

// ===== UTILITIES ESPORTATE =====
export const ApiKeysUISystemUtils = {
  ...GenericUISystemUtils,
  
  /**
   * Filter API keys by active status
   */
  filterKeysByActive: (keys: ApiKey[], active: boolean): ApiKey[] => {
    return keys.filter(key => key.isActive === active);
  },
  
  /**
   * Filter API keys by permission
   */
  filterKeysByPermission: (keys: ApiKey[], permission: string): ApiKey[] => {
    return keys.filter(key => key.permissions?.includes(permission));
  },
  
  /**
   * Check if API key is expired
   */
  isKeyExpired: (key: ApiKey): boolean => {
    return key.expiresAt ? new Date(key.expiresAt) < new Date() : false;
  },
  
  /**
   * Check if API key expires soon (within 7 days)
   */
  isKeyExpiringSoon: (key: ApiKey): boolean => {
    if (!key.expiresAt) return false;
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return new Date(key.expiresAt) <= weekFromNow;
  },
  
  /**
   * Get key display name
   */
  getKeyDisplayName: (key: ApiKey): string => {
    return key.name || `Key ${key.id.slice(-6)}`;
  },
  
  /**
   * Mask API key for display
   */
  maskApiKey: (key: string): string => {
    if (key.length <= 8) return key;
    return `${key.slice(0, 4)}${'*'.repeat(key.length - 8)}${key.slice(-4)}`;
  },
};

console.log('🚀 API Keys UI System Clean initialized');
