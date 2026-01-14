import { NextRequest, NextResponse } from 'next/server';
import {
  getAirtableKey,
  getAirtableBaseId,
} from '@/lib/api-keys-service';

export async function GET(request: NextRequest) {
  try {
    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
    ]);

    if (!apiKey || !baseId) {
      throw new Error('Missing Airtable credentials');
    }

    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/Marketing%20Costs`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const data = await response.json();
    const costs = data.records.map((record: any) => ({
      id: record.id,
      name: record.fields.Name,
      fonte: record.fields.Fonte,
      budget: record.fields.Budget || 0,
      costoMensile: record.fields['Costo Mensile'] || 0,
      dataInizio: record.fields['Data Inizio'],
      dataFine: record.fields['Data Fine'],
      note: record.fields.Note,
      createdTime: record.createdTime,
    }));

    return NextResponse.json({
      success: true,
      data: costs,
    });
  } catch (error) {
    console.error('❌ [Marketing Costs API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, fonte, budget, costoMensile, dataInizio, dataFine, note } = body;

    // Validation
    if (!name || !fonte) {
      return NextResponse.json(
        { success: false, error: 'Name and Fonte are required' },
        { status: 400 }
      );
    }

    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
    ]);

    if (!apiKey || !baseId) {
      throw new Error('Missing Airtable credentials');
    }

    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/Marketing%20Costs`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            Name: name,
            Fonte: fonte,
            Budget: budget || 0,
            'Costo Mensile': costoMensile,
            'Data Inizio': dataInizio,
            'Data Fine': dataFine,
            Note: note,
          },
        }),
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
        fonte: data.fields.Fonte,
        budget: data.fields.Budget || 0,
        costoMensile: data.fields['Costo Mensile'] || 0,
        dataInizio: data.fields['Data Inizio'],
        dataFine: data.fields['Data Fine'],
        note: data.fields.Note,
      },
    });
  } catch (error) {
    console.error('❌ [Marketing Costs API] Create Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
