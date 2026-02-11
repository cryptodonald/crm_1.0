/**
 * Webflow Form Submission Webhook
 *
 * Receives form submissions from materassidoctorbed.com,
 * deduplicates, normalizes, and creates leads in the CRM.
 *
 * Webflow V2 webhook payload (form_submission trigger):
 * {
 *   "triggerType": "form_submission",
 *   "payload": {
 *     "name": "Multi Step Form",
 *     "siteId": "...",
 *     "data": { "Nome": "...", "Cognome": "...", "Email": "...", ... },
 *     "submittedAt": "...",
 *     "formId": "..."
 *   }
 * }
 *
 * Signature: HMAC-SHA256 of "timestamp:body" using webhook secret.
 * Headers: x-webflow-timestamp, x-webflow-signature
 *
 * Setup: Webflow → Site Settings → Webhooks → Form submission
 * URL: https://crm.doctorbed.app/api/webhooks/webflow-leads
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createLead, queryOne } from '@/lib/postgres';
import type { Lead, LeadCreateInput } from '@/types/database';
import { Resend } from 'resend';

const SITO_SOURCE_ID = 'bb9111b7-d513-4388-8b3c-4bc86967828b';

// ============================================================================
// Normalization
// ============================================================================

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/(?:^|\s|')\S/g, (ch) => ch.toUpperCase());
}

function normalizePhone(raw: string): string {
  let phone = raw.replace(/[^\d+]/g, '');
  if (phone.startsWith('0039')) phone = '+39' + phone.slice(4);
  if (/^[03]/.test(phone) && !phone.startsWith('+')) phone = '+39' + phone;
  return phone;
}

/** Case-insensitive field lookup — tries exact match first, then lowercased */
function getField(data: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null) return String(data[key]).trim();
  }
  const entries = Object.entries(data);
  for (const key of keys) {
    const lc = key.toLowerCase();
    const found = entries.find(([k]) => k.toLowerCase() === lc);
    if (found && found[1] !== undefined && found[1] !== null) return String(found[1]).trim();
  }
  return '';
}

// ============================================================================
// Duplicate Check
// ============================================================================

