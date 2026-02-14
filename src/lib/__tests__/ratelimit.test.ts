import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Store original env
const originalEnv = { ...process.env };

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should allow all requests when KV is not configured', async () => {
      // Ensure KV is not configured
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;
      process.env.NODE_ENV = 'development';

      const { checkRateLimit } = await import('../ratelimit');

      const result = await checkRateLimit('test-user', null);

      expect(result.success).toBe(true);
      expect(result.limit).toBe(999);
      expect(result.remaining).toBe(999);
      expect(result.reset).toBeGreaterThan(Date.now());
    });

    it('should return unlimited when limiter is null in production', async () => {
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;
      process.env.NODE_ENV = 'production';

      const { checkRateLimit } = await import('../ratelimit');

      const result = await checkRateLimit('test-ip', null);

      expect(result.success).toBe(true);
      expect(result.limit).toBe(999);
      expect(result.remaining).toBe(999);
    });

    it('should use limiter when provided', async () => {
      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: true,
          limit: 5,
          remaining: 4,
          reset: Date.now() + 60000,
        }),
      };

      const { checkRateLimit } = await import('../ratelimit');

      // @ts-expect-error - mock limiter
      const result = await checkRateLimit('test-user', mockLimiter);

      expect(mockLimiter.limit).toHaveBeenCalledWith('test-user');
      expect(result.success).toBe(true);
      expect(result.limit).toBe(5);
      expect(result.remaining).toBe(4);
    });

    it('should return failure when rate limit exceeded', async () => {
      const mockLimiter = {
        limit: vi.fn().mockResolvedValue({
          success: false,
          limit: 5,
          remaining: 0,
          reset: Date.now() + 30000,
        }),
      };

      const { checkRateLimit } = await import('../ratelimit');

      // @ts-expect-error - mock limiter
      const result = await checkRateLimit('blocked-user', mockLimiter);

      expect(result.success).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('Rate Limiter Configuration', () => {
    it('should create limiters when KV is configured', async () => {
      // Mock KV configuration
      process.env.KV_REST_API_URL = 'https://test.upstash.io';
      process.env.KV_REST_API_TOKEN = 'test-token';

      // Mock @vercel/kv
      vi.doMock('@vercel/kv', () => ({
        kv: {
          get: vi.fn(),
          set: vi.fn(),
        },
      }));

      // Mock @upstash/ratelimit
      const MockRatelimit = vi.fn().mockImplementation(() => ({
        limit: vi.fn(),
      }));
      MockRatelimit.slidingWindow = vi.fn().mockReturnValue({});

      vi.doMock('@upstash/ratelimit', () => ({
        Ratelimit: MockRatelimit,
      }));

      const { authRateLimiter, apiRateLimiter, writeRateLimiter } = await import(
        '../ratelimit'
      );

      // When KV is configured, limiters should be created
      expect(authRateLimiter).not.toBeNull();
      expect(apiRateLimiter).not.toBeNull();
      expect(writeRateLimiter).not.toBeNull();
    });

    it('should return null limiters when KV is not configured', async () => {
      delete process.env.KV_REST_API_URL;
      delete process.env.KV_REST_API_TOKEN;

      vi.resetModules();

      const ratelimitModule = await import('../ratelimit');

      // Access the values after fresh import
      expect(ratelimitModule.authRateLimiter).toBeNull();
      expect(ratelimitModule.apiRateLimiter).toBeNull();
      expect(ratelimitModule.writeRateLimiter).toBeNull();
    });
  });
});
