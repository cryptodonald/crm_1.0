import { NextRequest, NextResponse } from 'next/server';
import {
  getAirtableKey,
  getAirtableBaseId,
  getAirtableLeadsTableId,
} from '@/lib/api-keys-service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise and non-Promise params
    const resolvedParams = await Promise.resolve(params);
    const recordId = resolvedParams.id;

    if (!recordId) {
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 [API] Fetching Marketing Source record: ${recordId}`);

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

    // Fetch the record directly from Airtable
    const url = `https://api.airtable.com/v0/${baseId}/Marketing%20Sources/${recordId}`;

    console.log(`📡 [API] Fetching from Airtable: ${url}`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `❌ [API] Airtable error: ${response.status} - ${errorText}`
      );
      return NextResponse.json(
        { error: `Failed to fetch source: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    console.log(
      `✅ [API] Successfully fetched source: ${data.fields?.Name || 'Unknown'}`
    );

    // Return the name and other useful fields
    return NextResponse.json({
      id: data.id,
      name: data.fields?.Name || 'Unknown',
      Name: data.fields?.Name || 'Unknown', // Include both cases
      fields: data.fields,
    });
  } catch (error) {
    console.error('❌ [API] Error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;
    const body = await request.json();
    const { name, description, active, color } = body;

    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
    ]);

    if (!apiKey || !baseId) {
      throw new Error('Missing Airtable credentials');
    }

    // Check if new name already exists (if name is being changed)
    if (name) {
      const checkResponse = await fetch(
        `https://api.airtable.com/v0/${baseId}/Marketing%20Sources?filterByFormula=AND(Name%3D%22${encodeURIComponent(name)}%22%2CRECORD_ID()!%3D%22${id}%22)`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.records.length > 0) {
          return NextResponse.json(
            { success: false, error: 'Una fonte con questo nome esiste già' },
            { status: 400 }
          );
        }
      }
    }

    const fields: any = {};
    if (name !== undefined) fields.Name = name;
    if (description !== undefined) fields.Description = description;
    if (active !== undefined) fields.Active = active;
    if (color !== undefined) fields.Color = color;

    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/Marketing%20Sources/${id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Airtable API error: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        name: data.fields.Name,
        description: data.fields.Description,
        active: data.fields.Active || false,
        color: data.fields.Color,
      },
    });
  } catch (error) {
    console.error('❌ [Marketing Sources API] Update Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const migrateToId = searchParams.get('migrateTo'); // ID della fonte alternativa

    const [apiKey, baseId, leadsTableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableLeadsTableId(),
    ]);

    if (!apiKey || !baseId) {
      throw new Error('Missing Airtable credentials');
    }

    // Get source name to check usage
    const sourceResponse = await fetch(
      `https://api.airtable.com/v0/${baseId}/Marketing%20Sources/${id}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!sourceResponse.ok) {
      throw new Error('Fonte non trovata');
    }

    const sourceData = await sourceResponse.json();
    const sourceName = sourceData.fields.Name;

    // Check usage in Leads table
    let leadsCount = 0;
    if (leadsTableId) {
      const leadsResponse = await fetch(
        `https://api.airtable.com/v0/${baseId}/${leadsTableId}?filterByFormula=Provenienza%3D%22${encodeURIComponent(sourceName)}%22&maxRecords=1`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (leadsResponse.ok) {
        const leadsData = await leadsResponse.json();
        leadsCount = leadsData.records.length;
      }
    }

    // Check usage in Marketing Costs
    const costsResponse = await fetch(
      `https://api.airtable.com/v0/${baseId}/Marketing%20Costs?filterByFormula=Fonte%3D%22${encodeURIComponent(sourceName)}%22&maxRecords=1`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    let costsCount = 0;
    if (costsResponse.ok) {
      const costsData = await costsResponse.json();
      costsCount = costsData.records.length;
    }

    const totalUsage = leadsCount + costsCount;

    // If source is in use and no migration target provided, return error with usage info
    if (totalUsage > 0 && !migrateToId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Fonte in uso',
          usage: {
            leads: leadsCount,
            costs: costsCount,
            total: totalUsage,
          },
          message: `Impossibile eliminare la fonte "${sourceName}" perché è utilizzata in ${totalUsage} record. Scegli una fonte alternativa per migrare i dati.`,
        },
        { status: 400 }
      );
    }

    // If migration target provided, migrate data first
    if (migrateToId && totalUsage > 0) {
      // Get target source name
      const targetSourceResponse = await fetch(
        `https://api.airtable.com/v0/${baseId}/Marketing%20Sources/${migrateToId}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (!targetSourceResponse.ok) {
        throw new Error('Fonte di destinazione non trovata');
      }

      const targetSourceData = await targetSourceResponse.json();
      const targetSourceName = targetSourceData.fields.Name;

      // TODO: Migrate leads and costs to new source
      // This would require batch update operations
      // For now, return error if migration is needed

      return NextResponse.json(
        {
          success: false,
          error: 'Migrazione non ancora implementata',
          message: 'La migrazione automatica dei dati non è ancora supportata. Per ora, modifica manualmente i record in Airtable prima di eliminare questa fonte.',
        },
        { status: 501 }
      );
    }

    // Delete source (only if not in use)
    const deleteResponse = await fetch(
      `https://api.airtable.com/v0/${baseId}/Marketing%20Sources/${id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!deleteResponse.ok) {
      const errorData = await deleteResponse.json();
      throw new Error(errorData.error?.message || `Airtable API error: ${deleteResponse.status}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Fonte eliminata con successo',
    });
  } catch (error) {
    console.error('❌ [Marketing Sources API] Delete Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
