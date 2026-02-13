import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { syncGoogleAccount } from '@/lib/calendar-sync';
import { getGoogleAccountsForUser } from '@/lib/google-calendar';
import { query } from '@/lib/postgres';
import { checkRateLimit } from '@/lib/ratelimit';
import type { GoogleAccount } from '@/types/database';

/**
 * POST /api/google-calendar/sync
 * Triggers manual sync for all user's Google accounts.
 * Body: { accountId?: string } (optional, sync specific account)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success } = await checkRateLimit(session.user.email, 'write');
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const { accountId } = body;

    let accounts: GoogleAccount[];
    if (accountId) {
      const account = await query<GoogleAccount>(
        `SELECT * FROM google_accounts WHERE id = $1 AND user_id = $2`,
        [accountId, session.user.id],
      );
      accounts = account;
    } else {
      accounts = await getGoogleAccountsForUser(session.user.id);
    }

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: 'No Google accounts connected', code: 'NO_ACCOUNTS' },
        { status: 400 },
      );
    }

    const results = [];
    for (const account of accounts) {
      const result = await syncGoogleAccount(account.id);
      results.push(result);
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('[API] POST /api/google-calendar/sync error:', error);
    return NextResponse.json(
      { error: 'Sync failed', code: 'SYNC_ERROR' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/google-calendar/sync
 * Returns sync status for user's Google accounts.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await query<Pick<GoogleAccount, 'id' | 'google_email' | 'sync_status' | 'sync_error' | 'last_sync_at'>>(
      `SELECT id, google_email, sync_status, sync_error, last_sync_at
       FROM google_accounts WHERE user_id = $1`,
      [session.user.id],
    );

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('[API] GET /api/google-calendar/sync error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status', code: 'FETCH_ERROR' },
      { status: 500 },
    );
  }
}
