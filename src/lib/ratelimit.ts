import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

/**
 * Rate Limiting Configuration
 * Uses Upstash for runtime rate limiting only (NOT for storing secrets)
 * 
 * Note: In development without KV credentials, rate limiting is disabled.
 */

// Check if KV is configured (required for rate limiting)
const isKVConfigured = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// Auth endpoints: strict rate limiting (5 req/min per IP)
export const authRateLimiter = isKVConfigured ? new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
  prefix: 'ratelimit:auth',
}) : null;

// General API: moderate rate limiting (30 req/min per user)
export const apiRateLimiter = isKVConfigured ? new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  analytics: true,
  prefix: 'ratelimit:api',
}) : null;

// Write operations: stricter (10 req/min per user)
export const writeRateLimiter = isKVConfigured ? new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'ratelimit:write',
}) : null;

/**
 * Helper function to check rate limit and return standardized response
 */
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit | null
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  // If rate limiting is not configured (local dev without KV), allow all requests
  if (!limiter) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚠️ [RATELIMIT] KV not configured - rate limiting disabled for: ${identifier}`);
    }
    return {
      success: true,
      limit: 999,
      remaining: 999,
      reset: Date.now() + 60000,
    };
  }
  
  const { success, limit, reset, remaining } = await limiter.limit(identifier);
  
  return {
    success,
    limit,
    remaining,
    reset,
  };
}
