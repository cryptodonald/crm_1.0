import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { 
  getAirtableKey,
  getAirtableBaseId,
  getAirtableActivitiesTableId,
} from '@/lib/api-keys-service';
import { ActivityFormData } from '@/types/activities';
import { getCachedActivities, invalidateActivitiesCache } from '@/lib/cache';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';
import { ActivitySyncService } from '@/lib/activity-sync-service';
import { authConfig } from '@/lib/auth.config';

export async function GET(request: NextRequest) {
  const requestStart = performance.now();
  
  try {
    console.log('🔧 [Activities API] Starting GET request');

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('maxRecords') || searchParams.get('limit') || '100';
    const offset = searchParams.get('offset') || '';
    const sortField = searchParams.get('sortField') || searchParams.get('sort') || 'Data';
    const sortDirection = searchParams.get('sortDirection') || searchParams.get('direction') || 'desc';
    const loadAll = searchParams.get('loadAll') === 'true';
    
    // Advanced filters
    const leadId = searchParams.get('leadId');
    const stati = searchParams.getAll('stato');
    const tipi = searchParams.getAll('tipo');
    const search = searchParams.get('search');
    const dataInizio = searchParams.get('dataInizio');
    const dataFine = searchParams.get('dataFine');
    const assegnatario = searchParams.get('assegnatario');
    
    // 🚀 Cache busting parameters
    const skipCache = searchParams.get('skipCache') === 'true';
    const forceRefresh = skipCache || searchParams.has('_t');
    
    console.log('🚀 [Activities API] Cache options:', { skipCache, forceRefresh, hasTimestamp: searchParams.has('_t') });
    
    // Create comprehensive cache key
    const filterKeys = [
      leadId && `lead:${leadId}`,
      stati.length > 0 && `stati:${stati.join(',')}`,
      tipi.length > 0 && `tipi:${tipi.join(',')}`,
      search && `search:${search}`,
      dataInizio && `from:${dataInizio}`,
      dataFine && `to:${dataFine}`,
      assegnatario && `assign:${assegnatario}`,
    ].filter(Boolean).join('|');
    
    const cacheKey = `activities:${limit}:${offset}:${sortField}:${sortDirection}:${filterKeys}`;

    // 🚀 Use caching system for performance optimization (skip cache if force refresh)
    let result;
    if (forceRefresh) {
      console.log('🚀 [Activities API] Force refresh - bypassing cache entirely');
      // Skip cache entirely and fetch fresh data
      result = await fetchActivitiesFromAirtable();
    } else {
      console.log('💾 [Activities API] Using cached data when available');
      result = await getCachedActivities(cacheKey, fetchActivitiesFromAirtable);
    }
    
    // Inline function to fetch from Airtable
    async function fetchActivitiesFromAirtable() {
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
      
      // Set pagination parameters
      if (loadAll) {
        // Load all records (up to Airtable's limit)
        url.searchParams.set('maxRecords', '1000');
      } else {
        url.searchParams.set('maxRecords', limit);
        if (offset) url.searchParams.set('offset', offset);
      }
      
      // Add sorting
      url.searchParams.set('sort[0][field]', sortField);
      url.searchParams.set('sort[0][direction]', sortDirection);
      
      // Build filter formula for Airtable
      const filterConditions = [];
      
      // Filter by lead ID if specified
      if (leadId) {
        filterConditions.push(`FIND('${leadId}', ARRAYJOIN({ID Lead}, ',')) > 0`);
      }
      
      // Filter by stati if specified
      if (stati.length > 0) {
        const statiCondition = stati.map(stato => `{Stato} = '${stato}'`).join(', ');
        filterConditions.push(`OR(${statiCondition})`);
      }
      
      // Filter by tipi if specified
      if (tipi.length > 0) {
        const tipiCondition = tipi.map(tipo => `{Tipo} = '${tipo}'`).join(', ');
        filterConditions.push(`OR(${tipiCondition})`);
      }
      
      // Search in multiple fields
      if (search) {
        const searchCondition = [
          `FIND(LOWER('${search}'), LOWER({Titolo})) > 0`,
          `FIND(LOWER('${search}'), LOWER({Note})) > 0`,
          `FIND(LOWER('${search}'), LOWER(ARRAYJOIN({Nome Lead}, ','))) > 0`,
        ].join(', ');
        filterConditions.push(`OR(${searchCondition})`);
      }
      
      // Date range filters
      if (dataInizio) {
        filterConditions.push(`IS_AFTER({Data}, '${dataInizio}')`);
      }
      
      if (dataFine) {
        filterConditions.push(`IS_BEFORE({Data}, '${dataFine}')`);
      }
      
      // Filter by assignee
      if (assegnatario) {
        filterConditions.push(`FIND('${assegnatario}', ARRAYJOIN({Assegnatario}, ',')) > 0`);
      }
      
      // Combine all filter conditions
      if (filterConditions.length > 0) {
        const filterFormula = filterConditions.length === 1 
          ? filterConditions[0]
          : `AND(${filterConditions.join(', ')})`;
        url.searchParams.set('filterByFormula', filterFormula);
      }

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

      // 🔄 Transform Airtable records to ActivityData format
      const transformedRecords = (data.records || []).map((record: any) => {
        const fields = { ...record.fields };
        
        // Parse Allegati field if it's a JSON string
        if (fields.Allegati && typeof fields.Allegati === 'string') {
          try {
            fields.Allegati = JSON.parse(fields.Allegati);
          } catch (e) {
            console.warn(`⚠️ Failed to parse attachments for activity ${record.id}:`, e);
            fields.Allegati = [];
          }
        }
        
        return {
          // Airtable metadata
          id: record.id,
          createdTime: record.createdTime,
          
          // Flatten fields to top level
          ...fields,
        };
      });
      
      console.log('🔄 [Activities API] Transformed records:', transformedRecords.length);
      
      return {
        success: true,
        data: transformedRecords,
        offset: data.offset,
        count: transformedRecords.length,
      };
    }
    
    const totalTime = performance.now() - requestStart;
    const wasCached = totalTime < 100; // Assume cached if under 100ms
    
    // 📈 Record performance metrics
    recordApiLatency('activities_api', totalTime, wasCached);
    
    console.log(`✅ [Activities API] Completed: ${result.count} activities in ${totalTime.toFixed(2)}ms (cached: ${wasCached})`);
    
    // Add headers for response
    const headers = new Headers({
      'Content-Type': 'application/json',
    });
    
    // Note: Removed Content-Encoding gzip as it causes ERR_CONTENT_DECODING_FAILED in development
    // Next.js handles compression automatically in production
    
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

    // Helper function to convert duration string to minutes
    const parseDurationToMinutes = (duration: string): number | undefined => {
      if (!duration) return undefined;
      
      // Handle formats like "00:15", "1:30", "15" (minutes)
      if (duration.includes(':')) {
        const [hours, minutes] = duration.split(':').map(Number);
        return (hours * 60) + minutes;
      }
      
      // If it's already a number string, use it as minutes
      const num = parseInt(duration, 10);
      return isNaN(num) ? undefined : num;
    };

    // Transform data for Airtable
    const airtableData = {
      fields: {
        // Required fields
        Tipo: activityData.Tipo,
        Stato: activityData.Stato || 'Da Pianificare', // Use provided state or default
        
        // Optional base fields
        ...(activityData.Obiettivo && { Obiettivo: activityData.Obiettivo }),
        ...(activityData.Priorità && { Priorità: activityData.Priorità }),
        
        // Programming fields
        ...(activityData.Data && { Data: activityData.Data }),
        ...(activityData['Durata stimata'] && { 
          'Durata stimata': parseDurationToMinutes(activityData['Durata stimata']) 
        }),
        
        // Assignment fields
        ...(activityData['ID Lead'] && { 'ID Lead': activityData['ID Lead'] }),
        ...(activityData.Assegnatario && { Assegnatario: activityData.Assegnatario }),
        
        // Results fields
        ...(activityData.Note && { Note: activityData.Note }),
        ...(activityData.Esito && { Esito: activityData.Esito }),
        ...(activityData['Prossima azione'] && { 'Prossima azione': activityData['Prossima azione'] }),
        ...(activityData['Data prossima azione'] && { 'Data prossima azione': activityData['Data prossima azione'] }),
        
        // Attachments - convert to JSON string format
        ...(activityData.allegati && activityData.allegati.length > 0 && {
          Allegati: JSON.stringify(activityData.allegati.map(allegato => ({
            url: allegato.url,
            filename: allegato.filename
          })))
        }),
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

    // 🚀 Invalidate cache after successful creation (async, non-blocking)
    invalidateActivitiesCache().catch(error => {
      console.warn('⚠️ [Activities API] Cache invalidation failed (non-critical):', error);
    });
    
    const totalTime = performance.now() - requestStart;
    
    // 📈 Record performance metrics
    recordApiLatency('activities_post_api', totalTime, false);
    
    console.log(`✅ [Activities API] Activity created successfully: ${result.id} in ${totalTime.toFixed(2)}ms`);

    // 📅 Sync to Google Calendar (async, non-blocking)
    // Get session to retrieve Google Calendar token
    const session = await getServerSession(authConfig);
    const userId = session?.user?.id || 'user_admin_001';
    const encryptedAccessToken = (session as any)?.googleAccessToken; // Token is encrypted by NextAuth
    
    console.log(`🔐 [Activities API] Session check - User: ${userId}, Has Google token: ${!!encryptedAccessToken}`);
    if (!encryptedAccessToken) {
      console.log(`🔐 [Activities API] Session details:`, { hasSession: !!session, sessionKeys: Object.keys(session || {}) });
    }
    
    if (encryptedAccessToken) {
      ActivitySyncService.syncCreateActivity(activityData, result.id, userId, encryptedAccessToken)
        .then((syncResult) => {
          if (syncResult.success) {
            console.log(`✅ [Activities API] Google Calendar sync successful: ${syncResult.googleEventId}`);
          } else {
            console.warn(`⚠️ [Activities API] Google Calendar sync failed: ${syncResult.error}`);
          }
        })
        .catch((error) => {
          console.error('❌ [Activities API] Google Calendar sync error:', error);
        });
    } else {
      console.log('ℹ️ [Activities API] No Google Calendar token - sync skipped');
    }

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
