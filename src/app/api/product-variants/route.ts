/**
 * 🎯 API Route: /api/product-variants
 * Gestisce le varianti dei prodotti nel catalogo
 */

import { NextResponse } from 'next/server';
import { ProductVariant, ProductVariantsResponse } from '@/types/products';
import { getAirtableKey, getAirtableBaseId } from '@/lib/api-keys-service';

const VARIANTS_TABLE_ID = 'tblGnZgea6HlO2pJ4'; // Product_Variants table ID

/**
 * Converte un record Airtable in un oggetto ProductVariant
 */
function parseVariantRecord(record: any): ProductVariant {
  return {
    id: record.id,
    createdTime: record.createdTime,
    fields: {
      Nome_Variante: record.fields.Nome_Variante || '',
      ID_Prodotto: record.fields.ID_Prodotto || [],
      Tipo_Variante: record.fields.Tipo_Variante || undefined,
      Codice_Variante: record.fields.Codice_Variante || undefined,
      Prezzo_Aggiuntivo_Attuale: record.fields.Prezzo_Aggiuntivo_Attuale || undefined,
      Costo_Aggiuntivo_Attuale: record.fields.Costo_Aggiuntivo_Attuale || undefined,
      Posizione: record.fields.Posizione || undefined,
      Obbligatorio: record.fields.Obbligatorio || false,
      Attivo: record.fields.Attivo || false,
      // Aggiungi campo per le strutture collegate
      Product_Structures: record.fields.Product_Structures || [],
    }
  };
}

/**
 * GET /api/product-variants
 * Recupera l'elenco delle varianti con filtri e paginazione
 */
