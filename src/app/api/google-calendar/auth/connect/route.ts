import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getAuthUrl } from '@/lib/google-calendar';
import { getUserByEmail } from '@/lib/postgres';
import { checkRateLimit } from '@/lib/ratelimit';

/**
 * GET /api/google-calendar/auth/connect
 * 
 * Generates a Google OAuth consent URL and redirects the user.
 * The state parameter encodes the Postgres user UUID for the callback.
 * We look up the real UUID from Postgres to handle stale JWTs.
 */
export async function GET() {
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

    // Look up real Postgres UUID by email (handles stale JWT with non-UUID IDs)
    const user = await getUserByEmail(session.user.email);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 },
      );
    }

    // Encode Postgres UUID in state for the callback
    const state = Buffer.from(
      JSON.stringify({ userId: user.id, ts: Date.now() }),
    ).toString('base64url');

    const authUrl = getAuthUrl(state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('[API] GET /api/google-calendar/auth/connect error:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth URL', code: 'AUTH_URL_ERROR' },
      { status: 500 },
    );
  }
}
