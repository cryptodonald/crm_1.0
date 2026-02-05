import { Redis } from '@upstash/redis';
import { env } from '@/env';

/**
 * Redis/KV Client for temporary data storage
 * 
 * Used for:
 * - Password reset tokens (TTL: 1 hour)
 * - Rate limiting (future)
 * - Session caching (future)
 */

let redis: Redis | null = null;

/**
 * Get Redis client instance (singleton)
 */
export function getRedis(): Redis | null {
  if (!env.KV_REST_API_URL || !env.KV_REST_API_TOKEN) {
    console.warn('[Redis] KV credentials not configured. Redis features disabled.');
    return null;
  }

  if (!redis) {
    redis = new Redis({
      url: env.KV_REST_API_URL,
      token: env.KV_REST_API_TOKEN,
      automaticDeserialization: false, // Disable auto-parse to control serialization
    });
  }

  return redis;
}

/**
 * Password Reset Token Management
 */
export const passwordResetTokens = {
  /**
   * Save a reset token with 1 hour expiration
   */
  async set(email: string, token: string): Promise<boolean> {
    const client = getRedis();
    if (!client) return false;

    try {
      const key = `password-reset:${email}`;
      // TTL: 1 hour (3600 seconds)
      await client.set(key, token, { ex: 3600 });
      return true;
    } catch (error) {
      console.error('[Redis] Error saving reset token:', error);
      return false;
    }
  },

  /**
   * Get reset token for email
   */
  async get(email: string): Promise<string | null> {
    const client = getRedis();
    if (!client) return null;

    try {
      const key = `password-reset:${email}`;
      return await client.get<string>(key);
    } catch (error) {
      console.error('[Redis] Error getting reset token:', error);
      return null;
    }
  },

  /**
   * Delete reset token (after use or invalidation)
   */
  async delete(email: string): Promise<boolean> {
    const client = getRedis();
    if (!client) return false;

    try {
      const key = `password-reset:${email}`;
      await client.del(key);
      return true;
    } catch (error) {
      console.error('[Redis] Error deleting reset token:', error);
      return false;
    }
  },

  /**
   * Verify token matches stored value
   */
  async verify(email: string, token: string): Promise<boolean> {
    const storedToken = await this.get(email);
    return storedToken === token;
  },
};
