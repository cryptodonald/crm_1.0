import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey, getAirtableBaseId, getAirtableActivitiesTableId } from '@/lib/api-keys-service';
import { activitiesCache } from '@/lib/activities-cache';

// Helper function to build Airtable filter for activities
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

  // Filtro per tipo - supporta valori multipli
  const tipi = searchParams.getAll('tipo').filter(t => t && t !== 'all');
  if (tipi.length > 0) {
    if (tipi.length === 1) {
      conditions.push(`{Tipo} = '${tipi[0]}'`);
    } else {
      const tipiConditions = tipi.map(tipo => `{Tipo} = '${tipo}'`).join(',');
      conditions.push(`OR(${tipiConditions})`);
    }
  }

  // Filtro per obiettivo - supporta valori multipli
  const obiettivi = searchParams.getAll('obiettivo').filter(o => o && o !== 'all');
  if (obiettivi.length > 0) {
    if (obiettivi.length === 1) {
      conditions.push(`{Obiettivo} = '${obiettivi[0]}'`);
    } else {
      const obiettiviConditions = obiettivi.map(obiettivo => `{Obiettivo} = '${obiettivo}'`).join(',');
      conditions.push(`OR(${obiettiviConditions})`);
    }
  }

  // Filtro per priorità - supporta valori multipli
  const prioritas = searchParams.getAll('priorita').filter(p => p && p !== 'all');
  if (prioritas.length > 0) {
    if (prioritas.length === 1) {
      conditions.push(`{Priorità} = '${prioritas[0]}'`);
    } else {
      const prioritasConditions = prioritas.map(priorita => `{Priorità} = '${priorita}'`).join(',');
      conditions.push(`OR(${prioritasConditions})`);
    }
  }

  // Filtro per data (usa il campo "Data" che è il principale)
  const dataInizio = searchParams.get('dataInizio');
  if (dataInizio) {
    conditions.push(`IS_AFTER({Data}, '${dataInizio}')`);
  }

  const dataFine = searchParams.get('dataFine');
  if (dataFine) {
    conditions.push(`IS_BEFORE({Data}, '${dataFine}')`);
  }

  // Filtro per assegnatario (cerca nel campo lookup Nome Assegnatario)
  const assegnatario = searchParams.get('assegnatario');
  if (assegnatario) {
    conditions.push(`SEARCH('${assegnatario.toLowerCase()}', LOWER(ARRAYJOIN({Nome Assegnatario}, ', ')))`);
  }

  // Filtro per leadId (campo link "ID Lead")
  const leadId = searchParams.get('leadId');
  if (leadId) {
    // Cerca l'ID record all'interno dell'array linkato
    conditions.push(`SEARCH('${leadId}', ARRAYJOIN({ID Lead}, ', '))`);
  }

  // Search globale
  const search = searchParams.get('search');
  if (search) {
    const searchLower = search.toLowerCase();
    conditions.push(`OR(
      SEARCH('${searchLower}', LOWER({Titolo})),
      SEARCH('${searchLower}', LOWER(ARRAYJOIN({Nome Lead}, ', '))),
      SEARCH('${searchLower}', LOWER(ARRAYJOIN({Nome Assegnatario}, ', '))),
      SEARCH('${searchLower}', LOWER({Note})),
      SEARCH('${searchLower}', LOWER({Tipo})),
      SEARCH('${searchLower}', LOWER({Stato})),
      SEARCH('${searchLower}', LOWER({Obiettivo}))
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

  do {
    const currentParams = new URLSearchParams(baseParams);
    if (offset) {
      currentParams.set('offset', offset);
    }

    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${tableId}?${currentParams.toString()}`;

    const response = await fetch(airtableUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 120 },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Airtable API error: ${response.status} - ${errorText}`);
      throw new Error(`Airtable error ${response.status}`);
    }

    const json = (await response.json()) as {
      records: Array<{
        id: string;
        fields: Record<string, unknown>;
        createdTime: string;
      }>;
      offset?: string;
    };

    console.log(`📦 [Activities] Received ${json.records?.length || 0} records`);

    allRecords.push(...json.records);
    offset = json.offset;

    console.log(
      `📊 [Activities] Total so far: ${allRecords.length}${offset ? ', more available' : ', done'}`
    );
  } while (offset);

  console.log(`✅ [Activities] Completed: ${allRecords.length} total records loaded`);
  return allRecords;
}

/**
 * GET /api/activities - Retrieve activities with optional filters
 * Supports ?loadAll=true to fetch all records regardless of pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get Airtable API credentials
    const [apiKey, baseId, tableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableActivitiesTableId(),
    ]);

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Airtable API key not available' },
        { status: 500 }
      );
    }

    if (!baseId) {
      return NextResponse.json(
        { error: 'Airtable base ID not available' },
        { status: 500 }
      );
    }

    if (!tableId) {
      return NextResponse.json(
        { error: 'Airtable activities table ID not available' },
        { status: 500 }
      );
    }

    // Check if user wants to load all records
    const loadAll = searchParams.get('loadAll') === 'true';

    console.log(`🔧 [Activities API] Request parameters:`, {
      loadAll: loadAll,
      url: request.url,
    });

    // Build base query parameters (without pagination)
    const baseParams = new URLSearchParams();

    // Filters
    const filterFormula = buildAirtableFilter(searchParams);
    if (filterFormula) {
      baseParams.set('filterByFormula', filterFormula);
    }

    // Sorting - default to Data (most recent first)
    const sortField = searchParams.get('sortField') || 'Data';
    const sortDirection = searchParams.get('sortDirection') || 'desc';
    baseParams.set('sort[0][field]', sortField);
    baseParams.set('sort[0][direction]', sortDirection);

    // DON'T specify a view - this will fetch ALL records from the table
    // regardless of any view filters that might be applied in Airtable UI

    if (loadAll) {
      // Cache key (avoid offset)
      const cacheKey = activitiesCache.generateKey(searchParams);
      const cached = activitiesCache.get(cacheKey);
      if (cached) {
        return NextResponse.json({ records: cached, offset: undefined, fromCache: true });
      }

      const allRecords = await fetchAllRecords(apiKey, baseId, tableId, baseParams);

      // Transform and cache
      const transformedRecords = allRecords.map((record: any) => ({
        id: record.id,
        createdTime: record.createdTime,
        ...record.fields,
      }));
      activitiesCache.set(cacheKey, transformedRecords);

      return NextResponse.json({ records: transformedRecords, offset: undefined, fromCache: false });
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

      // Cache only first page (no offset)
      const isFirstPage = !searchParams.get('offset');
      if (isFirstPage) {
        const cacheKey = activitiesCache.generateKey(searchParams);
        const cached = activitiesCache.get(cacheKey);
        if (cached) {
          return NextResponse.json({ records: cached, offset: undefined, fromCache: true });
        }
      }

      const response = await fetch(airtableUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 120 },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Activities] Airtable API error:', response.status, errorText);
        return NextResponse.json(
          { error: `Airtable API error: ${response.status}` },
          { status: response.status }
        );
      }

      const data = await response.json();

      // Transform the data to match our ActivityData interface
      const transformedData = {
        ...data,
        records: data.records.map((record: any) => ({
          id: record.id,
          createdTime: record.createdTime,
          ...record.fields,
        })),
      };

      // Cache first page
      if (!searchParams.get('offset')) {
        const cacheKey = activitiesCache.generateKey(searchParams);
        activitiesCache.set(cacheKey, transformedData.records);
      }

      return NextResponse.json(transformedData);
    }
  } catch (error) {
    console.error('[Activities] Error fetching activities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/activities - Create a new activity linked to a Lead
 * Body: { leadId: string; type: 'call'|'email'|'note'|'meeting'; title?: string; description?: string; date?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { leadId, type, title, description, date } = body as {
      leadId?: string;
      type?: 'call' | 'email' | 'note' | 'meeting';
      title?: string;
      description?: string;
      date?: string; // ISO string
    };

    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
    }
    if (!type) {
      return NextResponse.json({ error: 'type is required' }, { status: 400 });
    }

    // Credenziali Airtable
    const [apiKey, baseId, tableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableActivitiesTableId(),
    ]);

    if (!apiKey || !baseId || !tableId) {
      return NextResponse.json(
        { error: 'Airtable credentials not available' },
        { status: 500 }
      );
    }

    // Mapping type (UI) -> Tipo (Airtable)
    const tipoMap: Record<string, string> = {
      call: 'Chiamata',
      email: 'Email',
      meeting: 'Consulenza',
      note: 'Follow-up',
    };
    const airtableTipo = tipoMap[type] || 'Altro';

    // Costruisci fields per Airtable
    const fields: Record<string, any> = {
      'ID Lead': [leadId],
      Tipo: airtableTipo,
    };

    if (description && typeof description === 'string') {
      fields['Note'] = description;
    }

    // Data attività: se arriva dal client, usa quella, altrimenti now
    const when = date && typeof date === 'string' ? date : new Date().toISOString();
    fields['Data'] = when;

    // POST verso Airtable
    const url = `https://api.airtable.com/v0/${baseId}/${tableId}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [Activities] Create error: ${response.status} - ${errorText}`);
      return NextResponse.json(
        { error: `Failed to create activity: ${response.status}` },
        { status: response.status }
      );
    }

    const created = await response.json();
    const transformed = {
      id: created.id,
      createdTime: created.createdTime,
      ...created.fields,
    };

    // Invalidate cache after mutation
    activitiesCache.clear();

    return NextResponse.json({ success: true, activity: transformed });
  } catch (error) {
    console.error('❌ [Activities] Error creating activity:', error);
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    );
  }
}
