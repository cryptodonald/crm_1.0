/**
 * API Route: Check Lead Duplicates
 * 
 * Finds potential duplicate leads based on similarity threshold.
 * Uses Levenshtein distance for name matching and normalized phone comparison.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLeads } from '@/lib/postgres';

/**
 * STRICT name matching logic:
 * - If input has 1 part (e.g., "Mario"): only match first name exactly (full or close prefix)
 * - If input has 2+ parts (e.g., "Mario Rossi"): both first AND last name must match
 * - First name: must match at least first 6 chars OR be a very close match
 * - Last name: must match at least first 4 chars (stricter than before)
 * Examples:
 *   "Mario Rossi" matches "Mario Rossi" or "Mario Rossi Junior"
 *   "Mario Rossi" does NOT match "Mario" or "Mark Rossi" or "Mario Bianchi"
 *   "Mario" matches "Mario" or "Mariolo" but NOT "Mark" or "Mari"
 */
function isNameMatch(input: string, dbName: string): boolean {
  const inputLower = input.toLowerCase().trim();
  const dbLower = dbName.toLowerCase().trim();
  
  const inputParts = inputLower.split(/\s+/).filter(p => p.length > 0);
  const dbParts = dbLower.split(/\s+/).filter(p => p.length > 0);
  
  // Need at least first name
  if (inputParts.length === 0 || dbParts.length === 0) return false;
  
  const inputFirstName = inputParts[0];
  const dbFirstName = dbParts[0];
  
  // First name: must match at least first 6 chars (stricter)
  const minFirstNameChars = Math.min(6, inputFirstName.length, dbFirstName.length);
  if (inputFirstName.substring(0, minFirstNameChars) !== dbFirstName.substring(0, minFirstNameChars)) {
    return false;
  }
  
  // If input has last name, REQUIRE it to match in database too
  if (inputParts.length > 1) {
    // Database must also have at least 2 parts
    if (dbParts.length < 2) {
      return false; // "Mario Rossi" does NOT match "Mario"
    }
    
    const inputLastName = inputParts[inputParts.length - 1];
    const dbLastName = dbParts[dbParts.length - 1];
    
    // Last name: must match at least first 4 chars (stricter than before: was 3)
    const minLastNameChars = Math.min(4, inputLastName.length, dbLastName.length);
    if (inputLastName.substring(0, minLastNameChars) !== dbLastName.substring(0, minLastNameChars)) {
      return false;
    }
  }
  // If input has only first name, that's OK - we already checked it above
  
  return true;
}

/**
 * Normalize phone number for comparison
 * Handles Italian numbers with/without +39 prefix
 */
function normalizePhone(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  let normalized = phone.replace(/\D/g, '');
  
  // If starts with 39 (Italy code), keep it
  // If doesn't start with 39 and has 9-10 digits, it's likely Italian without prefix
  if (!normalized.startsWith('39') && normalized.length >= 9 && normalized.length <= 10) {
    normalized = '39' + normalized;
  }
  
  return normalized;
}

/**
 * GET /api/leads/check-duplicates
 * 
 * Query params:
 * - threshold: Similarity threshold (0-1, default 0.85)
 * - name: Optional name to check
 * - phone: Optional phone to check
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const threshold = parseFloat(searchParams.get('threshold') || '0.85');
    const nameToCheck = searchParams.get('name');
    const phoneToCheck = searchParams.get('phone');

    // Fetch all leads for comparison
    const { data: leads } = await getLeads({ limit: 5000 });

    // If specific name/phone provided, check only those
    if (nameToCheck || phoneToCheck) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const matches: any[] = [];

      for (const lead of leads) {
        let matchScore = 0;
        const matchTypes: string[] = [];

        // Name matching (strict prefix-based)
        if (nameToCheck && lead.name) {
          if (isNameMatch(nameToCheck, lead.name)) {
            matchScore += 1;
            matchTypes.push('name');
          }
        }

        // Phone matching (exact after normalization)
        if (phoneToCheck && lead.phone) {
          const normalizedInput = normalizePhone(phoneToCheck);
          const normalizedLead = normalizePhone(lead.phone);
          if (normalizedInput === normalizedLead) {
            matchScore += 1;
            matchTypes.push('phone');
          }
        }

        // If at least one field matches, it's a potential duplicate
        if (matchScore > 0) {
          matches.push({
            id: lead.id,
            name: lead.name,
            phone: lead.phone,
            email: lead.email,
            city: lead.city,
            status: lead.status,
            matchScore,
            matchTypes,
          });
        }
      }

      // Sort by match score descending
      matches.sort((a, b) => b.matchScore - a.matchScore);

      return NextResponse.json({
        success: true,
        matches,
        total: matches.length,
      });
    }

    // Find all duplicate groups across entire dataset
    const groups: Array<{
      masterId: string;
      duplicateIds: string[];
      similarity: number;
    }> = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const leadsMap: Record<string, any> = {};
    leads.forEach(lead => {
      leadsMap[lead.id] = lead;
    });

    const processedIds = new Set<string>();

    // Compare each lead with every other lead
    for (let i = 0; i < leads.length; i++) {
      const lead1 = leads[i];
      if (processedIds.has(lead1.id)) continue;

      const duplicates: string[] = [];

      for (let j = i + 1; j < leads.length; j++) {
        const lead2 = leads[j];
        if (processedIds.has(lead2.id)) continue;

        let isDuplicate = false;

        // Name strict prefix check
        if (lead1.name && lead2.name) {
          if (isNameMatch(lead1.name, lead2.name)) {
            isDuplicate = true;
          }
        }

        // Phone exact match check
        if (lead1.phone && lead2.phone) {
          const phone1 = normalizePhone(lead1.phone);
          const phone2 = normalizePhone(lead2.phone);
          if (phone1 === phone2) {
            isDuplicate = true;
          }
        }

        // Email exact match check
        if (lead1.email && lead2.email) {
          if (lead1.email.toLowerCase() === lead2.email.toLowerCase()) {
            isDuplicate = true;
          }
        }

        if (isDuplicate) {
          duplicates.push(lead2.id);
          processedIds.add(lead2.id);
        }
      }

      if (duplicates.length > 0) {
        groups.push({
          masterId: lead1.id,
          duplicateIds: duplicates,
          similarity: threshold,
        });
        processedIds.add(lead1.id);
      }
    }

    return NextResponse.json({
      success: true,
      groups,
      leadsMap,
      total: groups.length,
    });
  } catch (error: unknown) {
    console.error('[API] GET /api/leads/check-duplicates error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check duplicates',
      },
      { status: 500 }
    );
  }
}
