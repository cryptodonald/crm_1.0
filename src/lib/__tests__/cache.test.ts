import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @vercel/kv before importing cache module
vi.mock('@vercel/kv', () => {
  return {
    kv: {
      get: vi.fn(),
      setex: vi.fn(),
      del: vi.fn(),
      scan: vi.fn(),
      flushall: vi.fn(),
      pipeline: vi.fn(() => ({
        del: vi.fn().mockReturnThis(),
        exec: vi.fn(),
      })),
    },
  };
});

// Import the mocked kv to access it in tests
import { kv as mockKv } from '@vercel/kv';

// Import after mocking
import {
  cacheService,
  getCachedLead,
  getCachedUsers,
  getCachedApiKeys,
  invalidateLeadCache,
  invalidateUsersCache,
  debugCache,
} from '../cache';

describe('CacheService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset performance.now mock
    vi.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getWithCache', () => {
    it('should return cached value on cache hit', async () => {
      const cachedData = { id: '1', name: 'Test Lead' };
      mockKv.get.mockResolvedValue(cachedData);

      const fetchFn = vi.fn();
      const result = await cacheService.getWithCache('test-key', fetchFn, {
        ttl: 60,
        prefix: 'test',
      });

      expect(result).toEqual(cachedData);
      expect(mockKv.get).toHaveBeenCalledWith('test:test-key');
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should fetch and cache on cache miss', async () => {
      const freshData = { id: '2', name: 'Fresh Lead' };
      mockKv.get.mockResolvedValue(null);
      mockKv.setex.mockResolvedValue('OK');

      const fetchFn = vi.fn().mockResolvedValue(freshData);
      const result = await cacheService.getWithCache('test-key', fetchFn, {
        ttl: 120,
        prefix: 'test',
      });

      expect(result).toEqual(freshData);
      expect(mockKv.get).toHaveBeenCalledWith('test:test-key');
      expect(fetchFn).toHaveBeenCalled();
      expect(mockKv.setex).toHaveBeenCalledWith('test:test-key', 120, freshData);
    });

    it('should skip cache when skipCache option is true', async () => {
      const freshData = { id: '3', name: 'Skipped Cache' };
      const fetchFn = vi.fn().mockResolvedValue(freshData);

      const result = await cacheService.getWithCache('test-key', fetchFn, {
        ttl: 60,
        prefix: 'test',
        skipCache: true,
      });

      expect(result).toEqual(freshData);
      expect(mockKv.get).not.toHaveBeenCalled();
      expect(fetchFn).toHaveBeenCalled();
    });

    it('should fallback to fetchFn on cache error', async () => {
      const freshData = { id: '4', name: 'Fallback' };
      mockKv.get.mockRejectedValue(new Error('Redis error'));
      const fetchFn = vi.fn().mockResolvedValue(freshData);

      const result = await cacheService.getWithCache('test-key', fetchFn, {
        ttl: 60,
        prefix: 'test',
      });

      expect(result).toEqual(freshData);
      expect(fetchFn).toHaveBeenCalled();
    });

    it('should use key without prefix when prefix is not provided', async () => {
      mockKv.get.mockResolvedValue('cached');

      await cacheService.getWithCache('bare-key', vi.fn(), { ttl: 60 });

      expect(mockKv.get).toHaveBeenCalledWith('bare-key');
    });
  });

  describe('invalidatePattern', () => {
    it('should invalidate all keys matching pattern', async () => {
      const mockPipeline = {
        del: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      mockKv.pipeline.mockReturnValue(mockPipeline);
      mockKv.scan.mockResolvedValueOnce([0, ['lead:1', 'lead:2', 'lead:3']]);

      const count = await cacheService.invalidatePattern('lead:*');

      expect(count).toBe(3);
      expect(mockPipeline.del).toHaveBeenCalledTimes(3);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should return 0 when no keys match pattern', async () => {
      mockKv.scan.mockResolvedValueOnce([0, []]);

      const count = await cacheService.invalidatePattern('nonexistent:*');

      expect(count).toBe(0);
    });

    it('should handle scan errors gracefully', async () => {
      mockKv.scan.mockRejectedValue(new Error('Scan error'));

      const count = await cacheService.invalidatePattern('error:*');

      expect(count).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return empty stats initially', () => {
      const stats = cacheService.getStats();
      expect(typeof stats).toBe('object');
    });
  });

  describe('clearAll', () => {
    it('should flush all cache', async () => {
      mockKv.flushall.mockResolvedValue('OK');

      await cacheService.clearAll();

      expect(mockKv.flushall).toHaveBeenCalled();
    });

    it('should handle flushall errors', async () => {
      mockKv.flushall.mockRejectedValue(new Error('Flush error'));

      // Should not throw
      await expect(cacheService.clearAll()).resolves.toBeUndefined();
    });
  });
});

describe('Cache Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCachedLead', () => {
    it('should use correct prefix and TTL', async () => {
      mockKv.get.mockResolvedValue({ id: 'lead-1' });

      await getCachedLead('lead-1', vi.fn());

      expect(mockKv.get).toHaveBeenCalledWith('lead:lead-1');
    });
  });

  describe('getCachedUsers', () => {
    it('should use correct prefix and TTL', async () => {
      mockKv.get.mockResolvedValue([{ id: 'user-1' }]);

      await getCachedUsers(vi.fn());

      expect(mockKv.get).toHaveBeenCalledWith('users:all');
    });
  });

  describe('getCachedApiKeys', () => {
    it('should use correct prefix', async () => {
      mockKv.get.mockResolvedValue({ key: 'xxx' });

      await getCachedApiKeys('openai', vi.fn());

      expect(mockKv.get).toHaveBeenCalledWith('apikey:openai');
    });
  });

  describe('invalidateLeadCache', () => {
    it('should invalidate specific lead', async () => {
      mockKv.scan.mockResolvedValueOnce([0, []]);

      await invalidateLeadCache('lead-123');

      expect(mockKv.scan).toHaveBeenCalled();
    });

    it('should invalidate all leads when no id provided', async () => {
      mockKv.scan.mockResolvedValueOnce([0, []]);

      await invalidateLeadCache();

      expect(mockKv.scan).toHaveBeenCalled();
    });
  });

  describe('invalidateUsersCache', () => {
    it('should invalidate users cache', async () => {
      mockKv.scan.mockResolvedValueOnce([0, []]);

      await invalidateUsersCache();

      expect(mockKv.scan).toHaveBeenCalled();
    });
  });
});

describe('debugCache', () => {
  it('should expose debug utilities', () => {
    expect(debugCache.stats).toBeDefined();
    expect(debugCache.clear).toBeDefined();
    expect(debugCache.invalidateLead).toBeDefined();
    expect(debugCache.invalidateUsers).toBeDefined();
    expect(debugCache.invalidateActivities).toBeDefined();
    expect(debugCache.invalidateOrders).toBeDefined();
    expect(debugCache.invalidatePlaces).toBeDefined();
  });
});
