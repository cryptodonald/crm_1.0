import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey, getAirtableBaseId } from '@/lib/api-keys-service';
import { RedisCache } from '@/lib/redis-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 🚀 BATCH ENDPOINT FOR ORDERS PAGE
 * Returns orders + products + stats in 1 request
 */
export async function GET(request: NextRequest) {
  const requestStart = performance.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
    ]);
    
    if (!apiKey || !baseId) {
      throw new Error('Missing credentials');
    }
    
    // Fetch orders & products in parallel
    const [ordersData, productsData] = await Promise.all([
      fetchOrdersWithCache(apiKey, baseId),
      fetchProductsWithCache(apiKey, baseId),
    ]);
    
    // Calculate stats
    const stats = {
      totalOrders: ordersData.records.length,
      totalRevenue: ordersData.records.reduce((sum: number, o: any) => sum + (o.Totale || 0), 0),
      avgOrderValue: ordersData.records.length > 0 
        ? Math.round(ordersData.records.reduce((sum: number, o: any) => sum + (o.Totale || 0), 0) / ordersData.records.length)
        : 0,
    };
    
    const totalTime = performance.now() - requestStart;
    
    return NextResponse.json({
      orders: ordersData,
      products: productsData,
      stats,
      _timing: { total: Math.round(totalTime) },
      _meta: { cached: ordersData.fromCache && productsData.fromCache }
    }, {
      headers: {
        'X-Batch-Endpoint': 'orders-page',
        'X-Cache-Status': ordersData.fromCache && productsData.fromCache ? 'HIT' : 'PARTIAL',
        'X-Total-Time': String(Math.round(totalTime))
      }
    });
  } catch (error) {
    console.error('[Batch Orders] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

async function fetchOrdersWithCache(apiKey: string, baseId: string) {
  const cacheKey = 'all';
  const cached = await RedisCache.getOrders(cacheKey);
  
  if (cached) {
    return { records: cached, fromCache: true };
  }
  
  const url = `https://api.airtable.com/v0/${baseId}/Orders?sort[0][field]=Data&sort[0][direction]=desc`;
  let allRecords: any[] = [];
  let offset: string | undefined;
  
  do {
    const fetchUrl = offset ? `${url}&offset=${offset}` : url;
    const response = await fetch(fetchUrl, {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    const data = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);
  
  const transformed = allRecords.map((r: any) => ({ id: r.id, ...r.fields }));
  await RedisCache.setOrders(cacheKey, transformed);
  
  return { records: transformed, fromCache: false };
}

async function fetchProductsWithCache(apiKey: string, baseId: string) {
  const cacheKey = 'all';
  const cached = await RedisCache.get('products:' + cacheKey);
  
  if (cached) {
    return { records: cached, fromCache: true };
  }
  
  const url = `https://api.airtable.com/v0/${baseId}/Products`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  const data = await response.json();
  const transformed = data.records.map((r: any) => ({ id: r.id, ...r.fields }));
  
  await RedisCache.set('products:' + cacheKey, transformed);
  
  return { records: transformed, fromCache: false };
}
