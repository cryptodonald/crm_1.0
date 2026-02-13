/**
 * Google Calendar API Client
 * 
 * Wrapper around googleapis for Calendar operations.
 * Handles OAuth2 client creation, token refresh, and all Calendar API calls.
 */

import { google, calendar_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { env } from '@/env';
import { encrypt, decrypt } from '@/lib/encryption';
import { query, queryOne } from '@/lib/postgres';
import type { GoogleAccount } from '@/types/database';

// ============================================================================
// Types
// ============================================================================

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  scope: string;
}

export interface CalendarListItem {
  id: string;
  summary: string;
  backgroundColor: string | null;
  primary: boolean;
  accessRole: string; // 'owner' | 'writer' | 'reader' | 'freeBusyReader'
}

export interface GoogleEventInput {
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime: string; timeZone?: string } | { date: string };
  end: { dateTime: string; timeZone?: string } | { date: string };
  colorId?: string;
  recurrence?: string[];
}

export interface GoogleEventResult {
  id: string;
  summary: string | null;
  description: string | null;
  location: string | null;
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  status: string;
  etag: string;
  updated: string;
  colorId?: string;
  recurrence?: string[];
  htmlLink?: string;
}

// ============================================================================
// OAuth2 Client
// ============================================================================

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

/**
 * Creates a base OAuth2 client (without tokens).
 * Used to generate the auth URL for the connect flow.
 */
export function createOAuth2Client(): OAuth2Client {
  const redirectUri = env.GOOGLE_CALENDAR_REDIRECT_URI || 
    `${env.NEXTAUTH_URL}/api/google-calendar/auth/callback`;

  return new google.auth.OAuth2(
    env.GOOGLE_OAUTH_CLIENT_ID,
    env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectUri,
  );
}

/**
 * Generates the Google OAuth consent URL for calendar access.
 */
export function getAuthUrl(state: string): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent', // Force consent to always get refresh_token
    include_granted_scopes: true,
  });
}

/**
 * Exchanges an authorization code for tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens> {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to obtain tokens from Google. Missing access_token or refresh_token.');
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date || Date.now() + 3600 * 1000,
    scope: tokens.scope || SCOPES.join(' '),
  };
}

/**
 * Gets the Google user email from the token.
 */
export async function getGoogleUserEmail(accessToken: string): Promise<string> {
  const oauth2 = google.oauth2({ version: 'v2' });
  const client = createOAuth2Client();
  client.setCredentials({ access_token: accessToken });

  const { data } = await oauth2.userinfo.get({ auth: client });
  if (!data.email) {
    throw new Error('Could not retrieve email from Google account');
  }
  return data.email;
}

/**
 * Creates an authenticated OAuth2 client from a stored GoogleAccount.
 * Handles token refresh automatically and updates DB if tokens change.
 */
