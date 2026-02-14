import { NextRequest, NextResponse } from 'next/server';
import { runAlertDetection, sendAlertDigest } from '@/lib/seo-ads/alerts';

/**
 * POST /api/seo-ads/cron/alerts
 *
 * Vercel Cron job (daily at 08:00 UTC).
 * Detects anomalies (low QS, high CPC, wasted spend) and sends email digest.
 * Protected by Authorization: Bearer <CRON_SECRET>.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const alerts = await runAlertDetection();

    if (alerts.length === 0) {
      return NextResponse.json({ status: 'ok', alerts: 0, email: false });
    }

    const emailSent = await sendAlertDigest(alerts);

    console.log(`[Cron Alerts] ${alerts.length} alerts detected, email ${emailSent ? 'sent' : 'skipped'}`);

    return NextResponse.json({
      status: 'ok',
      alerts: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      email: emailSent,
    });
  } catch (error: unknown) {
    console.error('[Cron Alerts] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 },
    );
  }
}
