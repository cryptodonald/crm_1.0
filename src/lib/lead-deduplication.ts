import { LeadData } from '@/types/leads';

/**
 * Levenshtein distance algorithm for fuzzy string matching
 * Returns a value between 0 and 1 (higher = more similar)
 */
function levenshteinSimilarity(str1: string, str2: string): number {
  const a = str1.toLowerCase().trim();
  const b = str2.toLowerCase().trim();

  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const matrix: number[][] = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  const distance = matrix[b.length][a.length];
  const maxLen = Math.max(a.length, b.length);
  return 1 - distance / maxLen;
}

/**
 * Normalize string for comparison
 */
function normalizeString(str: string | undefined): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, ''); // Remove all spaces
}

/**
 * Normalize phone number for comparison
 */
function normalizePhone(phone: string | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '').slice(-10); // Keep only last 10 digits
}

export interface DuplicateGroup {
  masterId: string;
  duplicateIds: string[];
  similarity: number;
}

/**
 * Detect duplicate leads with OR logic:
 * - Same phone (any name)
 * - Same name (any phone)
 * - Similar name (fuzzy match >85%)
 */
export function detectDuplicates(
  leads: LeadData[],
  threshold: number = 0.85,
  exactOnly: boolean = false
): DuplicateGroup[] {
  const allMatches = new Map<string, Set<string>>();

  // Build full match graph - every lead checked against every other lead
  for (let i = 0; i < leads.length; i++) {
    for (let j = i + 1; j < leads.length; j++) {
      const master = leads[i];
      const candidate = leads[j];

      const masterPhone = normalizePhone(master.Telefono);
      const normalizedMasterName = normalizeString(master.Nome);
      const candidatePhone = normalizePhone(candidate.Telefono);
      const normalizedCandidateName = normalizeString(candidate.Nome);

      let similarity = 0;

      if (exactOnly) {
        // Exact match only: same name AND same phone
        if (
          normalizedMasterName === normalizedCandidateName &&
          masterPhone &&
          candidatePhone &&
          masterPhone === candidatePhone
        ) {
          similarity = 1.0;
        }
      } else {
        // Fuzzy matching with OR logic:

        // 1. SAME PHONE (highest priority) - any name is a duplicate
        if (
          masterPhone &&
          candidatePhone &&
          masterPhone === candidatePhone &&
          masterPhone.length > 0
        ) {
          similarity = 0.95; // High confidence: same phone number
        }
        // 2. SAME NAME (high priority) - any phone is a duplicate
        else if (normalizedMasterName === normalizedCandidateName && normalizedMasterName.length > 0) {
          similarity = 0.90; // High confidence: exact name match
        }
        // 3. SIMILAR NAME (fuzzy match) with phone validation
        else {
          const nameSimilarity = levenshteinSimilarity(
            normalizedMasterName,
            normalizedCandidateName
          );

          if (nameSimilarity >= threshold) {
            // Both names similar AND phones match
            if (
              masterPhone &&
              candidatePhone &&
              masterPhone === candidatePhone &&
              masterPhone.length > 0
            ) {
              similarity = Math.max(nameSimilarity, 0.95);
            }
            // Both names similar but phones different (or missing)
            else {
              similarity = nameSimilarity * 0.85; // Slightly lower without phone confirmation
            }
          }
        }
      }

      // If match found, add to bidirectional graph
      if (similarity >= threshold) {
        if (!allMatches.has(master.id)) allMatches.set(master.id, new Set());
        if (!allMatches.has(candidate.id)) allMatches.set(candidate.id, new Set());
        allMatches.get(master.id)!.add(candidate.id);
        allMatches.get(candidate.id)!.add(master.id);
      }
    }
  }

  // Build connected components (transitive closure)
  const visited = new Set<string>();
  const groups: DuplicateGroup[] = [];

  for (const leadId of allMatches.keys()) {
    if (visited.has(leadId)) continue;

    // BFS to find all connected duplicates
    const component = new Set<string>();
    const queue = [leadId];
    component.add(leadId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const matches = allMatches.get(current);

      if (matches) {
        for (const matchId of matches) {
          if (!component.has(matchId)) {
            component.add(matchId);
            queue.push(matchId);
          }
        }
      }
    }

    // Mark all as visited
    for (const id of component) {
      visited.add(id);
    }

    // Create group with first as master
    if (component.size > 1) {
      const sortedIds = Array.from(component).sort();
      const masterId = sortedIds[0];
      const duplicateIds = sortedIds.slice(1);

      // Calculate max similarity in this group
      let maxSimilarity = 0;
      for (const dupId of duplicateIds) {
        const matchesMaster = allMatches.get(masterId)?.has(dupId) ? 0.95 : 0.85;
        maxSimilarity = Math.max(maxSimilarity, matchesMaster);
      }

      groups.push({
        masterId,
        duplicateIds,
        similarity: maxSimilarity,
      });
    }
  }

  return groups;
}

/**
 * Get duplicate groups for a single lead
 */
export function getDuplicatesForLead(
  leadId: string,
  allLeads: LeadData[],
  threshold: number = 0.85
): LeadData[] {
  const lead = allLeads.find(l => l.id === leadId);
  if (!lead) return [];

  const groups = detectDuplicates(allLeads, threshold);
  const group = groups.find(
    g => g.masterId === leadId || g.duplicateIds.includes(leadId)
  );

  if (!group) return [];

  const dupeIds = group.masterId === leadId ? group.duplicateIds : [group.masterId, ...group.duplicateIds].filter(id => id !== leadId);
  return dupeIds.map(id => allLeads.find(l => l.id === id)!).filter(Boolean);
}
