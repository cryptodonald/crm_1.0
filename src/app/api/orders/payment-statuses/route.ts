import { NextRequest, NextResponse } from 'next/server';

/**
 * Opzioni valide di Stato_Pagamento come sono in Airtable
 * IMPORTANTE: Questi valori DEVONO matchare ESATTAMENTE le opzioni nel campo Airtable
 * 
 * Estratte dai dati attuali in Airtable:
 * - Non Pagato (predefinito per nuovi ordini)
 */
const PAYMENT_STATUSES = [
  'Non Pagato',      // Pagamento non ancora effettuato (default)
  'Parziale',        // Pagamento parziale ricevuto
  'Pagato',          // Pagamento completo ricevuto
  'Rifiutato',       // Pagamento rifiutato
  'Annullato',       // Pagamento annullato
];

/**
 * GET /api/orders/payment-statuses - Restituisce le opzioni valide di Stato_Pagamento
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 [API] Fetching order payment statuses');
    
    return NextResponse.json({
      success: true,
      paymentStatuses: PAYMENT_STATUSES,
      message: 'Order payment statuses retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Error fetching order payment statuses:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch order payment statuses',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
