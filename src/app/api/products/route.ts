import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey, getAirtableBaseId } from '@/lib/api-keys-service';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';
import { ProductFilters } from '@/types/products';

// 💥 DISABLE ALL NEXT.JS CACHING FOR THIS ROUTE
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Products table ID
const PRODUCTS_TABLE_ID = 'tblEFvr3aT2jQdYUL';

// Helper function to build Airtable filter for products
function buildAirtableFilter(searchParams: URLSearchParams): string {
  const conditions: string[] = [];

  // Filtro per categoria - supporta valori multipli
  const categorie = searchParams.getAll('categoria').filter(c => c && c !== 'all');
  if (categorie.length > 0) {
    if (categorie.length === 1) {
      conditions.push(`{Categoria} = '${categorie[0]}'`);
    } else {
      const categorieConditions = categorie.map(categoria => `{Categoria} = '${categoria}'`).join(',');
      conditions.push(`OR(${categorieConditions})`);
    }
  }

  // Filtro per stato attivo
  const attivo = searchParams.get('attivo');
  if (attivo === 'true') {
    conditions.push(`{Attivo} = TRUE()`);
  } else if (attivo === 'false') {
    conditions.push(`{Attivo} = FALSE()`);
  }

  // Filtro per prodotti in evidenza
  const inEvidenza = searchParams.get('in_evidenza');
  if (inEvidenza === 'true') {
    conditions.push(`{In_Evidenza} = TRUE()`);
  } else if (inEvidenza === 'false') {
    conditions.push(`{In_Evidenza} = FALSE()`);
  }

  // Filtro per prezzo minimo
  const prezzoMin = searchParams.get('prezzo_min');
  if (prezzoMin && !isNaN(parseFloat(prezzoMin))) {
    conditions.push(`{Prezzo_Listino_Attuale} >= ${prezzoMin}`);
  }

  // Filtro per prezzo massimo
  const prezzoMax = searchParams.get('prezzo_max');
  if (prezzoMax && !isNaN(parseFloat(prezzoMax))) {
    conditions.push(`{Prezzo_Listino_Attuale} <= ${prezzoMax}`);
  }

  // Filtro per margine minimo
  const margineMin = searchParams.get('margine_min');
  if (margineMin && !isNaN(parseFloat(margineMin))) {
    conditions.push(`{Margine_Standard} >= ${margineMin}`);
  }

  // Filtro per margine massimo
  const margineMax = searchParams.get('margine_max');
  if (margineMax && !isNaN(parseFloat(margineMax))) {
    conditions.push(`{Margine_Standard} <= ${margineMax}`);
  }

  // Search globale
  const search = searchParams.get('search');
  if (search) {
    const searchLower = search.toLowerCase();
    conditions.push(`OR(
      SEARCH('${searchLower}', LOWER({Codice_Matrice})),
      SEARCH('${searchLower}', LOWER({Nome_Prodotto})),
      SEARCH('${searchLower}', LOWER({Descrizione}))
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

  console.log('🔄 Loading ALL products from Airtable...');

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
  } while (offset);

  console.log(`✅ Pagination completed: ${allRecords.length} total records loaded`);
  return allRecords;
}

/**
 * GET /api/products - Fetch products with filters and pagination
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    
    console.log('🔧 [API] Products request parameters:', {
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
    const sortField = searchParams.get('sortField') || 'Nome_Prodotto';
    const sortDirection = searchParams.get('sortDirection') || 'asc';
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
      const allRecords = await fetchAllRecords(apiKey, baseId, PRODUCTS_TABLE_ID, airtableParams);
      
      // Transform the data to match our Product interface
      const transformedRecords = allRecords.map((record: any) => ({
        id: record.id,
        createdTime: record.createdTime,
        ...record.fields,
      }));
      
      recordApiLatency('products', 'list_all', Date.now() - startTime);
      
      return NextResponse.json({
        records: transformedRecords,
        totalRecords: transformedRecords.length,
        fromCache: false,
      });
    } else {
      // Standard pagination
      const maxRecords = parseInt(searchParams.get('maxRecords') || '25');
      const offset = searchParams.get('offset');
      
      airtableParams.append('maxRecords', maxRecords.toString());
      if (offset) {
        airtableParams.append('offset', offset);
      }

      const airtableUrl = `https://api.airtable.com/v0/${baseId}/${PRODUCTS_TABLE_ID}?${airtableParams.toString()}`;
      
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
      
      // Transform the data to match our Product interface
      const transformedData = {
        records: json.records.map((record: any) => ({
          id: record.id,
          createdTime: record.createdTime,
          ...record.fields,
        })),
        offset: json.offset,
        totalRecords: json.records?.length || 0,
      };
      
      recordApiLatency('products', 'list', Date.now() - startTime);
      
      return NextResponse.json(transformedData);
    }

  } catch (error) {
    console.error('❌ Products API Error:', error);
    recordError('products_api', error instanceof Error ? error.message : 'Unknown error');
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products - Create new product
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    console.log('🚀 [CREATE PRODUCT] Starting request');
    console.log('🔄 [CREATE PRODUCT] Received data:', JSON.stringify(body, null, 2));
    
    // Basic validation - different rules for simple vs structured products
    const isStructuredProduct = body.product_type === 'strutturato';
    
    if (!isStructuredProduct && !body.Codice_Matrice?.trim()) {
      return NextResponse.json(
        { error: 'Codice_Matrice è obbligatorio per prodotti semplici' },
        { status: 400 }
      );
    }
    
    if (!isStructuredProduct && !body.Nome_Prodotto?.trim()) {
      return NextResponse.json(
        { error: 'Nome_Prodotto è obbligatorio per prodotti semplici' },
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

    // Helper function to convert URLs or FileInfo to Airtable attachment format
    const formatAttachments = (attachments: any[]): Array<{url: string; filename?: string}> => {
      return attachments
        .filter(item => {
          // Support both string URLs and FileInfo objects
          if (typeof item === 'string') {
            return item && item.trim() !== '';
          }
          if (typeof item === 'object' && item !== null) {
            return item.url && typeof item.url === 'string' && item.url.trim() !== '';
          }
          return false;
        })
        .map(item => {
          if (typeof item === 'string') {
            return { url: item.trim() };
          }
          // FileInfo object
          const result: {url: string; filename?: string} = { url: item.url.trim() };
          if (item.filename && typeof item.filename === 'string') {
            result.filename = item.filename;
          }
          return result;
        });
    };

    // Prepare data for Airtable - handle optional fields properly
    const airtableFields: Record<string, any> = {
      Attivo: body.Attivo !== undefined ? body.Attivo : true, // Default true
      In_Evidenza: body.In_Evidenza !== undefined ? body.In_Evidenza : false, // Default false
    };
    
    // Add required fields - use temporary values for structured products
    if (body.Codice_Matrice && body.Codice_Matrice.trim()) {
      airtableFields.Codice_Matrice = body.Codice_Matrice.trim();
    } else if (isStructuredProduct) {
      // For structured products, use temporary values that will be updated later
      airtableFields.Codice_Matrice = `TEMP_${Date.now()}`;
    }
    
    if (body.Nome_Prodotto && body.Nome_Prodotto.trim()) {
      airtableFields.Nome_Prodotto = body.Nome_Prodotto.trim();
    } else if (isStructuredProduct) {
      // For structured products, use temporary name based on category
      const categoria = body.Categoria || 'Prodotto';
      airtableFields.Nome_Prodotto = `${categoria} Strutturato (da configurare)`;
    }

    // Add only fields that have valid values
    if (body.Descrizione && typeof body.Descrizione === 'string' && body.Descrizione.trim() !== '') {
      airtableFields.Descrizione = body.Descrizione.trim();
    }
    if (body.Metadata && typeof body.Metadata === 'string' && body.Metadata.trim() !== '') {
      airtableFields.Metadata = body.Metadata.trim();
    }
    if (body.Categoria && typeof body.Categoria === 'string') {
      airtableFields.Categoria = body.Categoria;
    }
    if (body.Prezzo_Listino_Attuale !== undefined && body.Prezzo_Listino_Attuale !== null && typeof body.Prezzo_Listino_Attuale === 'number' && body.Prezzo_Listino_Attuale >= 0) {
      airtableFields.Prezzo_Listino_Attuale = body.Prezzo_Listino_Attuale;
    }
    if (body.Costo_Attuale !== undefined && body.Costo_Attuale !== null && typeof body.Costo_Attuale === 'number' && body.Costo_Attuale >= 0) {
      airtableFields.Costo_Attuale = body.Costo_Attuale;
    }
    if (body.Margine_Standard !== undefined && body.Margine_Standard !== null && typeof body.Margine_Standard === 'number') {
      airtableFields.Margine_Standard = body.Margine_Standard / 100; // Convert percentage to decimal
    }
    if (body.Percentuale_Provvigione_Standard !== undefined && body.Percentuale_Provvigione_Standard !== null && typeof body.Percentuale_Provvigione_Standard === 'number') {
      airtableFields.Percentuale_Provvigione_Standard = body.Percentuale_Provvigione_Standard;
    }
    if (body.Base_Provvigionale && typeof body.Base_Provvigionale === 'string') {
      airtableFields.Base_Provvigionale = body.Base_Provvigionale;
    }
    
    // URL fields
    if (body.URL_Immagine_Principale && typeof body.URL_Immagine_Principale === 'string' && body.URL_Immagine_Principale.trim() !== '') {
      airtableFields.URL_Immagine_Principale = body.URL_Immagine_Principale.trim();
    }
    if (body.URL_Scheda_Tecnica && typeof body.URL_Scheda_Tecnica === 'string' && body.URL_Scheda_Tecnica.trim() !== '') {
      airtableFields.URL_Scheda_Tecnica = body.URL_Scheda_Tecnica.trim();
    }
    if (body.URL_Certificazioni && typeof body.URL_Certificazioni === 'string' && body.URL_Certificazioni.trim() !== '') {
      airtableFields.URL_Certificazioni = body.URL_Certificazioni.trim();
    }
    
    // Attachment fields - format URLs as Airtable attachments
    console.log('📎 [ATTACHMENTS DEBUG] Raw attachment data:');
    console.log('  Foto_Prodotto:', body.Foto_Prodotto, 'Type:', typeof body.Foto_Prodotto, 'IsArray:', Array.isArray(body.Foto_Prodotto));
    console.log('  Schede_Tecniche:', body.Schede_Tecniche, 'Type:', typeof body.Schede_Tecniche, 'IsArray:', Array.isArray(body.Schede_Tecniche));
    console.log('  Manuali:', body.Manuali, 'Type:', typeof body.Manuali, 'IsArray:', Array.isArray(body.Manuali));
    console.log('  Certificazioni:', body.Certificazioni, 'Type:', typeof body.Certificazioni, 'IsArray:', Array.isArray(body.Certificazioni));
    
    if (body.Foto_Prodotto && Array.isArray(body.Foto_Prodotto) && body.Foto_Prodotto.length > 0) {
      const formatted = formatAttachments(body.Foto_Prodotto);
      console.log('📎 Foto_Prodotto formatted:', formatted);
      airtableFields.Foto_Prodotto = formatted;
    }
    if (body.Schede_Tecniche && Array.isArray(body.Schede_Tecniche) && body.Schede_Tecniche.length > 0) {
      const formatted = formatAttachments(body.Schede_Tecniche);
      console.log('📎 Schede_Tecniche formatted:', formatted);
      airtableFields.Schede_Tecniche = formatted;
    }
    if (body.Manuali && Array.isArray(body.Manuali) && body.Manuali.length > 0) {
      const formatted = formatAttachments(body.Manuali);
      console.log('📎 Manuali formatted:', formatted);
      airtableFields.Manuali = formatted;
    }
    if (body.Certificazioni && Array.isArray(body.Certificazioni) && body.Certificazioni.length > 0) {
      const formatted = formatAttachments(body.Certificazioni);
      console.log('📎 Certificazioni formatted:', formatted);
      airtableFields.Certificazioni = formatted;
    }

    const airtableData = {
      fields: airtableFields,
    };

    console.log('📤 [CREATE PRODUCT] Sending to Airtable:', airtableData);

    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${PRODUCTS_TABLE_ID}`;
    
    const response = await fetch(airtableUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      body: JSON.stringify(airtableData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Airtable create error: ${response.status} - ${errorText}`);
      
      // Try to parse Airtable error for more specific details
      let detailedError = `Failed to create product: ${response.status}`;
      try {
        const errorObj = JSON.parse(errorText);
        if (errorObj.error && errorObj.error.message) {
          detailedError = errorObj.error.message;
        }
      } catch {
        // Fallback to original message
      }
      
      return NextResponse.json(
        { error: detailedError },
        { status: response.status }
      );
    }

    const createdRecord = await response.json();
    console.log('✅ [CREATE PRODUCT] Successfully created:', createdRecord.id);
    
    // Transform response
    const transformedRecord = {
      id: createdRecord.id,
      createdTime: createdRecord.createdTime,
      ...createdRecord.fields,
    };
    
    const totalTime = Date.now() - startTime;
    recordApiLatency('create_product_api', totalTime, false);
    
    console.log(`✅ [CREATE PRODUCT] Completed: ${createdRecord.id} in ${totalTime.toFixed(2)}ms`);

    return NextResponse.json({
      success: true,
      product: transformedRecord,
      _timing: {
        total: Math.round(totalTime),
        cached: false,
      }
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    recordError('create_product_api', errorMessage);
    recordApiLatency('create_product_api', totalTime, false);
    
    console.error(`❌ [CREATE PRODUCT] Error in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to create product',
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
 * DELETE /api/products - Delete multiple products
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { productIds } = body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: 'productIds array is required' },
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

    console.log(`🗑️ [DELETE] Attempting to delete ${productIds.length} products:`, productIds);

    // Airtable supports deletion of up to 10 records at a time
    const BATCH_SIZE = 10;
    const batches = [];
    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
      batches.push(productIds.slice(i, i + BATCH_SIZE));
    }

    const deletedIds = [];
    const errors = [];

    for (const batch of batches) {
      try {
        const deleteParams = batch.map((id) => `records[]=${encodeURIComponent(id)}`).join('&');
        const deleteUrl = `https://api.airtable.com/v0/${baseId}/${PRODUCTS_TABLE_ID}?${deleteParams}`;

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

    console.log(`✅ [DELETE] Summary: ${deletedIds.length}/${productIds.length} products deleted successfully`);

    return NextResponse.json({
      success: true,
      deleted: deletedIds.length,
      requested: productIds.length,
      deletedIds,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('❌ Delete Products API Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete products',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}