import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey, getAirtableBaseId, getAirtableLeadsTableId } from '@/lib/api-keys-service';
import { leadsCache } from '@/lib/leads-cache';
import { invalidateLeadCache, invalidateUsersCache } from '@/lib/cache';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';
import { LeadFormData } from '@/types/leads';

// 💥 DISABLE ALL NEXT.JS CACHING FOR THIS ROUTE
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper function to lookup Marketing Source record ID by name
async function getMarketingSourceRecordId(
  apiKey: string,
  baseId: string,
  sourceName: string
): Promise<string | null> {
  try {
    const encodedName = encodeURIComponent(sourceName);
    const filterFormula = `{Name} = '${sourceName}'`;
    const url = `https://api.airtable.com/v0/${baseId}/Marketing%20Sources?filterByFormula=${encodeURIComponent(filterFormula)}`;
    
    console.log(`📡 [LOOKUP] Fetching Marketing Sources with filter: ${filterFormula}`);
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [LOOKUP] Error: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log(`📦 [LOOKUP] Response records:`, data.records?.length || 0);
    
    if (data.records && data.records.length > 0) {
      const recordId = data.records[0].id;
      console.log(`✅ [LOOKUP] Found record ID: ${recordId}`);
      return recordId;
    }
    
    console.warn(`⚠️ [LOOKUP] No record found for source: ${sourceName}`);
    return null;
  } catch (error) {
    console.error(`❌ [LOOKUP] Exception:`, error);
    return null;
  }
}

// Helper function to build Airtable filter
function buildAirtableFilter(searchParams: URLSearchParams): string {
  const conditions: string[] = [];

  // Filtro per stato - supporta valori multipli
  const stati = searchParams.getAll('stato').filter(s => s && s !== 'all');
  if (stati.length > 0) {
    if (stati.length === 1) {
      conditions.push(`{Stato} = '${stati[0]}'`);
    } else {
      const statiConditions = stati.map(stato => `{Stato} = '${stato}'`).join(',');
      conditions.push(`OR(${statiConditions})`);
    }
  }

  // Filtro per provenienza - supporta valori multipli
  const provenienze = searchParams.getAll('provenienza').filter(p => p && p !== 'all');
  if (provenienze.length > 0) {
    if (provenienze.length === 1) {
      conditions.push(`{Provenienza} = '${provenienze[0]}'`);
    } else {
      const provenienzeConditions = provenienze.map(provenienza => `{Provenienza} = '${provenienza}'`).join(',');
      conditions.push(`OR(${provenienzeConditions})`);
    }
  }

  // Filtro per data
  const dataInizio = searchParams.get('dataInizio');
  if (dataInizio) {
    conditions.push(`IS_AFTER({Data}, '${dataInizio}')`);
  }

  const dataFine = searchParams.get('dataFine');
  if (dataFine) {
    conditions.push(`IS_BEFORE({Data}, '${dataFine}')`);
  }

  // Filtro per città
  const citta = searchParams.get('citta');
  if (citta) {
    conditions.push(`SEARCH('${citta.toLowerCase()}', LOWER({Città}))`);
  }

  // Search globale
  const search = searchParams.get('search');
  if (search) {
    const searchLower = search.toLowerCase();
    conditions.push(`OR(
      SEARCH('${searchLower}', LOWER({Nome})),
      SEARCH('${searchLower}', LOWER({Email})),
      SEARCH('${searchLower}', LOWER({Telefono})),
      SEARCH('${searchLower}', LOWER({Città})),
      SEARCH('${searchLower}', LOWER({Note}))
    )`);
  }

  return conditions.length > 0 ? `AND(${conditions.join(',')})` : '';
}

