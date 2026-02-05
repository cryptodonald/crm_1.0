/**
 * Rate Limiting (CRITICAL-005 fix)
 * 
 * Uses Upstash Ratelimit with sliding window algorithm.
 * Different limits per operation type (read vs write vs batch).
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

/**
 * Read operations rate limit (GET requests)
 * 60 requests per minute per user
 */
export const readRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, '1 m'),
  analytics: true,
  prefix: '@ratelimit:read',
});

/**
 * Write operations rate limit (POST/PATCH/DELETE)
 * 20 requests per minute per user
 */
export const writeRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  analytics: true,
  prefix: '@ratelimit:write',
});

/**
 * Batch operations rate limit (bulk actions)
 * 10 requests per minute per user
 */
export const batchRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'),
  analytics: true,
  prefix: '@ratelimit:batch',
});

/**
 * Helper to check rate limit and return NextResponse with proper headers
 */
export async function checkRateLimit(
  identifier: string,
  type: 'read' | 'write' | 'batch' = 'read'
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const limiter = type === 'read' ? readRateLimit : type === 'write' ? writeRateLimit : batchRateLimit;

  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  return { success, limit, remaining, reset };
}
