import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey, getAirtableBaseId, getAirtableLeadsTableId } from '@/lib/api-keys-service';
import { RedisCache, generateCacheKey } from '@/lib/redis-cache';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';

// 💥 DISABLE ALL NEXT.JS CACHING FOR THIS ROUTE
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Table IDs (from Airtable schema inspection)
const ORDERS_TABLE_ID = 'tblkqfCMabBpVD1fP';
const ORDER_ITEMS_TABLE_ID = 'tblxzhMCa5UJOMZqC';
// LEADS_TABLE_ID will be fetched dynamically

// Helper function to build Airtable filter for orders
function buildAirtableFilter(searchParams: URLSearchParams): string {
  const conditions: string[] = [];

  // Filtro per stato ordine
  const stati = searchParams.getAll('stato_ordine').filter(s => s && s !== 'all');
  if (stati.length > 0) {
    if (stati.length === 1) {
      conditions.push(`{Stato_Ordine} = '${stati[0]}'`);
    } else {
      const statiConditions = stati.map(stato => `{Stato_Ordine} = '${stato}'`).join(',');
      conditions.push(`OR(${statiConditions})`);
    }
  }

  // Filtro per stato pagamento
  const statiPagamento = searchParams.getAll('stato_pagamento').filter(s => s && s !== 'all');
  if (statiPagamento.length > 0) {
    if (statiPagamento.length === 1) {
      conditions.push(`{Stato_Pagamento} = '${statiPagamento[0]}'`);
    } else {
      const statiConditions = statiPagamento.map(stato => `{Stato_Pagamento} = '${stato}'`).join(',');
      conditions.push(`OR(${statiConditions})`);
    }
  }

  // Filtro per venditore
  const venditoreId = searchParams.get('venditore_id');
  if (venditoreId) {
    conditions.push(`SEARCH('${venditoreId}', ARRAYJOIN({ID_Venditore}, ','))`);
  }

  // Filtro per Lead ID
  const leadId = searchParams.get('leadId');
  if (leadId) {
    conditions.push(`SEARCH('${leadId}', ARRAYJOIN({ID_Lead}, ','))`);
  }

  // Filtro per data ordine
  const dataInizio = searchParams.get('data_da');
  if (dataInizio) {
    conditions.push(`IS_AFTER({Data_Ordine}, '${dataInizio}')`);
  }

  const dataFine = searchParams.get('data_a');
  if (dataFine) {
    conditions.push(`IS_BEFORE({Data_Ordine}, '${dataFine}')`);
  }

  // Filtro per importo
  const importoMin = searchParams.get('importo_min');
  if (importoMin) {
    conditions.push(`{Totale_Finale} >= ${importoMin}`);
  }

  const importoMax = searchParams.get('importo_max');
  if (importoMax) {
    conditions.push(`{Totale_Finale} <= ${importoMax}`);
  }

  // Search globale
  const search = searchParams.get('search');
  if (search) {
    const searchLower = search.toLowerCase();
    conditions.push(`OR(
      SEARCH('${searchLower}', LOWER({Numero_Ordine})),
      SEARCH('${searchLower}', LOWER({Note_Cliente})),
      SEARCH('${searchLower}', LOWER({Note_Interne})),
      SEARCH('${searchLower}', LOWER({Indirizzo_Consegna}))
    )`);
  }

  return conditions.length > 0 ? `AND(${conditions.join(',')})` : '';
}

