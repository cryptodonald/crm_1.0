import { NextRequest, NextResponse } from 'next/server';
import { 
  getAirtableKey,
  getAirtableBaseId,
  getAirtableActivitiesTableId,
} from '@/lib/api-keys-service';
import { ActivityFormData } from '@/types/activities';
import { invalidateActivitiesCache } from '@/lib/cache';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestStart = performance.now();
  
  try {
    const resolvedParams = await params;
    console.log('🔧 [Activities API] Starting PATCH request for ID:', resolvedParams.id);

    const credentialsStart = performance.now();
    
    // Get credentials from API Key Service
    const [apiKey, baseId, tableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableActivitiesTableId(),
    ]);
    
    const credentialsTime = performance.now() - credentialsStart;
    console.log(`🔑 [TIMING] Activities PATCH credentials: ${credentialsTime.toFixed(2)}ms`);

    // Validate all credentials are available
    if (!apiKey || !baseId || !tableId) {
      throw new Error('Missing Airtable credentials for activities');
    }

    // Parse request body
    const parseStart = performance.now();
    const updateData = await request.json();
    const parseTime = performance.now() - parseStart;
    console.log(`📝 [Activities API] Parsing PATCH request: ${parseTime.toFixed(2)}ms`);
    console.log('📝 [Activities API] Updating activity:', { id: resolvedParams.id, data: updateData });

    // Transform data for Airtable
    const airtableData = {
      fields: updateData, // Direct pass-through for now, can add validation later
    };

    console.log('📤 [Activities API] Sending PATCH to Airtable:', airtableData);
    
    const fetchStart = performance.now();

    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${resolvedParams.id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(airtableData),
    });

    const result = await response.json();
    const fetchTime = performance.now() - fetchStart;
    console.log(`🚀 [TIMING] Activities PATCH fetch: ${fetchTime.toFixed(2)}ms`);

    if (!response.ok) {
      console.error('❌ [Activities API] Airtable PATCH error:', {
        status: response.status,
        statusText: response.statusText,
        error: result,
      });
      throw new Error(result.error?.message || `Airtable API error: ${response.status}`);
    }

    const totalTime = performance.now() - requestStart;
    
    // 📈 Record performance metrics
    recordApiLatency('activities_patch_api', totalTime, false);
    
    console.log(`✅ [Activities API] Activity updated successfully: ${result.id} in ${totalTime.toFixed(2)}ms`);

    // 🚀 Prepare response BEFORE cache invalidation
    const apiResponse = NextResponse.json({
      success: true,
      data: result,
      message: 'Activity updated successfully',
      _timing: {
        total: Math.round(totalTime),
        credentials: Math.round(credentialsTime),
        parse: Math.round(parseTime),
        fetch: Math.round(fetchTime),
      }
    });
    
    // 🚀 NON-BLOCKING cache invalidation in background
    invalidateActivitiesCache().catch(err => 
      console.error('⚠️ [Activities PATCH] Background cache invalidation failed:', err)
    );
    
    return apiResponse;
  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // 📈 Record error metrics
    recordError('activities_patch_api', errorMessage);
    recordApiLatency('activities_patch_api', totalTime, false);
    
    console.error(`❌ [Activities API] PATCH Error in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      {
        error: 'Failed to update activity',
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestStart = performance.now();
  
  try {
    const resolvedParams = await params;
    console.log('🔧 [Activities API] Starting PUT request for ID:', resolvedParams.id);

    const credentialsStart = performance.now();
    
    // Get credentials from API Key Service
    const [apiKey, baseId, tableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableActivitiesTableId(),
    ]);
    
    const credentialsTime = performance.now() - credentialsStart;
    console.log(`🔑 [TIMING] Activities PUT credentials: ${credentialsTime.toFixed(2)}ms`);

    // Validate all credentials are available
    if (!apiKey || !baseId || !tableId) {
      throw new Error('Missing Airtable credentials for activities');
    }

    // Parse request body
    const parseStart = performance.now();
    const activityData: ActivityFormData = await request.json();
    const parseTime = performance.now() - parseStart;
    console.log(`📝 [Activities API] Parsing PUT request: ${parseTime.toFixed(2)}ms`);
    console.log('📝 [Activities API] Updating activity:', { id: resolvedParams.id, data: activityData });

    // Transform data for Airtable - same logic as POST route
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
        ...(activityData['Durata stimata'] && { 'Durata stimata': activityData['Durata stimata'] }),
        
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

    console.log('📤 [Activities API] Sending PUT to Airtable:', airtableData);
    
    const fetchStart = performance.now();

    // Timeout configuration similar to lead API
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18000); // 18 second timeout

    try {
      const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${resolvedParams.id}`, {
        method: 'PATCH', // Use PATCH for partial updates in Airtable
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br', // Compression
        },
        body: JSON.stringify(airtableData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      const result = await response.json();
      const fetchTime = performance.now() - fetchStart;
      console.log(`🚀 [TIMING] Activities PUT fetch: ${fetchTime.toFixed(2)}ms`);

      if (!response.ok) {
        console.error('❌ [Activities API] Airtable PUT error:', {
          status: response.status,
          statusText: response.statusText,
          error: result,
        });
        throw new Error(result.error?.message || `Airtable API error: ${response.status}`);
      }

      const totalTime = performance.now() - requestStart;
      
      // 📈 Record performance metrics
      recordApiLatency('activities_put_api', totalTime, false);
      
      console.log(`✅ [Activities API] Activity updated successfully: ${result.id} in ${totalTime.toFixed(2)}ms`);

      // 🚀 Prepare response BEFORE cache invalidation
      const apiResponse = NextResponse.json({
        success: true,
        data: result,
        message: 'Activity updated successfully',
        _timing: {
          total: Math.round(totalTime),
          credentials: Math.round(credentialsTime),
          parse: Math.round(parseTime),
          fetch: Math.round(fetchTime),
        }
      });
      
      // 🚀 NON-BLOCKING cache invalidation in background
      invalidateActivitiesCache().catch(err => 
        console.error('⚠️ [Activities PUT] Background cache invalidation failed:', err)
      );
      
      return apiResponse;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.warn('⏱️ [Activities API] Request timed out, but update may have succeeded');
        throw new Error('Request timeout - please check if the activity was updated');
      }
      throw error;
    }
  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // 📈 Record error metrics
    recordError('activities_put_api', errorMessage);
    recordApiLatency('activities_put_api', totalTime, false);
    
    console.error(`❌ [Activities API] PUT Error in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      {
        error: 'Failed to update activity',
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestStart = performance.now();
  
  try {
    const resolvedParams = await params;
    console.log('🔧 [Activities API] Starting DELETE request for ID:', resolvedParams.id);

    const credentialsStart = performance.now();
    
    // Get credentials from API Key Service
    const [apiKey, baseId, tableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableActivitiesTableId(),
    ]);
    
    const credentialsTime = performance.now() - credentialsStart;
    console.log(`🔑 [TIMING] Activities DELETE credentials: ${credentialsTime.toFixed(2)}ms`);

    // Validate all credentials are available
    if (!apiKey || !baseId || !tableId) {
      throw new Error('Missing Airtable credentials for activities');
    }

    console.log('🗑️ [Activities API] Deleting activity from Airtable:', resolvedParams.id);
    
    const fetchStart = performance.now();

    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}/${resolvedParams.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const fetchTime = performance.now() - fetchStart;
    console.log(`🚀 [TIMING] Activities DELETE fetch: ${fetchTime.toFixed(2)}ms`);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ [Activities API] Airtable DELETE error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      throw new Error(`Airtable API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    const totalTime = performance.now() - requestStart;
    
    // 📈 Record performance metrics
    recordApiLatency('activities_delete_api', totalTime, false);
    
    console.log(`✅ [Activities API] Activity deleted successfully: ${result.id} in ${totalTime.toFixed(2)}ms`);

    // 🚀 Prepare response BEFORE cache invalidation
    const apiResponse = NextResponse.json({
      success: true,
      data: result,
      message: 'Activity deleted successfully',
      _timing: {
        total: Math.round(totalTime),
        credentials: Math.round(credentialsTime),
        fetch: Math.round(fetchTime),
      }
    });
    
    // 🚀 NON-BLOCKING cache invalidation in background
    invalidateActivitiesCache().catch(err => 
      console.error('⚠️ [Activities DELETE] Background cache invalidation failed:', err)
    );
    
    return apiResponse;
  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // 📈 Record error metrics
    recordError('activities_delete_api', errorMessage);
    recordApiLatency('activities_delete_api', totalTime, false);
    
    console.error(`❌ [Activities API] DELETE Error in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      {
        error: 'Failed to delete activity',
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
