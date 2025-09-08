import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey, getAirtableBaseId, getAirtableOrdersTableId } from '@/lib/api-keys-service';
import { getCachedOrders } from '@/lib/cache';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';

function parseIds(searchParams: URLSearchParams): string[] {
  // Support both ids=rec1,rec2 and ids[]=rec1&ids[]=rec2
  const idsParams = searchParams.getAll('ids');
  const list: string[] = [];
  for (const param of idsParams) {
    const parts = param.split(',').map(s => s.trim()).filter(Boolean);
    list.push(...parts);
  }
  // Also support id=rec1 (single)
  const single = searchParams.get('id');
  if (single) list.push(single);
  // Deduplicate
  return Array.from(new Set(list));
}

/**
 * GET /api/orders?ids=recA,recB or /api/orders?ids=recA&ids=recB
 * Returns a simplified list of orders with common fields when available.
 */
export async function GET(request: NextRequest) {
  const requestStart = performance.now();
  
  try {
    console.log('🔧 [Orders API] Starting GET request');
    
    const { searchParams } = new URL(request.url);
    const ids = parseIds(searchParams);

    if (!ids.length) {
      recordError('orders_api', 'Missing ids parameter');
      return NextResponse.json(
        { error: 'ids query parameter is required' },
        { status: 400 }
      );
    }
    
    // Create cache key based on sorted IDs for consistency
    const sortedIds = [...ids].sort();
    const cacheKey = `orders_batch:${sortedIds.join(',')}`;

    // 🚀 Use caching system for performance optimization
    const result = await getCachedOrders(cacheKey, async () => {
      const credentialsStart = performance.now();
      
      const [apiKey, baseId, tableId] = await Promise.all([
        getAirtableKey(),
        getAirtableBaseId(),
        getAirtableOrdersTableId(),
      ]);
      
      const credentialsTime = performance.now() - credentialsStart;
      console.log(`🔑 [TIMING] Orders credentials: ${credentialsTime.toFixed(2)}ms`);

      if (!apiKey || !baseId || !tableId) {
        throw new Error('Airtable credentials not available');
      }

      // Build filterByFormula: OR(RECORD_ID()='rec1', RECORD_ID()='rec2', ...)
      const formula = `OR(${ids.map(id => `RECORD_ID()='${id}'`).join(',')})`;
      const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
      url.searchParams.set('filterByFormula', formula);
      url.searchParams.set('maxRecords', String(Math.min(ids.length, 100)));
      
      console.log('📡 [Orders API] Fetching from Airtable:', url.toString());
      const fetchStart = performance.now();

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('❌ [Orders API] Airtable error:', response.status, errText);
        throw new Error(`Airtable API error: ${response.status}`);
      }

      const data = await response.json();
      const fetchTime = performance.now() - fetchStart;
      console.log(`🚀 [TIMING] Orders fetch: ${fetchTime.toFixed(2)}ms`);

      // Transform records to a simple structure. Field names are optional.
      const records = (data.records || []).map((record: any) => {
        const f = record.fields || {};
        return {
          id: record.id,
          createdTime: record.createdTime,
          // Common optional fields (if present in Airtable)
          Data: f.Data || null,
          Totale: f.Totale ?? null,
          Stato: f.Stato || null,
          Numero: f['Numero Ordine'] || f.Numero || null,
          ...f, // also return all fields for flexibility on the client
        };
      });

      return {
        success: true,
        count: records.length,
        records,
      };
    });
    
    const totalTime = performance.now() - requestStart;
    const wasCached = totalTime < 100; // Assume cached if under 100ms
    
    // 📈 Record performance metrics
    recordApiLatency('orders_api', totalTime, wasCached);
    
    console.log(`✅ [Orders API] Completed: ${result.count} orders in ${totalTime.toFixed(2)}ms (cached: ${wasCached})`);
    
    // Add compression header for large responses
    const headers = new Headers({
      'Content-Type': 'application/json',
    });
    
    if (result.count > 20) {
      headers.set('Content-Encoding', 'gzip');
    }
    
    return new NextResponse(JSON.stringify({
      ...result,
      _timing: {
        total: Math.round(totalTime),
        cached: wasCached,
      }
    }), {
      headers,
    });
  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // 📈 Record error metrics
    recordError('orders_api', errorMessage);
    recordApiLatency('orders_api', totalTime, false);
    
    console.error(`❌ [Orders API] Error in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch orders',
        success: false,
        count: 0,
        records: [],
        details: errorMessage,
        _timing: {
          total: Math.round(totalTime),
          cached: false,
        }
      },
      { status: 500 }
    );
  }
}