// Helper function to fetch ALL records from Airtable using pagination
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

  console.log('🔄 Loading ALL orders from Airtable...');

  do {
    const currentParams = new URLSearchParams(baseParams);
    if (offset) {
      currentParams.set('offset', offset);
    }

    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableId}?${currentParams.toString()}`;

    console.log(
      `📡 Request ${Math.floor(allRecords.length / 100) + 1}: Fetching up to 100 records ${offset ? '(continuing pagination)' : '(first page)'}`
    );

    const response = await fetch(airtableUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (errorText.includes('LIST_RECORDS_ITERATOR_NOT_AVAILABLE') && retries < MAX_RETRIES) {
        console.log(`🔄 Iterator expired, restarting pagination... (attempt ${retries + 1}/${MAX_RETRIES})`);
        offset = undefined;
        allRecords.length = 0;
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
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

    console.log(`📦 Request ${Math.floor(allRecords.length / 100) + 1}: Received ${json.records?.length || 0} records`);

    allRecords.push(...json.records);
    offset = json.offset;
    
    console.log(
      `📊 Total records so far: ${allRecords.length}${offset ? ', has more pages' : ', no more pages'}`
    );

    if (offset) {
      console.log(`🔄 Response has offset: ${Boolean(offset)}`);
      console.log(`📊 Total records so far: ${allRecords.length}`);
      console.log(`🔄 Has more records: ${Boolean(offset)}`);
    }
  } while (offset);

  console.log(`✅ Pagination completed: ${allRecords.length} total records loaded in ${Math.floor(allRecords.length / 100) + 1} requests`);
  console.log(`✅ Loaded ${allRecords.length} orders total`);
  
  return allRecords;
}

// Helper function to fetch leads data for lookup
async function fetchLeadsLookup(
  apiKey: string,
  baseId: string,
  leadsTableId: string,
  leadIds: string[]
): Promise<Record<string, string>> {
  if (leadIds.length === 0) return {};
  
  console.log('🔍 Loading leads data for lookup:', leadIds.length, 'leads');
  
  // Temporarily fetch all leads without filtering to debug
  const filterFormula = '';
  
  // Original filter approach (commented for debugging):
  // const filterFormula = leadIds.length === 1 
  //   ? `RECORD_ID() = '${leadIds[0]}'`
  //   : `OR(${leadIds.map(id => `RECORD_ID() = '${id}'`).join(',')})`;
    
  
  const params = new URLSearchParams();
  // Fetch only the Nome field for efficiency
  params.set('fields[]', 'Nome');
  
  // Only add filter if it exists
  if (filterFormula) {
    params.set('filterByFormula', filterFormula);
  }
  
  const leadsUrl = `https://api.airtable.com/v0/${baseId}/${leadsTableId}?${params.toString()}`;
  
  console.log('🔍 Leads lookup query:', {
    leadIds: leadIds.length,
    filterFormula,
    leadsUrl
  });
  
  const response = await fetch(leadsUrl, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Failed to fetch leads for lookup:', {
      status: response.status,
      statusText: response.statusText,
      errorBody: errorText,
      requestUrl: leadsUrl
    });
    return {};
  }
  
  const json = await response.json();
  const lookup: Record<string, string> = {};
  
  console.log('📊 Leads lookup response:', {
    recordsCount: json.records?.length || 0,
    records: json.records?.map((r: any) => ({ id: r.id, Nome: r.fields?.Nome })) || []
  });
  
  // Filter records on the client side and build lookup
  json.records?.forEach((record: any) => {
    // Only include records that we actually requested
    if (leadIds.includes(record.id) && record.fields?.Nome) {
      lookup[record.id] = record.fields.Nome;
    }
  });
  
  console.log('✅ Loaded', Object.keys(lookup).length, 'lead names for lookup');
  return lookup;
}

