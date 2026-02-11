/**
 * Meta Lead Ads Integration
 * 
 * Helper functions for receiving and processing leads
 * from Facebook/Instagram Lead Ads via webhooks.
 * 
 * Flow:
 * 1. Meta sends webhook with leadgen_id
 * 2. We fetch lead data from Graph API
 * 3. Map Meta fields → CRM schema
 * 4. Check for duplicates
 * 5. Create lead in Postgres
 */

import crypto from 'crypto';
import { queryOne } from './postgres';
import type { Lead } from '@/types/database';

// ============================================================================
// Types
// ============================================================================

export interface MetaWebhookEntry {
  id: string;
  time: number;
  changes: MetaWebhookChange[];
}

export interface MetaWebhookChange {
  field: string;
  value: {
    leadgen_id: string;
    page_id: string;
    form_id: string;
    created_time: number;
    ad_id?: string;
    adgroup_id?: string;
  };
}

export interface MetaLeadData {
  id: string;
  created_time: string;
  field_data: Array<{
    name: string;
    values: string[];
  }>;
  ad_id?: string;
  form_id?: string;
}

export interface MappedLead {
  name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  postal_code: number | null;
  needs: string | null;
  gender: string | null;
  source_id: string | null;
  status: 'Nuovo';
}

// ============================================================================
// Webhook Signature Verification
// ============================================================================

/**
 * Verify Meta webhook signature (HMAC-SHA256).
 * Meta signs every webhook payload with your App Secret.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  appSecret: string
): boolean {
  if (!signature) return false;

  // Meta sends signature as "sha256=<hex>"
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody, 'utf8')
    .digest('hex');

  const providedSignature = signature.replace('sha256=', '');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(providedSignature, 'hex')
  );
}

// ============================================================================
// Graph API: Fetch Lead Data
// ============================================================================

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Fetch lead data from Meta Graph API using leadgen_id.
 * Returns the full lead object with field_data.
 */
export async function fetchLeadData(
  leadgenId: string,
  pageAccessToken: string
): Promise<MetaLeadData> {
  const url = `${GRAPH_API_BASE}/${leadgenId}?access_token=${pageAccessToken}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `Graph API error (${response.status}): ${errorBody}`
    );
  }

  return response.json();
}

// ============================================================================
// Normalization Helpers
// ============================================================================

/** Title Case: "mario rossi" → "Mario Rossi" */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/(?:^|\s|')\S/g, (ch) => ch.toUpperCase());
}

/**
 * Normalize Italian phone numbers.
 * - Strip non-digit chars (keep leading +)
 * - 0039 → +39
 * - Bare 3xx/0x → prepend +39
 * - Format: +39 XXX XXX XXXX
 */
function normalizePhone(raw: string): string {
  let phone = raw.replace(/[^\d+]/g, '');

  if (phone.startsWith('0039')) {
    phone = '+39' + phone.slice(4);
  }
  if (/^[03]/.test(phone) && !phone.startsWith('+')) {
    phone = '+39' + phone;
  }
  if (phone.startsWith('+39') && phone.length >= 12) {
    const local = phone.slice(3);
    return `+39 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  return phone;
}

// ============================================================================
// Field Mapping: Meta → CRM
// ============================================================================

// Standard fields (already mapped to specific CRM columns — skip for needs)
const STANDARD_FIELD_KEYS = new Set([
  'full_name', 'nome_e_cognome', 'nome', 'first_name', 'last_name',
  'email', 'phone_number', 'numero_di_telefono', 'telefono',
  'city', 'città', 'citta',
  'street_address', 'indirizzo',
  'zip_code', 'post_code', 'cap', 'postal_code',
  'gender', 'sesso',
]);

/**
 * Map Meta Lead Ads field_data to CRM lead schema.
 * 
 * Modulo "Consulenza Doctorbed New" fields:
 *  - nome_e_cognome (FULL_NAME)
 *  - numero_di_telefono (PHONE)
 *  - città (CITY)
 *  - cosa_stai_cercando? (CUSTOM → needs)
 *  - qual_è_la_tua_esigenza_principale? (CUSTOM → needs)
 *  - che_posizione_assumi_prevalentemente_quando_dormi? (CUSTOM → needs)
 *  - che_livello_di_rigidità_preferisci? (CUSTOM → needs)
 *
 * All non-standard (custom) fields are concatenated into `needs`.
 */
