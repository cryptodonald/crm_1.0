import type { AuditEntry, AuditAction, ApiKeyProvider } from '@/types/api-keys';
import { encryptionService } from './encryption';

/**
 * Audit logger for tracking all API key operations
 * Provides comprehensive logging for compliance and security
 */
export class AuditLogger {
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // ms

  /**
   * Log an audit event
   */
  async logEvent(
    apiKeyId: string,
    action: AuditAction,
    userId: string,
    details: Record<string, any> = {},
    context?: {
      ipAddress?: string;
      userAgent?: string;
      success?: boolean;
      errorMessage?: string;
    }
  ): Promise<void> {
    const auditEntry: AuditEntry = {
      id: this.generateId(),
      apiKeyId,
      action,
      details: this.sanitizeDetails(details),
      userId,
      timestamp: new Date(),
      success: context?.success ?? true,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      errorMessage: context?.errorMessage,
    };

    await this.persistAuditEntry(auditEntry);
  }

  /**
   * Log API key creation
   */
  async logKeyCreated(
    apiKeyId: string,
    userId: string,
    provider: ApiKeyProvider,
    scopes: string[],
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.logEvent(
      apiKeyId,
      'created',
      userId,
      { provider, scopes },
      context
    );
  }

  /**
   * Log API key update
   */
  async logKeyUpdated(
    apiKeyId: string,
    userId: string,
    changes: Record<string, { from: any; to: any }>,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.logEvent(
      apiKeyId,
      'updated',
      userId,
      { changes },
      context
    );
  }

  /**
   * Log API key deletion
   */
  async logKeyDeleted(
    apiKeyId: string,
    userId: string,
    reason?: string,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.logEvent(
      apiKeyId,
      'deleted',
      userId,
      { reason },
      context
    );
  }

  /**
   * Log API key rotation
   */
  async logKeyRotated(
    apiKeyId: string,
    userId: string,
    rotationType: 'manual' | 'automatic',
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.logEvent(
      apiKeyId,
      'rotated',
      userId,
      { rotationType },
      context
    );
  }

  /**
   * Log API key access
   */
  async logKeyAccessed(
    apiKeyId: string,
    userId: string,
    operation: string,
    resourcesAccessed: string[],
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.logEvent(
      apiKeyId,
      'accessed',
      userId,
      { operation, resourcesAccessed },
      context
    );
  }

  /**
   * Log failed authentication
   */
  async logAuthFailed(
    apiKeyId: string,
    userId: string,
    reason: string,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.logEvent(
      apiKeyId,
      'failed_auth',
      userId,
      { reason },
      { ...context, success: false, errorMessage: reason }
    );
  }

  /**
   * Log permission changes
   */
  async logPermissionsChanged(
    apiKeyId: string,
    userId: string,
    addedPermissions: string[],
    removedPermissions: string[],
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    await this.logEvent(
      apiKeyId,
      'permissions_changed',
      userId,
      { addedPermissions, removedPermissions },
      context
    );
  }

