/**
 * Centralized API Key Service
 * REFACTORED: Now reads directly from environment variables (Vercel)
 * No longer uses KV storage for secrets (KV only for cache/rate-limiting)
 */

class ApiKeyService {
  /**
   * Get an API key by service name from environment variables
   */
  async getApiKey(serviceName: string): Promise<string | null> {
    // Map service names to environment variable names
    const envVarMap: Record<string, string> = {
      'airtable': 'AIRTABLE_API_KEY',
      'airtable-base-id': 'AIRTABLE_BASE_ID',
      'airtable-leads-table': 'AIRTABLE_LEADS_TABLE_ID',
      'airtable-users-table': 'AIRTABLE_USERS_TABLE_ID',
      'airtable-activities-table': 'AIRTABLE_ACTIVITIES_TABLE_ID',
      'airtable-orders-table': 'AIRTABLE_ORDERS_TABLE_ID',
      'airtable-products-table': 'AIRTABLE_PRODUCTS_TABLE_ID',
      'airtable-automations-table': 'AIRTABLE_AUTOMATIONS_TABLE_ID',
      'whatsapp-api': 'WHATSAPP_API_TOKEN',
      'github-api': 'GITHUB_TOKEN',
      'google-maps': 'GOOGLE_MAPS_API_KEY',
      'vercel-blob': 'BLOB_READ_WRITE_TOKEN',
      'nextauth': 'NEXTAUTH_SECRET',
      'jwt': 'JWT_SECRET',
      'database': 'DATABASE_URL',
    };

    const envVarName = envVarMap[serviceName];
    if (!envVarName) {
      console.warn(`⚠️ Unknown service name: ${serviceName}`);
      return null;
    }

    const value = process.env[envVarName];
    if (!value) {
      console.warn(`⚠️ Environment variable not found: ${envVarName}`);
      return null;
    }

    return value;
  }

  /**
   * Specialized getters for common API keys
   */
  async getAirtableKey(): Promise<string | null> {
    return process.env.AIRTABLE_API_KEY || null;
  }

  async getWhatsAppToken(): Promise<string | null> {
    return process.env.WHATSAPP_API_TOKEN || null;
  }

  async getGitHubToken(): Promise<string | null> {
    return process.env.GITHUB_TOKEN || null;
  }

  async getGoogleMapsKey(): Promise<string | null> {
    return process.env.GOOGLE_MAPS_API_KEY || null;
  }

  async getBlobToken(): Promise<string | null> {
    return process.env.BLOB_READ_WRITE_TOKEN || null;
  }

  async getNextAuthSecret(): Promise<string | null> {
    return process.env.NEXTAUTH_SECRET || null;
  }

  async getDatabaseUrl(): Promise<string | null> {
    return process.env.DATABASE_URL || null;
  }

  /**
   * Airtable table ID helpers
   */
  async getAirtableBaseId(): Promise<string | null> {
    return process.env.AIRTABLE_BASE_ID || null;
  }

  async getAirtableLeadsTableId(): Promise<string | null> {
    return process.env.AIRTABLE_LEADS_TABLE_ID || null;
  }

  async getAirtableUsersTableId(): Promise<string | null> {
    return process.env.AIRTABLE_USERS_TABLE_ID || null;
  }

  async getAirtableActivitiesTableId(): Promise<string | null> {
    return process.env.AIRTABLE_ACTIVITIES_TABLE_ID || null;
  }

  async getAirtableOrdersTableId(): Promise<string | null> {
    return process.env.AIRTABLE_ORDERS_TABLE_ID || null;
  }

  async getAirtableProductsTableId(): Promise<string | null> {
    return process.env.AIRTABLE_PRODUCTS_TABLE_ID || null;
  }

  async getAirtableAutomationsTableId(): Promise<string | null> {
    return process.env.AIRTABLE_AUTOMATIONS_TABLE_ID || null;
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

// Airtable table ID exports
export const getAirtableBaseId = () => apiKeyService.getAirtableBaseId();
export const getAirtableLeadsTableId = () =>
  apiKeyService.getAirtableLeadsTableId();
export const getAirtableUsersTableId = () =>
  apiKeyService.getAirtableUsersTableId();
export const getAirtableActivitiesTableId = () =>
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
    // Prova prima dal KV database
    const kvToken = await this.getApiKey('vercel-blob');
    if (kvToken) {
      console.log('✅ [Blob Token] Using token from KV database');
      return kvToken;
    }
    
    // Fallback alle variabili d'ambiente
    const envToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (envToken) {
      console.log('ℹ️ [Blob Token] Using fallback token from environment variables');
      return envToken;
    }
    
    console.warn('⚠️ [Blob Token] No token found in KV or environment variables');
    return null;
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
