/**
 * Rileva se gli stati sono diversi tra master e duplicati
 * Supporta sia formato Airtable (fields.Stato) che LeadData (Stato)
 */
export function detectStateConflict(masterRecord: any, duplicateRecords: any[]): boolean {
  const masterState = masterRecord.fields?.['Stato'] || masterRecord.Stato;
  
  for (const dup of duplicateRecords) {
    const dupState = dup.fields?.['Stato'] || dup.Stato;
    if (dupState && dupState !== masterState) {
      return true;
    }
  }
  
  return false;
}

/**
 * Rileva se gli assegnatari sono diversi tra master e duplicati
 * Supporta sia formato Airtable (fields.Assegnatario) che LeadData (Assegnatario)
 */
export function detectAssigneeConflict(masterRecord: any, duplicateRecords: any[]): boolean {
  const masterAssignee = masterRecord.fields?.['Assegnatario'] || masterRecord.Assegnatario;
  
  for (const dup of duplicateRecords) {
    const dupAssignee = dup.fields?.['Assegnatario'] || dup.Assegnatario;
    if (dupAssignee && JSON.stringify(dupAssignee) !== JSON.stringify(masterAssignee)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Ottieni lista di stati unici tra master e duplicati
 * Supporta sia formato Airtable che LeadData
 */
export function getUniqueStates(masterRecord: any, duplicateRecords: any[]): string[] {
  const states = new Set<string>();
  
  const masterState = masterRecord.fields?.['Stato'] || masterRecord.Stato;
  if (masterState) states.add(masterState);
  
  for (const dup of duplicateRecords) {
    const dupState = dup.fields?.['Stato'] || dup.Stato;
    if (dupState) states.add(dupState);
  }
  
  return Array.from(states);
}

/**
 * Ottieni lista di assegnatari unici tra master e duplicati
 * Supporta sia formato Airtable che LeadData (arrays)
 */
export function getUniqueAssignees(masterRecord: any, duplicateRecords: any[]): string[] {
  const assignees = new Set<string>();
  
  const masterAssignee = masterRecord.fields?.['Assegnatario'] || masterRecord.Assegnatario;
  if (masterAssignee) {
    if (Array.isArray(masterAssignee)) {
      masterAssignee.forEach(a => assignees.add(String(a)));
    } else {
      assignees.add(String(masterAssignee));
    }
  }
  
  for (const dup of duplicateRecords) {
    const dupAssignee = dup.fields?.['Assegnatario'] || dup.Assegnatario;
    if (dupAssignee) {
      if (Array.isArray(dupAssignee)) {
        dupAssignee.forEach(a => assignees.add(String(a)));
      } else {
        assignees.add(String(dupAssignee));
      }
    }
  }
  
  return Array.from(assignees);
}

/**
 * Merge degli allegati: prendi dal master e aggiungi tutti i duplicati non presenti
 */
export function mergeAttachments(masterRecord: any, duplicateRecords: any[]): any[] {
  const merged: any[] = [];
  const seenUrls = new Set<string>();
  
  // Aggiungi allegati del master
  const masterAttachments = masterRecord.fields?.['Allegati'] || [];
  
  // Valida che masterAttachments sia effettivamente un array
  if (!Array.isArray(masterAttachments)) {
    console.warn(`[MERGE] Warning: masterAttachments is not an array, type: ${typeof masterAttachments}, value:`, masterAttachments);
  } else {
    for (const attachment of masterAttachments) {
      // Skip if attachment is not an object (e.g., malformed string)
      if (!attachment || typeof attachment !== 'object') {
        console.warn(`[MERGE] Skipping invalid attachment:`, attachment);
        continue;
      }
      const url = attachment.url || attachment.id;
      if (url && !seenUrls.has(url)) {
        merged.push(attachment);
        seenUrls.add(url);
      }
    }
  }
  
  // Aggiungi allegati dai duplicati (senza duplicati)
  for (const dup of duplicateRecords) {
    const dupAttachments = dup.fields?.['Allegati'] || [];
    
    if (!Array.isArray(dupAttachments)) {
      console.warn(`[MERGE] Warning: dupAttachments is not an array for ${dup.id}`);
      continue;
    }
    
    for (const attachment of dupAttachments) {
      if (!attachment || typeof attachment !== 'object') {
        console.warn(`[MERGE] Skipping invalid duplicate attachment:`, attachment);
        continue;
      }
      const url = attachment.url || attachment.id;
      if (url && !seenUrls.has(url)) {
        merged.push(attachment);
        seenUrls.add(url);
      }
    }
  }
  
  console.log(`[MERGE] mergeAttachments result: ${merged.length} valid attachments`);
  return merged;
}

/**
 * Ottieni informazioni sugli allegati per mostrare anteprima
 */
export function getAttachmentsPreview(masterRecord: any, duplicateRecords: any[]): {
  masterCount: number;
  duplicateCount: number;
  totalCount: number;
  merged: any[];
} {
  const masterAttachments = masterRecord.fields?.['Allegati'] || [];
  let duplicateCount = 0;
  
  for (const dup of duplicateRecords) {
    const dupAttachments = dup.fields?.['Allegati'] || [];
    duplicateCount += dupAttachments.length;
  }
  
  const merged = mergeAttachments(masterRecord, duplicateRecords);
  
  return {
    masterCount: masterAttachments.length,
    duplicateCount,
    totalCount: merged.length,
    merged,
  };
}

/**
 * Valida le scelte dell'utente
 */
export function validateMergeChoices(
  selectedState: string | undefined,
  masterState: string | undefined,
  duplicateStates: string[]
): { valid: boolean; error?: string } {
  // Se l'utente ha scelto uno stato, verifica che sia valido
  if (selectedState) {
    const validStates = [masterState, ...duplicateStates];
    if (!validStates.includes(selectedState)) {
      return {
        valid: false,
        error: `Stato selezionato "${selectedState}" non valido`,
      };
    }
  }
  
  return { valid: true };
}
