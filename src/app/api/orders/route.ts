import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey, getAirtableBaseId } from '@/lib/api-keys-service';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';

// 💥 DISABLE ALL NEXT.JS CACHING FOR THIS ROUTE
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Orders table ID (from our created table)
const ORDERS_TABLE_ID = 'tblkqfCMabBpVD1fP';

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
      
      recordApiLatency('orders', 'list_all', Date.now() - startTime);
      
      return NextResponse.json({
        records: allRecords,
        totalRecords: allRecords.length,
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
      
      recordApiLatency('orders', 'list', Date.now() - startTime);
      
      return NextResponse.json({
        records: json.records || [],
        offset: json.offset,
        totalRecords: json.records?.length || 0,
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

    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${ORDERS_TABLE_ID}`;
    
    const response = await fetch(airtableUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: body,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Airtable API error:', response.status, errorText);
      throw new Error(`Airtable error ${response.status}: ${errorText}`);
    }

    const json = await response.json();
    
    recordApiLatency('orders', 'create', Date.now() - startTime);
    
    return NextResponse.json(json);

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