export function mapMetaFieldsToLead(
  metaData: MetaLeadData,
  sourceId: string | null
): MappedLead {
  const fields = new Map<string, string>();

  // Flatten field_data into a simple key-value map
  for (const field of metaData.field_data) {
    const value = field.values?.[0]?.trim();
    if (value) {
      fields.set(field.name.toLowerCase(), value);
    }
  }

  // ── Name (Title Case) ──────────────────────────────────────────────
  const rawName = fields.get('full_name')
    || fields.get('nome_e_cognome')
    || fields.get('nome')
    || [fields.get('first_name'), fields.get('last_name')]
        .filter(Boolean)
        .join(' ')
    || 'Lead Meta (senza nome)';
  const fullName = rawName.startsWith('<test lead:') ? rawName : toTitleCase(rawName);

  // ── Phone (normalized Italian) ─────────────────────────────────────
  const rawPhone = fields.get('phone_number')
    || fields.get('numero_di_telefono')
    || fields.get('telefono')
    || null;
  const phone = rawPhone ? normalizePhone(rawPhone) : null;

  // ── City (Title Case) ──────────────────────────────────────────────
  const rawCity = fields.get('city')
    || fields.get('città')
    || fields.get('citta')
    || null;
  const city = rawCity && !rawCity.startsWith('<test lead:') ? toTitleCase(rawCity) : rawCity;

  // ── Postal Code ────────────────────────────────────────────────────
  const postalCodeRaw = fields.get('zip_code')
    || fields.get('post_code')
    || fields.get('cap')
    || fields.get('postal_code');
  const postalCode = postalCodeRaw ? parseInt(postalCodeRaw, 10) : null;

  // ── Needs: all custom fields → concatenated ────────────────────────
  // Labels for human-readable output
  const CUSTOM_LABELS: Record<string, string> = {
    'cosa_stai_cercando?': 'Cerca',
    'qual_è_la_tua_esigenza_principale?': 'Esigenza',
    'che_posizione_assumi_prevalentemente_quando_dormi?': 'Posizione',
    'che_livello_di_rigidità_preferisci?': 'Rigidità',
  };

  const needsParts: string[] = [];
  for (const [key, value] of fields.entries()) {
    if (STANDARD_FIELD_KEYS.has(key)) continue;
    // Skip test lead dummy data
    if (value.startsWith('<test lead:')) continue;

    const label = CUSTOM_LABELS[key];
    needsParts.push(label ? `${label}: ${value}` : value);
  }
  const needs = needsParts.length > 0 ? needsParts.join(' | ') : null;

  return {
    name: fullName,
    email: fields.get('email') || null,
    phone,
    city,
    address: fields.get('street_address') || fields.get('indirizzo') || null,
    postal_code: postalCode && !isNaN(postalCode) ? postalCode : null,
    needs,
    gender: fields.get('gender') || fields.get('sesso') || null,
    source_id: sourceId,
    status: 'Nuovo',
  };
}

// ============================================================================
// Duplicate Check
// ============================================================================

/**
 * Check if a lead with the same email or phone already exists.
 * Returns the existing lead if found, null otherwise.
 */
export async function checkDuplicate(
  email: string | null,
  phone: string | null
): Promise<Lead | null> {
  if (!email && !phone) return null;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (email) {
    conditions.push(`LOWER(email) = LOWER($${paramIndex})`);
    params.push(email);
    paramIndex++;
  }

  if (phone) {
    // Normalize phone: remove spaces, dashes, parentheses
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
    conditions.push(`REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') = $${paramIndex}`);
    params.push(normalizedPhone);
    paramIndex++;
  }

  const sql = `
    SELECT * FROM leads
    WHERE ${conditions.join(' OR ')}
    LIMIT 1
  `;

  return queryOne<Lead>(sql, params);
}
