import { NextRequest, NextResponse } from 'next/server';
import { syncAllUsers } from '@/lib/calendar-sync';

/**
 * POST /api/cron/calendar-sync
 * 
 * Vercel Cron endpoint. Runs every 15 minutes.
 * Syncs all active Google Calendar accounts.
 * 
 * Protected by CRON_SECRET header (Vercel sets this automatically).
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret (Vercel sets Authorization header for cron jobs)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    const result = await syncAllUsers();
    const duration = Date.now() - startTime;

    console.log(
      `[Cron] Calendar sync completed in ${duration}ms:`,
      `${result.successCount}/${result.totalAccounts} accounts synced,`,
      `${result.errorCount} errors`,
    );

    return NextResponse.json({
      success: true,
      duration,
      ...result,
    });
  } catch (error) {
    console.error('[Cron] Calendar sync failed:', error);
    return NextResponse.json(
      { error: 'Cron sync failed', code: 'CRON_ERROR' },
      { status: 500 },
    );
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}
