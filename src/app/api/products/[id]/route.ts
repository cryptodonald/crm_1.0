import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey, getAirtableBaseId } from '@/lib/api-keys-service';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';

// 💥 DISABLE ALL NEXT.JS CACHING FOR THIS ROUTE
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Products table ID
const PRODUCTS_TABLE_ID = 'tblEFvr3aT2jQdYUL';

/**
 * GET /api/products/[id] - Get single product by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestStart = performance.now();
  const { id } = await params;
  
  try {
    console.log(`🔍 [PRODUCT GET] Starting request for: ${id}`);

    // Get credentials in parallel
    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
    ]);

    if (!apiKey || !baseId) {
      throw new Error('Missing Airtable credentials');
    }

    // Direct Airtable call
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${PRODUCTS_TABLE_ID}/${id}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const record = await response.json();
    
    // Transform to flat structure
    const transformedProduct = {
      id: record.id,
      createdTime: record.createdTime,
      ...record.fields,
    };

    const totalTime = performance.now() - requestStart;
    recordApiLatency('product_get_api', totalTime, false);
    
    console.log(`✅ [PRODUCT GET] Completed: ${id} in ${totalTime.toFixed(2)}ms`);
    
    return NextResponse.json({
      success: true,
      product: transformedProduct,
      _timing: {
        total: Math.round(totalTime),
        cached: false,
      }
    });

  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    recordError('product_get_api', errorMessage);
    recordApiLatency('product_get_api', totalTime, false);
    
    console.error(`❌ [PRODUCT GET] Error in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch product',
        _timing: { total: Math.round(totalTime), cached: false }
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/products/[id] - Update single product
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestStart = performance.now();
  const { id } = await params;
  
  try {
    console.log(`📝 [PRODUCT UPDATE] Starting request for: ${id}`);
    
    const body = await request.json();
    console.log('📝 [PRODUCT UPDATE] Received data:', body);

    // Get credentials in parallel
    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
    ]);

    if (!apiKey || !baseId) {
      throw new Error('Missing Airtable credentials');
    }

    // Prepare fields for Airtable update
    const airtableFields: Record<string, any> = {};
    
    // Simple field mappings (direct copy if present)
    const simpleFields = [
      'Codice_Matrice',
      'Nome_Prodotto', 
      'Descrizione',
      'Metadata',
      'Categoria',
      'Prezzo_Listino_Attuale',
      'Costo_Attuale',
      'Percentuale_Provvigione_Standard',
      'Base_Provvigionale',
      'Attivo',
      'In_Evidenza',
      'URL_Immagine_Principale',
      'URL_Scheda_Tecnica',
      'URL_Certificazioni'
    ];
    
    // Copy simple fields if they exist in the update body
    simpleFields.forEach(field => {
      if (body[field] !== undefined) {
        airtableFields[field] = body[field];
      }
    });
    
    // Special handling for margin (convert percentage to decimal)
    if (body.Margine_Standard !== undefined) {
      airtableFields.Margine_Standard = body.Margine_Standard;
      // Note: assuming the frontend sends it as a decimal already
      // If it's a percentage (0-100), divide by 100
      if (body.Margine_Standard > 1) {
        airtableFields.Margine_Standard = body.Margine_Standard / 100;
      }
    }
    
    // Attachment fields - handle arrays of URLs
    const attachmentFields = ['Foto_Prodotto', 'Schede_Tecniche', 'Manuali', 'Certificazioni'];
    attachmentFields.forEach(field => {
      if (body[field] && Array.isArray(body[field])) {
        airtableFields[field] = body[field].map((url: string) => ({ url }));
      }
    });

    console.log('📝 [PRODUCT UPDATE] Prepared fields:', airtableFields);

    const airtableData = {
      fields: airtableFields
    };

    // Update in Airtable
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${PRODUCTS_TABLE_ID}/${id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate, br',
      },
      body: JSON.stringify(airtableData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Airtable update error: ${response.status} - ${errorText}`);
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
      
      // Try to parse Airtable error for more details
      let detailedError = `Failed to update product: ${response.status}`;
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

    const updatedRecord = await response.json();
    
    // Transform response
    const transformedRecord = {
      id: updatedRecord.id,
      createdTime: updatedRecord.createdTime,
      ...updatedRecord.fields,
    };

    const totalTime = performance.now() - requestStart;
    recordApiLatency('product_update_api', totalTime, false);
    
    console.log(`✅ [PRODUCT UPDATE] Completed: ${id} in ${totalTime.toFixed(2)}ms`);
    
    return NextResponse.json({
      success: true,
      product: transformedRecord,
      _timing: {
        total: Math.round(totalTime),
        cached: false,
      }
    });

  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    recordError('product_update_api', errorMessage);
    recordApiLatency('product_update_api', totalTime, false);
    
    console.error(`❌ [PRODUCT UPDATE] Error in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update product',
        _timing: { total: Math.round(totalTime), cached: false }
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[id] - Delete single product
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const requestStart = performance.now();
  const { id } = await params;
  
  try {
    console.log(`🗑️ [PRODUCT DELETE] Starting request for: ${id}`);

    // Get credentials in parallel
    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
    ]);

    if (!apiKey || !baseId) {
      throw new Error('Missing Airtable credentials');
    }

    // Delete from Airtable
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${PRODUCTS_TABLE_ID}/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Airtable delete error: ${response.status} - ${errorText}`);
      
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Product not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to delete product: ${response.status}` },
        { status: response.status }
      );
    }

    const deletedRecord = await response.json();
    
    const totalTime = performance.now() - requestStart;
    recordApiLatency('product_delete_api', totalTime, false);
    
    console.log(`✅ [PRODUCT DELETE] Completed: ${id} in ${totalTime.toFixed(2)}ms`);
    
    return NextResponse.json({
      success: true,
      deleted: true,
      id: deletedRecord.id,
      _timing: {
        total: Math.round(totalTime),
        cached: false,
      }
    });

  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    recordError('product_delete_api', errorMessage);
    recordApiLatency('product_delete_api', totalTime, false);
    
    console.error(`❌ [PRODUCT DELETE] Error in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete product',
        _timing: { total: Math.round(totalTime), cached: false }
      },
      { status: 500 }
    );
  }
}