import { kv } from '@vercel/kv';

/**
 * Vercel KV client configuration for API keys storage
 */

// KV key prefixes for organization
const KV_PREFIXES = {
  API_KEY: 'api_key:',
  USER_API_KEYS: 'user_api_keys:',
  TENANT_API_KEYS: 'tenant_api_keys:',
  API_KEY_STATS: 'api_key_stats:',
  API_KEY_USAGE: 'api_key_usage:',
} as const;

export interface ApiKeyData {
  id: string;
  name: string;
  key: string; // This will be encrypted
  userId: string;
  tenantId: string;
  permissions: string[];
  isActive: boolean;
  lastUsed?: Date;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  description?: string;
  ipWhitelist?: string[];
}

export interface ApiKeyUsage {
  date: string; // YYYY-MM-DD format
  count: number;
  lastEndpoint?: string;
}

/**
 * KV storage operations for API keys
 */
export class KVApiKeyService {
  /**
   * Store an API key in KV
   */
  async storeApiKey(apiKeyData: ApiKeyData): Promise<void> {
    const keyId = `${KV_PREFIXES.API_KEY}${apiKeyData.id}`;

    // Filter out null/undefined values for Redis hset
    const filteredData = Object.fromEntries(
      Object.entries(apiKeyData).filter(
        ([_, value]) => value !== null && value !== undefined
      )
    );

    await kv.hset(keyId, filteredData);

    // Add to user's API keys list
    const userKeysId = `${KV_PREFIXES.USER_API_KEYS}${apiKeyData.userId}`;
    await kv.sadd(userKeysId, apiKeyData.id);

    // Add to tenant's API keys list
    const tenantKeysId = `${KV_PREFIXES.TENANT_API_KEYS}${apiKeyData.tenantId}`;
    await kv.sadd(tenantKeysId, apiKeyData.id);
  }

  /**
   * Retrieve an API key by ID
   */
  async getApiKey(id: string): Promise<ApiKeyData | null> {
    const keyId = `${KV_PREFIXES.API_KEY}${id}`;
    return (await kv.hgetall(keyId)) as ApiKeyData | null;
  }

  /**
   * Get all API keys for a user
   */
  async getUserApiKeys(userId: string): Promise<ApiKeyData[]> {
    const userKeysId = `${KV_PREFIXES.USER_API_KEYS}${userId}`;
    const keyIds = await kv.smembers(userKeysId);

    if (!keyIds.length) return [];

    const keys = await Promise.all(keyIds.map(id => this.getApiKey(id)));

    return keys.filter(Boolean) as ApiKeyData[];
  }

  /**
   * Get all API keys for a tenant
   */
  async getTenantApiKeys(tenantId: string): Promise<ApiKeyData[]> {
    const tenantKeysId = `${KV_PREFIXES.TENANT_API_KEYS}${tenantId}`;
    const keyIds = await kv.smembers(tenantKeysId);

    if (!keyIds.length) return [];

    const keys = await Promise.all(keyIds.map(id => this.getApiKey(id)));

    return keys.filter(Boolean) as ApiKeyData[];
  }

  /**
   * Update an API key
   */
  async updateApiKey(
    id: string,
    updates: Partial<ApiKeyData>
  ): Promise<ApiKeyData | null> {
    const existing = await this.getApiKey(id);
    if (!existing) return null;

    const updated: ApiKeyData = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    // Filter out null/undefined values for Redis hset
    const filteredUpdated = Object.fromEntries(
      Object.entries(updated).filter(
        ([_, value]) => value !== null && value !== undefined
      )
    );

    const keyId = `${KV_PREFIXES.API_KEY}${id}`;
    await kv.hset(keyId, filteredUpdated);

    return updated;
  }

  /**
   * Delete an API key
   */
  async deleteApiKey(id: string): Promise<boolean> {
    const existing = await this.getApiKey(id);
    if (!existing) return false;

    // Remove from KV
    const keyId = `${KV_PREFIXES.API_KEY}${id}`;
    await kv.del(keyId);

    // Remove from user's list
    const userKeysId = `${KV_PREFIXES.USER_API_KEYS}${existing.userId}`;
    await kv.srem(userKeysId, id);

    // Remove from tenant's list
    const tenantKeysId = `${KV_PREFIXES.TENANT_API_KEYS}${existing.tenantId}`;
    await kv.srem(tenantKeysId, id);

    // Clean up usage stats
    const usageKey = `${KV_PREFIXES.API_KEY_USAGE}${id}`;
    await kv.del(usageKey);

    return true;
  }

  /**
   * Record API key usage
   */
  async recordUsage(apiKeyId: string, endpoint?: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const usageKey = `${KV_PREFIXES.API_KEY_USAGE}${apiKeyId}:${today}`;

    // Increment daily usage count
    await kv.incr(usageKey);

    // Set expiry for usage data (30 days)
    await kv.expire(usageKey, 30 * 24 * 60 * 60);

    // Update last used timestamp and increment total usage
    await this.updateApiKey(apiKeyId, {
      lastUsed: new Date(),
      usageCount: await this.getTotalUsage(apiKeyId),
    });

    // Store last endpoint if provided
    if (endpoint) {
      const endpointKey = `${KV_PREFIXES.API_KEY_USAGE}${apiKeyId}:last_endpoint`;
      await kv.set(endpointKey, endpoint);
      await kv.expire(endpointKey, 7 * 24 * 60 * 60); // 7 days
    }
  }

  /**
   * Get usage statistics for an API key
   */
  async getUsageStats(
    apiKeyId: string,
    days: number = 30
  ): Promise<ApiKeyUsage[]> {
    const stats: ApiKeyUsage[] = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const usageKey = `${KV_PREFIXES.API_KEY_USAGE}${apiKeyId}:${dateStr}`;
      const count = (await kv.get<number>(usageKey)) || 0;

      stats.push({
        date: dateStr,
        count,
      });
    }

    return stats.reverse(); // Oldest first
  }

  /**
   * Get total usage count for an API key
   */
  private async getTotalUsage(apiKeyId: string): Promise<number> {
    const stats = await this.getUsageStats(apiKeyId, 30);
    return stats.reduce((total, stat) => total + stat.count, 0);
  }

  /**
   * Find API key by the actual key value (for authentication)
   */
  async findByKeyValue(keyValue: string): Promise<ApiKeyData | null> {
    // Note: In a production environment, you might want to hash the key
    // and store the hash for faster lookups
    // For now, we'll need to decrypt and compare all keys

    // This is not efficient for large numbers of keys
    // Consider implementing a key hash index for production
    console.warn('findByKeyValue is not optimized for large datasets');

    return null; // Implement key hashing for production
  }

  /**
   * Get API key statistics for dashboard
   */
  async getApiKeyStats(
    userId?: string,
    tenantId?: string
  ): Promise<{
    total: number;
    active: number;
    inactive: number;
    totalUsage: number;
  }> {
    let keys: ApiKeyData[] = [];

    if (userId) {
      keys = await this.getUserApiKeys(userId);
    } else if (tenantId) {
      keys = await this.getTenantApiKeys(tenantId);
    }

    const total = keys.length;
    const active = keys.filter(key => key.isActive).length;
    const inactive = total - active;
    const totalUsage = keys.reduce((sum, key) => sum + key.usageCount, 0);

    return {
      total,
      active,
      inactive,
      totalUsage,
    };
  }
}

// Singleton instance
export const kvApiKeyService = new KVApiKeyService();
