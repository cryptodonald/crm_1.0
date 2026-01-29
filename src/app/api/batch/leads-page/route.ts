import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey, getAirtableBaseId, getAirtableLeadsTableId, getAirtableActivitiesTableId } from '@/lib/api-keys-service';
import { RedisCache, generateCacheKey } from '@/lib/redis-cache';

/**
 * 🚀 BATCH ENDPOINT FOR LEADS PAGE
 * 
 * Returns EVERYTHING needed for leads page in 1 request:
 * - Leads (with Redis cache)
 * - Activities (with Redis cache)  
 * - Stats (calculated server-side)
 * 
 * Performance: ~100ms instead of 4-5s
 */

// Disable Next.js caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface LeadsPageBatchResponse {
  leads: {
    records: any[];
    count: number;
    fromCache: boolean;
  };
  activities: {
    records: any[];
    count: number;
    fromCache: boolean;
  };
  stats: {
    totale: number;
    nuoviUltimi7Giorni: number;
    contattatiEntro48h: number;
    tassoQualificazione: number;
    tassoConversione: number;
    byStato: Record<string, number>;
    byProvenienza: Record<string, number>;
  };
  _timing: {
    leads: number;
    activities: number;
    stats: number;
    total: number;
  };
  _meta: {
    cached: boolean;
    cacheKeys: string[];
  };
}

/**
 * Helper: Fetch leads with caching
 */
