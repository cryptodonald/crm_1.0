import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getRecord, updateRecord, deleteRecord } from '@/lib/airtable';
import { checkRateLimit } from '@/lib/ratelimit';
import type { AirtableUserTask, UpdateUserTaskInput } from '@/types/developer';

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

    const task = await getRecord<AirtableUserTask>('userTasks', id);

    return NextResponse.json({ task }, {
      headers: {
        'X-RateLimit-Limit': rateLimit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
      },
    });
  } catch (error: any) {
    console.error(`[API] GET /api/tasks/[id] error:`, error);
    
    if (error.statusCode === 404) {
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
    const existingTask = await getRecord<AirtableUserTask>('userTasks', id);
    
    // Check if user is assignee, creator, or Admin/Manager
    const isAssignee = (existingTask.fields.AssignedTo as string[] | undefined)?.includes(session.user.id || '');
    const isCreator = (existingTask.fields.CreatedBy as string[] | undefined)?.includes(session.user.id || '');
    const isAdminOrManager = ['admin', 'manager'].includes(session.user.role || '');

    if (!isAssignee && !isCreator && !isAdminOrManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: UpdateUserTaskInput = await request.json();

    // Note: CompletedAt is a formula field in Airtable, not manually editable
    // It will auto-update when Status changes to 'done'

    const task = await updateRecord<AirtableUserTask>('userTasks', id, body);

    return NextResponse.json({ task }, {
      headers: {
        'X-RateLimit-Limit': rateLimit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
      },
    });
  } catch (error: any) {
    console.error(`[API] PATCH /api/tasks/[id] error:`, error);
    
    if (error.statusCode === 404) {
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
    const existingTask = await getRecord<AirtableUserTask>('userTasks', id);
    
    const isCreator = (existingTask.fields.CreatedBy as string[] | undefined)?.includes(session.user.id || '');
    const isAdmin = session.user.role === 'admin';

    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteRecord('userTasks', id);

    return NextResponse.json({ success: true, message: 'Task deleted' }, {
      headers: {
        'X-RateLimit-Limit': rateLimit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
      },
    });
  } catch (error: any) {
    console.error(`[API] DELETE /api/tasks/[id] error:`, error);
    
    if (error.statusCode === 404) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
