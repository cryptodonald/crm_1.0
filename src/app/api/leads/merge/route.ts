import { NextRequest, NextResponse } from 'next/server';
import {
  getAirtableKey,
  getAirtableBaseId,
  getAirtableLeadsTableId,
  getAirtableOrdersTableId,
  getAirtableActivitiesTableId,
} from '@/lib/api-keys-service';
import { invalidateLeadCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface MergeRequest {
  masterId: string;
  duplicateIds: string[];
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
  if (!response.ok) {
    const err = await response.json();
    console.error('Update error:', err);
    return false;
  }
  return true;
}

async function deleteLeadRecord(apiKey: string, baseId: string, tableId: string, leadId: string) {
  const url = `https://api.airtable.com/v0/${baseId}/${tableId}/${leadId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return response.ok;
}

async function getRecordsByField(
  apiKey: string,
  baseId: string,
  tableId: string,
  field: string,
  value: string
) {
  const encodedFormula = encodeURIComponent(`{${field}} = "${value}"`);
  const url = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula=${encodedFormula}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!response.ok) return [];
  const data = await response.json();
  return data.records || [];
}

async function batchUpdateRecords(
  apiKey: string,
  baseId: string,
  tableId: string,
  updates: Array<{ id: string; fields: any }>
) {
  if (updates.length === 0) return true;

  const url = `https://api.airtable.com/v0/${baseId}/${tableId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: updates }),
  });

  if (!response.ok) {
    const err = await response.json();
    console.error('Batch update error:', err);
    return false;
  }
  return true;
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
    const leadsTableId = await getAirtableLeadsTableId();
    const ordersTableId = await getAirtableOrdersTableId();
    const activitiesTableId = await getAirtableActivitiesTableId();

    if (!apiKey || !baseId || !leadsTableId) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 500 });
    }

    console.log(`🔗 Starting merge of ${duplicateIds.length} leads into ${masterId}`);

    // 1. Fetch master record
    const masterRecord = await getLeadRecord(apiKey, baseId, leadsTableId, masterId);
    if (!masterRecord) {
      return NextResponse.json({ error: 'Master lead not found' }, { status: 404 });
    }

    // 2. Fetch all duplicate records
    const duplicateRecords = [];
    for (const dupId of duplicateIds) {
      const dup = await getLeadRecord(apiKey, baseId, leadsTableId, dupId);
      if (dup) duplicateRecords.push(dup);
    }

    if (duplicateRecords.length === 0) {
      return NextResponse.json({ error: 'No duplicates found' }, { status: 404 });
    }

    // 3. Consolidate fields from duplicates into master
    const consolidated = consolidateFields(masterRecord, duplicateRecords);

    // 4. Merge relations (Orders, Activities)
    const { ordersToUpdate, activitiesToUpdate } = mergeRelations(masterRecord, duplicateRecords);

    // 5. Update master lead with consolidated fields ONLY (no link records in PATCH)
    const updated = await updateLeadRecord(apiKey, baseId, leadsTableId, masterId, consolidated);
    if (!updated) {
      console.error('Failed to update master lead');
      return NextResponse.json({ error: 'Failed to update master' }, { status: 500 });
    }

    console.log(`✅ Master updated with consolidated fields`);

    // 6. Update Orders to point to master lead
    if (ordersTableId && ordersToUpdate.length > 0) {
      console.log(`🔄 Updating ${ordersToUpdate.length} orders to master lead`);
      const orderRecords = [];
      for (const orderId of ordersToUpdate) {
        const order = await getLeadRecord(apiKey, baseId, ordersTableId, orderId);
        if (order) {
          orderRecords.push({
            id: orderId,
            fields: { 'Cliente': [masterId] }, // Update Cliente link to master
          });
        }
      }

      if (orderRecords.length > 0) {
        await batchUpdateRecords(apiKey, baseId, ordersTableId, orderRecords);
        console.log(`✅ ${orderRecords.length} orders updated`);
      }
    }

    // 7. Update Activities to point to master lead
    if (activitiesTableId && activitiesToUpdate.length > 0) {
      console.log(`🔄 Updating ${activitiesToUpdate.length} activities to master lead`);
      const activityRecords = [];
      for (const activityId of activitiesToUpdate) {
        const activity = await getLeadRecord(apiKey, baseId, activitiesTableId, activityId);
        if (activity) {
          activityRecords.push({
            id: activityId,
            fields: { 'Cliente': [masterId] }, // Update Cliente link to master
          });
        }
      }

      if (activityRecords.length > 0) {
        await batchUpdateRecords(apiKey, baseId, activitiesTableId, activityRecords);
        console.log(`✅ ${activityRecords.length} activities updated`);
      }
    }

    // 8. Delete duplicate leads
    let deletedCount = 0;
    for (const dup of duplicateRecords) {
      if (await deleteLeadRecord(apiKey, baseId, leadsTableId, dup.id)) {
        deletedCount++;
        console.log(`✅ Deleted duplicate: ${dup.id}`);
      }
    }

    await invalidateLeadCache();

    return NextResponse.json({
      success: true,
      mergedLeadId: masterId,
      mergedCount: deletedCount,
      preservedRelations: {
        orders: ordersToUpdate.length,
        activities: activitiesToUpdate.length,
      },
      message: `${deletedCount} lead uniti con successo. ${ordersToUpdate.length} ordini e ${activitiesToUpdate.length} attività riallocate.`,
    });
  } catch (error) {
    console.error('Merge error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Merge failed' },
      { status: 500 }
    );
  }
}
