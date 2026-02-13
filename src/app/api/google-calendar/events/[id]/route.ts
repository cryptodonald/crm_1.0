import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, queryOne, getUserByEmail } from '@/lib/postgres';
import { checkRateLimit } from '@/lib/ratelimit';
import type { CalendarEvent } from '@/types/database';

/**
 * PATCH /api/google-calendar/events/:id
 * Updates a CRM-created event on Google Calendar and locally.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success } = await checkRateLimit(session.user.email, 'write');
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429 },
      );
    }

    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;
    const body = await request.json();

    // Dynamic import to avoid loading googleapis at compile time
    const { getAuthenticatedClient, getGoogleAccountById, updateEvent: googleUpdateEvent } = await import('@/lib/google-calendar');

    // Get event with ownership check
    const event = await queryOne<CalendarEvent & { google_cal_id: string; account_id: string }>(
      `SELECT ce.*, gc.google_calendar_id as google_cal_id, ga.id as account_id
       FROM calendar_events ce
       JOIN google_calendars gc ON ce.google_calendar_id = gc.id
       JOIN google_accounts ga ON gc.google_account_id = ga.id
       WHERE ce.id = $1 AND ga.user_id = $2`,
      [id, user.id],
    );

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    if (event.source !== 'crm') {
      return NextResponse.json(
        { error: 'Can only edit CRM-created events', code: 'FORBIDDEN' },
        { status: 403 },
      );
    }

    const account = await getGoogleAccountById(event.account_id);
    if (!account) {
      return NextResponse.json(
        { error: 'Google account not found', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    const auth = await getAuthenticatedClient(account);

    // Build Google update payload
    const googleUpdate: Record<string, unknown> = {};
    if (body.title !== undefined) googleUpdate.summary = body.title;
    if (body.description !== undefined) googleUpdate.description = body.description;
    if (body.location !== undefined) googleUpdate.location = body.location;
    if (body.start_time !== undefined) {
      googleUpdate.start = body.all_day
        ? { date: body.start_time.split('T')[0] }
        : { dateTime: body.start_time };
    }
    if (body.end_time !== undefined) {
      googleUpdate.end = body.all_day
        ? { date: body.end_time.split('T')[0] }
        : { dateTime: body.end_time };
    }

    // Update on Google
    const googleResult = await googleUpdateEvent(
      auth,
      event.google_cal_id,
      event.google_event_id,
      googleUpdate,
    );

    // Update locally
    const updated = await queryOne<CalendarEvent>(
      `UPDATE calendar_events SET
         title = COALESCE($2, title),
         description = COALESCE($3, description),
         location = COALESCE($4, location),
         start_time = COALESCE($5, start_time),
         end_time = COALESCE($6, end_time),
         all_day = COALESCE($7, all_day),
         etag = $8,
         google_updated_at = $9,
         last_synced_at = now()
       WHERE id = $1 RETURNING *`,
      [
        id,
        body.title ?? null,
        body.description ?? null,
        body.location ?? null,
        body.start_time ?? null,
        body.end_time ?? null,
        body.all_day ?? null,
        googleResult.etag,
        googleResult.updated,
      ],
    );

    return NextResponse.json({ event: updated });
  } catch (error) {
    console.error('[API] PATCH /api/google-calendar/events/:id error:', error);
    return NextResponse.json(
      { error: 'Failed to update event', code: 'UPDATE_ERROR' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/google-calendar/events/:id
 * Deletes a CRM-created event from Google Calendar and locally.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success } = await checkRateLimit(session.user.email, 'write');
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429 },
      );
    }

    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { id } = await params;

    // Dynamic import to avoid loading googleapis at compile time
    const { getAuthenticatedClient, getGoogleAccountById, deleteEvent: googleDeleteEvent } = await import('@/lib/google-calendar');

    // Get event with ownership check
    const event = await queryOne<CalendarEvent & { google_cal_id: string; account_id: string }>(
      `SELECT ce.*, gc.google_calendar_id as google_cal_id, ga.id as account_id
       FROM calendar_events ce
       JOIN google_calendars gc ON ce.google_calendar_id = gc.id
       JOIN google_accounts ga ON gc.google_account_id = ga.id
       WHERE ce.id = $1 AND ga.user_id = $2`,
      [id, user.id],
    );

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    if (event.source !== 'crm') {
      return NextResponse.json(
        { error: 'Can only delete CRM-created events', code: 'FORBIDDEN' },
        { status: 403 },
      );
    }

    const account = await getGoogleAccountById(event.account_id);
    if (account) {
      try {
        const auth = await getAuthenticatedClient(account);
        await googleDeleteEvent(auth, event.google_cal_id, event.google_event_id);
      } catch (error) {
        console.warn('[API] Failed to delete from Google (continuing):', error);
      }
    }

    // Delete locally
    await query(`DELETE FROM calendar_events WHERE id = $1`, [id]);

    // Clear activity reference if linked
    if (event.activity_id) {
      await query(
        `UPDATE activities SET google_event_id = NULL WHERE id = $1`,
        [event.activity_id],
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /api/google-calendar/events/:id error:', error);
    return NextResponse.json(
      { error: 'Failed to delete event', code: 'DELETE_ERROR' },
      { status: 500 },
    );
  }
}
