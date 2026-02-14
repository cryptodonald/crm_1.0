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

/**
 * Login Attempt Tracking (Account Lockout)
 * 
 * Tracks failed login attempts per email.
 * After 5 failed attempts within 15 minutes, account is locked.
 */
export const loginAttempts = {
  /** Max failed attempts before lockout */
  MAX_ATTEMPTS: 5,
  /** Lockout window in seconds (15 minutes) */
  LOCKOUT_TTL: 900,

  /**
   * Check if account is locked
   */
  async check(email: string): Promise<{ locked: boolean; attempts: number }> {
    const client = getRedis();
    if (!client) return { locked: false, attempts: 0 };

    try {
      const key = `login-attempts:${email.toLowerCase()}`;
      const raw = await client.get(key);
      const attempts = raw ? parseInt(String(raw), 10) : 0;

      return { locked: attempts >= this.MAX_ATTEMPTS, attempts };
    } catch (error) {
      console.error('[Redis] Error checking login attempts:', error);
      return { locked: false, attempts: 0 };
    }
  },

  /**
   * Increment failed attempt counter (TTL: 15 min from first attempt)
   */
  async increment(email: string): Promise<number> {
    const client = getRedis();
    if (!client) return 0;

    try {
      const key = `login-attempts:${email.toLowerCase()}`;
      const attempts = await client.incr(key);

      // Set TTL on first attempt
      if (attempts === 1) {
        await client.expire(key, this.LOCKOUT_TTL);
      }

      return attempts;
    } catch (error) {
      console.error('[Redis] Error incrementing login attempts:', error);
      return 0;
    }
  },

  /**
   * Clear failed attempts on successful login
   */
  async clear(email: string): Promise<void> {
    const client = getRedis();
    if (!client) return;

    try {
      const key = `login-attempts:${email.toLowerCase()}`;
      await client.del(key);
    } catch (error) {
      console.error('[Redis] Error clearing login attempts:', error);
    }
  },
};
