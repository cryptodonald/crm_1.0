import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey, getAirtableBaseId } from '@/lib/api-keys-service';

const PRODUCT_STRUCTURES_TABLE_ID = 'tbl58tZxGfEnLpUZA';

/**
 * GET /api/product-structures
 * Recupera tutte le strutture prodotto da Airtable
 */
export async function GET(request: NextRequest) {
  console.log('🔧 [API] Product Structures - Loading from Airtable');
  
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

    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${PRODUCT_STRUCTURES_TABLE_ID}`;
    
    const queryParams = new URLSearchParams({
      'sort[0][field]': 'Nome',
      'sort[0][direction]': 'asc',
      maxRecords: '100'
    });

    const response = await fetch(`${airtableUrl}?${queryParams.toString()}`, {
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

    // Convert to ProductStructure format
    const structures = records.map((record: any) => {
      let fields = [];
      
      try {
        // Parse JSON fields
        if (record.fields.Campi_JSON) {
          fields = JSON.parse(record.fields.Campi_JSON);
        }
      } catch (e) {
        console.warn('Failed to parse fields JSON for structure:', record.id, e);
        fields = [];
      }

      return {
        id: record.fields.ID_Struttura || record.id,
        name: record.fields.Nome || '',
        description: record.fields.Descrizione || '',
        active: record.fields.Attiva ?? true,
        fields: fields,
        created_at: record.fields.Data_Creazione || record.createdTime,
        updated_at: record.fields.Data_Modifica || record.createdTime
      };
    });

    console.log(`✅ [API] Loaded ${structures.length} product structures`);

    return NextResponse.json({
      structures,
      total: structures.length
    });

  } catch (error: any) {
    console.error('❌ [API] Error loading product structures:', error.message);
    return NextResponse.json(
      { error: 'Failed to load product structures' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/product-structures
 * Crea una nuova struttura prodotto
 */
export async function POST(request: NextRequest) {
  console.log('🚀 [API] Product Structures - Creating new structure');
  
  try {
    const body = await request.json();
    const { name, description, fields, active } = body;

    if (!name || !fields) {
      return NextResponse.json(
        { error: 'Name and fields are required' },
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

    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${PRODUCT_STRUCTURES_TABLE_ID}`;
    
    const airtableRecord = {
      records: [{
        fields: {
          Nome: name,
          Descrizione: description || '',
          Campi_JSON: JSON.stringify(fields),
          Attiva: active ?? true
        }
      }]
    };

    const response = await fetch(airtableUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(airtableRecord),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const createdRecord = result.records[0];

    console.log(`✅ [API] Created structure: ${name}`);

    return NextResponse.json({
      success: true,
      message: 'Structure created successfully',
      structure: {
        id: createdRecord.fields.ID_Struttura || createdRecord.id,
        name: createdRecord.fields.Nome,
        description: createdRecord.fields.Descrizione,
        active: createdRecord.fields.Attiva,
        fields: JSON.parse(createdRecord.fields.Campi_JSON || '[]'),
        created_at: createdRecord.fields.Data_Creazione,
        updated_at: createdRecord.fields.Data_Modifica
      }
    });

  } catch (error: any) {
    console.error('❌ [API] Error creating structure:', error.message);
    return NextResponse.json(
      { error: 'Failed to create structure: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/product-structures
 * Aggiorna una struttura prodotto esistente
 */
export async function PUT(request: NextRequest) {
  console.log('🔧 [API] Product Structures - Updating structure');
  
  try {
    const body = await request.json();
    const { id, name, description, fields, active } = body;

    if (!id || !name || !fields) {
      return NextResponse.json(
        { error: 'ID, name and fields are required' },
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

    // Find the record by ID_Struttura field or record ID
    const searchUrl = `https://api.airtable.com/v0/${baseId}/${PRODUCT_STRUCTURES_TABLE_ID}`;
    const searchParams = new URLSearchParams({
      filterByFormula: `OR({ID_Struttura} = "${id}", RECORD_ID() = "${id}")`,
      maxRecords: '1'
    });

    const searchResponse = await fetch(`${searchUrl}?${searchParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!searchResponse.ok) {
      throw new Error('Failed to find structure');
    }

    const searchData = await searchResponse.json();
    
    if (searchData.records.length === 0) {
      return NextResponse.json(
        { error: 'Structure not found' },
        { status: 404 }
      );
    }

    const recordId = searchData.records[0].id;
    
    // Update the record
    const updateUrl = `https://api.airtable.com/v0/${baseId}/${PRODUCT_STRUCTURES_TABLE_ID}`;
    const updateRecord = {
      records: [{
        id: recordId,
        fields: {
          Nome: name,
          Descrizione: description || '',
          Campi_JSON: JSON.stringify(fields),
          Attiva: active ?? true
        }
      }]
    };

    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateRecord),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Update failed: ${updateResponse.status} - ${errorText}`);
    }

    const result = await updateResponse.json();
    const updatedRecord = result.records[0];

    console.log(`✅ [API] Updated structure: ${name}`);

    return NextResponse.json({
      success: true,
      message: 'Structure updated successfully',
      structure: {
        id: updatedRecord.fields.ID_Struttura || updatedRecord.id,
        name: updatedRecord.fields.Nome,
        description: updatedRecord.fields.Descrizione,
        active: updatedRecord.fields.Attiva,
        fields: JSON.parse(updatedRecord.fields.Campi_JSON || '[]'),
        created_at: updatedRecord.fields.Data_Creazione,
        updated_at: updatedRecord.fields.Data_Modifica
      }
    });

  } catch (error: any) {
    console.error('❌ [API] Error updating structure:', error.message);
    return NextResponse.json(
      { error: 'Failed to update structure: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/product-structures?id=<structure_id>
 * Elimina una struttura prodotto
 */
export async function DELETE(request: NextRequest) {
  console.log('🗑️ [API] Product Structures - Deleting structure');
  
  try {
    const { searchParams } = new URL(request.url);
    const structureId = searchParams.get('id');

    if (!structureId) {
      return NextResponse.json(
        { error: 'Structure ID is required' },
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

    // Find the record by ID_Struttura field or record ID
    const searchUrl = `https://api.airtable.com/v0/${baseId}/${PRODUCT_STRUCTURES_TABLE_ID}`;
    const searchParams2 = new URLSearchParams({
      filterByFormula: `OR({ID_Struttura} = "${structureId}", RECORD_ID() = "${structureId}")`,
      maxRecords: '1'
    });

    const searchResponse = await fetch(`${searchUrl}?${searchParams2.toString()}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!searchResponse.ok) {
      throw new Error('Failed to find structure');
    }

    const searchData = await searchResponse.json();
    
    if (searchData.records.length === 0) {
      return NextResponse.json(
        { error: 'Structure not found' },
        { status: 404 }
      );
    }

    const recordId = searchData.records[0].id;
    
    // Delete the record
    const deleteUrl = `https://api.airtable.com/v0/${baseId}/${PRODUCT_STRUCTURES_TABLE_ID}/${recordId}`;

    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      throw new Error(`Delete failed: ${deleteResponse.status} - ${errorText}`);
    }

    console.log(`✅ [API] Deleted structure: ${structureId}`);

    return NextResponse.json({
      success: true,
      message: 'Structure deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ [API] Error deleting structure:', error.message);
    return NextResponse.json(
      { error: 'Failed to delete structure: ' + error.message },
      { status: 500 }
    );
  }
}
