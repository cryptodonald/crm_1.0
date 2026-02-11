import { NextRequest, NextResponse } from 'next/server';
import {
  verifyWebhookSignature,
  fetchLeadData,
  mapMetaFieldsToLead,
  checkDuplicate,
} from '@/lib/meta-leads';
import { createLead } from '@/lib/postgres';
import type { LeadCreateInput } from '@/types/database';

// ============================================================================
// GET /api/webhooks/meta-leads
// Meta Webhook Verification (hub.challenge handshake)
// ============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_VERIFY_TOKEN;

  if (!verifyToken) {
    console.error('[Meta Webhook] META_VERIFY_TOKEN not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Meta Webhook] Verification successful');
    // Meta expects the challenge value as plain text response
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  console.warn('[Meta Webhook] Verification failed - invalid token');
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ============================================================================
// POST /api/webhooks/meta-leads
// Receive new leads from Meta Lead Ads
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Read raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const appSecret = process.env.META_APP_SECRET;

    // 2. Verify signature (skip in dev if no secret configured)
    if (appSecret) {
      if (!verifyWebhookSignature(rawBody, signature, appSecret)) {
        console.error('[Meta Webhook] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } else if (process.env.NODE_ENV === 'production') {
      console.error('[Meta Webhook] META_APP_SECRET not configured in production');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    // 3. Parse webhook payload
    const body = JSON.parse(rawBody);

    // Meta always sends object: "page" for Lead Ads
    if (body.object !== 'page') {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
    if (!pageAccessToken) {
      console.error('[Meta Webhook] META_PAGE_ACCESS_TOKEN not configured');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const sourceId = process.env.META_SOURCE_ID || null;
    let processedCount = 0;
    let skippedCount = 0;

    // 4. Process each entry (Meta can batch multiple entries)
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'leadgen') continue;

        const leadgenId = change.value?.leadgen_id;
        if (!leadgenId) {
          console.warn('[Meta Webhook] Missing leadgen_id in change', change);
          continue;
        }

        try {
          // 5. Fetch full lead data from Graph API
          const metaLeadData = await fetchLeadData(leadgenId, pageAccessToken);
          console.log('[Meta Webhook] Raw field_data:', JSON.stringify(metaLeadData.field_data));

          // 6. Map Meta fields → CRM schema (async: AI rewrites needs)
          const mapped = await mapMetaFieldsToLead(metaLeadData, sourceId);

          // 7. Check for duplicates
          const existing = await checkDuplicate(mapped.email, mapped.phone);
          if (existing) {
            console.log(
              `[Meta Webhook] Duplicate found: lead ${existing.id} (${existing.email || existing.phone})`
            );
            skippedCount++;
            continue;
          }

          // 8. Create lead in Postgres (convert null → undefined for LeadCreateInput)
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
            assigned_to: undefined,
            referral_lead_id: undefined,
          };

          const lead = await createLead(input);
          console.log(
            `[Meta Webhook] Lead created: ${lead.id} - ${lead.name} (${lead.email || 'no email'})`
          );
          processedCount++;
        } catch (err) {
          console.error(`[Meta Webhook] Error processing leadgen ${leadgenId}:`, err);
          // Continue processing other leads even if one fails
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[Meta Webhook] Done: ${processedCount} created, ${skippedCount} duplicates skipped (${duration}ms)`
    );

    // Meta expects 200 response — anything else triggers retries
    return NextResponse.json(
      { received: true, processed: processedCount, skipped: skippedCount },
      { status: 200 }
    );
  } catch (error) {
    console.error('[Meta Webhook] Unexpected error:', error);
    // Still return 200 to prevent Meta from retrying on parse errors
    return NextResponse.json({ received: true, error: 'Processing error' }, { status: 200 });
  }
}
