import { NextRequest, NextResponse } from 'next/server';
import {
  getAirtableKey,
  getAirtableBaseId,
} from '@/lib/api-keys-service';

// PATCH - Modifica spesa
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { dataInizio, dataFine, amount, note } = body;

    if (!dataInizio || !dataFine || amount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Campi obbligatori mancanti' },
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

    // Genera nome automatico dal range di date
    const startDate = new Date(dataInizio);
    const endDate = new Date(dataFine);
    
    // Calcola durata in giorni
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    // Formatta nome in base alla durata
    let nome;
    if (diffDays === 1) {
      // Singolo giorno
      nome = startDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
    } else if (diffDays <= 31 && startDate.getMonth() === endDate.getMonth()) {
      // Stesso mese (o periodo ≤31 giorni nello stesso mese)
      nome = startDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    } else {
      // Range personalizzato
      nome = `${startDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    nome = nome.charAt(0).toUpperCase() + nome.slice(1);

    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/Spese%20Mensili/${id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            Nome: nome,
            'Data Inizio': dataInizio,
            'Data Fine': dataFine,
            'Importo Speso': amount,
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
        nome: data.fields.Nome,
        campaignId: data.fields.Campagna?.[0],
        dataInizio: data.fields['Data Inizio'],
        dataFine: data.fields['Data Fine'],
        amount: data.fields['Importo Speso'],
        note: data.fields.Note,
      },
    });
  } catch (error) {
    console.error('❌ [Expense API] PATCH Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE - Elimina spesa
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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
      `https://api.airtable.com/v0/${baseId}/Spese%20Mensili/${id}`,
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
      message: 'Spesa eliminata',
    });
  } catch (error) {
    console.error('❌ [Expense API] DELETE Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