/**
 * GET /api/orders - Fetch orders with filters and pagination
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Debug log dei parametri
    console.log('🔧 [API] Request parameters:', {
      loadAll: searchParams.has('loadAll'),
      loadAllParam: searchParams.get('loadAll'),
      url: request.url
    });

    // Get Airtable credentials
    const [apiKey, baseId, leadsTableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableLeadsTableId(),
    ]);

    if (!apiKey || !baseId) {
      return NextResponse.json(
        { error: 'Airtable credentials not available' },
        { status: 500 }
      );
    }

    // Build base parameters for Airtable API
    const airtableParams = new URLSearchParams();

    // Sorting
    const sortField = searchParams.get('sortField') || 'Data_Ordine';
    const sortDirection = searchParams.get('sortDirection') || 'desc';
    airtableParams.append('sort[0][field]', sortField);
    airtableParams.append('sort[0][direction]', sortDirection);

    // Filtering
    const filterFormula = buildAirtableFilter(searchParams);
    if (filterFormula) {
      airtableParams.append('filterByFormula', filterFormula);
    }

    // Check if we need to load all records or paginate
    const loadAll = searchParams.get('loadAll') === 'true';
    
    if (loadAll) {
      // Fetch all records using pagination
      const allRecords = await fetchAllRecords(apiKey, baseId, ORDERS_TABLE_ID, airtableParams);
      
      // Extract unique lead IDs for lookup
      const leadIds = new Set<string>();
      allRecords.forEach(record => {
        const idLead = record.fields?.ID_Lead;
        if (Array.isArray(idLead)) {
          idLead.forEach(id => leadIds.add(id));
        }
      });
      
      // Fetch lead names for lookup
      const leadsLookup = await fetchLeadsLookup(apiKey, baseId, leadsTableId, Array.from(leadIds));
      
      // Enrich records with client names
      const enrichedRecords = allRecords.map(record => {
        const idLead = record.fields?.ID_Lead;
        let clientName = undefined;
        
        if (Array.isArray(idLead) && idLead.length > 0) {
          // Get all lead names and join them
          const leadNames = idLead
            .map(leadId => leadsLookup[leadId])
            .filter(name => name) // Remove undefined/null names
            .join(', ');
          
          clientName = leadNames || undefined;
        }
        
        // Prepara gli allegati esistenti per la tabella con parsing intelligente
        const existingAttachments = [];
        
        // Contratti - parsing unificato per tutti i formati
        if (record.fields?.URL_Contratto) {
          if (Array.isArray(record.fields.URL_Contratto)) {
            // Attachment array nativo di Airtable
            existingAttachments.push(...record.fields.URL_Contratto.map(item => item.url));
          } else if (typeof record.fields.URL_Contratto === 'object' && record.fields.URL_Contratto.url) {
            // Singolo attachment object
            existingAttachments.push(record.fields.URL_Contratto.url);
          } else if (typeof record.fields.URL_Contratto === 'string') {
            // Nuovo formato JSON o legacy
            try {
              const parsed = JSON.parse(record.fields.URL_Contratto);
              if (Array.isArray(parsed)) {
                // Nuovo formato: array di {url, filename}
                existingAttachments.push(...parsed.map(item => item.url || item));
              } else {
                // Single object {url, filename}
                existingAttachments.push(parsed.url || record.fields.URL_Contratto);
              }
            } catch {
              // Legacy: stringa URL semplice
              existingAttachments.push(record.fields.URL_Contratto);
            }
          }
        }
        
        // Documenti Cliente - parsing unificato per tutti i formati
        if (record.fields?.URL_Documenti_Cliente) {
          if (Array.isArray(record.fields.URL_Documenti_Cliente)) {
            // Attachment array nativo di Airtable
            existingAttachments.push(...record.fields.URL_Documenti_Cliente.map(item => item.url));
          } else if (typeof record.fields.URL_Documenti_Cliente === 'object' && record.fields.URL_Documenti_Cliente.url) {
            // Singolo attachment object
            existingAttachments.push(record.fields.URL_Documenti_Cliente.url);
          } else if (typeof record.fields.URL_Documenti_Cliente === 'string') {
            // Nuovo formato JSON o legacy multiline
            try {
              const parsed = JSON.parse(record.fields.URL_Documenti_Cliente);
              if (Array.isArray(parsed)) {
                // Nuovo formato: array di {url, filename}
                existingAttachments.push(...parsed.map(item => item.url || item));
              } else {
                // Single object {url, filename}
                existingAttachments.push(parsed.url || record.fields.URL_Documenti_Cliente);
              }
            } catch {
              // Legacy: formato multiline (nome: URL)
              const docs = record.fields.URL_Documenti_Cliente.split('\n')
                .filter(line => line.trim())
                .map(line => line.includes(': ') ? line.split(': ')[1] : line)
                .filter(url => url && url.trim());
              existingAttachments.push(...docs);
            }
          }
        }
        
        // Schede Cliente - parsing unificato per tutti i formati
        if (record.fields?.URL_Schede_Cliente) {
          if (Array.isArray(record.fields.URL_Schede_Cliente)) {
            // Attachment array nativo di Airtable
            existingAttachments.push(...record.fields.URL_Schede_Cliente.map(item => item.url));
          } else if (typeof record.fields.URL_Schede_Cliente === 'object' && record.fields.URL_Schede_Cliente.url) {
            // Singolo attachment object
            existingAttachments.push(record.fields.URL_Schede_Cliente.url);
          } else if (typeof record.fields.URL_Schede_Cliente === 'string') {
            // Nuovo formato JSON o legacy
            try {
              const parsed = JSON.parse(record.fields.URL_Schede_Cliente);
              if (Array.isArray(parsed)) {
                // Nuovo formato: array di {url, filename}
                existingAttachments.push(...parsed.map(item => item.url || item));
              } else {
                // Single object {url, filename}
                existingAttachments.push(parsed.url || record.fields.URL_Schede_Cliente);
              }
            } catch {
              // Legacy: stringa URL semplice
              existingAttachments.push(record.fields.URL_Schede_Cliente);
            }
          }
        }
        
        return {
          ...record,
          fields: {
            ...record.fields,
            Cliente_Nome: clientName,
            Allegati: existingAttachments,
          }
        };
      });
      
      recordApiLatency('orders', 'list_all', Date.now() - startTime);
      
      return NextResponse.json({
        records: enrichedRecords,
        totalRecords: enrichedRecords.length,
      });
    } else {
      // Standard pagination
      const maxRecords = parseInt(searchParams.get('maxRecords') || '25');
      const offset = searchParams.get('offset');
      
      airtableParams.append('maxRecords', maxRecords.toString());
      if (offset) {
        airtableParams.append('offset', offset);
      }

      const airtableUrl = `https://api.airtable.com/v0/${baseId}/${ORDERS_TABLE_ID}?${airtableParams.toString()}`;
      
      console.log('🔗 Airtable URL:', airtableUrl);

      const response = await fetch(airtableUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 30 },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Airtable API error:', response.status, errorText);
        throw new Error(`Airtable error ${response.status}: ${errorText}`);
      }

      const json = await response.json();
      
      // Extract unique lead IDs for lookup
      const leadIds = new Set<string>();
      json.records?.forEach((record: any) => {
        const idLead = record.fields?.ID_Lead;
        if (Array.isArray(idLead)) {
          idLead.forEach((id: string) => leadIds.add(id));
        }
      });
      
      // Fetch lead names for lookup
      const leadsLookup = await fetchLeadsLookup(apiKey, baseId, leadsTableId, Array.from(leadIds));
      
      // Enrich records with client names
      const enrichedRecords = (json.records || []).map((record: any) => {
        const idLead = record.fields?.ID_Lead;
        let clientName = undefined;
        
        if (Array.isArray(idLead) && idLead.length > 0) {
          // Get all lead names and join them
          const leadNames = idLead
            .map(leadId => leadsLookup[leadId])
            .filter(name => name) // Remove undefined/null names
            .join(', ');
          
          clientName = leadNames || undefined;
        }
        
        // Prepara gli allegati esistenti per la tabella con parsing intelligente
        const existingAttachments = [];
        
        // Contratti - parsing unificato per tutti i formati
        if (record.fields?.URL_Contratto) {
          if (Array.isArray(record.fields.URL_Contratto)) {
            // Attachment array nativo di Airtable
            existingAttachments.push(...record.fields.URL_Contratto.map(item => item.url));
          } else if (typeof record.fields.URL_Contratto === 'object' && record.fields.URL_Contratto.url) {
            // Singolo attachment object
            existingAttachments.push(record.fields.URL_Contratto.url);
          } else if (typeof record.fields.URL_Contratto === 'string') {
            // Nuovo formato JSON o legacy
            try {
              const parsed = JSON.parse(record.fields.URL_Contratto);
              if (Array.isArray(parsed)) {
                // Nuovo formato: array di {url, filename}
                existingAttachments.push(...parsed.map(item => item.url || item));
              } else {
                // Single object {url, filename}
                existingAttachments.push(parsed.url || record.fields.URL_Contratto);
              }
            } catch {
              // Legacy: stringa URL semplice
              existingAttachments.push(record.fields.URL_Contratto);
            }
          }
        }
        
        // Documenti Cliente - parsing unificato per tutti i formati
        if (record.fields?.URL_Documenti_Cliente) {
          if (Array.isArray(record.fields.URL_Documenti_Cliente)) {
            // Attachment array nativo di Airtable
            existingAttachments.push(...record.fields.URL_Documenti_Cliente.map(item => item.url));
          } else if (typeof record.fields.URL_Documenti_Cliente === 'object' && record.fields.URL_Documenti_Cliente.url) {
            // Singolo attachment object
            existingAttachments.push(record.fields.URL_Documenti_Cliente.url);
          } else if (typeof record.fields.URL_Documenti_Cliente === 'string') {
            // Nuovo formato JSON o legacy multiline
            try {
              const parsed = JSON.parse(record.fields.URL_Documenti_Cliente);
              if (Array.isArray(parsed)) {
                // Nuovo formato: array di {url, filename}
                existingAttachments.push(...parsed.map(item => item.url || item));
              } else {
                // Single object {url, filename}
                existingAttachments.push(parsed.url || record.fields.URL_Documenti_Cliente);
              }
            } catch {
              // Legacy: formato multiline (nome: URL)
              const docs = record.fields.URL_Documenti_Cliente.split('\n')
                .filter(line => line.trim())
                .map(line => line.includes(': ') ? line.split(': ')[1] : line)
                .filter(url => url && url.trim());
              existingAttachments.push(...docs);
            }
          }
        }
        
        // Schede Cliente - parsing unificato per tutti i formati
        if (record.fields?.URL_Schede_Cliente) {
          if (Array.isArray(record.fields.URL_Schede_Cliente)) {
            // Attachment array nativo di Airtable
            existingAttachments.push(...record.fields.URL_Schede_Cliente.map(item => item.url));
          } else if (typeof record.fields.URL_Schede_Cliente === 'object' && record.fields.URL_Schede_Cliente.url) {
            // Singolo attachment object
            existingAttachments.push(record.fields.URL_Schede_Cliente.url);
          } else if (typeof record.fields.URL_Schede_Cliente === 'string') {
            // Nuovo formato JSON o legacy
            try {
              const parsed = JSON.parse(record.fields.URL_Schede_Cliente);
              if (Array.isArray(parsed)) {
                // Nuovo formato: array di {url, filename}
                existingAttachments.push(...parsed.map(item => item.url || item));
              } else {
                // Single object {url, filename}
                existingAttachments.push(parsed.url || record.fields.URL_Schede_Cliente);
              }
            } catch {
              // Legacy: stringa URL semplice
              existingAttachments.push(record.fields.URL_Schede_Cliente);
            }
          }
        }
        
        return {
          ...record,
          fields: {
            ...record.fields,
            Cliente_Nome: clientName,
            Allegati: existingAttachments,
          }
        };
      });
      
      recordApiLatency('orders', 'list', Date.now() - startTime);
      
      return NextResponse.json({
        records: enrichedRecords,
        offset: json.offset,
        totalRecords: enrichedRecords.length,
      });
    }

  } catch (error) {
    console.error('❌ Orders API Error:', error);
    recordError('orders_api', error instanceof Error ? error.message : 'Unknown error');
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders - Create new order
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    const { orderData, orderItemsData } = body;
    
    console.log('📦 [CREATE ORDER] Received data:', { 
      orderFields: Object.keys(orderData || {}),
      itemsCount: orderItemsData?.length || 0
    });
    
    // Get Airtable credentials
    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
    ]);

    if (!apiKey || !baseId) {
      return NextResponse.json(
        { error: 'Airtable credentials not available' },
        { status: 500 }
      );
    }

    // Step 1: Create the main order
    console.log('🏁 [CREATE ORDER] Step 1: Creating main order...');
    const orderUrl = `https://api.airtable.com/v0/${baseId}/${ORDERS_TABLE_ID}`;
    
    const orderResponse = await fetch(orderUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: orderData,
      }),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('❌ [CREATE ORDER] Order creation error:', orderResponse.status, errorText);
      throw new Error(`Failed to create order: ${orderResponse.status} ${errorText}`);
    }

    const orderResult = await orderResponse.json();
    const orderId = orderResult.id;
    console.log('✅ [CREATE ORDER] Order created with ID:', orderId);
    
    // Step 2: Create order items (if any)
    let orderItemsResult = [];
    if (orderItemsData && orderItemsData.length > 0) {
      console.log(`📦 [CREATE ORDER] Step 2: Creating ${orderItemsData.length} order items...`);
      
      // Add order ID to each item
      const itemsWithOrderId = orderItemsData.map(item => ({
        ...item,
        'ID_Ordine': [orderId] // Link to the created order
      }));
      
      // Create items in batch (Airtable supports up to 10 records at once)
      const BATCH_SIZE = 10;
      const batches = [];
      for (let i = 0; i < itemsWithOrderId.length; i += BATCH_SIZE) {
        batches.push(itemsWithOrderId.slice(i, i + BATCH_SIZE));
      }
      
      for (const [batchIndex, batch] of batches.entries()) {
        console.log(`📦 [CREATE ORDER] Creating batch ${batchIndex + 1}/${batches.length} (${batch.length} items)`);
        
        const itemsUrl = `https://api.airtable.com/v0/${baseId}/${ORDER_ITEMS_TABLE_ID}`;
        const itemsResponse = await fetch(itemsUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            records: batch.map(item => ({ fields: item }))
          }),
        });
        
        if (!itemsResponse.ok) {
          const errorText = await itemsResponse.text();
          console.error(`❌ [CREATE ORDER] Items batch ${batchIndex + 1} error:`, itemsResponse.status, errorText);
          // Don't fail the whole operation, but log the error
          console.warn(`⚠️ [CREATE ORDER] Failed to create items batch ${batchIndex + 1}, continuing...`);
          continue;
        }
        
        const batchResult = await itemsResponse.json();
        orderItemsResult.push(...(batchResult.records || []));
        console.log(`✅ [CREATE ORDER] Batch ${batchIndex + 1} created: ${batchResult.records?.length || 0} items`);
      }
      
      console.log(`✅ [CREATE ORDER] All items created: ${orderItemsResult.length}/${orderItemsData.length}`);
    }
    
    const totalTime = Date.now() - startTime;
    recordApiLatency('orders', 'create', totalTime);
    
    // Invalidate orders cache
    await RedisCache.invalidateOrders();
    console.log('🧹 Redis cache invalidated after order creation');
    
    console.log(`✅ [CREATE ORDER] Complete! Order: ${orderId}, Items: ${orderItemsResult.length} (${totalTime}ms)`);
    
    return NextResponse.json({
      success: true,
      order: orderResult,
      orderItems: orderItemsResult,
      summary: {
        orderId,
        itemsCreated: orderItemsResult.length,
        totalTime
      }
    });

  } catch (error) {
    console.error('❌ Create Order API Error:', error);
    recordError('create_order_api', error instanceof Error ? error.message : 'Unknown error');
    
    return NextResponse.json(
      { 
        error: 'Failed to create order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orders - Delete multiple orders
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderIds } = body;

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: 'orderIds array is required' },
        { status: 400 }
      );
    }

    // Get Airtable credentials
    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
    ]);

    if (!apiKey || !baseId) {
      return NextResponse.json(
        { error: 'Airtable credentials not available' },
        { status: 500 }
      );
    }

    console.log(`🗑️ [DELETE] Attempting to delete ${orderIds.length} orders:`, orderIds);

    // Airtable supporta l'eliminazione di fino a 10 record per volta
    const BATCH_SIZE = 10;
    const batches = [];
    for (let i = 0; i < orderIds.length; i += BATCH_SIZE) {
      batches.push(orderIds.slice(i, i + BATCH_SIZE));
    }

    const deletedIds = [];
    const errors = [];

    for (const batch of batches) {
      try {
        const deleteParams = batch.map((id) => `records[]=${encodeURIComponent(id)}`).join('&');
        const deleteUrl = `https://api.airtable.com/v0/${baseId}/${ORDERS_TABLE_ID}?${deleteParams}`;

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
          errors.push(...batch);
          continue;
        }

        const json = await response.json();
        const batchDeletedIds = json.records?.map((record: any) => record.id) || [];
        deletedIds.push(...batchDeletedIds);
        
        console.log(`✅ Successfully deleted ${batchDeletedIds.length} records from batch`);

      } catch (error) {
        console.error(`❌ Error deleting batch:`, error);
        errors.push(...batch);
      }
    }

    // Invalidate orders cache
    await RedisCache.invalidateOrders();
    console.log('🧹 Redis cache invalidated after order deletion');
    
    console.log(`✅ [DELETE] Summary: ${deletedIds.length}/${orderIds.length} orders deleted successfully`);

    return NextResponse.json({
      success: true,
      deletedCount: deletedIds.length,
      totalRequested: orderIds.length,
      deletedIds,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('❌ Delete Orders API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
