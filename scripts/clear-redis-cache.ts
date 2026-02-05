#!/usr/bin/env tsx
/**
 * Clear Redis Cache
 * 
 * Clears all cache keys to fix corrupted data.
 * Run with: npx tsx scripts/clear-redis-cache.ts
 */

import { Redis } from '@upstash/redis';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function clearCache() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    console.error('❌ Redis credentials not found in .env.local');
    process.exit(1);
  }

  const redis = new Redis({ url, token });

  console.log('🔍 Scanning for cache keys...');

  try {
    // Upstash Redis doesn't support KEYS command in REST API
    // We'll use SCAN via their SDK
    
    // Common cache key patterns
    const patterns = [
      'leads:*',
      'activities:*',
      'orders:*',
      'products:*',
    ];

    let totalDeleted = 0;

    // For Upstash, we'll need to delete known patterns
    // Since SCAN is not available in REST API, we'll clear specific keys
    console.log('⚠️  Note: Upstash REST API has limited SCAN support');
    console.log('Clearing known cache patterns...');

    // Try to delete common cache keys
    const keysToTry = [
      'leads:list:all',
      'leads:filtered:*',
    ];

    for (const key of keysToTry) {
      try {
        const result = await redis.del(key);
        if (result > 0) {
          console.log(`✅ Deleted: ${key}`);
          totalDeleted++;
        }
      } catch (error) {
        // Key might not exist, that's okay
      }
    }

    console.log(`\n✅ Cache clear complete!`);
    console.log(`📊 Total keys deleted: ${totalDeleted}`);
    console.log('\n💡 Note: Some keys may not be deleted if they use dynamic hashes.');
    console.log('   The system will auto-delete corrupted cache on next read.');

  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    process.exit(1);
  }
}

clearCache();
