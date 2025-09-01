import type {
  ApiKey,
  ApiKeyWithMetadata,
  CreateApiKeyRequest,
  UpdateApiKeyRequest,
  ApiKeyListResponse,
  ApiKeyStatsResponse,
  ApiKeyHealth,
  ApiKeyMetrics,
  ApiKeyProvider,
  ApiKeyStatus,
} from '@/types/api-keys';
import { encryptionService } from './encryption';
import { auditLogger } from './audit-logger';

/**
 * Scalable API Keys Repository with Vercel KV backend
 * Features: Encryption, Multi-tenant, Caching, Audit logging
 */
export class ApiKeysRepository {
  private readonly cachePrefix = 'api_keys';
  private readonly defaultCacheTTL = 300; // 5 minutes
  private readonly maxRetries = 3;

  /**
   * Get current user/tenant context
   */
  private getCurrentContext(): { userId: string; tenantId: string } {
    // In production, get from JWT token or session
    // For now, return mock data
    return {
      userId: process.env.CURRENT_USER_ID || 'user_mock',
      tenantId: process.env.CURRENT_TENANT_ID || 'tenant_mock',
    };
  }

  /**
   * Get Vercel KV instance
   */
  private async getKV() {
    const kv = await import('@vercel/kv');
    return kv.kv;
  }

  /**
   * Generate cache key for tenant isolation
   */
  private getCacheKey(key: string, tenantId?: string): string {
    const tenant = tenantId || this.getCurrentContext().tenantId;
    return `${this.cachePrefix}:${tenant}:${key}`;
  }

  /**
   * Create new API key
   */
  async createApiKey(
    request: CreateApiKeyRequest
  ): Promise<ApiKeyWithMetadata> {
    const { userId, tenantId } = this.getCurrentContext();
    const kv = await this.getKV();

    const apiKey: ApiKey = {
      id: encryptionService.generateToken(16),
      name: request.name,
      description: request.description,
      provider: request.provider,
      key: encryptionService.encrypt(request.key),
      maskedKey: encryptionService.maskApiKey(request.key),
      scopes: request.scopes,
      status: 'active',
      tenantId,
      userId,
      environment: request.environment,
      lastUsed: undefined,
      usageCount: 0,
      expiresAt: request.expiresAt,
      rotationInterval: request.rotationInterval,
      lastRotated: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store in KV
    const keyPath = this.getCacheKey(`key:${apiKey.id}`);
    await kv.set(keyPath, JSON.stringify(apiKey));

    // Add to tenant's key list
    const listKey = this.getCacheKey('list');
    await kv.sadd(listKey, apiKey.id);

    // Invalidate cache
    await this.invalidateCache();

    // Log audit event
    await auditLogger.logKeyCreated(
      apiKey.id,
      userId,
      request.provider,
      request.scopes
    );

    return this.enrichApiKey(apiKey);
  }

  /**
   * Get API key by ID
   */
  async getApiKey(id: string): Promise<ApiKeyWithMetadata | null> {
    const kv = await this.getKV();
    const keyPath = this.getCacheKey(`key:${id}`);

    const data = await kv.get(keyPath);
    if (!data) return null;

    const apiKey = JSON.parse(data as string) as ApiKey;
    return this.enrichApiKey(apiKey);
  }

  /**
   * List API keys with pagination and filtering
   */
  async listApiKeys(options?: {
    page?: number;
    limit?: number;
    provider?: ApiKeyProvider;
    status?: ApiKeyStatus;
    environment?: string;
    search?: string;
  }): Promise<ApiKeyListResponse> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const offset = (page - 1) * limit;

    // Try cache first
    const cacheKey = this.getCacheKey(`list:${JSON.stringify(options)}`);
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const kv = await this.getKV();
    const listKey = this.getCacheKey('list');

    // Get all key IDs for tenant
    const keyIds = (await kv.smembers(listKey)) as string[];

    // Fetch all keys
    const keys: ApiKey[] = [];
    for (const keyId of keyIds) {
      const keyPath = this.getCacheKey(`key:${keyId}`);
      const data = await kv.get(keyPath);
      if (data) {
        keys.push(JSON.parse(data as string));
      }
    }

    // Apply filters
    let filteredKeys = keys;

    if (options?.provider) {
      filteredKeys = filteredKeys.filter(k => k.provider === options.provider);
    }

    if (options?.status) {
      filteredKeys = filteredKeys.filter(k => k.status === options.status);
    }

    if (options?.environment) {
      filteredKeys = filteredKeys.filter(
        k => k.environment === options.environment
      );
    }

    if (options?.search) {
      const search = options.search.toLowerCase();
      filteredKeys = filteredKeys.filter(
        k =>
          k.name.toLowerCase().includes(search) ||
          (k.description && k.description.toLowerCase().includes(search))
      );
    }

    // Sort by creation date (newest first)
    filteredKeys.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Paginate
    const total = filteredKeys.length;
    const paginatedKeys = filteredKeys.slice(offset, offset + limit);

    // Enrich with metadata
    const enrichedKeys = await Promise.all(
      paginatedKeys.map(key => this.enrichApiKey(key))
    );

    const result: ApiKeyListResponse = {
      data: enrichedKeys,
      total,
      page,
      limit,
      hasMore: offset + limit < total,
    };

    // Cache result
    await this.setCache(cacheKey, result, this.defaultCacheTTL);

    return result;
  }

