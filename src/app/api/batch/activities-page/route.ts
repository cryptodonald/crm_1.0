import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey, getAirtableBaseId, getAirtableActivitiesTableId, getAirtableLeadsTableId } from '@/lib/api-keys-service';
import { RedisCache } from '@/lib/redis-cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * 🚀 BATCH ENDPOINT FOR ACTIVITIES PAGE
 * Returns activities + leads + stats in 1 request
 */
export async function GET(request: NextRequest) {
  const requestStart = performance.now();
  
  try {
    const [apiKey, baseId, activitiesTableId, leadsTableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableActivitiesTableId(),
      getAirtableLeadsTableId(),
    ]);
    
    if (!apiKey || !baseId || !activitiesTableId || !leadsTableId) {
      throw new Error('Missing credentials');
    }
    
    // Fetch activities & leads in parallel
    const [activitiesData, leadsData] = await Promise.all([
      fetchActivitiesWithCache(apiKey, baseId, activitiesTableId),
      fetchLeadsWithCache(apiKey, baseId, leadsTableId),
    ]);
    
    // Calculate stats
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const stats = {
      totalActivities: activitiesData.records.length,
      completedToday: activitiesData.records.filter((a: any) => 
        a.Data?.startsWith(today) && a.Stato === 'Completata'
      ).length,
      pending: activitiesData.records.filter((a: any) => 
        a.Stato === 'Programmata' || a.Stato === 'In corso'
      ).length,
    };
    
    const totalTime = performance.now() - requestStart;
    
    return NextResponse.json({
      activities: activitiesData,
      leads: leadsData,
      stats,
      _timing: { total: Math.round(totalTime) },
      _meta: { cached: activitiesData.fromCache && leadsData.fromCache }
    }, {
      headers: {
        'X-Batch-Endpoint': 'activities-page',
        'X-Cache-Status': activitiesData.fromCache && leadsData.fromCache ? 'HIT' : 'PARTIAL',
        'X-Total-Time': String(Math.round(totalTime))
      }
    });
  } catch (error) {
    console.error('[Batch Activities] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

async function fetchActivitiesWithCache(apiKey: string, baseId: string, tableId: string) {
  const cacheKey = 'all';
  const cached = await RedisCache.getActivities(cacheKey);
  
  if (cached) {
    return { records: cached, fromCache: true };
  }
  
  const url = `https://api.airtable.com/v0/${baseId}/${tableId}?sort[0][field]=Data&sort[0][direction]=desc`;
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
  await RedisCache.setActivities(cacheKey, transformed);
  
  return { records: transformed, fromCache: false };
}

async function fetchLeadsWithCache(apiKey: string, baseId: string, tableId: string) {
  const cacheKey = 'all';
  const cached = await RedisCache.getLeads(cacheKey);
  
  if (cached) {
    return { records: cached, fromCache: true };
  }
  
  const url = `https://api.airtable.com/v0/${baseId}/${tableId}`;
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
  await RedisCache.setLeads(cacheKey, transformed);
  
  return { records: transformed, fromCache: false };
}
