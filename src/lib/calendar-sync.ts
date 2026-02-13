/**
 * Calendar Sync Engine
 * 
 * Handles synchronization between Google Calendar and local DB:
 * - Incremental sync using syncTokens
 * - Activity → Google Calendar push
 * - Conflict resolution (Google wins for calendar fields, CRM wins for business fields)
 * - Batch sync for cron job
 */

import {
  getAuthenticatedClient,
  listEvents,
  listCalendars,
  createEvent as googleCreateEvent,
  updateEvent as googleUpdateEvent,
  deleteEvent as googleDeleteEvent,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getEvent as googleGetEvent,
  getGoogleAccountById,
  getAllActiveGoogleAccounts,
  type GoogleEventResult,
  type GoogleEventInput,
} from '@/lib/google-calendar';
import { query, queryOne, getClient } from '@/lib/postgres';
import type {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  GoogleAccount,
  GoogleCalendar,
  CalendarEvent,
  Activity,
} from '@/types/database';

// ============================================================================
// Types
// ============================================================================

export interface SyncResult {
  accountId: string;
  calendarsProcessed: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  errors: string[];
}

// ============================================================================
// Main Sync Functions
// ============================================================================

/**
 * Syncs all visible calendars for a Google account.
 * Uses incremental sync with syncToken when available.
 */
