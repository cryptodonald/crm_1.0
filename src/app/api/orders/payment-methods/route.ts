import { NextRequest, NextResponse } from 'next/server';

/**
 * Opzioni valide di Modalita_Pagamento come sono in Airtable
 * IMPORTANTE: Questi valori DEVONO matchare ESATTAMENTE le opzioni nel campo Airtable
 * 
 * Estratte direttamente da Airtable (visualizzate nello screenshot):
 */
const PAYMENT_METHODS = [
  'Contanti',           // Pagamento in contanti
  'Bonifico',           // Trasferimento bancario
  'Carta Credito',      // Pagamento con carta di credito
  'Finanziamento',      // Pagamento tramite finanziamento
  'Assegno',            // Pagamento con assegno
  'PayPal',             // Pagamento via PayPal
];

/**
 * GET /api/orders/payment-methods - Restituisce le opzioni valide di Modalita_Pagamento
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📋 [API] Fetching order payment methods');
    
    return NextResponse.json({
      success: true,
      paymentMethods: PAYMENT_METHODS,
      message: 'Order payment methods retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Error fetching order payment methods:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch order payment methods',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
