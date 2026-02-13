import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query, getUserByEmail } from '@/lib/postgres';
import { checkRateLimit } from '@/lib/ratelimit';
import type { CalendarEvent, GoogleCalendar } from '@/types/database';

/**
 * GET /api/google-calendar/events
 * Returns calendar events for a time range.
 * Query params: start (ISO), end (ISO), calendarIds (comma-separated, optional)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success } = await checkRateLimit(session.user.email, 'read');
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

    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json(
        { error: 'start and end query params are required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    const calendarIdsParam = searchParams.get('calendarIds');
    const calendarIds = calendarIdsParam ? calendarIdsParam.split(',') : undefined;

    let events: CalendarEvent[];

    if (calendarIds && calendarIds.length > 0) {
      events = await query<CalendarEvent>(
        `SELECT ce.*, gc.name as calendar_name, gc.color as calendar_color
         FROM calendar_events ce
         JOIN google_calendars gc ON ce.google_calendar_id = gc.id
         JOIN google_accounts ga ON gc.google_account_id = ga.id
         WHERE ga.user_id = $1
           AND gc.is_visible = true
           AND gc.id = ANY($4)
           AND ce.start_time < $3
           AND (ce.end_time > $2 OR (ce.end_time IS NULL AND ce.start_time >= $2))
           AND ce.status != 'cancelled'
         ORDER BY ce.start_time ASC`,
        [user.id, start, end, calendarIds],
      );
    } else {
      events = await query<CalendarEvent>(
        `SELECT ce.*, gc.name as calendar_name, gc.color as calendar_color
         FROM calendar_events ce
         JOIN google_calendars gc ON ce.google_calendar_id = gc.id
         JOIN google_accounts ga ON gc.google_account_id = ga.id
         WHERE ga.user_id = $1
           AND gc.is_visible = true
           AND ce.start_time < $3
           AND (ce.end_time > $2 OR (ce.end_time IS NULL AND ce.start_time >= $2))
           AND ce.status != 'cancelled'
         ORDER BY ce.start_time ASC`,
        [user.id, start, end],
      );
    }

    return NextResponse.json({ events });
  } catch (error) {
    console.error('[API] GET /api/google-calendar/events error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events', code: 'FETCH_ERROR' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/google-calendar/events
 * Creates a new event on Google Calendar and stores locally.
 * Body: { calendarId, title, description?, location?, start_time, end_time?, all_day?, activity_id? }
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { calendarId, title, description, location, start_time, end_time, all_day, activity_id } = body;

    if (!calendarId || !title || !start_time) {
      return NextResponse.json(
        { error: 'calendarId, title, and start_time are required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    // Dynamic import to avoid loading googleapis at compile time
    const { getAuthenticatedClient, getGoogleAccountById, createEvent: googleCreateEvent } = await import('@/lib/google-calendar');

    // Verify ownership and writability
    const calendar = await query<GoogleCalendar & { google_account_id: string }>(
      `SELECT gc.* FROM google_calendars gc
       JOIN google_accounts ga ON gc.google_account_id = ga.id
       WHERE gc.id = $1 AND ga.user_id = $2 AND gc.is_writable = true`,
      [calendarId, user.id],
    );

    if (calendar.length === 0) {
      return NextResponse.json(
        { error: 'Calendar not found or not writable', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    const cal = calendar[0];
    const account = await getGoogleAccountById(cal.google_account_id);
    if (!account) {
      return NextResponse.json(
        { error: 'Google account not found', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }

    const auth = await getAuthenticatedClient(account);

    // Create on Google
    const googleEvent = await googleCreateEvent(auth, cal.google_calendar_id, {
      summary: title,
      description,
      location,
      start: all_day
        ? { date: start_time.split('T')[0] }
        : { dateTime: start_time },
      end: all_day
        ? { date: (end_time || start_time).split('T')[0] }
        : { dateTime: end_time || new Date(new Date(start_time).getTime() + 3600000).toISOString() },
    });

    // Store locally
    const localEvent = await query<CalendarEvent>(
      `INSERT INTO calendar_events (
         google_calendar_id, google_event_id, title, description, location,
         start_time, end_time, all_day, status, activity_id, source, etag,
         google_updated_at, last_synced_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'crm', $11, $12, now())
       RETURNING *`,
      [
        calendarId,
        googleEvent.id,
        googleEvent.summary,
        googleEvent.description,
        googleEvent.location,
        googleEvent.start.dateTime || googleEvent.start.date,
        googleEvent.end.dateTime || googleEvent.end.date,
        all_day || false,
        googleEvent.status,
        activity_id || null,
        googleEvent.etag,
        googleEvent.updated,
      ],
    );

    return NextResponse.json({ event: localEvent[0] }, { status: 201 });
  } catch (error) {
    console.error('[API] POST /api/google-calendar/events error:', error);
    return NextResponse.json(
      { error: 'Failed to create event', code: 'CREATE_ERROR' },
      { status: 500 },
    );
  }
}
