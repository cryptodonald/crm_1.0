/**
 * In-Memory Cache for Development
 * 
 * Bypasses Upstash Redis latency in development.
 * Production still uses Redis for distributed caching.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<string, CacheEntry<any>>();

export const memoryCache = {
  async get<T>(key: string): Promise<T | null> {
    const entry = cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check expiration
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  },
  
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    cache.set(key, {
      data: value,
      expiresAt: Date.now() + (ttlSeconds * 1000),
    });
  },
  
  async del(key: string): Promise<void> {
    cache.delete(key);
  },
  
  async clear(): Promise<void> {
    cache.clear();
  },
  
  async invalidate(pattern: string): Promise<void> {
    if (pattern.includes('*')) {
      // Wildcard pattern
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      const keysToDelete: string[] = [];
      
      cache.forEach((_, key) => {
        if (regex.test(key)) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => cache.delete(key));
      console.log(`[MemCache] Invalidated ${keysToDelete.length} keys matching: ${pattern}`);
    } else {
      cache.delete(pattern);
    }
  },
  
  getStats() {
    return {
      size: cache.size,
      keys: Array.from(cache.keys()),
    };
  },
};
