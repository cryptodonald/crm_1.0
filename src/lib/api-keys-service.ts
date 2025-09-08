import { kvApiKeyService, ApiKeyData } from './kv';
import { encryptionService } from './encryption';
import { getCachedApiKeys } from './cache';

/**
 * Centralized API Key Service
 * Replaces process.env calls with dynamic KV database lookups
 * Includes caching, error handling, and performance optimization
 */

interface CacheEntry {
  key: string;
  timestamp: number;
  ttl: number;
}

class ApiKeyService {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly userId: string;
  private readonly tenantId: string;

  constructor() {
    // These are the ONLY env vars we keep
    this.userId = process.env.CURRENT_USER_ID || 'user_admin_001';
    this.tenantId = process.env.CURRENT_TENANT_ID || 'tenant_doctorbed';
  }

  /**
   * 🚀 Get an API key by service name with enhanced caching
   */
  async getApiKey(serviceName: string): Promise<string | null> {
    return getCachedApiKeys(serviceName, async () => {
      try {
        // Check memory cache first for ultra-fast access
        const cached = this.getCachedKey(serviceName);
        if (cached) {
          console.log(`⚡ [API-Keys] Memory cache HIT: ${serviceName}`);
          return cached;
        }

        // Fetch from KV database
        const keys = await kvApiKeyService.getUserApiKeys(this.userId);
        const targetKey = keys.find(
          key =>
            key.service === serviceName && key.isActive && this.isNotExpired(key)
        );

        if (!targetKey) {
          console.warn(`⚠️ API key not found for service: ${serviceName}`);
          return null;
        }

        // Decrypt the key
        const decryptedKey = encryptionService.decrypt(targetKey.key);

        // Cache the result in memory
        this.setCachedKey(serviceName, decryptedKey);

        // Record usage (non-blocking)
        this.recordUsage(targetKey.id, serviceName).catch(console.error);

        console.log(`✅ [API-Keys] Fetched and cached: ${serviceName}`);
        return decryptedKey;
      } catch (error) {
        console.error(`💥 Error retrieving API key for ${serviceName}:`, error);
        return null;
      }
    });
  }

  /**
   * Get multiple API keys at once for performance
   */
  async getApiKeys(
    serviceNames: string[]
  ): Promise<Record<string, string | null>> {
    const results: Record<string, string | null> = {};

    try {
      // Get all user keys once
      const keys = await kvApiKeyService.getUserApiKeys(this.userId);

      for (const serviceName of serviceNames) {
        // Check cache first
        const cached = this.getCachedKey(serviceName);
        if (cached) {
          results[serviceName] = cached;
          continue;
        }

        // Find key for this service
        const targetKey = keys.find(
          key =>
            key.service === serviceName &&
            key.isActive &&
            this.isNotExpired(key)
        );

        if (targetKey) {
          try {
            const decryptedKey = encryptionService.decrypt(targetKey.key);
            this.setCachedKey(serviceName, decryptedKey);
            results[serviceName] = decryptedKey;

            // Record usage (non-blocking)
            this.recordUsage(targetKey.id, serviceName).catch(console.error);
          } catch (decryptError) {
            console.error(
              `Error decrypting key for ${serviceName}:`,
              decryptError
            );
            results[serviceName] = null;
          }
        } else {
          console.warn(`API key not found for service: ${serviceName}`);
          results[serviceName] = null;
        }
      }

      return results;
    } catch (error) {
      console.error('Error retrieving multiple API keys:', error);
      // Return null for all requested keys
      return serviceNames.reduce(
        (acc, service) => {
          acc[service] = null;
          return acc;
        },
        {} as Record<string, string | null>
      );
    }
  }

  /**
   * Specialized getters for common API keys
   */
  async getAirtableKey(): Promise<string | null> {
    return this.getApiKey('airtable');
  }

  async getWhatsAppToken(): Promise<string | null> {
    return this.getApiKey('whatsapp-api');
  }

  async getGitHubToken(): Promise<string | null> {
    return this.getApiKey('github-api');
  }

  async getGoogleMapsKey(): Promise<string | null> {
    return this.getApiKey('google-maps');
  }

  async getBlobToken(): Promise<string | null> {
    return this.getApiKey('vercel-blob');
  }

  async getNextAuthSecret(): Promise<string | null> {
    return this.getApiKey('nextauth');
  }

  async getDatabaseUrl(): Promise<string | null> {
    return this.getApiKey('database');
  }

  /**
   * Airtable table ID helpers
   */
  async getAirtableBaseId(): Promise<string | null> {
    return this.getApiKey('airtable-base-id');
  }

  async getAirtableLeadsTableId(): Promise<string | null> {
    return this.getApiKey('airtable-leads-table');
  }

  async getAirtableUsersTableId(): Promise<string | null> {
    return this.getApiKey('airtable-users-table');
  }

