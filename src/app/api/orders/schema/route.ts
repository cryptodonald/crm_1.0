import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey, getAirtableBaseId } from '@/lib/api-keys-service';

const ORDERS_TABLE_ID = 'tblkqfCMabBpVD1fP';

/**
 * GET /api/orders/schema - Ottieni la struttura completa della tabella ordini
 * Mappa tutti i campi disponibili in Airtable
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 [API] Fetching orders table schema');
    
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

    // Fetch table metadata from Airtable
    const schemaUrl = `https://api.airtable.com/v0/meta/bases/${baseId}/tables/${ORDERS_TABLE_ID}`;
    
    const response = await fetch(schemaUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Airtable schema error:', response.status, errorText);
      throw new Error(`Airtable error ${response.status}: ${errorText}`);
    }

    const schema = await response.json();
    
    // Mappa i campi disponibili
    const fields = schema.fields?.map((field: any) => ({
      id: field.id,
      name: field.name,
      type: field.type,
      options: field.options || null, // Per single select e multiple select
    })) || [];

    console.log('✅ [API] Schema retrieved successfully');
    console.log('📊 Available fields:', fields.map(f => `${f.name} (${f.type})`).join(', '));

    return NextResponse.json({
      success: true,
      tableName: schema.name,
      tableId: schema.id,
      fields: fields,
      message: 'Orders table schema retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Error fetching orders schema:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch orders schema',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