export async function GET(request: Request) {
  console.log('🔧 [API] Product Variants request parameters:', {
    url: request.url
  });

  try {
    // Get API credentials
    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId()
    ]);

    if (!apiKey || !baseId) {
      return NextResponse.json(
        { error: 'Missing API credentials' },
        { status: 500 }
      );
    }

    // Setup Airtable request URL
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${VARIANTS_TABLE_ID}`;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const loadAll = searchParams.get('loadAll') === 'true';
    const productId = searchParams.get('productId') || undefined;
    const variantType = searchParams.get('variantType') || undefined;
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortField = searchParams.get('sortField') || 'Nome_Variante';
    const sortDirection = (searchParams.get('sortDirection') || 'asc') as 'asc' | 'desc';

    // Build filter formula
    const filterByArray = [];
    
    if (productId) {
      filterByArray.push(`FIND("${productId}", ARRAYJOIN(ID_Prodotto))`);
    }
    
    if (variantType) {
      filterByArray.push(`{Tipo_Variante} = "${variantType}"`);
    }
    
    if (activeOnly) {
      filterByArray.push('{Attivo} = 1');
    }

    const filterBy = filterByArray.length > 0 
      ? 'AND(' + filterByArray.join(',') + ')'
      : undefined;

    // Prepare parameters for Airtable query
    const params: any = {
      view: 'Grid view',
      pageSize: loadAll ? 100 : limit,
      sort: [{ field: sortField, direction: sortDirection }]
    };

    if (filterBy) {
      params.filterByFormula = filterBy;
    }

    // Build query parameters
    const queryParams = new URLSearchParams();
    
    if (filterBy) {
      queryParams.set('filterByFormula', filterBy);
    }
    
    queryParams.set('sort[0][field]', sortField);
    queryParams.set('sort[0][direction]', sortDirection);
    
    if (!loadAll) {
      queryParams.set('maxRecords', limit.toString());
      if (page > 1) {
        // Note: Airtable pagination uses offset, which requires previous calls
        // For simplicity, we'll load all and paginate in memory
      }
    }

    const requestUrl = `${airtableUrl}?${queryParams.toString()}`;
    
    // Load variants
    console.log('🔄 Loading variants from Airtable...');
    let allRecords: any[] = [];
    let offset: string | undefined;
    let requestCount = 0;

    do {
      requestCount++;
      const currentUrl = offset ? `${requestUrl}&offset=${offset}` : requestUrl;
      console.log(`📡 Request ${requestCount}: Fetching from ${currentUrl}`);
      
      const response = await fetch(currentUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      const records = data.records || [];
      
      console.log(`📦 Request ${requestCount}: Received ${records.length} records`);
      allRecords = allRecords.concat(records);
      
      offset = data.offset;
      console.log(`📊 Total records so far: ${allRecords.length}${offset ? ', has more pages' : ', no more pages'}`);

      if (!loadAll) break;
    } while (offset);

    console.log(`✅ Pagination completed: ${allRecords.length} total records loaded in ${requestCount} requests`);

    // Calculate pagination
    const total = allRecords.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = loadAll ? 0 : (page - 1) * limit;
    const endIndex = loadAll ? total : Math.min(startIndex + limit, total);
    const paginatedRecords = allRecords.slice(startIndex, endIndex);

    // Parse and return response
    const variants = paginatedRecords.map(parseVariantRecord);
    
    const response: ProductVariantsResponse = {
      variants,
      total,
      page,
      limit,
      totalPages
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ [API] Error loading variants:', error.message);
    return NextResponse.json(
      { error: 'Failed to load variants' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/product-variants
 * Crea una nuova variante prodotto
 */
export async function POST(request: Request) {
  console.log('🔧 [API] Creating new product variant');

  try {
    const body = await request.json();

    // Get API credentials
    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId()
    ]);

    if (!apiKey || !baseId) {
      return NextResponse.json(
        { error: 'Missing API credentials' },
        { status: 500 }
      );
    }

    // Validate required fields
    if (!body.Nome_Variante || !body.ID_Prodotto || !body.Tipo_Variante) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Setup Airtable request
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${VARIANTS_TABLE_ID}`;

    // Create variant
    const response = await fetch(airtableUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: body }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
    }

    const record = await response.json();
    const variant = parseVariantRecord(record);

    return NextResponse.json(variant);

  } catch (error: any) {
    console.error('❌ [API] Error creating variant:', error.message);
    return NextResponse.json(
      { error: 'Failed to create variant' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/product-variants/[variantId]
 * Aggiorna una variante esistente
 */
export async function PATCH(request: Request) {
  console.log('🔧 [API] Updating product variant');

  try {
    const body = await request.json();
    const variantId = request.url.split('/').pop();

    if (!variantId) {
      return NextResponse.json(
        { error: 'Missing variant ID' },
        { status: 400 }
      );
    }

    // Get API credentials
    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId()
    ]);

    if (!apiKey || !baseId) {
      return NextResponse.json(
        { error: 'Missing API credentials' },
        { status: 500 }
      );
    }

    // Setup Airtable request
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${VARIANTS_TABLE_ID}/${variantId}`;

    // Update variant
    const response = await fetch(airtableUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: body }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
    }

    const record = await response.json();
    const variant = parseVariantRecord(record);

    return NextResponse.json(variant);

  } catch (error: any) {
    console.error('❌ [API] Error updating variant:', error.message);
    return NextResponse.json(
      { error: 'Failed to update variant' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/product-variants/[variantId]
 * Elimina una variante
 */
export async function DELETE(request: Request) {
  console.log('🔧 [API] Deleting product variant');

  try {
    const variantId = request.url.split('/').pop();

    if (!variantId) {
      return NextResponse.json(
        { error: 'Missing variant ID' },
        { status: 400 }
      );
    }

    // Get API credentials
    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId()
    ]);

    if (!apiKey || !baseId) {
      return NextResponse.json(
        { error: 'Missing API credentials' },
        { status: 500 }
      );
    }

    // Setup Airtable request
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${VARIANTS_TABLE_ID}/${variantId}`;

    // Delete variant
    const response = await fetch(airtableUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ [API] Error deleting variant:', error.message);
    return NextResponse.json(
      { error: 'Failed to delete variant' },
      { status: 500 }
    );
  }
}