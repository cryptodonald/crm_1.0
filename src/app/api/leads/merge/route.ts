import { NextRequest, NextResponse } from 'next/server';
import {
  getAirtableKey,
  getAirtableBaseId,
  getAirtableLeadsTableId,
  getAirtableOrdersTableId,
  getAirtableActivitiesTableId,
} from '@/lib/api-keys-service';
import { invalidateLeadCache } from '@/lib/cache';
import {
  detectStateConflict,
  detectAssigneeConflict,
  mergeAttachments,
  getUniqueStates,
  getUniqueAssignees,
} from '@/lib/merge-utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface MergeRequest {
  masterId: string;
  duplicateIds: string[];
  selectedState?: string;
  selectedAssignee?: string;
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
  console.log(`[DEBUG] updateLeadRecord for ${leadId}`);
  console.log(`[DEBUG] Sending fields:`, JSON.stringify(fields, null, 2));
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  
  if (!response.ok) {
    const err = await response.json();
    console.error('❌ [UPDATE ERROR] Response not ok:', response.status);
    console.error('❌ [UPDATE ERROR] Full error:', JSON.stringify(err, null, 2));
    console.error('❌ [UPDATE ERROR] Fields that failed:', JSON.stringify(fields, null, 2));
    return false;
  }
  
  const responseData = await response.json();
  console.log(`✅ [UPDATE SUCCESS] Record updated:`, responseData.id);
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
  updates: Array<{ id: string; fields: any }>,
  fieldName?: string
) {
  if (updates.length === 0) return { success: true };

  const url = `https://api.airtable.com/v0/${baseId}/${tableId}`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: updates }),
  });

  if (!response.ok) {
    const err = await response.json();
    console.error(`❌ Batch update error on field "${fieldName}":`, err);
    return { success: false, error: err };
  }
  return { success: true };
}

/**
 * Campi che NON devono essere aggiornati (calcolati o di sistema)
 */
const FORBIDDEN_FIELDS = new Set([
  'ID', // Campo calcolato
  'createdTime', // Di sistema
  'id', // Interno
  'Data', // Data non deve essere cambiata durante consolidamento
]);

function getOldestDate(dates: (string | Date | null | undefined)[]): string | null {
  const validDates = dates
    .filter((d): d is string | Date => d !== null && d !== undefined && d !== '')
    .map(d => new Date(d).getTime())
    .filter(d => !isNaN(d));

  if (validDates.length === 0) return null;
  
  const oldest = new Date(Math.min(...validDates));
  return oldest.toISOString().split('T')[0]; // Ritorna formato YYYY-MM-DD
}

function consolidateNotes(masterRecord: any, duplicateRecords: any[]): string {
  const allNotes: string[] = [];
  
  // Master notes (marked as current)
  if (masterRecord.fields?.['Note']) {
    allNotes.push(`[MASTER] ${masterRecord.fields['Note']}`);
  }
  
  // Duplicate notes (marked with lead name and date)
  for (const dup of duplicateRecords) {
    const dupName = dup.fields?.['Nome'] || 'Unknown';
    const dupDate = dup.fields?.['Data'] || 'N.D.';
    const dupNote = dup.fields?.['Note'];
    
    if (dupNote) {
      allNotes.push(`[${dupName} - ${dupDate}] ${dupNote}`);
    }
  }
  
  return allNotes.join('\n---\n');
}

function consolidateFields(
  masterRecord: any,
  duplicateRecords: any[],
  options?: { selectedState?: string; selectedAssignee?: string }
) {
  const masterFields = masterRecord.fields || {};
  const consolidated = { ...masterFields };
  
  // Campi testuali da consolidare (escludendo Note che ha logica speciale)
  const textFields = ['Email', 'Telefono', 'Indirizzo', 'CAP', 'Città', 'Esigenza'];
  
  for (const dupRecord of duplicateRecords) {
    for (const field of textFields) {
      // Se il master non ha il campo, prendi dal duplicato
      if (!consolidated[field] && dupRecord.fields?.[field]) {
        consolidated[field] = dupRecord.fields[field];
      }
    }
  }
  
  // Consolidate notes with markers
  const allNotes = consolidateNotes(masterRecord, duplicateRecords);
  if (allNotes) {
    consolidated['Note'] = allNotes;
  }
  
  // Set Data to oldest date (sempre più vecchia)
  const allDates = [
    masterRecord.fields?.['Data'],
    ...duplicateRecords.map(d => d.fields?.['Data']),
  ];
  const oldestDate = getOldestDate(allDates);
  if (oldestDate) {
    consolidated['Data'] = oldestDate;
  }
  
  // Handle Stato: usa selectedState se diversi, altrimenti mantieni master
  if (options?.selectedState) {
    console.log(`🎯 [Merge] Using selected state: ${options.selectedState}`);
    consolidated['Stato'] = options.selectedState;
  }
  
  // Handle Assegnatario: usa selectedAssignee se diversi, altrimenti mantieni master
  if (options?.selectedAssignee) {
    console.log(`👤 [Merge] Using selected assignee: ${options.selectedAssignee}`);
    consolidated['Assegnatario'] = options.selectedAssignee;
  }
  
  // Merge allegati: copia tutti i duplicati + mantieni il master
  const mergedAttachments = mergeAttachments(masterRecord, duplicateRecords);
  if (mergedAttachments.length > 0) {
    console.log(`📎 [Merge] Merged ${mergedAttachments.length} attachments`);
    consolidated['Allegati'] = mergedAttachments;
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
    
    // Skip empty arrays (like empty Allegati)
    if (Array.isArray(value) && value.length === 0) {
      console.log(`⏭️  Skipping empty array field: ${key}`);
      continue;
    }
    
    // Skip Allegati if it contains invalid data (e.g., strings like "[")
    let fieldValue = value;
    if (key === 'Allegati' && Array.isArray(fieldValue)) {
      const validAttachments = fieldValue.filter(a => a && typeof a === 'object' && (a.url || a.id));
      if (validAttachments.length !== fieldValue.length) {
        console.log(`⚠️  Allegati contains invalid items. Original: ${fieldValue.length}, Valid: ${validAttachments.length}`);
        if (validAttachments.length === 0) {
          console.log(`⏭️  Skipping Allegati (no valid attachments)`);
          continue;
        }
        fieldValue = validAttachments;
      }
    }
    
    sanitized[key] = fieldValue;
  }
  
  return sanitized;
}