async function findExistingLead(
  phone: string | null,
  email: string | null,
  name: string | null,
  city: string | null
): Promise<Lead | null> {
  if (phone) {
    const norm = phone.replace(/[\s\-\(\)]/g, '');
    const r = await queryOne<Lead>(
      `SELECT * FROM leads WHERE REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', '') = $1 LIMIT 1`,
      [norm]
    );
    if (r) return r;
  }
  if (email) {
    const r = await queryOne<Lead>(
      `SELECT * FROM leads WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email]
    );
    if (r) return r;
  }
  if (name && city) {
    const r = await queryOne<Lead>(
      `SELECT * FROM leads WHERE LOWER(name) = LOWER($1) AND LOWER(city) = LOWER($2) LIMIT 1`,
      [name, city]
    );
    if (r) return r;
  }
  return null;
}

// ============================================================================
// POST /api/webhooks/webflow-leads
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Verify Webflow signature (HMAC-SHA256 of "timestamp:body")
    const rawBody = await request.text();
    const secret = process.env.WEBFLOW_WEBHOOK_SECRET;
    const signature = request.headers.get('x-webflow-signature');
    const timestamp = request.headers.get('x-webflow-timestamp');

    // TODO: Re-enable signature verification after confirming payload structure
    if (secret && signature && timestamp) {
      const signedPayload = `${timestamp}:${rawBody}`;
      const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
      const sigMatch = signature === expected;
      console.log('[Webflow Webhook] Signature check:', { sigMatch, signature: signature?.slice(0, 12) + '...', expected: expected.slice(0, 12) + '...' });
      // Don't reject for now — just log
    } else {
      console.log('[Webflow Webhook] Signature headers:', { hasSecret: !!secret, hasSignature: !!signature, hasTimestamp: !!timestamp });
    }

    const payload = JSON.parse(rawBody);
    console.log('[Webflow Webhook] Full payload:', JSON.stringify(payload));

    // DEBUG: email the raw payload so we can see exact structure
    try {
      const debugKey = process.env.RESEND_API_KEY;
      const debugEmail = process.env.NOTIFY_EMAIL;
      if (debugKey && debugEmail) {
        const r = new Resend(debugKey);
        await r.emails.send({
          from: 'Doctorbed CRM <noreply@crm.doctorbed.app>',
          to: debugEmail,
          subject: '[DEBUG] Webflow raw payload',
          html: `<pre style="font-size:12px;white-space:pre-wrap;">${JSON.stringify(payload, null, 2).replace(/</g, '&lt;')}</pre>`,
        });
      }
    } catch (_) { /* ignore */ }

    // Webflow V2: { triggerType, payload: { name, siteId, data: {...} } }
    const formData: Record<string, unknown> =
      (payload.payload?.data as Record<string, unknown>)
      || (payload.data as Record<string, unknown>)
      || payload;

    console.log('[Webflow Webhook] Form data keys:', Object.keys(formData));

    // Extract fields (case-insensitive, tries multiple possible names)
    const nome = getField(formData, 'Nome', 'nome', 'name', 'First Name');
    const cognome = getField(formData, 'Cognome', 'cognome', 'Last Name');
    const rawName = [nome, cognome].filter(Boolean).join(' ');
    const name = rawName ? toTitleCase(rawName) : 'Lead Sito (senza nome)';

    const rawPhone = getField(formData, 'Telefono', 'telefono', 'Phone', 'Phone Number');
    const phone = rawPhone ? (normalizePhone(rawPhone) || null) : null;

    const email = getField(formData, 'Email', 'email') || null;

    const rawCity = getField(formData, 'Città', 'Citt', 'city', 'Citta', 'città');
    const city = rawCity ? toTitleCase(rawCity) : null;

    // Build needs from form selections + notes
    const scelta = getField(formData, 'Scelta', 'scelta', 'Materasso-scelte', 'materasso');
    const materasso = getField(formData, 'materasso', 'Materasso-scelte', 'Materasso');
    const note = getField(formData, 'Note', 'note', 'notes', 'Messaggio');
    const needsParts = [...new Set([scelta, materasso, note].filter(Boolean))];
    const needs = needsParts.length > 0 ? needsParts.join(' — ') : null;

    // Check for duplicates
    const existing = await findExistingLead(phone, email, name, city);
    if (existing) {
      console.log(`[Webflow Webhook] Duplicate: ${name} (${existing.phone || existing.email || existing.id})`);
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }

    // Create lead
    const input: LeadCreateInput = {
      name,
      phone: phone ?? undefined,
      email: email ?? undefined,
      city: city ?? undefined,
      needs: needs ?? undefined,
      source_id: SITO_SOURCE_ID,
      status: 'Nuovo',
    };

    const lead = await createLead(input);
    console.log(`[Webflow Webhook] Lead created: ${lead.id} - ${name}`);

    // Send email notification
    try {
      await sendNotification({ name, phone, email, city, needs });
      console.log('[Webflow Webhook] Email notification sent');
    } catch (emailErr) {
      console.error('[Webflow Webhook] Email failed:', emailErr);
    }

    return NextResponse.json({ received: true, created: true, id: lead.id }, { status: 200 });
  } catch (error) {
    console.error('[Webflow Webhook] Error:', error);
    return NextResponse.json({ received: true, error: 'Processing error' }, { status: 200 });
  }
}

// ============================================================================
// Email Notification
// ============================================================================

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

interface NotifLead {
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  needs: string | null;
}

async function sendNotification(lead: NotifLead): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const notifyEmail = process.env.NOTIFY_EMAIL;
  if (!apiKey || !notifyEmail) return;

  const resend = new Resend(apiKey);
  const now = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
  const name = esc(lead.name);

  const row = (label: string, value: string) =>
    `<tr>
      <td style="padding: 10px 12px; color: #888; font-size: 13px; width: 100px;">${label}</td>
      <td style="padding: 10px 12px; color: #1a1a1a; font-size: 14px;">${value}</td>
    </tr>`;

  const rows = [
    row('Nome', `<strong>${name}</strong>`),
    lead.phone ? row('Telefono', `<a href="tel:${esc(lead.phone)}" style="color: #2563eb; text-decoration: none;">${esc(lead.phone)}</a>`) : '',
    lead.email ? row('Email', `<a href="mailto:${esc(lead.email)}" style="color: #2563eb; text-decoration: none;">${esc(lead.email)}</a>`) : '',
    lead.city ? row('Città', esc(lead.city)) : '',
    lead.needs ? row('Richiesta', `<em>${esc(lead.needs)}</em>`) : '',
  ].filter(Boolean).join('');

  await resend.emails.send({
    from: 'Doctorbed CRM <noreply@crm.doctorbed.app>',
    to: notifyEmail,
    subject: `Nuovo lead dal sito web - ${lead.name}`,
    html: `
      <div style="font-family: -apple-system, Arial, sans-serif; max-width: 520px; margin: 0 auto;">
        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
          <h2 style="color: #1a1a1a; margin: 0 0 4px 0; font-size: 18px;">Nuovo lead dal sito web</h2>
          <p style="color: #888; margin: 0; font-size: 13px;">materassidoctorbed.com &middot; ${now}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;">
          ${rows}
        </table>
        <p style="color: #bbb; font-size: 11px; margin-top: 16px; text-align: center;">Doctorbed CRM &middot; crm.doctorbed.app</p>
      </div>
    `,
  });
}
