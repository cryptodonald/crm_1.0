import { kv } from '@vercel/kv';

/**
 * 🚀 Sistema di Caching Centralizzato per Performance
 * 
 * Implementa caching intelligente per ridurre latenza API da 10s a <2s
 * Usa Vercel KV con TTL configurabile per ogni tipo di dato
 */

export interface CacheOptions {
  ttl: number; // seconds
  prefix?: string;
  skipCache?: boolean;
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
}

class CacheService {
  private stats: Map<string, CacheStats> = new Map();
  private readonly STATS_KEY = 'cache:stats';

  /**
   * 🎯 Cache wrapper generico con timing e statistiche
   */
  async getWithCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: CacheOptions
  ): Promise<T> {
    const fullKey = options.prefix ? `${options.prefix}:${key}` : key;
    const startTime = performance.now();

    try {
      // Skip cache se richiesto
      if (options.skipCache) {
        console.log(`⚡ [Cache] Skipping cache for: ${fullKey}`);
        const result = await fetchFn();
        this.recordMiss(fullKey);
        return result;
      }

      // Prova a leggere dalla cache
      const cached = await kv.get<T>(fullKey);
      
      if (cached !== null) {
        const cacheTime = performance.now() - startTime;
        console.log(`✅ [Cache] HIT ${fullKey} (${cacheTime.toFixed(2)}ms)`);
        this.recordHit(fullKey);
        return cached;
      }

      // Cache miss - esegui fetch
      console.log(`❌ [Cache] MISS ${fullKey} - fetching...`);
      const result = await fetchFn();
      
      // Salva in cache con TTL
      await kv.setex(fullKey, options.ttl, result);
      
      const totalTime = performance.now() - startTime;
      console.log(`📦 [Cache] STORED ${fullKey} (TTL: ${options.ttl}s, ${totalTime.toFixed(2)}ms)`);
      
      this.recordMiss(fullKey);
      return result;

    } catch (error) {
      console.error(`💥 [Cache] Error for ${fullKey}:`, error);
      // Fallback: esegui sempre la funzione
      return await fetchFn();
    }
  }

  /**
   * 🗑️ Invalidazione cache selettiva per pattern
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      // Scan per trovare tutte le chiavi che matchano
      const keys = await this.scanKeys(pattern);
      
      if (keys.length === 0) {
        console.log(`🔍 [Cache] No keys found for pattern: ${pattern}`);
        return 0;
      }

      // Elimina tutte le chiavi trovate
      const pipeline = kv.pipeline();
      keys.forEach(key => pipeline.del(key));
      await pipeline.exec();

      console.log(`🧹 [Cache] Invalidated ${keys.length} keys for pattern: ${pattern}`);
      return keys.length;
    } catch (error) {
      console.error(`💥 [Cache] Error invalidating pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * 🔍 Scan per trovare chiavi con pattern
   */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = 0;
    
    do {
      try {
        const result = await kv.scan(cursor, { match: pattern, count: 100 });
        cursor = result[0];
        keys.push(...result[1]);
      } catch (error) {
        console.warn(`⚠️ [Cache] Scan error:`, error);
        break;
      }
    } while (cursor !== 0);
    
    return keys;
  }

  /**
   * 📊 Statistiche cache
   */
  private recordHit(key: string): void {
    const stats = this.stats.get(key) || { hits: 0, misses: 0, hitRate: 0, totalRequests: 0 };
    stats.hits++;
    stats.totalRequests++;
    stats.hitRate = (stats.hits / stats.totalRequests) * 100;
    this.stats.set(key, stats);
  }

  private recordMiss(key: string): void {
    const stats = this.stats.get(key) || { hits: 0, misses: 0, hitRate: 0, totalRequests: 0 };
    stats.misses++;
    stats.totalRequests++;
    stats.hitRate = (stats.hits / stats.totalRequests) * 100;
    this.stats.set(key, stats);
  }

  /**
   * 📈 Ottieni statistiche aggregate
   */
  getStats(): Record<string, CacheStats> {
    const result: Record<string, CacheStats> = {};
    this.stats.forEach((value, key) => {
      result[key] = { ...value };
    });
    return result;
  }

  /**
   * 🧹 Pulisci tutte le cache
   */
  async clearAll(): Promise<void> {
    try {
      await kv.flushall();
      this.stats.clear();
      console.log('🧹 [Cache] All caches cleared');
    } catch (error) {
      console.error('💥 [Cache] Error clearing all caches:', error);
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();

/**
 * 🎯 Helper specifici per il CRM
 */

// Lead caching (TTL: 60 secondi)
export const getCachedLead = async <T>(
  leadId: string, 
  fetchFn: () => Promise<T>
): Promise<T> => {
  return cacheService.getWithCache(
    leadId,
    fetchFn,
    { 
      ttl: 60,
      prefix: 'lead'
    }
  );
};

// Users caching (TTL: 300 secondi = 5 minuti)
export const getCachedUsers = async <T>(
  fetchFn: () => Promise<T>
): Promise<T> => {
  return cacheService.getWithCache(
    'all',
    fetchFn,
    { 
      ttl: 300,
      prefix: 'users'
    }
  );
};

// API Keys caching (TTL: 300 secondi)
export const getCachedApiKeys = async <T>(
  service: string,
  fetchFn: () => Promise<T>
): Promise<T> => {
  return cacheService.getWithCache(
    service,
    fetchFn,
    { 
      ttl: 300,
      prefix: 'apikey'
    }
  );
};

// Invalidazione specifica
export const invalidateLeadCache = (leadId?: string) => {
  if (leadId) {
    return cacheService.invalidatePattern(`lead:${leadId}`);
  }
  return cacheService.invalidatePattern('lead:*');
};

export const invalidateUsersCache = () => {
  return cacheService.invalidatePattern('users:*');
};

// Activities caching (TTL: 120 secondi = 2 minuti)
export const getCachedActivities = async <T>(
  cacheKey: string,
  fetchFn: () => Promise<T>
): Promise<T> => {
  return cacheService.getWithCache(
    cacheKey,
    fetchFn,
    { 
      ttl: 120,
      prefix: 'activities'
    }
  );
};

export const invalidateActivitiesCache = () => {
  return cacheService.invalidatePattern('activities:*');
};

// Orders caching (TTL: 180 secondi = 3 minuti)
export const getCachedOrders = async <T>(
  cacheKey: string,
  fetchFn: () => Promise<T>
): Promise<T> => {
  return cacheService.getWithCache(
    cacheKey,
    fetchFn,
    { 
      ttl: 180,
      prefix: 'orders'
    }
  );
};

export const invalidateOrdersCache = () => {
  return cacheService.invalidatePattern('orders:*');
};

// Places Search caching (TTL: 3600 secondi = 1 ora)
export const getCachedPlacesSearch = async <T>(
  cacheKey: string,
  fetchFn: () => Promise<T>
): Promise<T> => {
  return cacheService.getWithCache(
    cacheKey,
    fetchFn,
    { 
      ttl: 3600, // Places searches are stable and have rate limits
      prefix: 'places_search'
    }
  );
};

// Places Details caching (TTL: 86400 secondi = 24 ore)
export const getCachedPlacesDetails = async <T>(
  cacheKey: string,
  fetchFn: () => Promise<T>
): Promise<T> => {
  return cacheService.getWithCache(
    cacheKey,
    fetchFn,
    { 
      ttl: 86400, // Place details rarely change
      prefix: 'places_details'
    }
  );
};

export const invalidatePlacesCache = () => {
  return Promise.all([
    cacheService.invalidatePattern('places_search:*'),
    cacheService.invalidatePattern('places_details:*'),
  ]);
};

/**
 * 🔥 Debug utilities
 */
export const debugCache = {
  stats: () => cacheService.getStats(),
  clear: () => cacheService.clearAll(),
  invalidateLead: invalidateLeadCache,
  invalidateUsers: invalidateUsersCache,
  invalidateActivities: invalidateActivitiesCache,
  invalidateOrders: invalidateOrdersCache,
  invalidatePlaces: invalidatePlacesCache,
};
