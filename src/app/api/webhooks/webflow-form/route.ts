import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '@/env';
import { createLead } from '@/lib/postgres';
import { attributeLead } from '@/lib/seo-ads/attribution';
import { createLeadAttribution } from '@/lib/seo-ads/queries';
import { checkRateLimit } from '@/lib/ratelimit';
import { z } from 'zod';

// Zod validation per payload webhook
const webflowPayloadSchema = z.object({
  data: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    gclid: z.string().optional(),
    utm_source: z.string().optional(),
    utm_medium: z.string().optional(),
    utm_campaign: z.string().optional(),
    utm_keyword: z.string().optional(),
    landing_page: z.string().optional(),
  }),
});

/**
 * Verify HMAC signature del webhook Webflow.
 * Uses timing-safe comparison to prevent timing attacks.
 */
function verifyWebflowSignature(body: string, signature: string | null): boolean {
  const secret = env.WEBFLOW_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const hmac = createHmac('sha256', secret);
  hmac.update(body);
  const expected = hmac.digest('hex');

  // Timing-safe comparison
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limit (per IP — webhook è anonimo)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const isDev = process.env.NODE_ENV === 'development';
    const { success } = isDev
      ? { success: true }
      : await checkRateLimit(`webhook:${ip}`, 'write');
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // 2. Signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-webflow-signature');

    if (!verifyWebflowSignature(rawBody, signature)) {
      console.error('[Webhook] Invalid Webflow signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // 3. Parse + validate
    const payload = JSON.parse(rawBody);
    const parsed = webflowPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const formData = parsed.data.data;

    // 4. Create lead (CRM pattern — lib/postgres.ts)
    const lead = await createLead({
      name: formData.name,
      phone: formData.phone || undefined,
      email: formData.email || undefined,
      status: 'Nuovo',
    });

    // 5. Automatic attribution
    const attribution = await attributeLead({
      gclid: formData.gclid,
      utm_source: formData.utm_source,
      utm_medium: formData.utm_medium,
      utm_campaign: formData.utm_campaign,
      utm_keyword: formData.utm_keyword,
      landing_page_url: formData.landing_page,
    });

    // 6. Save attribution
    await createLeadAttribution({
      lead_id: lead.id,
      keyword_id: attribution.keyword_id ?? undefined,
      source: attribution.source,
      confidence: attribution.confidence,
      gclid: formData.gclid,
      landing_page_url: formData.landing_page,
      utm_source: formData.utm_source,
      utm_medium: formData.utm_medium,
      utm_campaign: formData.utm_campaign,
      utm_keyword: formData.utm_keyword,
    });

    console.log(`[Webhook] Lead created: ${lead.id} (source: ${attribution.source}, confidence: ${attribution.confidence})`);
    return NextResponse.json({ success: true, lead_id: lead.id }, { status: 201 });
  } catch (error: unknown) {
    console.error('[Webhook] webflow-form error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
