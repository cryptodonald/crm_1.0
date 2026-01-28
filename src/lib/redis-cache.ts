/**
 * Redis Cache Layer usando Vercel KV (Upstash)
 * Fornisce caching condiviso tra istanze Vercel + Real-time Pub/Sub
 */

import { kv } from '@vercel/kv';

/**
 * Redis Cache Service
 * Gestisce caching granulare per Leads, Orders, Activities, Products
 */
export class RedisCache {
  private static readonly PREFIX = 'crm:';
  private static readonly DEFAULT_TTL = 300; // 5 minuti

  /**
   * LEADS CACHE
   */
  static async getLeads(key: string): Promise<any | null> {
    try {
      const data = await kv.get(`${this.PREFIX}leads:${key}`);
      console.log(`🔍 Redis GET leads:${key} → ${data ? 'HIT' : 'MISS'}`);
      return data;
    } catch (error) {
      console.error('❌ Redis GET error:', error);
      return null; // Fallback gracefully
    }
  }

  static async setLeads(key: string, data: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      await kv.setex(`${this.PREFIX}leads:${key}`, ttl, JSON.stringify(data));
      console.log(`✅ Redis SET leads:${key} (TTL: ${ttl}s)`);
    } catch (error) {
      console.error('❌ Redis SET error:', error);
      // Non bloccare l'app se Redis fallisce
    }
  }

  static async invalidateLeads(pattern: string = '*'): Promise<void> {
    try {
      // Usa scan per trovare tutte le chiavi che matchano il pattern
      const keys = await kv.keys(`${this.PREFIX}leads:${pattern}`);
      if (keys && keys.length > 0) {
        await kv.del(...keys);
        console.log(`🧹 Redis invalidated ${keys.length} leads keys`);
      }
    } catch (error) {
      console.error('❌ Redis invalidation error:', error);
    }
  }

  /**
   * ORDERS CACHE
   */
  static async getOrders(key: string): Promise<any | null> {
    try {
      const data = await kv.get(`${this.PREFIX}orders:${key}`);
      console.log(`🔍 Redis GET orders:${key} → ${data ? 'HIT' : 'MISS'}`);
      return data;
    } catch (error) {
      console.error('❌ Redis GET orders error:', error);
      return null;
    }
  }

  static async setOrders(key: string, data: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      await kv.setex(`${this.PREFIX}orders:${key}`, ttl, JSON.stringify(data));
      console.log(`✅ Redis SET orders:${key} (TTL: ${ttl}s)`);
    } catch (error) {
      console.error('❌ Redis SET orders error:', error);
    }
  }

  static async invalidateOrders(pattern: string = '*'): Promise<void> {
    try {
      const keys = await kv.keys(`${this.PREFIX}orders:${pattern}`);
      if (keys && keys.length > 0) {
        await kv.del(...keys);
        console.log(`🧹 Redis invalidated ${keys.length} orders keys`);
      }
    } catch (error) {
      console.error('❌ Redis invalidation error:', error);
    }
  }

  /**
   * ACTIVITIES CACHE
   */
  static async getActivities(key: string): Promise<any | null> {
    try {
      const data = await kv.get(`${this.PREFIX}activities:${key}`);
      console.log(`🔍 Redis GET activities:${key} → ${data ? 'HIT' : 'MISS'}`);
      return data;
    } catch (error) {
      console.error('❌ Redis GET activities error:', error);
      return null;
    }
  }

  static async setActivities(key: string, data: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      await kv.setex(`${this.PREFIX}activities:${key}`, ttl, JSON.stringify(data));
      console.log(`✅ Redis SET activities:${key} (TTL: ${ttl}s)`);
    } catch (error) {
      console.error('❌ Redis SET activities error:', error);
    }
  }

  static async invalidateActivities(pattern: string = '*'): Promise<void> {
    try {
      const keys = await kv.keys(`${this.PREFIX}activities:${pattern}`);
      if (keys && keys.length > 0) {
        await kv.del(...keys);
        console.log(`🧹 Redis invalidated ${keys.length} activities keys`);
      }
    } catch (error) {
      console.error('❌ Redis invalidation error:', error);
    }
  }

  /**
   * REAL-TIME PUB/SUB (per future implementation)
   * Nota: Vercel KV supporta Pub/Sub tramite @upstash/redis
   */
  static async publishUpdate(channel: string, data: any): Promise<void> {
    try {
      await kv.publish(channel, JSON.stringify(data));
      console.log(`📡 Published to channel: ${channel}`);
    } catch (error) {
      console.error('❌ Redis publish error:', error);
      // Non bloccante
    }
  }

  /**
   * GENERIC CACHE (per altri usi)
   */
  static async get(key: string): Promise<any | null> {
    try {
      return await kv.get(`${this.PREFIX}${key}`);
    } catch (error) {
      console.error('❌ Redis GET error:', error);
      return null;
    }
  }

  static async set(key: string, value: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      await kv.setex(`${this.PREFIX}${key}`, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('❌ Redis SET error:', error);
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await kv.del(`${this.PREFIX}${key}`);
    } catch (error) {
      console.error('❌ Redis DEL error:', error);
    }
  }

  /**
   * HEALTH CHECK
   */
  static async ping(): Promise<boolean> {
    try {
      await kv.ping();
      return true;
    } catch (error) {
      console.error('❌ Redis ping failed:', error);
      return false;
    }
  }

  /**
   * STATS & MONITORING
   */
  static async getStats(): Promise<{
    isConnected: boolean;
    prefix: string;
    defaultTTL: number;
  }> {
    const isConnected = await this.ping();
    return {
      isConnected,
      prefix: this.PREFIX,
      defaultTTL: this.DEFAULT_TTL,
    };
  }
}

/**
 * Helper per generare cache key consistenti
 */
export function generateCacheKey(params: URLSearchParams): string {
  // Parametri rilevanti per il caching
  const relevantParams = new URLSearchParams();
  const filterParams = ['stato', 'provenienza', 'dataInizio', 'dataFine', 'citta', 'sortField', 'sortDirection', 'search'];
  
  for (const param of filterParams) {
    const values = params.getAll(param);
    for (const value of values) {
      if (value) relevantParams.append(param, value);
    }
  }

  return relevantParams.toString() || 'all';
}
