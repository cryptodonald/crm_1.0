import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { findRecords, createRecord } from '@/lib/airtable';
import { checkRateLimit } from '@/lib/ratelimit';
import type { AirtableUserTask, CreateUserTaskInput } from '@/types/developer';

/**
 * GET /api/tasks
 * Fetch user tasks with optional filters
 * 
 * Query params:
 * - status: comma-separated status values
 * - priority: comma-separated priority values
 * - type: comma-separated type values
 * - assignedTo: user ID filter (default: current user)
 * - mine: 'true' to filter by current user (default: false)
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check
    const { success, limit: rateLimit, remaining, reset } = await checkRateLimit(session.user.email, 'read');
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED', retryAfter: reset },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const priorityParam = searchParams.get('priority');
    const typeParam = searchParams.get('type');
    const assignedToParam = searchParams.get('assignedTo');
    const mineParam = searchParams.get('mine');

    // Build filter formula
    const filters: string[] = [];

    if (statusParam) {
      const statuses = statusParam.split(',');
      const statusFilters = statuses.map(s => `{Status} = '${s}'`).join(', ');
      filters.push(`OR(${statusFilters})`);
    }

    if (priorityParam) {
      const priorities = priorityParam.split(',');
      const priorityFilters = priorities.map(p => `{Priority} = '${p}'`).join(', ');
      filters.push(`OR(${priorityFilters})`);
    }

    if (typeParam) {
      const types = typeParam.split(',');
      const typeFilters = types.map(t => `{Type} = '${t}'`).join(', ');
      filters.push(`OR(${typeFilters})`);
    }

    // Filter by assignedTo or current user
    if (mineParam === 'true' && session.user.id) {
      filters.push(`FIND('${session.user.id}', ARRAYJOIN({AssignedTo}))`);
    } else if (assignedToParam) {
      filters.push(`FIND('${assignedToParam}', ARRAYJOIN({AssignedTo}))`);
    }

    const filterFormula = filters.length > 0 ? `AND(${filters.join(', ')})` : undefined;

    // Fetch tasks
    const options: any = {
      sort: [
        { field: 'Priority', direction: 'desc' },
        { field: 'DueDate', direction: 'asc' }
      ],
    };
    if (filterFormula) {
      options.filterByFormula = filterFormula;
    }
    const tasks = await findRecords<AirtableUserTask>('userTasks', options);

    return NextResponse.json(
      { tasks, total: tasks.length },
      {
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error('[API] GET /api/tasks error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tasks', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tasks
 * Create new user task
 * 
 * Body: CreateUserTaskInput
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check
    const { success, limit: rateLimit, remaining, reset } = await checkRateLimit(session.user.email, 'write');
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED', retryAfter: reset },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      );
    }

    // Parse body
    const body: CreateUserTaskInput = await request.json();

    // Validation
    if (!body.Title || typeof body.Title !== 'string' || body.Title.trim().length === 0) {
      return NextResponse.json(
        { error: 'Title is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!body.Type) {
      return NextResponse.json(
        { error: 'Type is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Create task
    const task = await createRecord<AirtableUserTask>('userTasks', {
      Title: body.Title,
      Description: body.Description,
      Type: body.Type,
      Status: body.Status || 'todo',
      Priority: body.Priority || 'medium',
      DueDate: body.DueDate,
      CreatedBy: body.CreatedBy || (session.user.id ? [session.user.id] : undefined),
      AssignedTo: body.AssignedTo || (session.user.id ? [session.user.id] : undefined),
      RelatedLead: body.RelatedLead,
      RelatedActivity: body.RelatedActivity,
      RelatedOrder: body.RelatedOrder,
    });

    // TODO: Send notification if assigned to someone else
    if (body.AssignedTo && body.AssignedTo[0] !== session.user.id) {
      // Implement notification logic
    }

    return NextResponse.json(
      { task },
      {
        status: 201,
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error('[API] POST /api/tasks error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create task', code: 'CREATE_ERROR' },
      { status: 500 }
    );
  }
}
