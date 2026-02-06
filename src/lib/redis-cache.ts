/**
 * REDIS CACHE LAYER
 * 
 * Pattern generico per cachare query Postgres con TTL configurabile.
 * Invalidazione granulare per chiavi specifiche o pattern.
 * 
 * Performance target: Cache hit rate >70%
 */

import { Redis } from '@upstash/redis';

// Redis client (singleton)
let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    redisClient = Redis.fromEnv();
  }
  return redisClient;
}

// Metriche cache
interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
}

const metrics: CacheMetrics = {
  hits: 0,
  misses: 0,
  errors: 0,
};

export function getCacheMetrics() {
  const total = metrics.hits + metrics.misses;
  const hitRate = total > 0 ? (metrics.hits / total) * 100 : 0;
  
  return {
    ...metrics,
    total,
    hitRate: hitRate.toFixed(2) + '%',
  };
}

export function resetCacheMetrics() {
  metrics.hits = 0;
  metrics.misses = 0;
  metrics.errors = 0;
}

/**
 * Cache generico con TTL
 * 
 * @param key - Chiave cache (es: "leads:list", "dashboard:stats")
 * @param ttlSeconds - TTL in secondi (es: 300 = 5 minuti)
 * @param queryFn - Funzione che ritorna i dati se cache miss
 * @returns Dati cachati o da query
 * 
 * @example
 * const leads = await cachedQuery(
 *   'leads:active',
 *   300, // 5 minuti
 *   async () => await getLeadsFromPostgres({ stato: 'Attivo' })
 * );
 */
export async function cachedQuery<T>(
  key: string,
  ttlSeconds: number,
  queryFn: () => Promise<T>
): Promise<T> {
  try {
    const redis = getRedis();
    
    // 1. Prova cache
    const cached = await redis.get(key);
    
    if (cached !== null) {
      metrics.hits++;
      console.log(`[Cache HIT] ${key} (hit rate: ${getCacheMetrics().hitRate})`);
      return cached as T;
    }
    
    // 2. Cache miss → query database
    metrics.misses++;
    console.log(`[Cache MISS] ${key} (hit rate: ${getCacheMetrics().hitRate})`);
    
    const data = await queryFn();
    
    // 3. Salva in cache con TTL
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
    
    return data;
    
  } catch (error: any) {
    metrics.errors++;
    console.error(`[Cache ERROR] ${key}:`, error.message);
    
    // Fallback: esegui query senza cache
    return await queryFn();
  }
}

/**
 * Invalida cache per chiave specifica o pattern
 * 
 * @param pattern - Pattern chiave (supporta wildcard *)
 * 
 * @example
 * // Invalida singola chiave
 * await invalidateCache('leads:rec123456');
 * 
 * // Invalida tutte le liste lead
 * await invalidateCache('leads:list:*');
 * 
 * // Invalida tutto il dashboard
 * await invalidateCache('dashboard:*');
 */
export async function invalidateCache(pattern: string) {
  try {
    const redis = getRedis();
    
    // Se pattern contiene wildcard, usa KEYS
    if (pattern.includes('*')) {
      const keys = await redis.keys(pattern);
      
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`[Cache INVALIDATE] ${keys.length} keys matching "${pattern}"`);
      }
    } else {
      // Chiave singola
      await redis.del(pattern);
      console.log(`[Cache INVALIDATE] ${pattern}`);
    }
    
  } catch (error: any) {
    console.error(`[Cache INVALIDATE ERROR] ${pattern}:`, error.message);
  }
}

/**
 * Invalida cache per entity e operazione
 * Helper per invalidazioni comuni dopo mutazioni
 * 
 * @example
 * // Dopo create/update/delete lead
 * await invalidateCacheForEntity('lead', leadId);
 * 
 * // Invalida dashboard dopo qualsiasi mutazione
 * await invalidateCache('dashboard:*');
 */
export async function invalidateCacheForEntity(
  entity: 'lead' | 'activity' | 'order' | 'product' | 'user',
  entityId?: string
) {
  const promises: Promise<void>[] = [];
  
  // Invalida dettaglio entity
  if (entityId) {
    promises.push(invalidateCache(`${entity}:${entityId}`));
  }
  
  // Invalida liste entity
  promises.push(invalidateCache(`${entity}s:list:*`));
  
  // Invalida dashboard (stats potrebbero cambiare)
  if (entity === 'lead' || entity === 'order') {
    promises.push(invalidateCache('dashboard:*'));
  }
  
  await Promise.all(promises);
}

/**
 * Clear tutta la cache (use with caution!)
 */
export async function clearAllCache() {
  try {
    const redis = getRedis();
    await redis.flushdb();
    console.log('[Cache] Tutta la cache è stata pulita');
  } catch (error: any) {
    console.error('[Cache FLUSH ERROR]:', error.message);
  }
}

/**
 * Pattern di cache comuni per CRM
 */
export const CacheKeys = {
  // Dashboard
  dashboardStats: () => 'dashboard:stats',
  dashboardLeaderboard: () => 'dashboard:leaderboard',
  dashboardActivity: () => 'dashboard:activity',
  
  // Leads
  leadsList: (filters: string) => `leads:list:${filters}`,
  leadDetail: (id: string) => `leads:${id}`,
  leadsSearch: (query: string) => `leads:search:${query}`,
  
  // Activities
  activitiesList: (leadId?: string) => leadId ? `activities:lead:${leadId}` : 'activities:list',
  activityDetail: (id: string) => `activities:${id}`,
  
  // Orders
  ordersList: (leadId?: string) => leadId ? `orders:lead:${leadId}` : 'orders:list',
  orderDetail: (id: string) => `orders:${id}`,
  
  // Products
  productsList: () => 'products:list',
  productDetail: (id: string) => `products:${id}`,
  
  // Users
  usersList: () => 'users:list',
  userDetail: (id: string) => `users:${id}`,
};

/**
 * TTL raccomandati per CRM (secondi)
 */
export const CacheTTL = {
  // Molto frequente
  dashboardStats: 120,      // 2 minuti (aggiornamento frequente)
  leaderboard: 60,          // 1 minuto (competizione)
  
  // Frequente
  leadsList: 300,           // 5 minuti
  activitiesList: 300,      // 5 minuti
  ordersList: 300,          // 5 minuti
  
  // Medio
  leadDetail: 600,          // 10 minuti
  activityDetail: 600,      // 10 minuti
  orderDetail: 600,         // 10 minuti
  
  // Raro
  productsList: 3600,       // 1 ora (catalogo stabile)
  productDetail: 3600,      // 1 ora
  usersList: 1800,          // 30 minuti
  userDetail: 1800,         // 30 minuti
  
  // Search (medio-basso)
  search: 180,              // 3 minuti
};
