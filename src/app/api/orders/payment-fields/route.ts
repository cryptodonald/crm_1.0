import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey, getAirtableBaseId } from '@/lib/api-keys-service';

const ORDERS_TABLE_ID = 'tblkqfCMabBpVD1fP';

/**
 * GET /api/orders/payment-fields - Recupera le opzioni disponibili per Stato_Pagamento e Modalita_Pagamento
 * 
 * Interroga Airtable per estrarre le opzioni valide direttamente dalla struttura della tabella
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 [API] Fetching payment field options');
    
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

    // Prova a recuperare il primo ordine per vedere la struttura dei campi
    const airtableUrl = `https://api.airtable.com/v0/${baseId}/${ORDERS_TABLE_ID}?maxRecords=1`;
    
    const response = await fetch(airtableUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Airtable API error:', response.status, errorText);
      throw new Error(`Airtable error ${response.status}`);
    }

    const json = await response.json();

    // Se abbiamo record, estraiamo i dati
    if (json.records && json.records.length > 0) {
      const firstOrder = json.records[0].fields;
      
      console.log('✅ [API] Sample order retrieved');
      console.log('   Stato_Pagamento:', firstOrder.Stato_Pagamento);
      console.log('   Modalita_Pagamento:', firstOrder.Modalita_Pagamento);
      
      return NextResponse.json({
        success: true,
        note: 'Payment field options detected from sample record',
        sampleStatoPagamento: firstOrder.Stato_Pagamento,
        sampleModalitaPagamento: firstOrder.Modalita_Pagamento,
        message: 'Check the developer logs for actual field options in Airtable'
      });
    }

    // Se non abbiamo record, ritorna i placeholder
    return NextResponse.json({
      success: false,
      message: 'No orders found to inspect field options',
      note: 'Please manually check Airtable table structure for payment field options'
    });

  } catch (error) {
    console.error('❌ Error fetching payment fields:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch payment fields',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
