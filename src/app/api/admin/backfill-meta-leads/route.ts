/**
 * TEMPORARY ENDPOINT - Backfill Meta Lead Ads
 * 
 * Fetches ALL leads from Meta Graph API for the Doctorbed form,
 * deduplicates against existing CRM leads, and imports new ones.
 * 
 * DELETE THIS FILE after backfill is complete.
 * 
 * Usage: POST /api/admin/backfill-meta-leads
 * Header: x-admin-key: <META_APP_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  mapMetaFieldsToLead,
  type MetaLeadData,
} from '@/lib/meta-leads';
import { createLead, queryOne, query } from '@/lib/postgres';
import type { Lead, LeadCreateInput } from '@/types/database';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;
const FORM_ID = '1003102475081340'; // Modulo - Consulenza Doctorbed New

interface BackfillResult {
  created: Array<{ name: string; phone: string | null; city: string | null }>;
  skipped_duplicate: Array<{ name: string; reason: string }>;
  skipped_test: string[];
  updated: Array<{ name: string; fields: string[] }>;
  errors: Array<{ leadgen_id: string; error: string }>;
}

/**
 * Check duplicate by normalized phone OR exact name match.
 * More aggressive than webhook check to avoid any duplicates.
 */
async function findExistingLead(
  name: string,
  phone: string | null,
  city: string | null
): Promise<Lead | null> {
  // 1. Check by phone (most reliable)
  if (phone) {
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
    const byPhone = await queryOne<Lead>(
      `SELECT * FROM leads 
       WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') = $1
       LIMIT 1`,
      [normalizedPhone]
    );
    if (byPhone) return byPhone;
  }

  // 2. Check by name + city (fallback)
  if (name && city) {
    const byNameCity = await queryOne<Lead>(
      `SELECT * FROM leads 
       WHERE LOWER(name) = LOWER($1) AND LOWER(city) = LOWER($2)
       LIMIT 1`,
      [name, city]
    );
    if (byNameCity) return byNameCity;
  }

  // 3. Check by name only (last resort)
  if (name && name !== 'Lead Meta (senza nome)') {
    const byName = await queryOne<Lead>(
      `SELECT * FROM leads 
       WHERE LOWER(name) = LOWER($1)
       LIMIT 1`,
      [name]
    );
    if (byName) return byName;
  }

  return null;
}

/**
 * Fetch all leads from a Meta form, paginating through results.
 */
async function fetchAllFormLeads(
  pageAccessToken: string
): Promise<MetaLeadData[]> {
  const allLeads: MetaLeadData[] = [];
  let url: string | null =
    `${GRAPH_API_BASE}/${FORM_ID}/leads?fields=id,created_time,field_data,platform&limit=25&access_token=${pageAccessToken}`;

  while (url) {
    const res: Response = await fetch(url);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Graph API error: ${err}`);
    }
    const data: { data?: MetaLeadData[]; paging?: { next?: string } } = await res.json();
    allLeads.push(...(data.data || []));
    url = data.paging?.next || null;
  }

  return allLeads;
}

export async function POST(request: NextRequest) {
  // Simple auth: require META_APP_SECRET as admin key
  const adminKey = request.headers.get('x-admin-key');
  const appSecret = process.env.META_APP_SECRET;
  if (!adminKey || adminKey !== appSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
  if (!pageAccessToken) {
    return NextResponse.json({ error: 'META_PAGE_ACCESS_TOKEN not configured' }, { status: 500 });
  }

  const sourceId = process.env.META_SOURCE_ID || null;
  const result: BackfillResult = {
    created: [],
    skipped_duplicate: [],
    skipped_test: [],
    updated: [],
    errors: [],
  };

  try {
    console.log('[Backfill] Fetching all leads from Meta form...');
    const allMetaLeads = await fetchAllFormLeads(pageAccessToken);
    console.log(`[Backfill] Found ${allMetaLeads.length} leads from Meta`);

    // Process oldest first (chronological order)
    allMetaLeads.reverse();

    for (const metaLead of allMetaLeads) {
      try {
        // Skip test leads
        const isTest = metaLead.field_data?.some(
          (f) => f.values?.[0]?.startsWith('<test lead:')
        );
        if (isTest) {
          result.skipped_test.push(metaLead.id);
          continue;
        }

        // Quick field extraction for duplicate check (NO AI call)
        const fields = new Map<string, string>();
        for (const f of metaLead.field_data) {
          const v = f.values?.[0]?.trim();
          if (v) fields.set(f.name.toLowerCase(), v);
        }
        const quickName = fields.get('nome_e_cognome') || fields.get('full_name') || 'Lead Meta';
        const quickPhone = fields.get('numero_di_telefono') || fields.get('phone_number') || null;
        const quickCity = fields.get('città') || fields.get('city') || null;

        // Check for duplicate BEFORE AI rewrite
        const existing = await findExistingLead(quickName, quickPhone, quickCity);
        
        if (existing) {
          result.skipped_duplicate.push({
            name: quickName,
            reason: `matches: ${existing.name} (${existing.phone || existing.id})`,
          });
          continue;
        }

        // Not a duplicate → full mapping with AI rewrite for needs
        const mapped = await mapMetaFieldsToLead(metaLead, sourceId);

        const input: LeadCreateInput = {
          name: mapped.name,
          email: mapped.email ?? undefined,
          phone: mapped.phone ?? undefined,
          city: mapped.city ?? undefined,
          address: mapped.address ?? undefined,
          postal_code: mapped.postal_code ?? undefined,
          needs: mapped.needs ?? undefined,
          gender: mapped.gender ?? undefined,
          source_id: mapped.source_id ?? undefined,
          status: mapped.status,
        };

        await createLead(input);
        result.created.push({
          name: mapped.name,
          phone: mapped.phone,
          city: mapped.city,
        });

        console.log(`[Backfill] Created: ${mapped.name} (${mapped.phone || 'no phone'})`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push({ leadgen_id: metaLead.id, error: message });
        console.error(`[Backfill] Error for ${metaLead.id}:`, message);
      }
    }

    console.log(
      `[Backfill] Done: ${result.created.length} created, ` +
      `${result.skipped_duplicate.length} duplicates, ` +
      `${result.updated.length} updated, ` +
      `${result.skipped_test.length} test, ` +
      `${result.errors.length} errors`
    );

    return NextResponse.json({
      success: true,
      total_from_meta: allMetaLeads.length,
      summary: {
        created: result.created.length,
        skipped_duplicate: result.skipped_duplicate.length,
        skipped_test: result.skipped_test.length,
        updated: result.updated.length,
        errors: result.errors.length,
      },
      details: result,
    });
  } catch (error) {
    console.error('[Backfill] Fatal error:', error);
    return NextResponse.json(
      { error: 'Backfill failed', details: String(error) },
      { status: 500 }
    );
  }
}
