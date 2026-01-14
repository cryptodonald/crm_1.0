import { NextRequest, NextResponse } from 'next/server';
import {
  getAirtableKey,
  getAirtableBaseId,
} from '@/lib/api-keys-service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, fonte, budget, costoMensile, dataInizio, dataFine, note } = body;

    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
    ]);

    if (!apiKey || !baseId) {
      throw new Error('Missing Airtable credentials');
    }

    const fields: any = {};
    if (name !== undefined) fields.Name = name;
    if (fonte !== undefined) fields.Fonte = fonte;
    if (budget !== undefined) fields.Budget = budget;
    if (costoMensile !== undefined) fields['Costo Mensile'] = costoMensile;
    if (dataInizio !== undefined) fields['Data Inizio'] = dataInizio;
    if (dataFine !== undefined) fields['Data Fine'] = dataFine;
    if (note !== undefined) fields.Note = note;

    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/Marketing%20Costs/${id}`,
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
        fonte: data.fields.Fonte,
        budget: data.fields.Budget || 0,
        costoMensile: data.fields['Costo Mensile'] || 0,
        dataInizio: data.fields['Data Inizio'],
        dataFine: data.fields['Data Fine'],
        note: data.fields.Note,
      },
    });
  } catch (error) {
    console.error('❌ [Marketing Costs API] Update Error:', error);
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [apiKey, baseId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
    ]);

    if (!apiKey || !baseId) {
      throw new Error('Missing Airtable credentials');
    }

    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/Marketing%20Costs/${id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Airtable API error: ${response.status}`);
    }

    return NextResponse.json({
      success: true,
      message: 'Marketing cost deleted successfully',
    });
  } catch (error) {
    console.error('❌ [Marketing Costs API] Delete Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