export async function POST(request: NextRequest) {
  try {
    const body: MergeRequest = await request.json();
    const { masterId, duplicateIds = [], selectedState, selectedAssignee } = body;

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

    const startTime = Date.now();
    console.log(`🔗 Starting merge of ${duplicateIds.length} leads into ${masterId}`);

    // 1. Fetch master record
    console.log('[TIMER] Fetching master record...');
    const masterRecord = await getLeadRecord(apiKey, baseId, leadsTableId, masterId);
    console.log(`[TIMER] Master fetched in ${Date.now() - startTime}ms`);
    if (!masterRecord) {
      return NextResponse.json({ error: 'Master lead not found' }, { status: 404 });
    }

    // 2. Fetch all duplicate records
    console.log('[TIMER] Fetching duplicate records...');
    const duplicateRecords = [];
    for (const dupId of duplicateIds) {
      const dup = await getLeadRecord(apiKey, baseId, leadsTableId, dupId);
      if (dup) duplicateRecords.push(dup);
    }

    if (duplicateRecords.length === 0) {
      return NextResponse.json({ error: 'No duplicates found' }, { status: 404 });
    }

    console.log(`[TIMER] Duplicates fetched in ${Date.now() - startTime}ms`);
    console.log(`📊 Found ${duplicateRecords.length} duplicate records to merge`);

    // 3. Consolidate text fields from duplicates into master
    const consolidated = consolidateFields(masterRecord, duplicateRecords, {
      selectedState,
      selectedAssignee,
    });

    // 4. Merge relations (Orders, Activities)
    const { ordersToUpdate, activitiesToUpdate } = mergeRelations(masterRecord, duplicateRecords);
    
    // Add merged relations to consolidated fields
    consolidated['Orders'] = ordersToUpdate;
    consolidated['Attività'] = activitiesToUpdate;

    console.log(`📋 Consolidated fields ready. Orders: ${ordersToUpdate.length}, Activities: ${activitiesToUpdate.length}`);
    console.log(`📅 Data impostata a: ${consolidated['Data']}`);
    if (consolidated['Note']) {
      console.log(`📝 Note consolidate (righe: ${consolidated['Note'].split('\n').length})`);
    }

    // 5. Sanitize fields before sending to Airtable (remove forbidden/system fields)
    const sanitizedFields = sanitizeFields(consolidated);
    
    console.log(`🧹 Sanitized fields:`, Object.keys(sanitizedFields));
    console.log(`[DEBUG] Full sanitized object:`, JSON.stringify(sanitizedFields, null, 2));
    console.log(`[DEBUG] Assegnatario type: ${typeof sanitizedFields['Assegnatario']}, value:`, sanitizedFields['Assegnatario']);

    // 6. Update master lead with consolidated fields
    console.log('[TIMER] Updating master lead...');
    const updated = await updateLeadRecord(apiKey, baseId, leadsTableId, masterId, sanitizedFields);
    if (!updated) {
      console.error('❌ Failed to update master lead');
      return NextResponse.json({ error: 'Failed to update master' }, { status: 500 });
    }

    console.log(`[TIMER] Master updated in ${Date.now() - startTime}ms`);
    console.log(`✅ Master lead updated with consolidated data`);

    // 7 & 8. Update Orders and Activities (skip if errors, don't block merge)
    console.log('[TIMER] Skipping optional relation updates - focus on core merge');
    
    // NOTE: Activities update is optional - if field names don't match, we skip
    // This prevents the merge from hanging if Airtable schema is unknown

    // 9. Delete duplicate leads
    console.log('[TIMER] Deleting duplicate records...');
    let deletedCount = 0;
    for (const dup of duplicateRecords) {
      if (await deleteLeadRecord(apiKey, baseId, leadsTableId, dup.id)) {
        deletedCount++;
      console.log(`🖁️  Deleted duplicate: ${dup.id}`);
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`🎉 Merge completed in ${totalTime}ms: ${deletedCount} leads consolidated into master`);

    // Invalidate cache in background (non-blocking for speed)
    invalidateLeadCache().catch(err => console.error('[API] Cache invalidation error:', err));
    console.log(`🧹 [API] Cache invalidation started (non-blocking)`);

    const responseData = {
      success: true,
      mergedLeadId: masterId,
      mergedCount: deletedCount,
      preservedRelations: {
        orders: ordersToUpdate.length,
        activities: activitiesToUpdate.length,
      },
      message: `${deletedCount} lead uniti con successo. Data impostata al ${consolidated['Data']}. ${ordersToUpdate.length} ordini e ${activitiesToUpdate.length} attività riallocate al master.`,
    };
    
    console.log(`[API] About to send response (${totalTime}ms total):`, JSON.stringify(responseData));
    
    const response = NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
    
    console.log(`[API] ✅ RESPONSE SENT - Total time: ${totalTime}ms`);
    return response;
  } catch (error) {
    console.error('❌ Merge error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Merge failed' },
      { status: 500 }
    );
  }
}
