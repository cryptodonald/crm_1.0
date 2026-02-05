import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getRecord, updateRecord } from '@/lib/airtable';
import { checkRateLimit } from '@/lib/ratelimit';
import type { AirtableNotification } from '@/types/developer';

/**
 * PATCH /api/notifications/[id]/read
 * Mark notification as read/unread
 * 
 * Body: { read: boolean }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success, limit: rateLimit, remaining } = await checkRateLimit(session.user.email, 'write');
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Fetch notification to verify recipient
    const notification = await getRecord<AirtableNotification>('notifications', id);
    
    // Verify current user is the recipient
    const isRecipient = (notification.fields.Recipient as string[] | undefined)?.includes(session.user.id || '');
    if (!isRecipient && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse body
    const body = await request.json();
    const readStatus = body.read !== undefined ? body.read : true;

    // Update notification
    const updatedNotification = await updateRecord<AirtableNotification>('notifications', id, {
      Read: readStatus,
    });

    return NextResponse.json(
      { notification: updatedNotification },
      {
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error(`[API] PATCH /api/notifications/[id]/read error:`, error);
    
    if (error.statusCode === 404) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}