// Helper function to fetch ALL records from Airtable using pagination
// Copied from working CRM original implementation
async function fetchAllRecords(
  apiKey: string,
  baseId: string,
  tableId: string,
  baseParams: URLSearchParams
): Promise<any[]> {
  let offset: string | undefined;
    const allRecords: any[] = [];
  let retries = 0;
  const MAX_RETRIES = 3;

  do {
    const currentParams = new URLSearchParams(baseParams);
    if (offset) {
      currentParams.set('offset', offset);
    }

    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableId}?${currentParams.toString()}`;

    console.log(
      `📡 Fetching records${offset ? ` (offset: ${offset.substring(0, 10)}...)` : ' (first page)'}`
    );
    console.log(`🔗 URL: ${airtableUrl}`);

    const response = await fetch(airtableUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      // Usa caching per migliorare performance
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (errorText.includes('LIST_RECORDS_ITERATOR_NOT_AVAILABLE') && retries < MAX_RETRIES) {
        console.log(`🔄 Iterator expired (normal behavior), restarting pagination... (attempt ${retries + 1}/${MAX_RETRIES})`);
        offset = undefined; // Reset offset to restart pagination
        allRecords.length = 0; // Clear already fetched records
        retries++;
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue; // Continue with the do-while loop
      } else {
        console.error(`❌ Airtable API error: ${response.status} - ${errorText}`);
        throw new Error(`Airtable error ${response.status}`);
      }
    }

    const json = (await response.json()) as {
      records: Array<{
        id: string;
        fields: Record<string, unknown>;
        createdTime: string;
      }>;
      offset?: string;
    };

    console.log(`📦 Received ${json.records?.length || 0} records`);

    allRecords.push(...json.records);
    offset = json.offset;
    
    // Log successful recovery after retry
    if (retries > 0 && allRecords.length > 0) {
      console.log(`✅ Successfully recovered after iterator retry`);
    }

    console.log(
      `📊 Total so far: ${allRecords.length}${offset ? ', more available' : ', done'}`
    );
  } while (offset);

  console.log(`✅ Completed: ${allRecords.length} total records loaded`);
  return allRecords;
}

/**
 * DELETE /api/leads - Delete multiple leads
 * Expects JSON body with { leadIds: string[] }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadIds } = body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json(
        { error: 'leadIds array is required' },
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

    console.log(`🗑️ [DELETE] Attempting to delete ${leadIds.length} leads:`, leadIds);

    // Airtable supporta l'eliminazione di fino a 10 record per volta
    const BATCH_SIZE = 10;
    const batches: any[] = [];
    for (let i = 0; i < leadIds.length; i += BATCH_SIZE) {
      batches.push(leadIds.slice(i, i + BATCH_SIZE));
    }

    const deletedIds: any[] = [];
    const errors: any[] = [];

    for (const batch of batches) {
      try {
        // Costruisci URL con query params per ogni ID
        const deleteParams = batch.map((id) => `records[]=${encodeURIComponent(id)}`).join('&');
        const deleteUrl = `https://api.airtable.com/v0/${baseId}/${tableId}?${deleteParams}`;

        console.log(`🔄 Deleting batch of ${batch.length} records...`);
        
        const response = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Batch delete error: ${response.status} - ${errorText}`);
          errors.push(`Batch error: ${response.status}`);
          continue;
        }

        const result = await response.json();
        console.log(`✅ Batch deleted successfully:`, result.records?.length || 0, 'records');
        
        if (result.records) {
          deletedIds.push(...result.records.map((r: any) => r.id));
        }
      } catch (error) {
        console.error('❌ Batch delete error:', error);
        errors.push(`Batch error: ${error}`);
      }
    }

    // Invalida la cache dopo le eliminazioni
    leadsCache.clear();
    console.log('🧹 Cache cleared after deletions');

    const result = {
      success: true,
      deleted: deletedIds.length,
      requested: leadIds.length,
      deletedIds,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log(`✅ [DELETE] Completed:`, result);
    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ [DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete leads' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/leads - Retrieve leads with optional filters
 * Supports ?loadAll=true to fetch all records regardless of pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

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

    // Check if user wants to load all records
    const loadAll = searchParams.get('loadAll') === 'true';

    // Cache clearing se richiesto
    const clearCache = searchParams.get('clearCache') === 'true';
    const ultraRefresh = searchParams.get('_ultraRefresh') === 'true';
    
    if (clearCache || ultraRefresh) {
      leadsCache.clear();
    }
    
    console.log(`[API] Loading ${loadAll ? 'all' : 'paginated'} leads${clearCache || ultraRefresh ? ' (cache cleared)' : ''}`);

    // Build base query parameters (without pagination)
    const baseParams = new URLSearchParams();

    // Filters
    const filterFormula = buildAirtableFilter(searchParams);
    if (filterFormula) {
      baseParams.set('filterByFormula', filterFormula);
    }

    // Sorting
    const sortField = searchParams.get('sortField') || 'Data';
    const sortDirection = searchParams.get('sortDirection') || 'desc';
    baseParams.set('sort[0][field]', sortField);
    baseParams.set('sort[0][direction]', sortDirection);

    // DON'T specify a view - this will fetch ALL records from the table
    // regardless of any view filters that might be applied in Airtable UI

    if (loadAll) {
      // Controlla se è richiesto un force refresh (bypass cache)
      const forceRefresh = searchParams.get('_forceRefresh') || 
                          searchParams.get('skipCache') === 'true' || 
                          clearCache || 
                          ultraRefresh;
      
      let cachedData = null;
      let cacheKey = '';
      
      if (!forceRefresh) {
        // Genera chiave cache basata sui parametri
        cacheKey = leadsCache.generateKey(searchParams);
        
        // Controlla cache prima
        cachedData = leadsCache.get(cacheKey);
        if (cachedData) {
          console.log(`🚀 [CACHE HIT] Serving ${cachedData.length} leads from cache`);
          const transformedData = {
            records: cachedData,
            offset: undefined,
            fromCache: true, // Flag per debug
          };
          return NextResponse.json(transformedData);
        }
      } else {
        console.log(`🔄 [FORCE REFRESH] Bypassing cache and fetching fresh data from Airtable`);
        cacheKey = leadsCache.generateKey(searchParams);
      }
      
      console.log(`💾 [CACHE MISS] Fetching from Airtable...`);
      // Fetch ALL records using recursive pagination
      console.log('🔄 Loading ALL leads from Airtable...');
      const allRecords = await fetchAllRecords(apiKey, baseId, tableId, baseParams);

      // Transform the data to match our LeadData interface
      const transformedRecords = allRecords.map((record: any) => ({
        id: record.id,
        createdTime: record.createdTime,
        ...record.fields,
      }));
      
      // Salva in cache per future richieste
      leadsCache.set(cacheKey, transformedRecords);
      
      const transformedData = {
        records: transformedRecords,
        offset: undefined,
        fromCache: false, // Flag per debug
      };

      console.log(`✅ Loaded ${allRecords.length} leads total and cached`);
      return NextResponse.json(transformedData);
    } else {
      // Standard paginated request
      const maxRecords = searchParams.get('maxRecords') || '25';
      baseParams.set('maxRecords', maxRecords);

      const offset = searchParams.get('offset');
      if (offset) {
        baseParams.set('offset', offset);
      }

      // Call Airtable API
      const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableId}?${baseParams}`;

      const response = await fetch(airtableUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        // Usa caching per 30 secondi per migliorare performance
        next: { revalidate: 30 },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Airtable API error:', response.status, errorText);
        return NextResponse.json(
          { error: `Airtable API error: ${response.status}` },
          { status: response.status }
        );
      }

      const data = await response.json();

      // Transform the data to match our LeadData interface
      const transformedData = {
        ...data,
        records: data.records.map((record: any) => ({
          id: record.id,
          createdTime: record.createdTime,
          ...record.fields,
        })),
      };

      return NextResponse.json(transformedData);
    }
  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/leads - Create a new lead OR invalidate cache
 * Expects JSON body with LeadFormData, or query param ?invalidate=true
 */
