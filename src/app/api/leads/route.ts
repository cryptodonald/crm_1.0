import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey } from '@/lib/api-keys-service';

const AIRTABLE_BASE_ID = 'app359c17lK0Ta8Ws';
const LEADS_TABLE_ID = 'tblKIZ9CDjcQorONA';

// Helper function to build Airtable filter
function buildAirtableFilter(searchParams: URLSearchParams): string {
  const conditions: string[] = [];

  // Filtro per stato
  const stato = searchParams.get('stato');
  if (stato && stato !== 'all') {
    conditions.push(`{Stato} = '${stato}'`);
  }

  // Filtro per provenienza
  const provenienza = searchParams.get('provenienza');
  if (provenienza && provenienza !== 'all') {
    conditions.push(`{Provenienza} = '${provenienza}'`);
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
async function fetchAllRecords(apiKey: string, baseParams: URLSearchParams): Promise<any[]> {
  let offset: string | undefined;
  const allRecords: any[] = [];
  
  do {
    const currentParams = new URLSearchParams(baseParams);
    if (offset) {
      currentParams.set('offset', offset);
    }
    
    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${LEADS_TABLE_ID}?${currentParams.toString()}`;
    
    console.log(`📡 Fetching records${offset ? ` (offset: ${offset.substring(0, 10)}...)` : ' (first page)'}`);
    console.log(`🔗 URL: ${airtableUrl}`);
    
    const response = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Airtable API error: ${response.status} - ${errorText}`);
      throw new Error(`Airtable error ${response.status}`);
    }
    
    const json = await response.json() as { 
      records: Array<{ id: string; fields: Record<string, unknown>; createdTime: string }>; 
      offset?: string 
    };
    
    console.log(`📦 Received ${json.records?.length || 0} records`);
    
    allRecords.push(...json.records);
    offset = json.offset;
    
    console.log(`📊 Total so far: ${allRecords.length}${offset ? ', more available' : ', done'}`);
    
  } while (offset);
  
  console.log(`✅ Completed: ${allRecords.length} total records loaded`);
  return allRecords;
}

/**
 * GET /api/leads - Retrieve leads with optional filters
 * Supports ?loadAll=true to fetch all records regardless of pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get Airtable API key
    const apiKey = await getAirtableKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Airtable API key not available' },
        { status: 500 }
      );
    }

    // Check if user wants to load all records
    const loadAll = searchParams.get('loadAll') === 'true';
    
    console.log(`🔧 [API] Request parameters:`, {
      loadAll: loadAll,
      loadAllParam: searchParams.get('loadAll'),
      url: request.url
    });
    
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
      // Fetch ALL records using recursive pagination
      console.log('🔄 Loading ALL leads from Airtable...');
      const allRecords = await fetchAllRecords(apiKey, baseParams);
      
      // Transform the data to match our LeadData interface
      const transformedData = {
        records: allRecords.map((record: any) => ({
          id: record.id,
          createdTime: record.createdTime,
          ...record.fields
        })),
        // No offset since we loaded everything
        offset: undefined
      };
      
      console.log(`✅ Loaded ${allRecords.length} leads total`);
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
      const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${LEADS_TABLE_ID}?${baseParams}`;
      
      const response = await fetch(airtableUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
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
          ...record.fields
        }))
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
