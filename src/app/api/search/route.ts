/**
 * SEARCH API ENDPOINT
 * 
 * Endpoint unificato per search con FTS Postgres + Redis cache
 * 
 * GET /api/search?q=mario&type=leads&limit=20
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  searchLeads, 
  searchActivities, 
  searchProducts, 
  searchOrders,
  globalSearch 
} from '@/lib/postgres-search';
import { getCacheMetrics } from '@/lib/redis-cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query param "q" is required' },
        { status: 400 }
      );
    }
    
    const startTime = Date.now();
    let results: any;
    
    switch (type) {
      case 'leads':
        results = await searchLeads(query, limit);
        break;
        
      case 'activities':
        results = await searchActivities(query, undefined, limit);
        break;
        
      case 'products':
        results = await searchProducts(query, limit);
        break;
        
      case 'orders':
        results = await searchOrders(query, limit);
        break;
        
      case 'all':
      default:
        results = await globalSearch(query, 10);
        break;
    }
    
    const duration = Date.now() - startTime;
    const cacheMetrics = getCacheMetrics();
    
    return NextResponse.json({
      query,
      type,
      results,
      meta: {
        duration_ms: duration,
        count: Array.isArray(results) ? results.length : results.totalResults,
        cache: cacheMetrics,
      },
    });
    
  } catch (error: any) {
    console.error('[Search API] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Search failed', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}
