import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/postgres';
import { refreshCalendarList } from '@/lib/calendar-sync';
import { checkRateLimit } from '@/lib/ratelimit';
import type { GoogleCalendar } from '@/types/database';

/**
 * GET /api/google-calendar/calendars
 * Returns all calendars for the current user's connected Google accounts.
 * Query params: ?accountId=UUID (optional, filter by account)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success } = await checkRateLimit(session.user.email, 'read');
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429 },
      );
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    let calendars: GoogleCalendar[];
    if (accountId) {
      calendars = await query<GoogleCalendar>(
        `SELECT gc.* FROM google_calendars gc
         JOIN google_accounts ga ON gc.google_account_id = ga.id
         WHERE ga.user_id = $1 AND gc.google_account_id = $2
         ORDER BY gc.is_primary DESC, gc.name ASC`,
        [session.user.id, accountId],
      );
    } else {
      calendars = await query<GoogleCalendar>(
        `SELECT gc.* FROM google_calendars gc
         JOIN google_accounts ga ON gc.google_account_id = ga.id
         WHERE ga.user_id = $1
         ORDER BY gc.is_primary DESC, gc.name ASC`,
        [session.user.id],
      );
    }

    return NextResponse.json({ calendars });
  } catch (error) {
    console.error('[API] GET /api/google-calendar/calendars error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendars', code: 'FETCH_ERROR' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/google-calendar/calendars
 * Refreshes calendar list from Google for a specific account.
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
    const account = await query(
      `SELECT id FROM google_accounts WHERE id = $1 AND user_id = $2`,
      [accountId, session.user.id],
    );
    if (account.length === 0) {
      return NextResponse.json(
        { error: 'Account not found', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    const calendars = await refreshCalendarList(accountId);

    return NextResponse.json({ calendars });
  } catch (error) {
    console.error('[API] POST /api/google-calendar/calendars error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh calendars', code: 'REFRESH_ERROR' },
      { status: 500 },
    );
  }
}
