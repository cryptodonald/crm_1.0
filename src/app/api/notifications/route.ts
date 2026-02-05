import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { findRecords } from '@/lib/airtable';
import { checkRateLimit } from '@/lib/ratelimit';
import type { AirtableNotification } from '@/types/developer';

/**
 * GET /api/notifications
 * Fetch notifications for current user
 * 
 * Query params:
 * - unread: 'true' to filter unread only
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success, limit: rateLimit, remaining } = await checkRateLimit(session.user.email, 'read');
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    // Build filter for current user
    const filters: string[] = [];
    
    if (session.user.id) {
      filters.push(`FIND('${session.user.id}', ARRAYJOIN({Recipient}))`);
    }

    if (unreadOnly) {
      filters.push(`{Read} = FALSE()`);
    }

    const filterFormula = filters.length > 0 ? `AND(${filters.join(', ')})` : undefined;

    const options: any = {
      maxRecords: 50, // Limit to last 50 notifications
    };
    if (filterFormula) {
      options.filterByFormula = filterFormula;
    }
    const notifications = await findRecords<AirtableNotification>('notifications', options);

    // Count unread
    const unreadCount = notifications.filter(n => !n.fields.Read).length;

    return NextResponse.json(
      { notifications, total: notifications.length, unreadCount },
      {
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error('[API] GET /api/notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