export async function syncGoogleAccount(accountId: string): Promise<SyncResult> {
  const result: SyncResult = {
    accountId,
    calendarsProcessed: 0,
    eventsCreated: 0,
    eventsUpdated: 0,
    eventsDeleted: 0,
    errors: [],
  };

  const account = await getGoogleAccountById(accountId);
  if (!account) {
    result.errors.push('Account not found');
    return result;
  }

  // Mark as syncing
  await query(
    `UPDATE google_accounts SET sync_status = 'syncing', sync_error = NULL WHERE id = $1`,
    [accountId],
  );

  try {
    const auth = await getAuthenticatedClient(account);

    // Get visible calendars
    const calendars = await query<GoogleCalendar>(
      `SELECT * FROM google_calendars WHERE google_account_id = $1 AND is_visible = true`,
      [accountId],
    );

    for (const calendar of calendars) {
      try {
        const calResult = await syncCalendar(auth, calendar);
        result.calendarsProcessed++;
        result.eventsCreated += calResult.created;
        result.eventsUpdated += calResult.updated;
        result.eventsDeleted += calResult.deleted;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Calendar ${calendar.name}: ${message}`);
      }
    }

    // Mark as done
    await query(
      `UPDATE google_accounts SET sync_status = 'idle', last_sync_at = now(), sync_error = NULL WHERE id = $1`,
      [accountId],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(message);
    await query(
      `UPDATE google_accounts SET sync_status = 'error', sync_error = $2 WHERE id = $1`,
      [accountId, message],
    );
  }

  return result;
}

/**
 * Syncs events for a single calendar.
 */
async function syncCalendar(
  auth: import('google-auth-library').OAuth2Client,
  calendar: GoogleCalendar,
): Promise<{ created: number; updated: number; deleted: number }> {
  let created = 0;
  let updated = 0;
  let deleted = 0;

  // Use syncToken for incremental sync, or full sync with time range
  const syncOpts: { syncToken?: string; timeMin?: string; timeMax?: string } = {};

  if (calendar.sync_token) {
    syncOpts.syncToken = calendar.sync_token;
  } else {
    // Full sync: fetch events from 3 months ago to 6 months ahead
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);
    const sixMonthsAhead = new Date(now);
    sixMonthsAhead.setMonth(now.getMonth() + 6);

    syncOpts.timeMin = threeMonthsAgo.toISOString();
    syncOpts.timeMax = sixMonthsAhead.toISOString();
  }

  const { events, nextSyncToken } = await listEvents(
    auth,
    calendar.google_calendar_id,
    syncOpts,
  );

  // If syncToken was invalid (410), do full sync
  if (calendar.sync_token && events.length === 0 && !nextSyncToken) {
    // Clear syncToken and retry
    await query(
      `UPDATE google_calendars SET sync_token = NULL WHERE id = $1`,
      [calendar.id],
    );
    return syncCalendar(auth, { ...calendar, sync_token: null });
  }

  // Process each event
  for (const googleEvent of events) {
    try {
      if (googleEvent.status === 'cancelled') {
        // Delete local event
        const result = await query(
          `DELETE FROM calendar_events WHERE google_calendar_id = $1 AND google_event_id = $2 RETURNING id`,
          [calendar.id, googleEvent.id],
        );
        if (result.length > 0) deleted++;
      } else {
        // Upsert event
        const existing = await queryOne<CalendarEvent>(
          `SELECT * FROM calendar_events WHERE google_calendar_id = $1 AND google_event_id = $2`,
          [calendar.id, googleEvent.id],
        );

        if (existing) {
          // Check for conflicts on CRM events
          if (existing.source === 'crm') {
            const merged = resolveConflict(existing, googleEvent);
            await updateLocalEvent(existing.id, merged);
          } else {
            // Pure Google event — just update
            await updateLocalEvent(existing.id, googleEventToLocal(googleEvent));
          }
          updated++;
        } else {
          // New event
          await insertLocalEvent(calendar.id, googleEvent);
          created++;
        }
      }
    } catch (error) {
      console.error(`[CalendarSync] Error processing event ${googleEvent.id}:`, error);
    }
  }

  // Save new sync token
  if (nextSyncToken) {
    await query(
      `UPDATE google_calendars SET sync_token = $2, last_sync_at = now() WHERE id = $1`,
      [calendar.id, nextSyncToken],
    );
  }

  return { created, updated, deleted };
}

// ============================================================================
// Conflict Resolution
// ============================================================================

/**
 * Resolves conflicts between local CRM event and Google event.
 * 
 * Strategy:
 * - Google wins for: start_time, end_time, all_day, location (calendar fields)
 * - CRM wins for: activity_id, source (business fields)
 * - title and description: Google wins (user may have edited on Google)
 */
export function resolveConflict(
  local: CalendarEvent,
  google: GoogleEventResult,
): Partial<CalendarEvent> {
  const startTime = google.start.dateTime || google.start.date || local.start_time;
  const endTime = google.end.dateTime || google.end.date || local.end_time;
  const allDay = !!google.start.date;

  return {
    // Google wins for calendar fields
    title: google.summary ?? local.title,
    description: google.description ?? local.description,
    location: google.location ?? local.location,
    start_time: startTime as string,
    end_time: endTime as string,
    all_day: allDay,
    status: google.status as CalendarEvent['status'],
    // Sync metadata always from Google
    etag: google.etag,
    google_updated_at: google.updated,
    last_synced_at: new Date().toISOString(),
    // CRM wins for business fields (preserved from local)
    activity_id: local.activity_id,
    source: local.source,
  };
}

// ============================================================================
// Activity → Google Calendar
// ============================================================================

/**
 * Syncs a CRM activity to Google Calendar.
 * Creates or updates the corresponding Google event.
 */
export async function syncActivityToGoogle(
  activity: Activity,
  userId: string,
): Promise<string | null> {
  if (!activity.sync_to_google || !activity.activity_date) {
    return null;
  }

  // Find user's primary writable calendar
  const calendar = await queryOne<GoogleCalendar & { account_id: string }>(
    `SELECT gc.*, ga.id as account_id
     FROM google_calendars gc
     JOIN google_accounts ga ON gc.google_account_id = ga.id
     WHERE ga.user_id = $1 AND gc.is_writable = true AND gc.is_primary = true
     LIMIT 1`,
    [userId],
  );

  if (!calendar) {
    console.warn('[CalendarSync] No writable primary calendar found for user', userId);
    return null;
  }

  const account = await getGoogleAccountById(calendar.google_account_id);
  if (!account) return null;

  const auth = await getAuthenticatedClient(account);

  // Build Google event from activity
  const eventInput = activityToGoogleEvent(activity);

  if (activity.google_event_id) {
    // Update existing event
    try {
      const result = await googleUpdateEvent(
        auth,
        calendar.google_calendar_id,
        activity.google_event_id,
        eventInput,
      );

      // Update local cache
      await query(
        `UPDATE calendar_events 
         SET title = $2, description = $3, start_time = $4, end_time = $5, 
             etag = $6, google_updated_at = $7, last_synced_at = now()
         WHERE google_event_id = $1`,
        [
          activity.google_event_id,
          result.summary,
          result.description,
          result.start.dateTime || result.start.date,
          result.end.dateTime || result.end.date,
          result.etag,
          result.updated,
        ],
      );

      return activity.google_event_id;
    } catch (error) {
      console.error('[CalendarSync] Failed to update Google event:', error);
      // If event was deleted on Google, create a new one
      if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 404) {
        // Fall through to create
      } else {
        throw error;
      }
    }
  }

  // Create new event
  const result = await googleCreateEvent(
    auth,
    calendar.google_calendar_id,
    eventInput,
  );

  // Save reference on activity
  await query(
    `UPDATE activities SET google_event_id = $2 WHERE id = $1`,
    [activity.id, result.id],
  );

  // Create local cache entry
  await query(
    `INSERT INTO calendar_events (
       google_calendar_id, google_event_id, title, description, location,
       start_time, end_time, all_day, status, activity_id, source, etag,
       google_updated_at, last_synced_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'crm', $11, $12, now())
     ON CONFLICT (google_calendar_id, google_event_id) DO UPDATE SET
       title = EXCLUDED.title, description = EXCLUDED.description,
       start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time,
       etag = EXCLUDED.etag, google_updated_at = EXCLUDED.google_updated_at,
       last_synced_at = now()`,
    [
      calendar.id,
      result.id,
      result.summary,
      result.description,
      result.location,
      result.start.dateTime || result.start.date,
      result.end.dateTime || result.end.date,
      false,
      result.status,
      activity.id,
      result.etag,
      result.updated,
    ],
  );

  return result.id;
}

/**
 * Deletes a Google Calendar event when a CRM activity is deleted or sync disabled.
 */
export async function deleteActivityFromGoogle(
  activity: Activity,
  userId: string,
): Promise<void> {
  if (!activity.google_event_id) return;

  const calendar = await queryOne<GoogleCalendar>(
    `SELECT gc.*
     FROM google_calendars gc
     JOIN google_accounts ga ON gc.google_account_id = ga.id
     WHERE ga.user_id = $1 AND gc.is_writable = true AND gc.is_primary = true
     LIMIT 1`,
    [userId],
  );

  if (!calendar) return;

  const account = await getGoogleAccountById(calendar.google_account_id);
  if (!account) return;

  try {
    const auth = await getAuthenticatedClient(account);
    await googleDeleteEvent(auth, calendar.google_calendar_id, activity.google_event_id);
  } catch (error) {
    console.warn('[CalendarSync] Failed to delete Google event:', error);
  }

  // Clean up local cache
  await query(
    `DELETE FROM calendar_events WHERE google_event_id = $1`,
    [activity.google_event_id],
  );
}

// ============================================================================
// Calendar List Sync
// ============================================================================

/**
 * Refreshes the list of calendars for a Google account from the API.
 */
export async function refreshCalendarList(accountId: string): Promise<GoogleCalendar[]> {
  const account = await getGoogleAccountById(accountId);
  if (!account) throw new Error('Account not found');

  const auth = await getAuthenticatedClient(account);
  const googleCalendars = await listCalendars(auth);

  const client = await getClient();
  try {
    await client.query('BEGIN');

    for (const gcal of googleCalendars) {
      const isWritable = gcal.accessRole === 'owner' || gcal.accessRole === 'writer';
      
      await client.query(
        `INSERT INTO google_calendars (
           google_account_id, google_calendar_id, name, color, is_primary, is_writable
         ) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (google_account_id, google_calendar_id) DO UPDATE SET
           name = EXCLUDED.name, color = EXCLUDED.color,
           is_primary = EXCLUDED.is_primary, is_writable = EXCLUDED.is_writable`,
        [accountId, gcal.id, gcal.summary, gcal.backgroundColor, gcal.primary, isWritable],
      );
    }

    // Remove calendars that no longer exist on Google
    const googleIds = googleCalendars.map((c) => c.id);
    if (googleIds.length > 0) {
      await client.query(
        `DELETE FROM google_calendars 
         WHERE google_account_id = $1 AND google_calendar_id != ALL($2)`,
        [accountId, googleIds],
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return query<GoogleCalendar>(
    `SELECT * FROM google_calendars WHERE google_account_id = $1 ORDER BY is_primary DESC, name ASC`,
    [accountId],
  );
}

// ============================================================================
// Batch Sync (Cron)
// ============================================================================

/**
 * Syncs all active Google accounts. Called by cron job every 15 minutes.
 */
export async function syncAllUsers(): Promise<{
  totalAccounts: number;
  successCount: number;
  errorCount: number;
  errors: Array<{ accountId: string; error: string }>;
}> {
  const accounts = await getAllActiveGoogleAccounts();
  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ accountId: string; error: string }> = [];

  for (const account of accounts) {
    try {
      const result = await syncGoogleAccount(account.id);
      if (result.errors.length > 0) {
        errorCount++;
        errors.push({ accountId: account.id, error: result.errors.join('; ') });
      } else {
        successCount++;
      }
    } catch (error) {
      errorCount++;
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push({ accountId: account.id, error: message });
    }
  }

  return {
    totalAccounts: accounts.length,
    successCount,
    errorCount,
    errors,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function activityToGoogleEvent(activity: Activity): GoogleEventInput {
  const activityDate = new Date(activity.activity_date as string);
  const duration = activity.estimated_duration || 60; // Default 1 hour
  const endDate = new Date(activityDate.getTime() + duration * 60 * 1000);

  // Build description with CRM context
  const descParts: string[] = [];
  if (activity.objective) descParts.push(`Obiettivo: ${activity.objective}`);
  if (activity.notes) descParts.push(`Note: ${activity.notes}`);
  descParts.push(`[CRM Activity - ${activity.type || 'Altro'}]`);

  return {
    summary: activity.title || `${activity.type || 'Attività'} CRM`,
    description: descParts.join('\n'),
    start: { dateTime: activityDate.toISOString() },
    end: { dateTime: endDate.toISOString() },
  };
}

function googleEventToLocal(event: GoogleEventResult): Partial<CalendarEvent> {
  const startTime = event.start.dateTime || event.start.date;
  const endTime = event.end.dateTime || event.end.date;

  return {
    title: event.summary,
    description: event.description,
    location: event.location,
    start_time: startTime as string,
    end_time: endTime as string | undefined,
    all_day: !!event.start.date,
    status: event.status as CalendarEvent['status'],
    etag: event.etag,
    google_updated_at: event.updated,
    last_synced_at: new Date().toISOString(),
  };
}

async function insertLocalEvent(
  calendarId: string,
  event: GoogleEventResult,
): Promise<void> {
  const local = googleEventToLocal(event);
  await query(
    `INSERT INTO calendar_events (
       google_calendar_id, google_event_id, title, description, location,
       start_time, end_time, all_day, status, source, etag, google_updated_at, last_synced_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'google', $10, $11, now())
     ON CONFLICT (google_calendar_id, google_event_id) DO NOTHING`,
    [
      calendarId,
      event.id,
      local.title,
      local.description,
      local.location,
      local.start_time,
      local.end_time,
      local.all_day,
      local.status,
      local.etag,
      local.google_updated_at,
    ],
  );
}

async function updateLocalEvent(
  eventId: string,
  data: Partial<CalendarEvent>,
): Promise<void> {
  const updates: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  const fields: Array<[string, unknown]> = [
    ['title', data.title],
    ['description', data.description],
    ['location', data.location],
    ['start_time', data.start_time],
    ['end_time', data.end_time],
    ['all_day', data.all_day],
    ['status', data.status],
    ['etag', data.etag],
    ['google_updated_at', data.google_updated_at],
    ['last_synced_at', data.last_synced_at],
  ];

  for (const [field, value] of fields) {
    if (value !== undefined) {
      updates.push(`${field} = $${idx++}`);
      params.push(value);
    }
  }

  if (updates.length > 0) {
    params.push(eventId);
    await query(
      `UPDATE calendar_events SET ${updates.join(', ')} WHERE id = $${idx}`,
      params,
    );
  }
}
