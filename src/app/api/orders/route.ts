import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey, getAirtableBaseId, getAirtableOrdersTableId } from '@/lib/api-keys-service';

function parseIds(searchParams: URLSearchParams): string[] {
  // Support both ids=rec1,rec2 and ids[]=rec1&ids[]=rec2
  const idsParams = searchParams.getAll('ids');
  const list: string[] = [];
  for (const param of idsParams) {
    const parts = param.split(',').map(s => s.trim()).filter(Boolean);
    list.push(...parts);
  }
  // Also support id=rec1 (single)
  const single = searchParams.get('id');
  if (single) list.push(single);
  // Deduplicate
  return Array.from(new Set(list));
}

/**
 * GET /api/orders?ids=recA,recB or /api/orders?ids=recA&ids=recB
 * Returns a simplified list of orders with common fields when available.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = parseIds(searchParams);

    if (!ids.length) {
      return NextResponse.json(
        { error: 'ids query parameter is required' },
        { status: 400 }
      );
    }

    const [apiKey, baseId, tableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableOrdersTableId(),
    ]);

    if (!apiKey || !baseId || !tableId) {
      return NextResponse.json(
        { error: 'Airtable credentials not available' },
        { status: 500 }
      );
    }

    // Build filterByFormula: OR(RECORD_ID()='rec1', RECORD_ID()='rec2', ...)
    const formula = `OR(${ids.map(id => `RECORD_ID()='${id}'`).join(',')})`;
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
    url.searchParams.set('filterByFormula', formula);
    url.searchParams.set('maxRecords', String(Math.min(ids.length, 100)));

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 120 },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Orders] Airtable API error:', response.status, errText);
      return NextResponse.json(
        { error: `Airtable API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Transform records to a simple structure. Field names are optional.
    const records = (data.records || []).map((record: any) => {
      const f = record.fields || {};
      return {
        id: record.id,
        createdTime: record.createdTime,
        // Common optional fields (if present in Airtable)
        Data: f.Data || null,
        Totale: f.Totale ?? null,
        Stato: f.Stato || null,
        Numero: f['Numero Ordine'] || f.Numero || null,
        ...f, // also return all fields for flexibility on the client
      };
    });

    return NextResponse.json({ success: true, count: records.length, records });
  } catch (error) {
    console.error('[Orders] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
