/**
 * Webflow Form Submission Webhook
 *
 * Receives form submissions from materassidoctorbed.com,
 * deduplicates, normalizes, and creates leads in the CRM.
 *
 * Webflow webhook payload (form_submission trigger):
 * {
 *   "_id": "...",
 *   "displayName": "Multi Step Form",
 *   "data": { "Nome": "...", "Cognome": "...", "Email": "...", ... }
 * }
 *
 * Setup: Webflow → Site Settings → Webhooks → Form submission
 * URL: https://crm.doctorbed.app/api/webhooks/webflow-leads
 */

import { NextRequest, NextResponse } from 'next/server';
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
    const payload = await request.json();

    // Webflow sends { data: { field: value } } for form submissions
    const data = payload.data || payload;

    // Extract fields (Webflow field names from the form)
    const nome = (data['Nome'] || '').trim();
    const cognome = (data['Cognome'] || '').trim();
    const rawName = [nome, cognome].filter(Boolean).join(' ');
    const name = rawName ? toTitleCase(rawName) : 'Lead Sito (senza nome)';

    const rawPhone = (data['Telefono'] || '').trim();
    const phone = rawPhone ? (normalizePhone(rawPhone) || null) : null;

    const email = (data['Email'] || '').trim() || null;

    const rawCity = (data['Città'] || data['Citt'] || data['city'] || '').trim();
    const city = rawCity ? toTitleCase(rawCity) : null;

    // Build needs from form selections
    const scelta = (data['Scelta'] || data['Materasso-scelte'] || data['materasso'] || '').trim();
    const note = (data['Note'] || '').trim();
    const needsParts = [scelta, note].filter(Boolean);
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
