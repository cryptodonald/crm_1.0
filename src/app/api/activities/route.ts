import { NextRequest, NextResponse } from 'next/server';
import { 
  getAirtableKey,
  getAirtableBaseId,
  getAirtableActivitiesTableId,
} from '@/lib/api-keys-service';
import { ActivityFormData } from '@/types/activities';
import { getCachedActivities, invalidateActivitiesCache } from '@/lib/cache';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';

export async function GET(request: NextRequest) {
  const requestStart = performance.now();
  
  try {
    console.log('🔧 [Activities API] Starting GET request');

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '100';
    const offset = searchParams.get('offset') || '';
    const sort = searchParams.get('sort') || 'Data';
    const direction = searchParams.get('direction') || 'desc';
    
    // Create cache key based on query parameters
    const cacheKey = `activities:${limit}:${offset}:${sort}:${direction}`;

    // 🚀 Use caching system for performance optimization
    const result = await getCachedActivities(cacheKey, async () => {
      const credentialsStart = performance.now();
      
      // Get credentials from API Key Service
      const [apiKey, baseId, tableId] = await Promise.all([
        getAirtableKey(),
        getAirtableBaseId(),
        getAirtableActivitiesTableId(),
      ]);
      
      const credentialsTime = performance.now() - credentialsStart;
      console.log(`🔑 [TIMING] Activities credentials: ${credentialsTime.toFixed(2)}ms`);

      // Validate all credentials are available
      if (!apiKey || !baseId || !tableId) {
        throw new Error('Missing Airtable credentials for activities');
      }

      // Build Airtable API URL
      const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
      url.searchParams.set('maxRecords', limit);
      if (offset) url.searchParams.set('offset', offset);
      
      // Add sorting
      url.searchParams.set('sort[0][field]', sort);
      url.searchParams.set('sort[0][direction]', direction);

      console.log('📡 [Activities API] Fetching from Airtable:', url.toString());
      
      const fetchStart = performance.now();

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ [Activities API] Airtable error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const fetchTime = performance.now() - fetchStart;
      console.log(`🚀 [TIMING] Activities fetch: ${fetchTime.toFixed(2)}ms`);

      return {
        success: true,
        data: data.records || [],
        offset: data.offset,
        count: data.records?.length || 0,
      };
    });
    
    const totalTime = performance.now() - requestStart;
    const wasCached = totalTime < 100; // Assume cached if under 100ms
    
    // 📈 Record performance metrics
    recordApiLatency('activities_api', totalTime, wasCached);
    
    console.log(`✅ [Activities API] Completed: ${result.count} activities in ${totalTime.toFixed(2)}ms (cached: ${wasCached})`);
    
    // Add compression header for large responses
    const headers = new Headers({
      'Content-Type': 'application/json',
    });
    
    if (result.count > 50) {
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
    recordError('activities_api', errorMessage);
    recordApiLatency('activities_api', totalTime, false);
    
    console.error(`❌ [Activities API] Error in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch activities',
        success: false,
        data: [],
        count: 0,
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

export async function POST(request: NextRequest) {
  const requestStart = performance.now();
  
  try {
    console.log('🔧 [Activities API] Starting POST request');

    const credentialsStart = performance.now();
    
    // Get credentials from API Key Service
    const [apiKey, baseId, tableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableActivitiesTableId(),
    ]);
    
    const credentialsTime = performance.now() - credentialsStart;
    console.log(`🔑 [TIMING] Activities POST credentials: ${credentialsTime.toFixed(2)}ms`);

    // Validate all credentials are available
    if (!apiKey || !baseId || !tableId) {
      throw new Error('Missing Airtable credentials for activities');
    }

    // Parse request body
    const parseStart = performance.now();
    const activityData: ActivityFormData = await request.json();
    const parseTime = performance.now() - parseStart;
    console.log(`📝 [Activities API] Parsing request: ${parseTime.toFixed(2)}ms`);
    console.log('📝 [Activities API] Creating activity:', activityData);

    // Transform data for Airtable
    const airtableData = {
      fields: {
        // Required fields
        Tipo: activityData.Tipo,
        Stato: 'Da Pianificare', // Default state for new activities
        
        // Optional fields
        ...(activityData.Obiettivo && { Obiettivo: activityData.Obiettivo }),
        ...(activityData.Data && { Data: activityData.Data }),
        ...(activityData['Durata stimata'] && { 'Durata stimata': activityData['Durata stimata'] }),
        ...(activityData.Priorità && { Priorità: activityData.Priorità }),
        ...(activityData.Note && { Note: activityData.Note }),
        ...(activityData['ID Lead'] && { 'ID Lead': activityData['ID Lead'] }),
        ...(activityData.Assegnatario && { Assegnatario: activityData.Assegnatario }),
      },
    };

    console.log('📤 [Activities API] Sending to Airtable:', airtableData);
    
    const fetchStart = performance.now();

    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(airtableData),
    });

    const result = await response.json();
    const fetchTime = performance.now() - fetchStart;
    console.log(`🚀 [TIMING] Activities POST fetch: ${fetchTime.toFixed(2)}ms`);

    if (!response.ok) {
      console.error('❌ [Activities API] Airtable error:', {
        status: response.status,
        statusText: response.statusText,
        error: result,
      });
      throw new Error(result.error?.message || `Airtable API error: ${response.status}`);
    }

    // 🚀 Invalidate cache after successful creation
    await invalidateActivitiesCache();
    
    const totalTime = performance.now() - requestStart;
    
    // 📈 Record performance metrics
    recordApiLatency('activities_post_api', totalTime, false);
    
    console.log(`✅ [Activities API] Activity created successfully: ${result.id} in ${totalTime.toFixed(2)}ms`);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Activity created successfully',
      _timing: {
        total: Math.round(totalTime),
        credentials: Math.round(credentialsTime),
        parse: Math.round(parseTime),
        fetch: Math.round(fetchTime),
      }
    });
  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // 📈 Record error metrics
    recordError('activities_post_api', errorMessage);
    recordApiLatency('activities_post_api', totalTime, false);
    
    console.error(`❌ [Activities API] Error in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      {
        error: 'Failed to create activity',
        success: false,
        details: errorMessage,
        _timing: {
          total: Math.round(totalTime),
        }
      },
      { status: 500 }
    );
  }
}