  /**
   * Get audit trail for an API key
   */
  async getAuditTrail(
    apiKeyId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      actions?: AuditAction[];
    }
  ): Promise<AuditEntry[]> {
    // This would typically query your database
    // For now, we'll return a mock implementation
    const cacheKey = `audit_trail_${apiKeyId}`;
    
    try {
      // Try to get from cache first
      const cached = await this.getFromCache(cacheKey);
      if (cached) {
        return this.filterAuditEntries(cached, options);
      }

      // Fetch from storage (implement based on your storage solution)
      const entries = await this.fetchAuditEntries(apiKeyId);
      
      // Cache for future requests
      await this.setCache(cacheKey, entries, 300); // 5 minutes
      
      return this.filterAuditEntries(entries, options);
    } catch (error) {
      console.error('Failed to get audit trail:', error);
      return [];
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStats(
    tenantId: string,
    period: 'day' | 'week' | 'month' = 'month'
  ): Promise<{
    totalEvents: number;
    eventsByAction: Record<AuditAction, number>;
    uniqueUsers: number;
    failureRate: number;
  }> {
    // Mock implementation - replace with actual database queries
    return {
      totalEvents: 150,
      eventsByAction: {
        created: 25,
        updated: 45,
        deleted: 5,
        rotated: 8,
        accessed: 62,
        failed_auth: 3,
        permissions_changed: 2,
      },
      uniqueUsers: 12,
      failureRate: 0.02, // 2%
    };
  }

  private generateId(): string {
    return encryptionService.generateToken(16);
  }

  private sanitizeDetails(details: Record<string, any>): Record<string, any> {
    const sanitized = { ...details };
    
    // Remove or mask sensitive information
    const sensitiveKeys = ['apiKey', 'key', 'password', 'token', 'secret'];
    
    for (const key of sensitiveKeys) {
      if (sanitized[key]) {
        sanitized[key] = encryptionService.maskApiKey(sanitized[key]);
      }
    }
    
    return sanitized;
  }

  private async persistAuditEntry(entry: AuditEntry): Promise<void> {
    let retries = 0;
    
    while (retries < this.maxRetries) {
      try {
        // Store in your preferred storage (database, KV store, etc.)
        await this.storeAuditEntry(entry);
        return;
      } catch (error) {
        retries++;
        if (retries >= this.maxRetries) {
          console.error('Failed to persist audit entry after retries:', error);
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * retries));
      }
    }
  }

  private async storeAuditEntry(entry: AuditEntry): Promise<void> {
    // Implementation depends on your storage solution
    // For Vercel KV:
    const kv = await import('@vercel/kv').catch(() => null);
    if (kv) {
      const key = `audit:${entry.apiKeyId}:${entry.id}`;
      await kv.kv.set(key, JSON.stringify(entry), { ex: 86400 * 365 }); // 1 year
      
      // Also add to list for querying
      const listKey = `audit_list:${entry.apiKeyId}`;
      await kv.kv.lpush(listKey, entry.id);
      await kv.kv.expire(listKey, 86400 * 365);
    }
  }

  private async fetchAuditEntries(apiKeyId: string): Promise<AuditEntry[]> {
    // Implementation for fetching audit entries
    const kv = await import('@vercel/kv').catch(() => null);
    if (!kv) return [];

    try {
      const listKey = `audit_list:${apiKeyId}`;
      const entryIds = await kv.kv.lrange(listKey, 0, -1);
      
      const entries: AuditEntry[] = [];
      for (const entryId of entryIds) {
        const key = `audit:${apiKeyId}:${entryId}`;
        const entryData = await kv.kv.get(key);
        if (entryData) {
          entries.push(JSON.parse(entryData as string));
        }
      }
      
      // Sort by timestamp descending
      return entries.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('Failed to fetch audit entries:', error);
      return [];
    }
  }

  private filterAuditEntries(
    entries: AuditEntry[],
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      actions?: AuditAction[];
    }
  ): AuditEntry[] {
    let filtered = entries;

    if (options?.startDate) {
      filtered = filtered.filter(entry => 
        new Date(entry.timestamp) >= options.startDate!
      );
    }

    if (options?.endDate) {
      filtered = filtered.filter(entry => 
        new Date(entry.timestamp) <= options.endDate!
      );
    }

    if (options?.actions?.length) {
      filtered = filtered.filter(entry => 
        options.actions!.includes(entry.action)
      );
    }

    const offset = options?.offset || 0;
    const limit = options?.limit || 100;

    return filtered.slice(offset, offset + limit);
  }

  private async getFromCache(key: string): Promise<any> {
    // Simple cache implementation using Vercel KV
    const kv = await import('@vercel/kv').catch(() => null);
    if (!kv) return null;

    try {
      const cached = await kv.kv.get(`cache:${key}`);
      return cached ? JSON.parse(cached as string) : null;
    } catch {
      return null;
    }
  }

  private async setCache(key: string, value: any, ttlSeconds: number): Promise<void> {
    const kv = await import('@vercel/kv').catch(() => null);
    if (!kv) return;

    try {
      await kv.kv.set(`cache:${key}`, JSON.stringify(value), { ex: ttlSeconds });
    } catch (error) {
      console.error('Failed to set cache:', error);
    }
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();
