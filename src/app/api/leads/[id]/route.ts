import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey, getAirtableBaseId, getAirtableLeadsTableId } from '@/lib/api-keys-service';
import { leadsCache } from '@/lib/leads-cache';
import { getCachedLead, invalidateLeadCache } from '@/lib/cache';
// import { fetchAirtableRecord } from '@/lib/airtable-batch'; // Temporaneamente disabilitato
import { recordApiLatency, recordError } from '@/lib/performance-monitor';
import { LeadFormData } from '@/types/leads';

/**
 * GET /api/leads/[id] - Get single lead by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  const requestStart = performance.now();
  
  try {
    const leadId = id;
    
    // Check for skipCache query parameter
    const { searchParams } = new URL(request.url);
    const skipCache = searchParams.get('skipCache') === 'true';
    
    
    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 [GET LEAD] Starting fetch for: ${leadId}`);

    // 🚀 Usa batch processing ottimizzato con caching
    const fetchFn = async () => {
      const credentialsStart = performance.now();
      
      // Get Airtable credentials
      const [apiKey, baseId, tableId] = await Promise.all([
        getAirtableKey(),
        getAirtableBaseId(), 
        getAirtableLeadsTableId(),
      ]);
      
      const credentialsTime = performance.now() - credentialsStart;
      console.log(`🔑 [TIMING] Credentials fetch: ${credentialsTime.toFixed(2)}ms`);
      
      if (!apiKey || !baseId || !tableId) {
        throw new Error('Airtable credentials not available');
      }

      // 🔄 Usa chiamata diretta Airtable (più affidabile) con ottimizzazioni
      const airtableStart = performance.now();
      
      // Call Airtable API direttamente senza limitazioni sui campi
      const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableId}/${leadId}`;
      
      const response = await fetch(airtableUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br', // 🚀 Mantieni compressione
        },
      });

      const airtableTime = performance.now() - airtableStart;
      console.log(`🌐 [TIMING] Airtable API call: ${airtableTime.toFixed(2)}ms`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Airtable API error: ${response.status} - ${errorText}`);
        
        if (response.status === 404 || response.status === 403) {
          const is404Error = response.status === 404 || 
            errorText.includes('INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND') ||
            errorText.includes('model was not found');
            
          if (is404Error) {
            throw new Error('Lead not found');
          }
        }
        
        throw new Error(`Airtable API error: ${response.status}`);
      }

      const parseStart = performance.now();
      const record = await response.json();

      // Transform the data to match our LeadData interface
      const transformedLead = {
        id: record.id,
        createdTime: record.createdTime,
        ...record.fields, // 🚀 Tutti i campi senza limitazioni
      };
      
      const parseTime = performance.now() - parseStart;
      console.log(`📝 [TIMING] JSON parsing: ${parseTime.toFixed(2)}ms`);

      return transformedLead;
    };
    
    // Esegui con o senza cache in base al parametro
    const result = skipCache 
      ? await fetchFn()
      : await getCachedLead(leadId, fetchFn);
    
    const totalTime = performance.now() - requestStart;
    const wasCached = totalTime < 100; // Assume cached if under 100ms
    
    // 📈 Record performance metrics
    recordApiLatency('lead_api', totalTime, wasCached);
    
    console.log(`✅ [GET LEAD] Completed: ${leadId} in ${totalTime.toFixed(2)}ms (cached: ${wasCached})`);
    
    return NextResponse.json({
      success: true,
      lead: result,
      _timing: {
        total: Math.round(totalTime),
        cached: wasCached,
      }
    });

  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // 📈 Record error metrics
    recordError('lead_api', errorMessage);
    recordApiLatency('lead_api', totalTime, false); // Non-cached error
    
    console.error(`❌ [GET LEAD] Error in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch lead',
        _timing: {
          total: Math.round(totalTime),
          cached: false,
        }
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/leads/[id] - Update single lead
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  const requestStart = performance.now();
  
  try {
    const leadId = id;
    const body: Partial<LeadFormData> = await request.json();
    
    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    console.log('🔄 [UPDATE LEAD] Received data:', { leadId, body });

    // Get Airtable credentials
    const credentialsStart = performance.now();
    const [apiKey, baseId, tableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableLeadsTableId(),
    ]);
    
    const credentialsTime = performance.now() - credentialsStart;
    console.log(`🔑 [TIMING] Credentials fetch: ${credentialsTime.toFixed(2)}ms`);
    
    if (!apiKey || !baseId || !tableId) {
      return NextResponse.json(
        { error: 'Airtable credentials not available' },
        { status: 500 }
      );
    }

    // Prepara i dati per Airtable (solo campi forniti)
    const fieldsToUpdate: Record<string, any> = {};
    
    if (body.Nome !== undefined) fieldsToUpdate.Nome = body.Nome.trim();
    if (body.Telefono !== undefined) fieldsToUpdate.Telefono = body.Telefono.trim();
    if (body.Email !== undefined) fieldsToUpdate.Email = body.Email.trim();
    if (body.Indirizzo !== undefined) fieldsToUpdate.Indirizzo = body.Indirizzo.trim();
    if (body.CAP !== undefined) fieldsToUpdate.CAP = body.CAP;
    if (body.Città !== undefined) fieldsToUpdate.Città = body.Città.trim();
    if (body.Esigenza !== undefined) fieldsToUpdate.Esigenza = body.Esigenza.trim();
    if (body.Stato !== undefined) fieldsToUpdate.Stato = body.Stato;
    // ⚠️ Provenienza è un campo linked (lookup/rollup) in Airtable e non può essere modificato direttamente
    // if (body.Provenienza !== undefined) fieldsToUpdate.Provenienza = body.Provenienza;
    if (body.Note !== undefined) fieldsToUpdate.Note = body.Note.trim();
    if (body.Assegnatario !== undefined) fieldsToUpdate.Assegnatario = body.Assegnatario;
    if (body.Referenza !== undefined) fieldsToUpdate.Referenza = body.Referenza;
    if (body.Allegati !== undefined) {
      // Gestione del nuovo formato JSON per allegati
      if (typeof body.Allegati === 'string') {
        // Se è già una stringa JSON, usa quella
        fieldsToUpdate.Allegati = body.Allegati;
        console.log('📎 [UPDATE LEAD] Setting Allegati as JSON string:', body.Allegati);
      } else if (Array.isArray(body.Allegati)) {
        // Se è un array, convertilo in stringa JSON
        fieldsToUpdate.Allegati = JSON.stringify(body.Allegati);
        console.log('📎 [UPDATE LEAD] Converting Allegati array to JSON:', fieldsToUpdate.Allegati);
      } else {
        // Fallback: stringa vuota per rimuovere
        fieldsToUpdate.Allegati = "";
        console.log('📎 [UPDATE LEAD] Clearing Allegati field');
      }
    }

    const airtableData = {
      fields: fieldsToUpdate,
    };

    console.log('📤 [UPDATE LEAD] Sending to Airtable:', airtableData);

    // Chiamata API Airtable per aggiornare il record con timeout
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableId}/${leadId}`;
    
    // Controller per timeout - Fire & Verify strategy
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('⏰ [UPDATE LEAD] Airtable request timeout after 6s (Fire & Verify), aborting...');
      controller.abort();
    }, 6000); // 6s timeout per Fire & Verify strategy
    
    const airtableStart = performance.now();
    
    const response = await fetch(airtableUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(airtableData),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const airtableTime = performance.now() - airtableStart;
    console.log(`🌐 [TIMING] Airtable API call: ${airtableTime.toFixed(2)}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Airtable update error: ${response.status} - ${errorText}`);
      
      // Airtable può restituire 403 per record non esistenti o inaccessibili
      if (response.status === 404 || response.status === 403) {
        // Controlla se l'errore indica che il modello/record non è stato trovato
        const is404Error = response.status === 404 || 
          errorText.includes('INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND') ||
          errorText.includes('model was not found');
          
        if (is404Error) {
          return NextResponse.json(
            { error: 'Lead not found' },
            { status: 404 }
          );
        }
      }
      
      return NextResponse.json(
        { error: `Failed to update lead: ${response.status}` },
        { status: response.status }
      );
    }

    const parseStart = performance.now();
    const updatedRecord = await response.json();
    const parseTime = performance.now() - parseStart;
    console.log(`📝 [TIMING] JSON parsing: ${parseTime.toFixed(2)}ms`);
    
    console.log('✅ [UPDATE LEAD] Successfully updated:', updatedRecord.id);

    // Invalida TUTTE le cache dei lead (sia singolo che lista completa)
    const cacheStart = performance.now();
    
    leadsCache.clear(); // Cache in-memory, veloce
    
    // 🚨 IMPORTANTE: Invalida TUTTA la cache dei lead (non solo il singolo)
    // Questo garantisce che la lista /leads mostri subito le modifiche
    Promise.all([
      invalidateLeadCache(leadId),  // Singolo lead
      invalidateLeadCache(),         // 🔥 TUTTA la cache dei lead
    ]).catch(err => {
      console.warn('⚠️ [UPDATE LEAD] Cache invalidation failed (non-critical):', err.message);
    });
    
    const cacheTime = performance.now() - cacheStart; // Solo parte sincrona
    
    console.log('🧹 [UPDATE LEAD] Cache cleared: in-memory + KV (single + all leads)');

    // Transform per risposta coerente
    const transformedRecord = {
      id: updatedRecord.id,
      createdTime: updatedRecord.createdTime,
      ...updatedRecord.fields,
    };
    
    const totalTime = performance.now() - requestStart;
    console.log(`✅ [UPDATE LEAD] Completed: ${leadId} in ${totalTime.toFixed(2)}ms`);
    
    // 📈 Record performance metrics
    recordApiLatency('lead_update_api', totalTime, false);

    return NextResponse.json({
      success: true,
      lead: transformedRecord,
      _timing: {
        total: Math.round(totalTime),
        airtable: Math.round(airtableTime),
        cache: Math.round(cacheTime),
      }
    });

  } catch (error: any) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // 📈 Record error metrics
    recordError('lead_update_api', errorMessage);
    recordApiLatency('lead_update_api', totalTime, false);
    
    console.error(`❌ [UPDATE LEAD] Error in ${totalTime.toFixed(2)}ms:`, error);
    
    // Gestione specifica per timeout
    if (error.name === 'AbortError') {
      console.error('⏰ [UPDATE LEAD] Request timed out after 6s (Fire & Verify)');
      return NextResponse.json(
        { 
          error: 'Request timeout - client will verify if operation succeeded',
          _timing: {
            total: Math.round(totalTime),
          }
        },
        { status: 408 } // Request Timeout
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to update lead',
        _timing: {
          total: Math.round(totalTime),
        }
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/leads/[id] - Delete single lead
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = await params;
  try {
    const leadId = id;
    
    if (!leadId) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    // Get Airtable credentials
    const [apiKey, baseId, tableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableLeadsTableId(),
    ]);
    if (!apiKey || !baseId || !tableId) {
      return NextResponse.json(
        { error: 'Airtable credentials not available' },
        { status: 500 }
      );
    }

    console.log(`🗑️ [DELETE LEAD] Attempting to delete lead: ${leadId}`);

    // Chiamata API Airtable per eliminare il record
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableId}/${leadId}`;
    
    const response = await fetch(airtableUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Airtable delete error: ${response.status} - ${errorText}`);
      
      // Airtable può restituire 403 per record non esistenti o inaccessibili
      if (response.status === 404 || response.status === 403) {
        // Controlla se l'errore indica che il modello/record non è stato trovato
        const is404Error = response.status === 404 || 
          errorText.includes('INVALID_PERMISSIONS_OR_MODEL_NOT_FOUND') ||
          errorText.includes('model was not found');
          
        if (is404Error) {
          return NextResponse.json(
            { error: 'Lead not found' },
            { status: 404 }
          );
        }
      }
      
      return NextResponse.json(
        { error: `Failed to delete lead: ${response.status}` },
        { status: response.status }
      );
    }

    const deletedRecord = await response.json();
    console.log('✅ [DELETE LEAD] Successfully deleted:', deletedRecord.id);

    // 🚀 Prepare response BEFORE cache invalidation  
    const apiResponse = NextResponse.json({
      success: true,
      deleted: true,
      id: deletedRecord.id,
    });
    
    // 🚀 NON-BLOCKING cache invalidation in background
    leadsCache.clear(); // In-memory cache, fast
    invalidateLeadCache(leadId).catch(err => 
      console.error('⚠️ [Leads DELETE] Background cache invalidation failed:', err)
    );
    console.log('🧹 Cache cleared after lead deletion');

    return apiResponse;

  } catch (error) {
    console.error('❌ [DELETE LEAD] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    );
  }
}
