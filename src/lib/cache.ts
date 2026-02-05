import { Redis } from '@upstash/redis';
import { env } from '@/env';

/**
 * Redis Cache Layer (HIGH-001 fix)
 * 
 * Features:
 * - Granular cache invalidation
 * - Structured cache keys
 * - Different TTL per data type
 * - Type-safe operations
 */

// Initialize Redis client only if KV is configured
let redis: Redis | null = null;

if (env.KV_REST_API_URL && env.KV_REST_API_TOKEN) {
  redis = new Redis({
    url: env.KV_REST_API_URL,
    token: env.KV_REST_API_TOKEN,
  });
}

/**
 * TTL Strategy (in seconds)
 */
export const TTL = {
  DETAIL: 600,        // 10 minutes - detail views
  LIST: 300,          // 5 minutes - list views
  STATS: 120,         // 2 minutes - aggregations/stats
  SESSION: 3600,      // 1 hour - session data
  STATIC: 86400,      // 24 hours - rarely changing data
} as const;

/**
 * Cache key builder with structured format
 * Format: {entity}:{userId}:{filter-params}
 */
export const cacheKeys = {
  // Lead keys
  lead: (leadId: string) => `leads:${leadId}`,
  leadsList: (userId: string, filters?: Record<string, any>) => {
    const filterHash = filters ? JSON.stringify(filters) : 'all';
    return `leads:list:${userId}:${filterHash}`;
  },
  leadsStats: (userId: string) => `leads:stats:${userId}`,

  // Activity keys
  activity: (activityId: string) => `activities:${activityId}`,
  activitiesList: (userId: string, filters?: Record<string, any>) => {
    const filterHash = filters ? JSON.stringify(filters) : 'all';
    return `activities:list:${userId}:${filterHash}`;
  },

  // Order keys
  order: (orderId: string) => `orders:${orderId}`,
  ordersList: (userId: string, filters?: Record<string, any>) => {
    const filterHash = filters ? JSON.stringify(filters) : 'all';
    return `orders:list:${userId}:${filterHash}`;
  },

  // Product keys
  product: (productId: string) => `products:${productId}`,
  productsList: () => `products:list`,

  // User keys
  user: (userId: string) => `users:${userId}`,
  usersList: () => `users:list`,

  // Session keys
  session: (sessionId: string) => `session:${sessionId}`,
} as const;

/**
 * Check if cache is available
 */
export function isCacheAvailable(): boolean {
  return redis !== null;
}

/**
 * Get value from cache
 */
export async function get<T>(key: string): Promise<T | null> {
  if (!redis) return null;

  try {
    const value = await redis.get<T>(key);
    return value;
  } catch (error) {
    console.error('[Cache] Get error:', { key, error });
    return null;
  }
}

/**
 * Set value in cache with TTL
 */
export async function set<T>(
  key: string,
  value: T,
  ttlSeconds: number = TTL.DETAIL
): Promise<void> {
  if (!redis) return;

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    console.error('[Cache] Set error:', { key, error });
  }
}

/**
 * Delete single key from cache
 */
export async function del(key: string): Promise<void> {
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (error) {
    console.error('[Cache] Delete error:', { key, error });
  }
}

/**
 * Granular cache invalidation
 * 
 * ❌ BAD: invalidate('leads:*') - nukes entire cache
 * ✅ GOOD: invalidate(`leads:${leadId}`) - single lead
 */
export async function invalidate(pattern: string): Promise<void> {
  if (!redis) return;

  try {
    // If pattern contains wildcard, scan and delete matching keys
    if (pattern.includes('*')) {
      const keys: string[] = [];
      let cursor: string | number = 0;

      do {
        const result: [string | number, string[]] = await redis.scan(cursor, { match: pattern, count: 100 }) as [string | number, string[]];
        cursor = typeof result[0] === 'string' ? parseInt(result[0]) : result[0];
        keys.push(...result[1]);
      } while (cursor !== 0);

      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`[Cache] Invalidated ${keys.length} keys matching: ${pattern}`);
      }
    } else {
      // Single key invalidation
      await redis.del(pattern);
      console.log(`[Cache] Invalidated key: ${pattern}`);
    }
  } catch (error) {
    console.error('[Cache] Invalidation error:', { pattern, error });
  }
}

/**
 * Invalidate multiple keys at once
 */
export async function invalidateMany(keys: string[]): Promise<void> {
  if (!redis || keys.length === 0) return;

  try {
    await redis.del(...keys);
    console.log(`[Cache] Invalidated ${keys.length} keys`);
  } catch (error) {
    console.error('[Cache] Invalidate many error:', { keys, error });
  }
}

/**
 * Get or set pattern (cache-aside)
 */
export async function getOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = TTL.DETAIL
): Promise<T> {
  // Try cache first
  const cached = await get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch data
  const data = await fetcher();

  // Store in cache
  await set(key, data, ttlSeconds);

  return data;
}

/**
 * Clear all cache (use with caution)
 */
export async function clearAll(): Promise<void> {
  if (!redis) return;

  try {
    await redis.flushdb();
    console.log('[Cache] Cleared all cache');
  } catch (error) {
    console.error('[Cache] Clear all error:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getStats(): Promise<{
  available: boolean;
  keyCount?: number;
  memoryUsage?: number;
}> {
  if (!redis) {
    return { available: false };
  }

  try {
    // Get key count
    let keyCount = 0;
    let cursor: string | number = 0;

    do {
      const result: [string | number, string[]] = await redis.scan(cursor, { count: 1000 }) as [string | number, string[]];
      cursor = typeof result[0] === 'string' ? parseInt(result[0]) : result[0];
      keyCount += result[1].length;
    } while (cursor !== 0);

    return {
      available: true,
      keyCount,
    };
  } catch (error) {
    console.error('[Cache] Stats error:', error);
    return { available: false };
  }
}

// Export Redis client for advanced use cases
export { redis };
