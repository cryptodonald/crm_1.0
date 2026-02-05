import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { activitiesTable } from '@/lib/airtable';
import { triggerOnUpdate, triggerOnDelete } from '@/lib/automation-engine';

/**
 * GET /api/activities/[id]
 * Get single activity by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const activity = await activitiesTable.find(id);
    return NextResponse.json(activity);
  } catch (error: any) {
    console.error('[API] GET /api/activities/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Activity not found' },
      { status: 404 }
    );
  }
}

/**
 * PATCH /api/activities/[id]
 * Update activity + trigger automations
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // Fetch previous state (per automazioni che controllano il before/after)
    const previousRecord = await activitiesTable.find(id);

    // Update activity
    const updatedActivity = await activitiesTable.update(id, body);

    // 🔥 Trigger automations (async, non-blocking)
    triggerOnUpdate('Activity', updatedActivity, previousRecord).catch(err => {
      console.error('[Automation] Error triggering onUpdate for Activity:', err);
    });

    return NextResponse.json(updatedActivity);
  } catch (error: any) {
    console.error('[API] PATCH /api/activities/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update activity' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/activities/[id]
 * Delete activity + trigger automations
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Fetch record before deletion (per audit/automazioni)
    const record = await activitiesTable.find(id);

    // Delete activity
    await activitiesTable.destroy(id);

    // 🔥 Trigger automations (async, non-blocking)
    triggerOnDelete('Activity', record).catch(err => {
      console.error('[Automation] Error triggering onDelete for Activity:', err);
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API] DELETE /api/activities/[id] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete activity' },
      { status: 500 }
    );
  }
}
