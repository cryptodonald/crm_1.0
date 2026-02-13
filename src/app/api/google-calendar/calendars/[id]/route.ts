import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { queryOne } from '@/lib/postgres';
import { checkRateLimit } from '@/lib/ratelimit';
import type { GoogleCalendar } from '@/types/database';

/**
 * PATCH /api/google-calendar/calendars/:id
 * Toggle calendar visibility.
 * Body: { is_visible: boolean }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id } = await params;
    const body = await request.json();

    if (typeof body.is_visible !== 'boolean') {
      return NextResponse.json(
        { error: 'is_visible (boolean) is required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    // Verify ownership through join
    const calendar = await queryOne<GoogleCalendar>(
      `SELECT gc.* FROM google_calendars gc
       JOIN google_accounts ga ON gc.google_account_id = ga.id
       WHERE gc.id = $1 AND ga.user_id = $2`,
      [id, session.user.id],
    );

    if (!calendar) {
      return NextResponse.json(
        { error: 'Calendar not found', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    // Update visibility
    const updated = await queryOne<GoogleCalendar>(
      `UPDATE google_calendars SET is_visible = $2 WHERE id = $1 RETURNING *`,
      [id, body.is_visible],
    );

    return NextResponse.json({ calendar: updated });
  } catch (error) {
    console.error('[API] PATCH /api/google-calendar/calendars/:id error:', error);
    return NextResponse.json(
      { error: 'Failed to update calendar', code: 'UPDATE_ERROR' },
      { status: 500 },
    );
  }
}
