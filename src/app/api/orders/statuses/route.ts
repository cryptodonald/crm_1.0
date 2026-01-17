import { NextRequest, NextResponse } from 'next/server';

// Opzioni valide di Stato_Ordine come sono in Airtable
// IMPORTANTE: Questi valori DEVONO matchare ESATTAMENTE le opzioni nel campo Airtable
const ORDER_STATUSES = [
  'Bozza',
  'Confermato',
  'In Produzione',  // Con spazio, non underscore
  'Spedito',
  'Consegnato',     // Non 'Completato' - Airtable ha 'Consegnato'
  'Annullato',
];

/**
 * GET /api/orders/statuses - Restituisce le opzioni valide di Stato_Ordine
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 [API] Fetching order statuses');
    
    return NextResponse.json({
      success: true,
      statuses: ORDER_STATUSES,
      message: 'Order statuses retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Error fetching order statuses:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch order statuses',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
