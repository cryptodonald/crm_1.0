import { NextRequest, NextResponse } from 'next/server';
import {
  getAirtableKey,
  getAirtableBaseId,
} from '@/lib/api-keys-service';

// GET - Lista spese per campagna
export async function GET(request: NextRequest) {
  console.log('🚀🚀🚀 [Expenses API] GET REQUEST RECEIVED');
  console.log('📍 [Expenses API] URL:', request.url);
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    console.log('🔑 [Expenses API] Campaign ID from params:', campaignId);

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: 'Campaign ID richiesto' },
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

    // Filtra per campagna - usa FIND per array di link
    const filterFormula = `FIND("${campaignId}", ARRAYJOIN({Campagna}))`;
    const url = `https://api.airtable.com/v0/${baseId}/Spese%20Mensili?filterByFormula=${encodeURIComponent(filterFormula)}&sort%5B0%5D%5Bfield%5D=Data%20Inizio&sort%5B0%5D%5Bdirection%5D=desc`;

    console.log('🔍 [Expenses API] Fetching expenses for campaign:', campaignId);
    console.log('🔍 [Expenses API] Filter formula:', filterFormula);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Airtable API error: ${response.status}`);
    }

    const data = await response.json();

    console.log('✅ [Expenses API] Found records:', data.records.length);
    console.log('📦 [Expenses API] Total records in response:', data.records.length);
    
    // Log tutti i record per debug
    if (data.records.length > 0) {
      console.log('📋 [Expenses API] First record sample:', JSON.stringify(data.records[0], null, 2));
    }
    
    // Test: prova a recuperare TUTTI i record senza filtro per vedere se esistono
    console.log('🧪 [Expenses API] Testing: fetching ALL records without filter...');
    const testUrl = `https://api.airtable.com/v0/${baseId}/Spese%20Mensili?maxRecords=10`;
    const testResponse = await fetch(testUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });
    const testData = await testResponse.json();
    console.log('🧪 [Expenses API] Total records WITHOUT filter:', testData.records.length);
    if (testData.records.length > 0) {
      console.log('🧪 [Expenses API] Sample record Campagna field:', testData.records[0].fields.Campagna);
    }

    const expenses = data.records.map((record: any) => ({
      id: record.id,
      nome: record.fields.Nome,
      campaignId: record.fields.Campagna?.[0],
      dataInizio: record.fields['Data Inizio'],
      dataFine: record.fields['Data Fine'],
      amount: record.fields['Importo Speso'] || 0,
      note: record.fields.Note,
    }));

    return NextResponse.json({
      success: true,
      expenses,
    });
  } catch (error) {
    console.error('❌ [Expenses API] GET Error:', error);
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
    const { campaignId, dataInizio, dataFine, amount, note } = body;

    if (!campaignId || !dataInizio || !dataFine || amount === undefined) {
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
      `https://api.airtable.com/v0/${baseId}/Spese%20Mensili`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            Nome: nome,
            Campagna: [campaignId],
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
    console.error('❌ [Monthly Expenses API] Create Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
