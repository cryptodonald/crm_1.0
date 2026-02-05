import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { activitiesTable, findRecords } from '@/lib/airtable';
import { triggerOnCreate } from '@/lib/automation-engine';
import type { AirtableActivity } from '@/types/airtable.generated';

/**
 * GET /api/activities
 * Fetch activities with optional filters
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');

    const filterFormula = leadId 
      ? `FIND("${leadId}", {ID Lead})` 
      : undefined;

    const activities = await findRecords<AirtableActivity>('activities', {
      filterByFormula: filterFormula,
      sort: [{ field: 'Data', direction: 'desc' }],
    });

    return NextResponse.json({ activities });
  } catch (error: any) {
    console.error('[API] GET /api/activities error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/activities
 * Create new activity + trigger automations
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Create activity
    const newActivity = await activitiesTable.create(body);

    // 🔥 Trigger automations (async, non-blocking)
    triggerOnCreate('Activity', newActivity).catch(err => {
      console.error('[Automation] Error triggering onCreate for Activity:', err);
    });

    return NextResponse.json(newActivity, { status: 201 });
  } catch (error: any) {
    console.error('[API] POST /api/activities error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create activity' },
      { status: 500 }
    );
  }
}
