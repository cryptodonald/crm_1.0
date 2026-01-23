import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey, getAirtableBaseId, getAirtableLeadsTableId } from '@/lib/api-keys-service';
import { invalidateLeadCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface MergeRequest {
  masterId: string;
  duplicateIds: string[];
  strategy?: string;
}

async function getLeadRecord(apiKey: string, baseId: string, tableId: string, leadId: string) {
  const url = `https://api.airtable.com/v0/${baseId}/${tableId}/${leadId}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
  });
  return response.ok ? response.json() : null;
}

async function updateLeadRecord(apiKey: string, baseId: string, tableId: string, leadId: string, fields: any) {
  const url = `https://api.airtable.com/v0/${baseId}/${tableId}/${leadId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  return response.ok;
}

async function deleteLeadRecord(apiKey: string, baseId: string, tableId: string, leadId: string) {
  const url = `https://api.airtable.com/v0/${baseId}/${tableId}/${leadId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return response.ok;
}

function consolidateFields(masterRecord: any, duplicateRecords: any[]) {
  const masterFields = masterRecord.fields || {};
  const consolidated = { ...masterFields };
  const fields = ['Email', 'Telefono', 'Indirizzo', 'CAP', 'Città', 'Esigenza', 'Note'];
  
  for (const dupRecord of duplicateRecords) {
    for (const field of fields) {
      if (!consolidated[field] && dupRecord.fields?.[field]) {
        consolidated[field] = dupRecord.fields[field];
      }
    }
  }
  return consolidated;
}

function mergeRelations(masterRecord: any, duplicateRecords: any[]) {
  const masterFields = masterRecord.fields || {};
  const orders = new Set(masterFields['Orders'] || []);
  const activities = new Set(masterFields['Attività'] || []);
  
  for (const dupRecord of duplicateRecords) {
    (dupRecord.fields?.['Orders'] || []).forEach((id: string) => orders.add(id));
    (dupRecord.fields?.['Attività'] || []).forEach((id: string) => activities.add(id));
  }
  
  return {
    ordersToUpdate: Array.from(orders),
    activitiesToUpdate: Array.from(activities),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: MergeRequest = await request.json();
    const { masterId, duplicateIds = [] } = body;

    if (!masterId || duplicateIds.length === 0) {
      return NextResponse.json({ error: 'masterId e duplicateIds obbligatori' }, { status: 400 });
    }

    const apiKey = await getAirtableKey();
    const baseId = await getAirtableBaseId();
    const tableId = await getAirtableLeadsTableId();

    if (!apiKey || !baseId || !tableId) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 500 });
    }

    const masterRecord = await getLeadRecord(apiKey, baseId, tableId, masterId);
    if (!masterRecord) {
      return NextResponse.json({ error: 'Master lead not found' }, { status: 404 });
    }

    const duplicateRecords = [];
    for (const dupId of duplicateIds) {
      const dup = await getLeadRecord(apiKey, baseId, tableId, dupId);
      if (dup) duplicateRecords.push(dup);
    }

    if (duplicateRecords.length === 0) {
      return NextResponse.json({ error: 'No duplicates found' }, { status: 404 });
    }

    const consolidated = consolidateFields(masterRecord, duplicateRecords);
    const { ordersToUpdate, activitiesToUpdate } = mergeRelations(masterRecord, duplicateRecords);

    consolidated['Orders'] = ordersToUpdate;
    consolidated['Attività'] = activitiesToUpdate;

    const updated = await updateLeadRecord(apiKey, baseId, tableId, masterId, consolidated);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update master' }, { status: 500 });
    }

    let deletedCount = 0;
    for (const dup of duplicateRecords) {
      if (await deleteLeadRecord(apiKey, baseId, tableId, dup.id)) {
        deletedCount++;
      }
    }

    await invalidateLeadCache();

    return NextResponse.json({
      success: true,
      mergedLeadId: masterId,
      mergedCount: deletedCount,
      preservedRelations: { orders: ordersToUpdate.length, activities: activitiesToUpdate.length },
      message: `${deletedCount} lead uniti con successo`,
    });
  } catch (error) {
    console.error('Merge error:', error);
    return NextResponse.json({ error: 'Merge failed' }, { status: 500 });
  }
}