async function fetchLeadsWithCache(
  searchParams: URLSearchParams,
  apiKey: string,
  baseId: string,
  tableId: string
): Promise<{ records: any[]; fromCache: boolean; time: number }> {
  const start = performance.now();
  
  // Check cache first
  const cacheKey = generateCacheKey(searchParams);
  const cachedData = await RedisCache.getLeads(cacheKey);
  
  if (cachedData) {
    console.log(`✅ [Batch Leads] Cache HIT - ${cachedData.length} leads`);
    return {
      records: cachedData,
      fromCache: true,
      time: performance.now() - start
    };
  }
  
  console.log('❌ [Batch Leads] Cache MISS - fetching from Airtable');
  
  // Build Airtable URL
  const airtableParams = new URLSearchParams();
  airtableParams.set('sort[0][field]', searchParams.get('sortField') || 'Data');
  airtableParams.set('sort[0][direction]', searchParams.get('sortDirection') || 'desc');
  
  const url = `https://api.airtable.com/v0/${baseId}/${tableId}?${airtableParams.toString()}`;
  
  // Fetch all records
  let allRecords: any[] = [];
  let offset: string | undefined;
  
  do {
    const fetchUrl = offset ? `${url}&offset=${offset}` : url;
    const response = await fetch(fetchUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Airtable error: ${response.status}`);
    }
    
    const data = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);
  
  // Transform records
  const transformedRecords = allRecords.map((record: any) => ({
    id: record.id,
    createdTime: record.createdTime,
    ...record.fields,
  }));
  
  // Save to cache
  await RedisCache.setLeads(cacheKey, transformedRecords);
  console.log(`💾 [Batch Leads] Saved ${transformedRecords.length} leads to cache`);
  
  return {
    records: transformedRecords,
    fromCache: false,
    time: performance.now() - start
  };
}

/**
 * Helper: Fetch activities with caching
 */
async function fetchActivitiesWithCache(
  apiKey: string,
  baseId: string,
  tableId: string
): Promise<{ records: any[]; fromCache: boolean; time: number }> {
  const start = performance.now();
  
  // Check cache
  const cacheKey = 'all'; // Activities cache key
  const cachedData = await RedisCache.getActivities(cacheKey);
  
  if (cachedData) {
    console.log(`✅ [Batch Activities] Cache HIT - ${cachedData.length} activities`);
    return {
      records: cachedData,
      fromCache: true,
      time: performance.now() - start
    };
  }
  
  console.log('❌ [Batch Activities] Cache MISS - fetching from Airtable');
  
  // Fetch all activities
  const url = `https://api.airtable.com/v0/${baseId}/${tableId}?sort[0][field]=Data&sort[0][direction]=desc`;
  
  let allRecords: any[] = [];
  let offset: string | undefined;
  
  do {
    const fetchUrl = offset ? `${url}&offset=${offset}` : url;
    const response = await fetch(fetchUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Airtable error: ${response.status}`);
    }
    
    const data = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;
  } while (offset);
  
  // Transform records
  const transformedRecords = allRecords.map((record: any) => {
    const fields = { ...record.fields };
    
    // Parse Allegati if needed
    if (fields.Allegati && typeof fields.Allegati === 'string') {
      try {
        fields.Allegati = JSON.parse(fields.Allegati);
      } catch (e) {
        fields.Allegati = [];
      }
    }
    
    return {
      id: record.id,
      createdTime: record.createdTime,
      ...fields,
    };
  });
  
  // Save to cache
  await RedisCache.setActivities(cacheKey, transformedRecords);
  console.log(`💾 [Batch Activities] Saved ${transformedRecords.length} activities to cache`);
  
  return {
    records: transformedRecords,
    fromCache: false,
    time: performance.now() - start
  };
}

/**
 * Helper: Calculate stats server-side
 */
function calculateLeadsStats(
  leads: any[],
  activities: any[]
): {
  totale: number;
  nuoviUltimi7Giorni: number;
  contattatiEntro48h: number;
  tassoQualificazione: number;
  tassoConversione: number;
  byStato: Record<string, number>;
  byProvenienza: Record<string, number>;
} {
  const start = performance.now();
  
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Nuovi ultimi 7 giorni
  const nuoviUltimi7Giorni = leads.filter(lead => {
    if (!lead.Data) return false;
    const leadDate = new Date(lead.Data);
    return leadDate >= sevenDaysAgo;
  }).length;
  
  // Lead contattati entro 48h
  const leadContattatiEntro48h = leads.filter(lead => {
    if (!lead.Data) return false;
    
    const leadCreationDate = new Date(lead.Data);
    const leadPlus48Hours = new Date(leadCreationDate.getTime() + 48 * 60 * 60 * 1000);
    
    const hasActivityWithin48h = activities.some(activity => {
      const activityLeadIds = activity['ID Lead'] || [];
      const isLinkedToLead = activityLeadIds.includes(lead.id) || activityLeadIds.includes(lead.ID);
      
      if (!isLinkedToLead || !activity.Data) return false;
      
      const activityDate = new Date(activity.Data);
      return activityDate >= leadCreationDate && activityDate <= leadPlus48Hours;
    });
    
    return hasActivityWithin48h;
  }).length;
  
  // Count by stato
  const byStato: Record<string, number> = {};
  leads.forEach(lead => {
    byStato[lead.Stato] = (byStato[lead.Stato] || 0) + 1;
  });
  
  // Count by provenienza
  const byProvenienza: Record<string, number> = {};
  leads.forEach(lead => {
    byProvenienza[lead.Provenienza] = (byProvenienza[lead.Provenienza] || 0) + 1;
  });
  
  const totale = leads.length;
  const qualificati = byStato['Qualificato'] || 0;
  const clienti = byStato['Cliente'] || 0;
  
  const tassoQualificazione = totale > 0 ? Math.round((qualificati / totale) * 100) : 0;
  const tassoConversione = totale > 0 ? Math.round((clienti / totale) * 100) : 0;
  
  const statsTime = performance.now() - start;
  console.log(`📊 [Batch Stats] Calculated in ${statsTime.toFixed(2)}ms`);
  
  return {
    totale,
    nuoviUltimi7Giorni,
    contattatiEntro48h: leadContattatiEntro48h,
    tassoQualificazione,
    tassoConversione,
    byStato,
    byProvenienza
  };
}

/**
 * Main GET handler
 */
export async function GET(request: NextRequest) {
  const requestStart = performance.now();
  
  try {
    console.log('🚀 [Batch Leads Page] Starting batch request');
    
    const { searchParams } = new URL(request.url);
    
    // Get credentials
    const credentialsStart = performance.now();
    const [apiKey, baseId, leadsTableId, activitiesTableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableLeadsTableId(),
      getAirtableActivitiesTableId(),
    ]);
    const credentialsTime = performance.now() - credentialsStart;
    console.log(`🔑 Credentials: ${credentialsTime.toFixed(2)}ms`);
    
    if (!apiKey || !baseId || !leadsTableId || !activitiesTableId) {
      throw new Error('Missing Airtable credentials');
    }
    
    // Fetch everything in parallel
    const fetchStart = performance.now();
    const [leadsData, activitiesData] = await Promise.all([
      fetchLeadsWithCache(searchParams, apiKey, baseId, leadsTableId),
      fetchActivitiesWithCache(apiKey, baseId, activitiesTableId),
    ]);
    const fetchTime = performance.now() - fetchStart;
    console.log(`📡 Parallel fetch: ${fetchTime.toFixed(2)}ms`);
    
    // Calculate stats server-side
    const statsStart = performance.now();
    const stats = calculateLeadsStats(leadsData.records, activitiesData.records);
    const statsTime = performance.now() - statsStart;
    
    const totalTime = performance.now() - requestStart;
    
    const response: LeadsPageBatchResponse = {
      leads: {
        records: leadsData.records,
        count: leadsData.records.length,
        fromCache: leadsData.fromCache
      },
      activities: {
        records: activitiesData.records,
        count: activitiesData.records.length,
        fromCache: activitiesData.fromCache
      },
      stats,
      _timing: {
        leads: Math.round(leadsData.time),
        activities: Math.round(activitiesData.time),
        stats: Math.round(statsTime),
        total: Math.round(totalTime)
      },
      _meta: {
        cached: leadsData.fromCache && activitiesData.fromCache,
        cacheKeys: [
          `leads:${generateCacheKey(searchParams)}`,
          'activities:all'
        ]
      }
    };
    
    console.log(`✅ [Batch Leads Page] Completed in ${totalTime.toFixed(2)}ms`);
    console.log(`   Leads: ${leadsData.records.length} (${leadsData.fromCache ? 'cached' : 'fresh'})`);
    console.log(`   Activities: ${activitiesData.records.length} (${activitiesData.fromCache ? 'cached' : 'fresh'})`);
    
    return NextResponse.json(response, {
      headers: {
        'X-Batch-Endpoint': 'leads-page',
        'X-Cache-Status': response._meta.cached ? 'HIT' : 'PARTIAL',
        'X-Total-Time': String(Math.round(totalTime)),
        'X-Records-Count': String(leadsData.records.length + activitiesData.records.length)
      }
    });
    
  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`❌ [Batch Leads Page] Error in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch batch data',
        details: errorMessage,
        _timing: {
          total: Math.round(totalTime)
        }
      },
      { status: 500 }
    );
  }
}
