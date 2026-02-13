import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getGoogleAccountById, revokeToken } from '@/lib/google-calendar';
import { query } from '@/lib/postgres';
import { checkRateLimit } from '@/lib/ratelimit';

/**
 * POST /api/google-calendar/auth/disconnect
 * 
 * Disconnects a Google account: revokes token and deletes from DB (CASCADE).
 * Body: { accountId: string }
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

    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    // Verify ownership
    const account = await getGoogleAccountById(accountId);
    if (!account || account.user_id !== session.user.id) {
      return NextResponse.json(
        { error: 'Account not found', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    // Revoke token on Google
    await revokeToken(account);

    // Delete from DB (CASCADE deletes calendars and events)
    await query(
      `DELETE FROM google_accounts WHERE id = $1`,
      [accountId],
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] POST /api/google-calendar/auth/disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect', code: 'DISCONNECT_ERROR' },
      { status: 500 },
    );
  }
}