  async getAirtableActivitiesTableId(): Promise<string | null> {
    return this.getApiKey('airtable-activities-table');
  }

  async getAirtableOrdersTableId(): Promise<string | null> {
    return this.getApiKey('airtable-orders-table');
  }

  async getAirtableProductsTableId(): Promise<string | null> {
    return this.getApiKey('airtable-products-table');
  }

  async getAirtableAutomationsTableId(): Promise<string | null> {
    return this.getApiKey('airtable-automations-table');
  }

  /**
   * Get all WhatsApp related keys at once
   */
  async getWhatsAppKeys(): Promise<{
    accessToken: string | null;
    webhookVerifyToken: string | null;
    appSecret: string | null;
    webhookSecret: string | null;
  }> {
    const keys = await this.getApiKeys([
      'whatsapp-api',
      'whatsapp-webhook',
      'whatsapp-security',
      'whatsapp-webhook-auth',
    ]);

    return {
      accessToken: keys['whatsapp-api'],
      webhookVerifyToken: keys['whatsapp-webhook'],
      appSecret: keys['whatsapp-security'],
      webhookSecret: keys['whatsapp-webhook-auth'],
    };
  }

  /**
   * Get all GitHub related keys at once
   */
  async getGitHubKeys(): Promise<{
    token: string | null;
    appPrivateKey: string | null;
    webhookSecret: string | null;
  }> {
    const keys = await this.getApiKeys([
      'github-api',
      'github-app',
      'github-webhook',
    ]);

    return {
      token: keys['github-api'],
      appPrivateKey: keys['github-app'],
      webhookSecret: keys['github-webhook'],
    };
  }

  /**
   * Cache management
   */
  private getCachedKey(serviceName: string): string | null {
    const entry = this.cache.get(serviceName);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(serviceName);
      return null;
    }

    return entry.key;
  }

  private setCachedKey(serviceName: string, key: string): void {
    this.cache.set(serviceName, {
      key,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL,
    });
  }

  /**
   * Clear cache for specific service or all
   */
  clearCache(serviceName?: string): void {
    if (serviceName) {
      this.cache.delete(serviceName);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Check if key is not expired
   */
  private isNotExpired(apiKey: ApiKeyData): boolean {
    if (!apiKey.expiresAt) return true;
    return new Date(apiKey.expiresAt) > new Date();
  }

  /**
   * Record API key usage (async, non-blocking)
   */
  private async recordUsage(keyId: string, serviceName: string): Promise<void> {
    try {
      await kvApiKeyService.recordUsage(keyId, serviceName);
    } catch (error) {
      console.error(`Error recording usage for ${serviceName}:`, error);
      // Don't throw - usage tracking shouldn't break the app
    }
  }

  /**
   * Health check - verify service can access KV
   */
  async healthCheck(): Promise<boolean> {
    try {
      await kvApiKeyService.getUserApiKeys(this.userId);
      return true;
    } catch (error) {
      console.error('API Key Service health check failed:', error);
      return false;
    }
  }

  /**
   * Get service statistics
   */
  getStats(): {
    cacheSize: number;
    cacheHits: number;
    userId: string;
    tenantId: string;
  } {
    return {
      cacheSize: this.cache.size,
      cacheHits: 0, // Could implement hit tracking
      userId: this.userId,
      tenantId: this.tenantId,
    };
  }
}

// Singleton instance
export const apiKeyService = new ApiKeyService();

// Convenience exports for common patterns
export const getApiKey = (serviceName: string) =>
  apiKeyService.getApiKey(serviceName);
export const getAirtableKey = () => apiKeyService.getAirtableKey();
export const getWhatsAppToken = () => apiKeyService.getWhatsAppToken();
export const getGitHubToken = () => apiKeyService.getGitHubToken();
export const getGoogleMapsKey = () => apiKeyService.getGoogleMapsKey();
export const getBlobToken = () => apiKeyService.getBlobToken();
export const getNextAuthSecret = () => apiKeyService.getNextAuthSecret();
export const getDatabaseUrl = () => apiKeyService.getDatabaseUrl();
export const getWhatsAppKeys = () => apiKeyService.getWhatsAppKeys();
export const getGitHubKeys = () => apiKeyService.getGitHubKeys();

// Airtable table ID exports
export const getAirtableBaseId = () => apiKeyService.getAirtableBaseId();
export const getAirtableLeadsTableId = () =>
  apiKeyService.getAirtableLeadsTableId();
export const getAirtableUsersTableId = () =>
  apiKeyService.getAirtableUsersTableId();
export const getAirtableActivitiesTableId = () =>
  apiKeyService.getAirtableActivitiesTableId();
export const getAirtableOrdersTableId = () =>
  apiKeyService.getAirtableOrdersTableId();
export const getAirtableProductsTableId = () =>
  apiKeyService.getAirtableProductsTableId();
export const getAirtableAutomationsTableId = () =>
  apiKeyService.getAirtableAutomationsTableId();
