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
  apiKeyService.getAirtableActivitiesTableId();
export const getAirtableOrdersTableId = () =>
  apiKeyService.getAirtableOrdersTableId();
export const getAirtableProductsTableId = () =>
  apiKeyService.getAirtableProductsTableId();
export const getAirtableAutomationsTableId = () =>
  apiKeyService.getAirtableAutomationsTableId();
