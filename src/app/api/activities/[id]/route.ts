import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getActivityById, updateActivity, deleteActivity } from '@/lib/postgres';
import { checkRateLimit } from '@/lib/ratelimit';
import type { ActivityUpdateInput } from '@/types/database';
// import { triggerOnUpdate, triggerOnDelete } from '@/lib/automation-engine'; // TODO: Migra automations dopo

/**
 * GET /api/activities/[id]
 * Get single activity by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Rate limit check
    const { success, limit: rateLimit, remaining } = await checkRateLimit(session.user.email, 'read');
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { id } = await params;
    const activity = await getActivityById(id);

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    return NextResponse.json(
      { activity },
      {
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: unknown) {
    console.error('[API] GET /api/activities/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Activity not found' },
      { status: 404 }
    );
  }
}

/**
 * PATCH /api/activities/[id]
 * Update activity
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Rate limit check
    const { success, limit: rateLimit, remaining } = await checkRateLimit(session.user.email, 'write');
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validation
    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Map to Postgres schema
    const input: ActivityUpdateInput = {};
    if (body.title !== undefined) input.title = body.title;
    if (body.type !== undefined) input.type = body.type;
    if (body.activity_date !== undefined) input.activity_date = body.activity_date;
    if (body.lead_id !== undefined) input.lead_id = body.lead_id;
    if (body.assigned_to !== undefined) input.assigned_to = body.assigned_to;
    if (body.status !== undefined) input.status = body.status;
    if (body.notes !== undefined) input.notes = body.notes;
    if (body.estimated_duration !== undefined) input.estimated_duration = body.estimated_duration;
    if (body.duration_minutes !== undefined) input.estimated_duration = body.duration_minutes;
    if (body.outcome !== undefined) input.outcome = body.outcome;
    if (body.objective !== undefined) input.objective = body.objective;
    if (body.priority !== undefined) input.priority = body.priority;

    // TODO: Fetch previous state per automations
    // const previousRecord = await getActivityById(id);

    // Update activity
    const updatedActivity = await updateActivity(id, input);

    // TODO: Trigger automations (commentato per ora)
    // triggerOnUpdate('Activity', updatedActivity, previousRecord).catch(err => {
    //   console.error('[Automation] Error triggering onUpdate for Activity:', err);
    // });

    return NextResponse.json(
      { activity: updatedActivity },
      {
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: unknown) {
    console.error('[API] PATCH /api/activities/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update activity' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/activities/[id]
 * Delete activity
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Rate limit check
    const { success, limit: rateLimit, remaining } = await checkRateLimit(session.user.email, 'write');
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { id } = await params;

    // TODO: Fetch record before deletion (per audit/automazioni)
    // const record = await getActivityById(id);

    // Delete activity
    await deleteActivity(id);

    // TODO: Trigger automations (commentato per ora)
    // triggerOnDelete('Activity', record).catch(err => {
    //   console.error('[Automation] Error triggering onDelete for Activity:', err);
    // });

    return NextResponse.json(
      { success: true, message: 'Activity deleted' },
      {
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: unknown) {
    console.error('[API] DELETE /api/activities/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete activity' },
      { status: 500 }
    );
  }
}
