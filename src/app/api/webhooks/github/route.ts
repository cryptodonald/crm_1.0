/**
 * GitHub Webhook Handler
 * Secure webhook processing with signature verification
 */

import { NextRequest, NextResponse } from 'next/server';
import { GitHubClient } from '@/lib/github/client';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST - Handle GitHub webhook events
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('[GitHub Webhook] Received webhook request');

    // Get headers
    const githubEvent = request.headers.get('x-github-event');
    const githubDelivery = request.headers.get('x-github-delivery');
    const signature = request.headers.get('x-hub-signature-256') || '';
    const userAgent = request.headers.get('user-agent') || '';

    console.log('[GitHub Webhook] Event details:', {
      event: githubEvent,
      delivery: githubDelivery,
      hasSignature: !!signature,
      userAgent: userAgent.substring(0, 50), // Log partial user agent
    });

    // Validate GitHub user agent
    if (!userAgent.startsWith('GitHub-Hookshot/')) {
      console.error('[GitHub Webhook] Invalid user agent');
      return NextResponse.json(
        { error: 'Invalid user agent' },
        { status: 403 }
      );
    }

    // Get raw body for signature verification
    const body = await request.text();

    if (!body) {
      console.error('[GitHub Webhook] Empty body');
      return NextResponse.json({ error: 'Empty body' }, { status: 400 });
    }

    // Verify signature if secret is configured
    const webhookSecret = env.GITHUB_WEBHOOK_SECRET;
    if (
      webhookSecret &&
      !GitHubClient.verifyWebhookSignature(body, signature, webhookSecret)
    ) {
      console.error('[GitHub Webhook] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse webhook payload
    let payload: any;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      console.error('[GitHub Webhook] Invalid JSON payload');
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!githubEvent || !githubDelivery) {
      console.error('[GitHub Webhook] Missing required headers');
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 }
      );
    }

    // Process the webhook event
    const webhookEvent = {
      eventType: githubEvent,
      deliveryId: githubDelivery,
      signature,
      payload,
      repository: payload.repository
        ? {
            id: payload.repository.id,
            name: payload.repository.name,
            fullName: payload.repository.full_name,
          }
        : undefined,
    };

    await GitHubClient.processWebhookEvent(webhookEvent);

    const duration = Date.now() - startTime;
    console.log(`[GitHub Webhook] Processing completed in ${duration}ms`);

    return NextResponse.json(
      {
        status: 'ok',
        event: githubEvent,
        delivery: githubDelivery,
        processed: true,
      },
      { status: 200 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[GitHub Webhook] Error processing webhook:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        duration,
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Webhook health check
 */
export async function GET() {
  console.log('[GitHub Webhook] Health check requested');

  return NextResponse.json(
    {
      status: 'healthy',
      service: 'GitHub Webhook Handler',
      timestamp: new Date().toISOString(),
      endpoints: {
        POST: 'Handles GitHub webhook events',
        GET: 'Health check',
      },
      security: {
        signatureVerification: 'enabled',
        userAgentValidation: 'enabled',
      },
    },
    { status: 200 }
  );
}

/**
 * OPTIONS - CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://api.github.com',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers':
        'X-Hub-Signature-256, X-GitHub-Event, X-GitHub-Delivery, Content-Type',
    },
  });
}
