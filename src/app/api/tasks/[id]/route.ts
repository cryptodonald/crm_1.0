import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getTaskById, updateTask, deleteTask } from '@/lib/postgres';
import { checkRateLimit } from '@/lib/ratelimit';
import type { TaskUpdateInput } from '@/types/database';

const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).nullish(),
  status: z.string().max(50).optional(),
  priority: z.string().max(20).optional(),
  due_date: z.string().nullish(),
  assigned_to_id: z.string().uuid().nullish(),
}).refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

/**
 * GET /api/tasks/[id]
 * Fetch single task by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success, limit: rateLimit, remaining } = await checkRateLimit(session.user.email, 'read');
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const task = await getTaskById(id);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task }, {
      headers: {
        'X-RateLimit-Limit': rateLimit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
      },
    });
  } catch (error: unknown) {
    console.error(`[API] GET /api/tasks/[id] error:`, error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

/**
 * PATCH /api/tasks/[id]
 * Update task (only assignee or Admin/Manager can update)
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

    // Fetch task to check permissions
    const existingTask = await getTaskById(id);

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    // Check if user is assignee, creator, or Admin/Manager
    const isAssignee = existingTask.assigned_to_id === session.user.id;
    const isCreator = existingTask.created_by_id === session.user.id;
    const isAdminOrManager = ['admin', 'manager'].includes(session.user.role || '');

    if (!isAssignee && !isCreator && !isAdminOrManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = updateTaskSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Map validated data to Postgres schema (body is safe after Zod validation)
    const input: TaskUpdateInput = {};
    if (body.title !== undefined) input.title = body.title;
    if (body.description !== undefined) input.description = body.description;
    if (body.status !== undefined) input.status = body.status;
    if (body.priority !== undefined) input.priority = body.priority;
    if (body.due_date !== undefined) input.due_date = body.due_date;
    if (body.assigned_to_id !== undefined) input.assigned_to_id = body.assigned_to_id;

    const task = await updateTask(id, input);

    return NextResponse.json({ task }, {
      headers: {
        'X-RateLimit-Limit': rateLimit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
      },
    });
  } catch (error: unknown) {
    console.error(`[API] PATCH /api/tasks/[id] error:`, error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

/**
 * DELETE /api/tasks/[id]
 * Delete task (only creator or Admin can delete)
 */
export async function DELETE(
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

    // Fetch task to check permissions
    const existingTask = await getTaskById(id);

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    
    const isCreator = existingTask.created_by_id === session.user.id;
    const isAdmin = session.user.role === 'admin';

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteTask(id);

    return NextResponse.json({ success: true, message: 'Task deleted' }, {
      headers: {
        'X-RateLimit-Limit': rateLimit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
      },
    });
  } catch (error: unknown) {
    console.error(`[API] DELETE /api/tasks/[id] error:`, error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