  /**
   * Update API key
   */
  async updateApiKey(
    id: string,
    request: UpdateApiKeyRequest
  ): Promise<ApiKeyWithMetadata> {
    const { userId } = this.getCurrentContext();
    const kv = await this.getKV();

    const existing = await this.getApiKey(id);
    if (!existing) {
      throw new Error('API key not found');
    }

    // Track changes for audit
    const changes: Record<string, { from: any; to: any }> = {};

    const updated: ApiKey = {
      ...existing,
      updatedAt: new Date(),
    };

    if (request.name !== undefined && request.name !== existing.name) {
      changes.name = { from: existing.name, to: request.name };
      updated.name = request.name;
    }

    if (
      request.description !== undefined &&
      request.description !== existing.description
    ) {
      changes.description = {
        from: existing.description,
        to: request.description,
      };
      updated.description = request.description;
    }

    if (
      request.scopes &&
      JSON.stringify(request.scopes) !== JSON.stringify(existing.scopes)
    ) {
      changes.scopes = { from: existing.scopes, to: request.scopes };
      updated.scopes = request.scopes;
    }

    if (request.status && request.status !== existing.status) {
      changes.status = { from: existing.status, to: request.status };
      updated.status = request.status;
    }

    if (request.expiresAt !== undefined) {
      changes.expiresAt = { from: existing.expiresAt, to: request.expiresAt };
      updated.expiresAt = request.expiresAt;
    }

    if (request.rotationInterval !== undefined) {
      changes.rotationInterval = {
        from: existing.rotationInterval,
        to: request.rotationInterval,
      };
      updated.rotationInterval = request.rotationInterval;
    }

    // Store updated key
    const keyPath = this.getCacheKey(`key:${id}`);
    await kv.set(keyPath, JSON.stringify(updated));

    // Invalidate cache
    await this.invalidateCache();

    // Log audit event
    if (Object.keys(changes).length > 0) {
      await auditLogger.logKeyUpdated(id, userId, changes);
    }

    return this.enrichApiKey(updated);
  }

  /**
   * Delete API key
   */
  async deleteApiKey(id: string, reason?: string): Promise<void> {
    const { userId } = this.getCurrentContext();
    const kv = await this.getKV();

    const existing = await this.getApiKey(id);
    if (!existing) {
      throw new Error('API key not found');
    }

    // Remove from storage
    const keyPath = this.getCacheKey(`key:${id}`);
    await kv.del(keyPath);

    // Remove from list
    const listKey = this.getCacheKey('list');
    await kv.srem(listKey, id);

    // Invalidate cache
    await this.invalidateCache();

    // Log audit event
    await auditLogger.logKeyDeleted(id, userId, reason);
  }

  /**
   * Rotate API key
   */
  async rotateApiKey(id: string, newKey: string): Promise<ApiKeyWithMetadata> {
    const { userId } = this.getCurrentContext();

    const existing = await this.getApiKey(id);
    if (!existing) {
      throw new Error('API key not found');
    }

    const updated = await this.updateApiKey(id, {
      status: 'active', // Ensure it's active after rotation
    });

    // Update the encrypted key and masked version
    const kv = await this.getKV();
    const keyPath = this.getCacheKey(`key:${id}`);

    const updatedKey: ApiKey = {
      ...updated,
      key: encryptionService.encrypt(newKey),
      maskedKey: encryptionService.maskApiKey(newKey),
      lastRotated: new Date(),
      updatedAt: new Date(),
    };

    await kv.set(keyPath, JSON.stringify(updatedKey));

    // Invalidate cache
    await this.invalidateCache();

    // Log audit event
    await auditLogger.logKeyRotated(id, userId, 'manual');

    return this.enrichApiKey(updatedKey);
  }

  /**
   * Get decrypted API key value (for internal use only)
   */
  async getDecryptedKey(id: string): Promise<string | null> {
    const apiKey = await this.getApiKey(id);
    if (!apiKey) return null;

    try {
      return encryptionService.decrypt(apiKey.key);
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      return null;
    }
  }

