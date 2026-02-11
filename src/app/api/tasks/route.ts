import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getTasks, createTask } from '@/lib/postgres';
import { checkRateLimit } from '@/lib/ratelimit';
import type { TaskCreateInput, TaskStatus, Priority } from '@/types/database';

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
    const assigned_to_id = searchParams.get('assignedTo') || searchParams.get('assigned_to_id') || undefined;
    const lead_id = searchParams.get('lead_id') || undefined;
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    const status = statusParam ? statusParam.split(',') as TaskStatus[] : undefined;
    const priority = priorityParam ? priorityParam.split(',') as Priority[] : undefined;
    const page = pageParam ? parseInt(pageParam) : 1;
    const limit = limitParam ? parseInt(limitParam) : 50;

    // Fetch tasks with pagination
    const result = await getTasks({
      assigned_to_id,
      lead_id,
      status,
      priority,
      page,
      limit,
      sort_by: 'due_date',
      sort_order: 'asc',
    });

    return NextResponse.json(
      { 
        tasks: result.data, 
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
    console.error('[API] GET /api/tasks error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch tasks', code: 'FETCH_ERROR' },
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
    const body = await request.json();

    // Validation
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
      return NextResponse.json(
        { error: 'title is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (!body.type) {
      return NextResponse.json(
        { error: 'type is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Map input to Postgres schema
    const input: TaskCreateInput = {
      title: body.title,
      description: body.description || null,
      type: body.type,
      status: body.status || 'todo',
      priority: body.priority || 'medium',
      due_date: body.due_date || null,
      created_by_id: body.created_by_id || null,
      assigned_to_id: body.assigned_to_id || null,
      lead_id: body.lead_id || null,
      activity_id: body.activity_id || null,
    };

    // Create task
    const task = await createTask(input);

    // TODO: Send notification if assigned to someone else
    if (body.assigned_to_id && body.assigned_to_id !== session.user.id) {
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
  } catch (error: unknown) {
    console.error('[API] POST /api/tasks error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create task', code: 'CREATE_ERROR' },
      { status: 500 }
    );
  }
}
