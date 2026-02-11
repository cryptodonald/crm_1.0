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
// Field Mapping: Meta → CRM
// ============================================================================

/**
 * Map Meta Lead Ads field_data to CRM lead schema.
 * 
 * Common Meta field names:
 * - full_name, first_name, last_name
 * - email
 * - phone_number
 * - city
 * - street_address
 * - zip_code / post_code
 * - Custom fields (depend on form configuration)
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

  // Build name from available fields
  const fullName = fields.get('full_name') 
    || fields.get('nome_e_cognome')
    || fields.get('nome')
    || [fields.get('first_name'), fields.get('last_name')]
        .filter(Boolean)
        .join(' ')
    || 'Lead Meta (senza nome)';

  // Parse postal code as integer
  const postalCodeRaw = fields.get('zip_code') 
    || fields.get('post_code') 
    || fields.get('cap')
    || fields.get('postal_code');
  const postalCode = postalCodeRaw ? parseInt(postalCodeRaw, 10) : null;

  return {
    name: fullName,
    email: fields.get('email') || null,
    phone: fields.get('phone_number') || fields.get('telefono') || null,
    city: fields.get('city') || fields.get('città') || fields.get('citta') || null,
    address: fields.get('street_address') || fields.get('indirizzo') || null,
    postal_code: postalCode && !isNaN(postalCode) ? postalCode : null,
    needs: fields.get('needs') || fields.get('esigenze') || fields.get('messaggio') || fields.get('note') || null,
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
