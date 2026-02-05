import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { ordersTable, findRecords } from '@/lib/airtable';
import { triggerOnCreate } from '@/lib/automation-engine';
import type { AirtableOrders } from '@/types/airtable.generated';

/**
 * GET /api/orders
 * Fetch orders with optional filters
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');

    const filterFormula = leadId 
      ? `FIND("${leadId}", {ID_Lead})` 
      : undefined;

    const orders = await findRecords<AirtableOrders>('orders', {
      filterByFormula: filterFormula,
      sort: [{ field: 'Data_Ordine', direction: 'desc' }],
    });

    return NextResponse.json(orders);
  } catch (error: any) {
    console.error('[API] GET /api/orders error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orders
 * Create new order + trigger automations
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Create order
    const newOrder = await ordersTable.create(body);

    // 🔥 Trigger automations (async, non-blocking)
    // Esempio: Order con stato "Confermato" → Lead diventa "Cliente"
    triggerOnCreate('Order', newOrder).catch(err => {
      console.error('[Automation] Error triggering onCreate for Order:', err);
    });

    return NextResponse.json(newOrder, { status: 201 });
  } catch (error: any) {
    console.error('[API] POST /api/orders error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
