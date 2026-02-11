/**
 * SWR LocalStorage Provider
 * 
 * Persists SWR cache to localStorage for instant load on page reload.
 * Cache survives browser refresh and provides offline-first experience.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { SWRConfiguration } from 'swr';

const STORAGE_KEY = 'crm-swr-cache';
const CACHE_VERSION = '1.0';
const MAX_CACHE_AGE_MS = 1000 * 60 * 60 * 24; // 24 hours

interface CachedData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  timestamp: number;
  version: string;
}

interface CacheMap {
  [key: string]: CachedData;
}

/**
 * LocalStorage provider for SWR
 * Saves and loads cache from localStorage
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function localStorageProvider(): Map<string, any> {
  // Initialize cache from localStorage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = new Map<string, any>();
  
  if (typeof window === 'undefined') {
    return map; // SSR: return empty map
  }

  try {
    // Load existing cache from localStorage
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const cacheMap: CacheMap = JSON.parse(cached);
      const now = Date.now();
      
      // Restore cache entries that are not expired
      Object.entries(cacheMap).forEach(([key, entry]) => {
        // Check version and age
        if (
          entry.version === CACHE_VERSION &&
          now - entry.timestamp < MAX_CACHE_AGE_MS
        ) {
          map.set(key, entry.data);
        }
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[SWR Cache] Restored ${map.size} entries from localStorage`);
      }
    }
  } catch (error) {
    console.error('[SWR Cache] Failed to load from localStorage:', error);
    // Clear corrupted cache
    try {
      localStorage.removeItem(STORAGE_KEY);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // Ignore
    }
  }

  // Listen for changes and save to localStorage
  const originalSet = map.set.bind(map);
  const originalDelete = map.delete.bind(map);
  const originalClear = map.clear.bind(map);

  // Override set to persist on change
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map.set = function (key: string, value: any) {
    originalSet(key, value);
    saveToLocalStorage(map);
    return map;
  };

  // Override delete to persist on change
  map.delete = function (key: string) {
    const result = originalDelete(key);
    saveToLocalStorage(map);
    return result;
  };

  // Override clear to persist on change
  map.clear = function () {
    originalClear();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('[SWR Cache] Failed to clear localStorage:', e);
    }
  };

  return map;
}

/**
 * Save current cache Map to localStorage
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function saveToLocalStorage(map: Map<string, any>): void {
  if (typeof window === 'undefined') return;

  try {
    const cacheMap: CacheMap = {};
    const now = Date.now();

    map.forEach((value, key) => {
      cacheMap[key] = {
        data: value,
        timestamp: now,
        version: CACHE_VERSION,
      };
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheMap));
  } catch (error) {
    console.error('[SWR Cache] Failed to save to localStorage:', error);
    // Quota exceeded: try to clear old cache
    try {
      localStorage.removeItem(STORAGE_KEY);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      // Ignore
    }
  }
}

/**
 * Manual cache clear (for logout, errors, etc.)
 */
export function clearSWRCache(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY);
    if (process.env.NODE_ENV === 'development') {
      console.log('[SWR Cache] Cleared localStorage cache');
    }
  } catch (error) {
    console.error('[SWR Cache] Failed to clear cache:', error);
  }
}

/**
 * Get cache stats for debugging
 */
export function getSWRCacheStats(): {
  keys: number;
  size: number;
  age: number | null;
} {
  if (typeof window === 'undefined') {
    return { keys: 0, size: 0, age: null };
  }

  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) {
      return { keys: 0, size: 0, age: null };
    }

    const cacheMap: CacheMap = JSON.parse(cached);
    const keys = Object.keys(cacheMap).length;
    const size = cached.length; // Approximate size in bytes
    const oldestTimestamp = Math.min(
      ...Object.values(cacheMap).map(e => e.timestamp)
    );
    const age = Date.now() - oldestTimestamp;

    return { keys, size, age };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return { keys: 0, size: 0, age: null };
  }
}
