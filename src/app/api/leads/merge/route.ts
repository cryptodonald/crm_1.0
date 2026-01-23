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

/**
 * Campi che NON devono essere aggiornati (calcolati o di sistema)
 */
const FORBIDDEN_FIELDS = new Set([
  'ID', // Campo calcolato
  'createdTime', // Di sistema
  'id', // Interno
]);

function consolidateFields(masterRecord: any, duplicateRecords: any[]) {
  const masterFields = masterRecord.fields || {};
  const consolidated = { ...masterFields };
  
  // Campi testuali da consolidare
  const textFields = ['Email', 'Telefono', 'Indirizzo', 'CAP', 'Città', 'Esigenza', 'Note'];
  
  for (const dupRecord of duplicateRecords) {
    for (const field of textFields) {
      // Se il master non ha il campo, prendi dal duplicato
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

function sanitizeFields(fields: any): any {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(fields)) {
    // Skip forbidden fields
    if (FORBIDDEN_FIELDS.has(key)) {
      console.log(`⏭️  Skipping forbidden field: ${key}`);
      continue;
    }
    
    // Skip empty values
    if (value === null || value === undefined || value === '') {
      continue;
    }
    
    sanitized[key] = value;
  }
  
  return sanitized;
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

    console.log(`📊 Found ${duplicateRecords.length} duplicate records to merge`);

    // 3. Consolidate text fields from duplicates into master
    const consolidated = consolidateFields(masterRecord, duplicateRecords);

    // 4. Merge relations (Orders, Activities)
    const { ordersToUpdate, activitiesToUpdate } = mergeRelations(masterRecord, duplicateRecords);
    
    // Add merged relations to consolidated fields
    consolidated['Orders'] = ordersToUpdate;
    consolidated['Attività'] = activitiesToUpdate;

    console.log(`📋 Consolidated fields ready. Orders: ${ordersToUpdate.length}, Activities: ${activitiesToUpdate.length}`);

    // 5. Sanitize fields before sending to Airtable (remove forbidden/system fields)
    const sanitizedFields = sanitizeFields(consolidated);
    
    console.log(`🧹 Sanitized fields:`, Object.keys(sanitizedFields));

    // 6. Update master lead with consolidated fields
    const updated = await updateLeadRecord(apiKey, baseId, leadsTableId, masterId, sanitizedFields);
    if (!updated) {
      console.error('❌ Failed to update master lead');
      return NextResponse.json({ error: 'Failed to update master' }, { status: 500 });
    }

    console.log(`✅ Master lead updated with consolidated data`);

    // 7. Update Orders to point to master lead (if table available)
    if (ordersTableId && ordersToUpdate.length > 0) {
      console.log(`🔄 Updating ${ordersToUpdate.length} orders to master lead`);
      const orderUpdates = ordersToUpdate.map(orderId => ({
        id: orderId,
        fields: { 'Cliente': [masterId] },
      }));

      const ordersSuccess = await batchUpdateRecords(apiKey, baseId, ordersTableId, orderUpdates);
      if (ordersSuccess) {
        console.log(`✅ ${ordersToUpdate.length} orders updated to master`);
      } else {
        console.warn(`⚠️  Failed to update some orders, continuing with merge...`);
      }
    }

    // 8. Update Activities - try multiple field names if first fails
    if (activitiesTableId && activitiesToUpdate.length > 0) {
      console.log(`🔄 Updating ${activitiesToUpdate.length} activities to master lead`);
      
      // Try different field names for the activity link
      const possibleFieldNames = ['Cliente', 'Lead', 'Lead_ID', 'Contatto'];
      let activitiesSuccess = false;
      let usedFieldName = '';

      for (const fieldName of possibleFieldNames) {
        const activityUpdates = activitiesToUpdate.map(activityId => ({
          id: activityId,
          fields: { [fieldName]: [masterId] },
        }));

        const success = await batchUpdateRecords(apiKey, baseId, activitiesTableId, activityUpdates);
        if (success) {
          console.log(`✅ ${activitiesToUpdate.length} activities updated with field "${fieldName}"`);
          activitiesSuccess = true;
          usedFieldName = fieldName;
          break;
        } else {
          console.log(`⏭️  Field "${fieldName}" not found, trying next...`);
        }
      }

      if (!activitiesSuccess) {
        console.warn(`⚠️  Could not update activities - unknown field name. Continuing with merge...`);
      }
    }

    // 9. Delete duplicate leads
    let deletedCount = 0;
    for (const dup of duplicateRecords) {
      if (await deleteLeadRecord(apiKey, baseId, leadsTableId, dup.id)) {
        deletedCount++;
        console.log(`🗑️  Deleted duplicate: ${dup.id}`);
      }
    }

    console.log(`🎉 Merge completed: ${deletedCount} leads consolidated into master`);

    await invalidateLeadCache();

    return NextResponse.json({
      success: true,
      mergedLeadId: masterId,
      mergedCount: deletedCount,
      preservedRelations: {
        orders: ordersToUpdate.length,
        activities: activitiesToUpdate.length,
      },
      message: `${deletedCount} lead uniti con successo. ${ordersToUpdate.length} ordini e ${activitiesToUpdate.length} attività riallocate al master.`,
    });
  } catch (error) {
    console.error('❌ Merge error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Merge failed' },
      { status: 500 }
    );
  }
}
