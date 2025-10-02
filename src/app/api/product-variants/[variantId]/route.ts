/**
 * 🎯 API Route: /api/product-variants/[variantId]
 * Gestisce singola variante prodotto
 */

import { NextResponse } from 'next/server';
import { ProductVariant } from '@/types/products';
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
    }
  };
}

/**
 * GET /api/product-variants/[variantId]
 * Recupera una singola variante per ID
 */
export async function GET(
  request: Request,
  { params }: { params: { variantId: string } }
) {
  console.log('🔧 [API] Getting product variant:', params.variantId);

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

    // Setup Airtable request
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${VARIANTS_TABLE_ID}/${params.variantId}`;

    // Get variant
    const response = await fetch(airtableUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
    }

    const record = await response.json();
    const variant = parseVariantRecord(record);

    return NextResponse.json(variant);

  } catch (error: any) {
    console.error('❌ [API] Error getting variant:', error.message);
    return NextResponse.json(
      { error: 'Failed to get variant' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/product-variants/[variantId]
 * Aggiorna una variante esistente
 */
export async function PATCH(
  request: Request,
  { params }: { params: { variantId: string } }
) {
  console.log('🔧 [API] Updating product variant:', params.variantId);

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

    // Setup Airtable request
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${VARIANTS_TABLE_ID}/${params.variantId}`;

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
export async function DELETE(
  request: Request,
  { params }: { params: { variantId: string } }
) {
  console.log('🔧 [API] Deleting product variant:', params.variantId);

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

    // Setup Airtable request
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${VARIANTS_TABLE_ID}/${params.variantId}`;

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