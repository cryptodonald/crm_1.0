import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { exchangeCodeForTokens, getGoogleUserEmail } from '@/lib/google-calendar';
import { encrypt } from '@/lib/encryption';
import { query, getUserByEmail } from '@/lib/postgres';
import { refreshCalendarList } from '@/lib/calendar-sync';
import { env } from '@/env';

/**
 * GET /api/google-calendar/auth/callback
 * 
 * Google OAuth callback. Receives authorization code, exchanges for tokens,
 * encrypts and stores them, then fetches calendar list.
 * 
 * User ID is resolved from Postgres via email (not from JWT) to handle
 * stale JWTs that may contain Airtable-format IDs.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle denial
    if (error) {
      console.warn('[GoogleCalendar] OAuth denied:', error);
      return NextResponse.redirect(
        `${env.NEXTAUTH_URL}/settings/calendar?error=access_denied`,
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${env.NEXTAUTH_URL}/settings/calendar?error=missing_params`,
      );
    }

    // Verify state freshness (CSRF protection)
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64url').toString());

      // Check state freshness (max 10 minutes)
      if (Date.now() - stateData.ts > 10 * 60 * 1000) {
        return NextResponse.redirect(
          `${env.NEXTAUTH_URL}/settings/calendar?error=state_expired`,
        );
      }
    } catch {
      return NextResponse.redirect(
        `${env.NEXTAUTH_URL}/settings/calendar?error=invalid_state`,
      );
    }

    // Resolve real Postgres UUID from session email
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.redirect(
        `${env.NEXTAUTH_URL}/settings/calendar?error=unauthorized`,
      );
    }

    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.redirect(
        `${env.NEXTAUTH_URL}/settings/calendar?error=user_not_found`,
      );
    }

    const userId = user.id; // Real Postgres UUID

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get Google email
    const googleEmail = await getGoogleUserEmail(tokens.access_token);

    // Encrypt tokens
    const accessTokenEncrypted = encrypt(tokens.access_token);
    const refreshTokenEncrypted = encrypt(tokens.refresh_token);

    // Upsert Google account
    const result = await query<{ id: string }>(
      `INSERT INTO google_accounts (
         user_id, google_email, access_token_encrypted, refresh_token_encrypted,
         token_expires_at, scopes, is_corporate
       ) VALUES ($1, $2, $3, $4, $5, $6, false)
       ON CONFLICT (user_id, google_email) DO UPDATE SET
         access_token_encrypted = EXCLUDED.access_token_encrypted,
         refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
         token_expires_at = EXCLUDED.token_expires_at,
         scopes = EXCLUDED.scopes,
         sync_status = 'idle',
         sync_error = NULL,
         connected_at = now()
       RETURNING id`,
      [
        userId,
        googleEmail,
        accessTokenEncrypted,
        refreshTokenEncrypted,
        new Date(tokens.expiry_date).toISOString(),
        tokens.scope.split(' '),
      ],
    );

    const accountId = result[0]?.id;

    // Fetch calendar list immediately
    if (accountId) {
      try {
        await refreshCalendarList(accountId);
      } catch (calError) {
        console.error('[GoogleCalendar] Failed to fetch initial calendar list:', calError);
      }
    }

    return NextResponse.redirect(
      `${env.NEXTAUTH_URL}/settings/calendar?success=connected`,
    );
  } catch (error) {
    console.error('[API] GET /api/google-calendar/auth/callback error:', error);
    return NextResponse.redirect(
      `${env.NEXTAUTH_URL}/settings/calendar?error=connection_failed`,
    );
  }
}