export async function getAuthenticatedClient(account: GoogleAccount): Promise<OAuth2Client> {
  const client = createOAuth2Client();
  
  const accessToken = decrypt(account.access_token_encrypted);
  const refreshToken = decrypt(account.refresh_token_encrypted);

  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: new Date(account.token_expires_at).getTime(),
  });

  // Listen for token refresh events and update DB
  client.on('tokens', async (tokens) => {
    try {
      const updates: string[] = [];
      const params: unknown[] = [];
      let paramIdx = 1;

      if (tokens.access_token) {
        updates.push(`access_token_encrypted = $${paramIdx++}`);
        params.push(encrypt(tokens.access_token));
      }
      if (tokens.refresh_token) {
        updates.push(`refresh_token_encrypted = $${paramIdx++}`);
        params.push(encrypt(tokens.refresh_token));
      }
      if (tokens.expiry_date) {
        updates.push(`token_expires_at = $${paramIdx++}`);
        params.push(new Date(tokens.expiry_date).toISOString());
      }

      if (updates.length > 0) {
        params.push(account.id);
        await query(
          `UPDATE google_accounts SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
          params,
        );
      }
    } catch (error) {
      console.error('[GoogleCalendar] Failed to update refreshed tokens:', error);
    }
  });

  return client;
}

/**
 * Revokes a Google OAuth token.
 */
export async function revokeToken(account: GoogleAccount): Promise<void> {
  try {
    const client = createOAuth2Client();
    const accessToken = decrypt(account.access_token_encrypted);
    await client.revokeToken(accessToken);
  } catch (error) {
    // Token may already be invalid, log but don't throw
    console.warn('[GoogleCalendar] Token revocation failed (may already be revoked):', error);
  }
}

// ============================================================================
// Calendar API Operations
// ============================================================================

function getCalendarClient(auth: OAuth2Client): calendar_v3.Calendar {
  return google.calendar({ version: 'v3', auth });
}

/**
 * Lists all calendars the user has access to.
 */
export async function listCalendars(auth: OAuth2Client): Promise<CalendarListItem[]> {
  const calendar = getCalendarClient(auth);
  const { data } = await calendar.calendarList.list({
    minAccessRole: 'reader',
  });

  return (data.items || []).map((item) => ({
    id: item.id || '',
    summary: item.summary || 'Unnamed Calendar',
    backgroundColor: item.backgroundColor || null,
    primary: item.primary || false,
    accessRole: item.accessRole || 'reader',
  }));
}

/**
 * Lists events from a calendar, either full sync or incremental.
 */
export async function listEvents(
  auth: OAuth2Client,
  calendarId: string,
  opts: {
    syncToken?: string;
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
  } = {},
): Promise<{
  events: GoogleEventResult[];
  nextSyncToken: string | null;
  nextPageToken: string | null;
}> {
  const calendar = getCalendarClient(auth);
  const allEvents: GoogleEventResult[] = [];
  let pageToken: string | undefined;
  let nextSyncToken: string | null = null;

  do {
    const params: calendar_v3.Params$Resource$Events$List = {
      calendarId,
      maxResults: opts.maxResults || 250,
      singleEvents: true,
      orderBy: 'startTime',
      pageToken,
    };

    // Incremental sync with syncToken
    if (opts.syncToken) {
      params.syncToken = opts.syncToken;
    } else {
      // Full sync with time range
      if (opts.timeMin) params.timeMin = opts.timeMin;
      if (opts.timeMax) params.timeMax = opts.timeMax;
    }

    try {
      const { data } = await calendar.events.list(params);

      for (const item of data.items || []) {
        allEvents.push(mapGoogleEvent(item));
      }

      pageToken = data.nextPageToken || undefined;
      nextSyncToken = data.nextSyncToken || null;
    } catch (error: unknown) {
      // If syncToken is invalid (410 Gone), caller should do full sync
      if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 410) {
        return { events: [], nextSyncToken: null, nextPageToken: null };
      }
      throw error;
    }
  } while (pageToken);

  return { events: allEvents, nextSyncToken, nextPageToken: null };
}

/**
 * Creates an event on Google Calendar.
 */
export async function createEvent(
  auth: OAuth2Client,
  calendarId: string,
  event: GoogleEventInput,
): Promise<GoogleEventResult> {
  const calendar = getCalendarClient(auth);
  const { data } = await calendar.events.insert({
    calendarId,
    requestBody: event,
  });
  return mapGoogleEvent(data);
}

/**
 * Updates an existing event on Google Calendar.
 */
export async function updateEvent(
  auth: OAuth2Client,
  calendarId: string,
  eventId: string,
  event: Partial<GoogleEventInput>,
): Promise<GoogleEventResult> {
  const calendar = getCalendarClient(auth);
  const { data } = await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: event,
  });
  return mapGoogleEvent(data);
}

/**
 * Deletes an event from Google Calendar.
 */
export async function deleteEvent(
  auth: OAuth2Client,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const calendar = getCalendarClient(auth);
  await calendar.events.delete({
    calendarId,
    eventId,
  });
}

/**
 * Gets a single event by ID (used for conflict detection).
 */
export async function getEvent(
  auth: OAuth2Client,
  calendarId: string,
  eventId: string,
): Promise<GoogleEventResult | null> {
  const calendar = getCalendarClient(auth);
  try {
    const { data } = await calendar.events.get({
      calendarId,
      eventId,
    });
    return mapGoogleEvent(data);
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 404) {
      return null;
    }
    throw error;
  }
}

// ============================================================================
// DB Helpers
// ============================================================================

/**
 * Gets all Google accounts for a user.
 */
export async function getGoogleAccountsForUser(userId: string): Promise<GoogleAccount[]> {
  return query<GoogleAccount>(
    `SELECT * FROM google_accounts WHERE user_id = $1 ORDER BY connected_at ASC`,
    [userId],
  );
}

/**
 * Gets a Google account by ID.
 */
export async function getGoogleAccountById(accountId: string): Promise<GoogleAccount | null> {
  return queryOne<GoogleAccount>(
    `SELECT * FROM google_accounts WHERE id = $1`,
    [accountId],
  );
}

/**
 * Gets all active Google accounts (for cron sync).
 */
export async function getAllActiveGoogleAccounts(): Promise<GoogleAccount[]> {
  return query<GoogleAccount>(
    `SELECT * FROM google_accounts WHERE sync_status != 'error' OR sync_error IS NULL ORDER BY last_sync_at ASC NULLS FIRST`,
  );
}

// ============================================================================
// Helpers
// ============================================================================

function mapGoogleEvent(item: calendar_v3.Schema$Event): GoogleEventResult {
  return {
    id: item.id || '',
    summary: item.summary || null,
    description: item.description || null,
    location: item.location || null,
    start: {
      dateTime: item.start?.dateTime || undefined,
      date: item.start?.date || undefined,
      timeZone: item.start?.timeZone || undefined,
    },
    end: {
      dateTime: item.end?.dateTime || undefined,
      date: item.end?.date || undefined,
      timeZone: item.end?.timeZone || undefined,
    },
    status: item.status || 'confirmed',
    etag: item.etag || '',
    updated: item.updated || new Date().toISOString(),
    colorId: item.colorId || undefined,
    recurrence: item.recurrence || undefined,
    htmlLink: item.htmlLink || undefined,
  };
}