export async function POST(request: NextRequest) {
  // Handle cache invalidation request
  const { searchParams } = new URL(request.url);
  if (searchParams.get('invalidate') === 'true') {
    console.log('[API] POST /api/leads?invalidate=true - Clearing cache');
    leadsCache.clear();
    return NextResponse.json({ success: true, message: 'Cache invalidated' });
  }
  
  const requestStart = performance.now();
  
  try {
    const body: LeadFormData = await request.json();
    
    console.log('🚀 [CREATE LEAD] Starting request');
    console.log('🔄 [CREATE LEAD] Received data:', JSON.stringify(body, null, 2));
    console.log('🔄 [CREATE LEAD] Data types:', {
      Nome: typeof body.Nome,
      CAP: typeof body.CAP,
      Telefono: typeof body.Telefono,
      Email: typeof body.Email,
      Provenienza: typeof body.Provenienza,
      Assegnatario: Array.isArray(body.Assegnatario) ? 'array' : typeof body.Assegnatario,
      Referenza: Array.isArray(body.Referenza) ? 'array' : typeof body.Referenza,
      Allegati: Array.isArray(body.Allegati) ? 'array' : typeof body.Allegati,
    });

    // Validazione base
    if (!body.Nome?.trim()) {
      return NextResponse.json(
        { error: 'Nome è obbligatorio' },
        { status: 400 }
      );
    }
    
    if (!body.Provenienza?.trim()) {
      return NextResponse.json(
        { error: 'Provenienza è obbligatoria' },
        { status: 400 }
      );
    }

    // Get Airtable credentials with timing
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

    // 🔑 Lookup del record ID della fonte da Marketing Sources
    console.log(`🔍 [LOOKUP] Cercando record ID per provenienza: "${body.Provenienza}"`);
    const sourceRecordId = await getMarketingSourceRecordId(apiKey, baseId, body.Provenienza);
    
    if (!sourceRecordId) {
      console.error(`❌ Fonte non trovata: "${body.Provenienza}"`);
      return NextResponse.json(
        { error: `Fonte "${body.Provenienza}" non trovata nel database` },
        { status: 400 }
      );
    }
    
    console.log(`✅ [LOOKUP] Trovato record ID: ${sourceRecordId}`);

    // Prepara i dati per Airtable - gestione corretta dei campi opzionali
    // Crea datetime con data e ora in formato 24h: YYYY-MM-DD HH:MM
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const dataConOra = `${year}-${month}-${day} ${hours}:${minutes}`;
    
    const airtableFields: Record<string, any> = {
      Nome: body.Nome.trim(),
      Data: dataConOra, // YYYY-MM-DD HH:MM format (con orario 24h)
      Stato: body.Stato || 'Nuovo',
      Fonte: [sourceRecordId], // Link record a Marketing Sources
    };
    
    console.log(`⏰ [CREATE LEAD] Datetime created: ${dataConOra}`);

    // Aggiungi solo i campi che hanno valori validi (non vuoti, null o undefined)
    if (body.Telefono && typeof body.Telefono === 'string' && body.Telefono.trim() !== '') {
      airtableFields.Telefono = body.Telefono.trim();
    }
    if (body.Email && typeof body.Email === 'string' && body.Email.trim() !== '') {
      airtableFields.Email = body.Email.trim();
    }
    if (body.Indirizzo && typeof body.Indirizzo === 'string' && body.Indirizzo.trim() !== '') {
      airtableFields.Indirizzo = body.Indirizzo.trim();
    }
    if (body.CAP !== undefined && body.CAP !== null && typeof body.CAP === 'number' && body.CAP > 0) {
      airtableFields.CAP = body.CAP;
    }
    if (body.Città && typeof body.Città === 'string' && body.Città.trim() !== '') {
      airtableFields.Città = body.Città.trim();
    }
    if (body.Esigenza && typeof body.Esigenza === 'string' && body.Esigenza.trim() !== '') {
      airtableFields.Esigenza = body.Esigenza.trim();
    }
    if (body.Note && typeof body.Note === 'string' && body.Note.trim() !== '') {
      airtableFields.Note = body.Note.trim();
    }
    if (body.Assegnatario && Array.isArray(body.Assegnatario) && body.Assegnatario.length > 0) {
      airtableFields.Assegnatario = body.Assegnatario;
    }
    if (body.Referenza && Array.isArray(body.Referenza) && body.Referenza.length > 0) {
      airtableFields.Referenza = body.Referenza;
    }
    if (body.Allegati && Array.isArray(body.Allegati) && body.Allegati.length > 0) {
      // Converti gli allegati in JSON string per il nuovo formato
      const attachmentsJson = body.Allegati.map(allegato => ({
        url: allegato.url,
        filename: allegato.filename
      }));
      airtableFields.Allegati = JSON.stringify(attachmentsJson);
    }

    const airtableData = {
      fields: airtableFields,
    };

    console.log('📤 [CREATE LEAD] Sending to Airtable:', airtableData);

    // Chiamata API Airtable per creare il record con ottimizzazioni
    const airtableStart = performance.now();
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableId}`;
    
    const response = await fetch(airtableUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate, br', // 🚀 Compressione
      },
      body: JSON.stringify(airtableData),
    });
    
    const airtableTime = performance.now() - airtableStart;
    console.log(`🌐 [TIMING] Airtable API call: ${airtableTime.toFixed(2)}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Airtable create error: ${response.status} - ${errorText}`);
      console.error(`📋 Request body sent to Airtable:`, JSON.stringify(airtableData, null, 2));
      console.error(`📋 Original form data:`, JSON.stringify(body, null, 2));
      
      // Cerca di parsare l'errore Airtable per dettagli più specifici
      let detailedError = `Failed to create lead: ${response.status}`;
      try {
        const errorObj = JSON.parse(errorText);
        if (errorObj.error && errorObj.error.message) {
          detailedError = errorObj.error.message;
        }
      } catch {
        // Fallback al messaggio originale
      }
      
      return NextResponse.json(
        { error: detailedError },
        { status: response.status }
      );
    }

    const parseStart = performance.now();
    const createdRecord = await response.json();
    const parseTime = performance.now() - parseStart;
    console.log(`📝 [TIMING] JSON parsing: ${parseTime.toFixed(2)}ms`);
    
    console.log('✅ [CREATE LEAD] Successfully created:', createdRecord.id);

    // 🚀 Invalida entrambe le cache (legacy + KV) - async, non-blocking
    leadsCache.clear();
    Promise.all([
      invalidateLeadCache(), // Invalida tutta la cache lead KV
      invalidateUsersCache(), // Gli users potrebbero avere conteggi aggiornati
    ]).then(() => {
      console.log('🧽 All caches cleared after lead creation');
    }).catch(error => {
      console.warn('⚠️ [CREATE LEAD] Cache invalidation failed (non-critical):', error);
    });

    // 🔄 Trasformazione: Includi il campo Fonte (array di record IDs)
    // Quando creiamo un lead, salviamo Fonte come array di IDs link record
    // Questo viene ritornato da Airtable e usato dal frontend per il lookup
    let finalFields = { ...createdRecord.fields };
    
    console.log('🔍 [TRANSFORM] Final fields from Airtable:', JSON.stringify(finalFields, null, 2));
    console.log('🔍 [TRANSFORM] Fonte field:', finalFields.Fonte);
    
    // Assicurati che il campo Fonte sia presente nella risposta
    if (!finalFields.Fonte) {
      console.warn('⚠️ [TRANSFORM] Fonte field missing from Airtable response');
      // Prova a ricostruirlo dal body se disponibile
      if (body._fonteName) {
        const sourceRecordIdAgain = await getMarketingSourceRecordId(apiKey, baseId, body._fonteName);
        if (sourceRecordIdAgain) {
          finalFields.Fonte = [sourceRecordIdAgain];
          console.log(`✅ [TRANSFORM] Reconstructed Fonte from body: ${sourceRecordIdAgain}`);
        }
      }
    }
    
    // Transform per risposta coerente
    const transformedRecord = {
      id: createdRecord.id,
      createdTime: createdRecord.createdTime,
      ...finalFields,
    };
    
    const totalTime = performance.now() - requestStart;
    
    // 📈 Record performance metrics
    recordApiLatency('create_lead_api', totalTime, false); // Never cached for creation
    
    console.log(`✅ [CREATE LEAD] Completed: ${createdRecord.id} in ${totalTime.toFixed(2)}ms`);

    return NextResponse.json({
      success: true,
      lead: transformedRecord,
      _timing: {
        total: Math.round(totalTime),
        cached: false,
      }
    });
  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // 📈 Record error metrics
    recordError('create_lead_api', errorMessage);
    recordApiLatency('create_lead_api', totalTime, false);
    
    console.error(`❌ [CREATE LEAD] Error in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create lead',
        _timing: {
          total: Math.round(totalTime),
          cached: false,
        }
      },
      { status: 500 }
    );
  }
}
