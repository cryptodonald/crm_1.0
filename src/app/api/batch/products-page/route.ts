import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey, getAirtableBaseId } from '@/lib/api-keys-service';
import { RedisCache } from '@/lib/redis-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 🚀 BATCH ENDPOINT FOR PRODUCTS PAGE
 * Returns products + variants + stats in 1 request
 */
export async function GET(request: NextRequest) {
  const requestStart = performance.now();
  
  try {
    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
    ]);
    
    if (!apiKey || !baseId) {
      throw new Error('Missing credentials');
    }
    
    // Fetch products in parallel (variants can be fetched if needed)
    const productsData = await fetchProductsWithCache(apiKey, baseId);
    
    // Calculate stats
    const stats = {
      totalProducts: productsData.records.length,
      activeProducts: productsData.records.filter((p: any) => p.Attivo !== false).length,
      averagePrice: productsData.records.length > 0
        ? Math.round(productsData.records.reduce((sum: number, p: any) => sum + (p.Prezzo || 0), 0) / productsData.records.length)
        : 0,
    };
    
    const totalTime = performance.now() - requestStart;
    
    return NextResponse.json({
      products: productsData,
      stats,
      _timing: { total: Math.round(totalTime) },
      _meta: { cached: productsData.fromCache }
    }, {
      headers: {
        'X-Batch-Endpoint': 'products-page',
        'X-Cache-Status': productsData.fromCache ? 'HIT' : 'MISS',
        'X-Total-Time': String(Math.round(totalTime))
      }
    });
  } catch (error) {
    console.error('[Batch Products] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

async function fetchProductsWithCache(apiKey: string, baseId: string) {
  const cacheKey = 'all';
  const cached = await RedisCache.get('products:' + cacheKey);
  
  if (cached) {
    return { records: cached, fromCache: true };
  }
  
  const url = `https://api.airtable.com/v0/${baseId}/Products`;
  let allRecords: any[] = [];
  let offset: string | undefined;
  
  do {
    const fetchUrl = offset ? `${url}?offset=${offset}` : url;
    const response = await fetch(fetchUrl, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const data = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);
  
  const transformed = allRecords.map((r: any) => ({ id: r.id, ...r.fields }));
  await RedisCache.set('products:' + cacheKey, transformed);
  
  return { records: transformed, fromCache: false };
}