  /**
   * Get API key statistics
   */
  async getStats(): Promise<ApiKeyStatsResponse> {
    const cacheKey = this.getCacheKey('stats');
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const { data } = await this.listApiKeys({ limit: 1000 }); // Get all keys

    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    const stats: ApiKeyStatsResponse = {
      total: data.length,
      active: data.filter(k => k.status === 'active').length,
      expired: data.filter(k => k.isExpired).length,
      expiringSoon: data.filter(k => k.isExpiringSoon).length,
      byProvider: {} as Record<ApiKeyProvider, number>,
      byStatus: {} as Record<ApiKeyStatus, number>,
      byEnvironment: {},
      healthyKeys: data.filter(k => k.healthStatus === 'healthy').length,
      lastUpdated: now,
    };

    // Calculate breakdowns
    for (const key of data) {
      stats.byProvider[key.provider] =
        (stats.byProvider[key.provider] || 0) + 1;
      stats.byStatus[key.status] = (stats.byStatus[key.status] || 0) + 1;
      stats.byEnvironment[key.environment] =
        (stats.byEnvironment[key.environment] || 0) + 1;
    }

    // Cache for 1 minute
    await this.setCache(cacheKey, stats, 60);

    return stats;
  }

  /**
   * Record API key usage
   */
  async recordUsage(
    id: string,
    operation: string,
    resourcesAccessed: string[]
  ): Promise<void> {
    const { userId } = this.getCurrentContext();
    const kv = await this.getKV();

    const existing = await this.getApiKey(id);
    if (!existing) return;

    const updated: ApiKey = {
      ...existing,
      lastUsed: new Date(),
      usageCount: existing.usageCount + 1,
      updatedAt: new Date(),
    };

    const keyPath = this.getCacheKey(`key:${id}`);
    await kv.set(keyPath, JSON.stringify(updated));

    // Log usage
    await auditLogger.logKeyAccessed(id, userId, operation, resourcesAccessed);
  }

  /**
   * Enrich API key with computed metadata
   */
  private async enrichApiKey(apiKey: ApiKey): Promise<ApiKeyWithMetadata> {
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    const enriched: ApiKeyWithMetadata = {
      ...apiKey,
      isExpired: apiKey.expiresAt ? apiKey.expiresAt < now : false,
      isExpiringSoon: apiKey.expiresAt
        ? apiKey.expiresAt < thirtyDaysFromNow
        : false,
      healthStatus: await this.getHealthStatus(apiKey.id),
      lastHealthCheck: new Date(), // Mock - implement actual health checks
      permissions: [], // Mock - implement permissions system
      auditTrail: await auditLogger.getAuditTrail(apiKey.id, { limit: 10 }),
    };

    return enriched;
  }

  /**
   * Get health status for an API key
   */
  private async getHealthStatus(
    apiKeyId: string
  ): Promise<'healthy' | 'warning' | 'error'> {
    // Mock implementation - replace with actual health checks
    // This would test connectivity to the provider's API
    return 'healthy';
  }

  /**
   * Cache utilities
   */
  private async getFromCache(key: string): Promise<any> {
    const kv = await this.getKV();
    try {
      const data = await kv.get(`cache:${key}`);
      return data ? JSON.parse(data as string) : null;
    } catch {
      return null;
    }
  }

  private async setCache(
    key: string,
    value: any,
    ttlSeconds: number
  ): Promise<void> {
    const kv = await this.getKV();
    try {
      await kv.set(`cache:${key}`, JSON.stringify(value), { ex: ttlSeconds });
    } catch (error) {
      console.error('Failed to set cache:', error);
    }
  }

  private async invalidateCache(): Promise<void> {
    const kv = await this.getKV();
    const { tenantId } = this.getCurrentContext();

    try {
      // Get all cache keys for this tenant
      const pattern = `cache:${this.cachePrefix}:${tenantId}:*`;
      // Note: Vercel KV doesn't support SCAN, so we'd need to track cache keys
      // For now, we'll implement a simple key tracking system

      const cacheKeysListKey = `cache_keys:${tenantId}`;
      const cacheKeys = (await kv.smembers(cacheKeysListKey)) as string[];

      // Delete all cached keys
      if (cacheKeys.length > 0) {
        await kv.del(...cacheKeys.map(k => `cache:${k}`));
        await kv.del(cacheKeysListKey);
      }
    } catch (error) {
      console.error('Failed to invalidate cache:', error);
    }
  }
}

// Singleton instance
export const apiKeysRepository = new ApiKeysRepository();
