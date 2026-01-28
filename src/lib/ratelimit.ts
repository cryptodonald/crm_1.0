import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';

/**
 * Rate Limiting Configuration
 * Uses Upstash for runtime rate limiting only (NOT for storing secrets)
 */

// Auth endpoints: strict rate limiting (5 req/min per IP)
export const authRateLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(5, '1 m'),
  analytics: true,
  prefix: 'ratelimit:auth',
});

// General API: moderate rate limiting (30 req/min per user)
export const apiRateLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  analytics: true,
  prefix: 'ratelimit:api',
});

// Write operations: stricter (10 req/min per user)
export const writeRateLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: 'ratelimit:write',
});

/**
 * Helper function to check rate limit and return standardized response
 */
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const { success, limit, reset, remaining } = await limiter.limit(identifier);
  
  return {
    success,
    limit,
    remaining,
    reset,
  };
}
