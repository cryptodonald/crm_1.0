import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getActivities, createActivity } from '@/lib/postgres';
import { checkRateLimit } from '@/lib/ratelimit';
import type { ActivityCreateInput, ActivityType, ActivityStatus } from '@/types/database';
// import { triggerOnCreate } from '@/lib/automation-engine'; // TODO: Migra automations dopo

/**
 * GET /api/activities
 * Fetch activities with optional filters
 * 
 * Query params:
 * - lead_id: filter by lead UUID
 * - assigned_to: filter by user UUID
 * - type: activity type (or comma-separated)
 * - status: activity status (or comma-separated)
 * - search: FTS search query
 * - page: page number (default 1)
 * - limit: results per page (default 50)
 */
export async function GET(request: NextRequest) {
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const lead_id = searchParams.get('lead_id') || undefined;
    const assigned_to = searchParams.get('assigned_to') || undefined;
    const typeParam = searchParams.get('type');
    const statusParam = searchParams.get('status');
    const search = searchParams.get('search') || undefined;
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    const type = typeParam ? typeParam.split(',') as ActivityType[] : undefined;
    const status = statusParam ? statusParam.split(',') as ActivityStatus[] : undefined;
    const page = pageParam ? parseInt(pageParam) : 1;
    const limit = limitParam ? parseInt(limitParam) : 50;

    // Fetch activities with pagination
    const result = await getActivities({
      lead_id,
      assigned_to,
      type,
      status,
      search,
      page,
      limit,
    });

    return NextResponse.json(
      {
        activities: result.data,
        total: result.pagination.total,
        pagination: result.pagination,
      },
      {
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: unknown) {
    console.error('[API] GET /api/activities error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/activities
 * Create new activity
 * 
 * Body: { title, type?, activity_date?, lead_id?, assigned_to?, status?, notes?, outcome?, objective?, priority?, estimated_duration? }
 */
export async function POST(request: NextRequest) {
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

    // Parse body
    const body = await request.json();

    // Validation
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
      return NextResponse.json(
        { error: 'title is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Map input to Postgres schema
    const input: ActivityCreateInput = {
      title: body.title,
      type: body.type || null,
      activity_date: body.activity_date || null,
      lead_id: body.lead_id || null,
      assigned_to: body.assigned_to || null,
      status: body.status || 'Da fare',
      notes: body.notes || null,
      estimated_duration: body.estimated_duration || body.duration_minutes || null,
      outcome: body.outcome || null,
      objective: body.objective || null,
      priority: body.priority || null,
    };

    // Create activity
    const newActivity = await createActivity(input);

    // TODO: Trigger automations (commentato per ora)
    // triggerOnCreate('Activity', newActivity).catch(err => {
    //   console.error('[Automation] Error triggering onCreate for Activity:', err);
    // });

    return NextResponse.json(
      { activity: newActivity },
      {
        status: 201,
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: unknown) {
    console.error('[API] POST /api/activities error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create activity' },
      { status: 500 }
    );
  }
}
