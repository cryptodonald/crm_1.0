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
import { attributeLead } from '@/lib/seo-ads/attribution';
import { createLeadAttribution } from '@/lib/seo-ads/queries';

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

// AI rewrite (OpenRouter) similar to Meta leads
async function aiRewriteNeeds(custom: Record<string, string>): Promise<string> {
  // Fallback concatenation
  const fallback = Object.values(custom).filter(Boolean).join(' — ');
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return fallback;

  const bullet = Object.entries(custom)
    .filter(([, v]) => v && v.trim().length > 0)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  try {
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://crm.doctorbed.app',
        'X-Title': 'CRM Doctorbed - AI Rewrite',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        max_tokens: 150,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              'Sei un assistente CRM. Riscrivi le risposte del modulo in UNA sola frase in italiano. '
              + 'Usa solo le informazioni fornite. Non inventare. Terza persona: "Il cliente...".',
          },
          {
            role: 'user',
            content: `Dati modulo Webflow (interesse/motivo/opzioni/note):\n${bullet}`,
          },
        ],
      }),
    });

    if (!resp.ok) return fallback;
    const data = await resp.json();
    return data.choices?.[0]?.message?.content?.trim() || fallback;
  } catch {
    return fallback;
  }
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

if (secret && signature && timestamp) {
  const signedPayload = `${timestamp}:${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  try {
    const valid = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  const age = Date.now() - Number(timestamp);
  if (age > 300_000) {
    return NextResponse.json({ error: 'Request expired' }, { status: 401 });
  }
} else if (process.env.NODE_ENV === 'production') {
  return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 });
}

const payload = JSON.parse(rawBody);

// Webflow V2: { triggerType, payload: { name, siteId, data: {...} } }
    const formData: Record<string, unknown> =
      (payload.payload?.data as Record<string, unknown>)
      || (payload.data as Record<string, unknown>)
      || payload;

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

// Build needs from form selections + notes (then AI rewrite)
const scelta = getField(formData, 'Scelta', 'scelta'); // cosa è interessato
const motivo = getField(formData, 'materasso', 'Motivo', 'motivo'); // motivo
const motorizzato = getField(formData, 'motorizzato');
const topper = getField(formData, 'topper');
const note = getField(formData, 'Note', 'note', 'notes', 'Messaggio');

let needs: string | null = null;
const custom: Record<string, string> = {};
if (scelta) custom['interesse'] = scelta;
if (motivo) custom['motivo'] = motivo;
if (motorizzato) custom['motorizzato'] = motorizzato;
if (topper) custom['topper'] = topper;
if (note) custom['note'] = note;

if (Object.keys(custom).length > 0) {
  needs = await aiRewriteNeeds(custom);
}

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

    // 6. Automatic SEO/Ads attribution (UTM + GCLID from hidden form fields)
    try {
      const gclid = getField(formData, 'gclid', 'GCLID') || undefined;
      const utmSource = getField(formData, 'utm_source', 'UTM_Source', 'utmSource') || undefined;
      const utmMedium = getField(formData, 'utm_medium', 'UTM_Medium', 'utmMedium') || undefined;
      const utmCampaign = getField(formData, 'utm_campaign', 'UTM_Campaign', 'utmCampaign') || undefined;
      const utmKeyword = getField(formData, 'utm_keyword', 'UTM_Keyword', 'utmKeyword') || undefined;
      const landingPage = getField(formData, 'landing_page', 'page_url', 'pageUrl') || undefined;

      if (gclid || utmSource || utmKeyword || landingPage) {
        const attribution = await attributeLead({
          gclid,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          utm_keyword: utmKeyword,
          landing_page_url: landingPage,
        });

        await createLeadAttribution({
          lead_id: lead.id,
          keyword_id: attribution.keyword_id ?? undefined,
          source: attribution.source,
          confidence: attribution.confidence,
          gclid,
          landing_page_url: landingPage,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          utm_keyword: utmKeyword,
        });

        console.log(`[Webflow Webhook] Attribution: ${attribution.source} (${attribution.confidence})`);
      }
    } catch (attrErr) {
      console.error('[Webflow Webhook] Attribution failed (non-blocking):', attrErr);
    }

// Send email notification
try {
  await sendNotification({ name, phone, email, city, needs });
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  const lines = [
    `Nome: ${lead.name}`,
    lead.phone ? `Telefono: ${lead.phone}` : null,
    lead.email ? `Email: ${lead.email}` : null,
    lead.city ? `Città: ${lead.city}` : null,
    lead.needs ? `Esigenza: ${lead.needs}` : null,
  ].filter(Boolean).join('\n');


  await resend.emails.send({
    from: 'Doctorbed CRM <noreply@crm.doctorbed.app>',
    to: notifyEmail,
    subject: `Nuovo lead dal sito web - ${lead.name}`,
    text: lines,
  });
}
