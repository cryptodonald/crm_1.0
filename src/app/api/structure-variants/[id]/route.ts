import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey, getAirtableBaseId } from '@/lib/api-keys-service';

// Using existing Product_Variants table with new structure fields
const STRUCTURE_VARIANTS_TABLE_ID = 'tblGnZgea6HlO2pJ4'; // Product_Variants table ID

/**
 * GET /api/structure-variants/[id]
 * Recupera una variante strutturata specifica
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔍 [API] Structure Variant Get - Starting for ID:', params.id);
  
  try {
    const { id } = await params;

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

    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${STRUCTURE_VARIANTS_TABLE_ID}/${id}`;

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
    const fields = record.fields;
    
    // Get structure names from linked records
    let structureNames: string[] = [];
    if (fields.Product_Structures && fields.Product_Structures.length > 0) {
      // Fetch structure names
      const structurePromises = fields.Product_Structures.map(async (structureId: string) => {
        try {
          const structResponse = await fetch(`https://api.airtable.com/v0/${baseId}/tbl58tZxGfEnLpUZA/${structureId}`, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          });
          if (structResponse.ok) {
            const structData = await structResponse.json();
            return structData.fields.Nome || 'Unknown';
          }
        } catch (error) {
          console.warn('Could not fetch structure name:', error);
        }
        return 'Unknown';
      });
      
      structureNames = await Promise.all(structurePromises);
    }

    const variant = {
      id: record.id,
      structure_name: structureNames.join(','),
      field_id: (fields.Tipo_Variante || 'unknown').toLowerCase().replace(/\s+/g, '_'),
      field_name: fields.Tipo_Variante || 'unknown',
      code: fields.Codice_Variante || '',
      name: fields.Nome_Variante || '',
      description: fields.Descrizione_Variante || '',
      price_modifier: fields.Prezzo_Aggiuntivo_Attuale || 0,
      cost_modifier: fields.Costo_Aggiuntivo_Attuale || 0,
      active: fields.Attivo !== false,
      posizione: fields.Posizione || 0,
      created_time: record.createdTime
    };

    console.log('✅ [API] Variant retrieved successfully');

    return NextResponse.json({
      success: true,
      variant
    });

  } catch (error: any) {
    console.error('❌ [API] Structure Variant get error:', error.message);
    return NextResponse.json(
      { error: 'Failed to get variant: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/structure-variants/[id]
 * Aggiorna una variante strutturata specifica
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔧 [API] Structure Variant Update - Starting for ID:', params.id);
  
  try {
    const { id } = await params;
    const body = await request.json();
    
    console.log('📝 [API] Update request body:', body);
    
    // Validate required fields
    if (!body.code || !body.name) {
      return NextResponse.json(
        { error: 'Missing required fields: code, name' },
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

    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${STRUCTURE_VARIANTS_TABLE_ID}/${id}`;

    // Handle structure updates if provided
    let structureRecordIds: string[] = [];
    if (body.structures && Array.isArray(body.structures) && body.structures.length > 0) {
      // Find structure record IDs by names
      for (const structureName of body.structures) {
        try {
          const structureSearchUrl = `https://api.airtable.com/v0/${baseId}/tbl58tZxGfEnLpUZA`;
          const structureSearchParams = new URLSearchParams({
            filterByFormula: `{Nome} = "${structureName}"`,
            maxRecords: '1'
          });
          
          const structureResponse = await fetch(`${structureSearchUrl}?${structureSearchParams.toString()}`, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (structureResponse.ok) {
            const structureData = await structureResponse.json();
            if (structureData.records && structureData.records.length > 0) {
              structureRecordIds.push(structureData.records[0].id);
              console.log(`🔗 [API] Found structure: ${structureName} -> ${structureData.records[0].id}`);
            }
          }
        } catch (error) {
          console.warn(`⚠️ Could not find structure: ${structureName}`, error);
        }
      }
    }

    // Prepare fields for update
    const updateFields = {
      Codice_Variante: body.code,
      Nome_Variante: body.name,
      Descrizione_Variante: body.description || '',
      Prezzo_Aggiuntivo_Attuale: body.price_modifier || 0,
      Costo_Aggiuntivo_Attuale: body.cost_modifier || 0,
      Attivo: body.active !== false,
      ...(body.posizione !== undefined && { Posizione: body.posizione }),
      ...(structureRecordIds.length > 0 && { Product_Structures: structureRecordIds })
    };

    console.log('📝 [API] Updating variant with fields:', updateFields);

    const response = await fetch(airtableUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: updateFields }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Airtable update error:', response.status, errorText);
      throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ [API] Variant updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Variant updated successfully',
      variant: result
    });

  } catch (error: any) {
    console.error('❌ [API] Structure Variant update error:', error.message);
    return NextResponse.json(
      { error: 'Failed to update variant: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/structure-variants/[id]
 * Elimina una variante strutturata specifica
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🗑️ [API] Structure Variant Delete - Starting for ID:', params.id);
  
  try {
    const { id } = await params;

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

    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${STRUCTURE_VARIANTS_TABLE_ID}/${id}`;

    console.log('🗑️ [API] Deleting variant from Airtable');

    const response = await fetch(airtableUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [API] Airtable delete error:', response.status, errorText);
      throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ [API] Variant deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Variant deleted successfully',
      deleted: result
    });

  } catch (error: any) {
    console.error('❌ [API] Structure Variant delete error:', error.message);
    return NextResponse.json(
      { error: 'Failed to delete variant: ' + error.message },
      { status: 500 }
    );
  }
}