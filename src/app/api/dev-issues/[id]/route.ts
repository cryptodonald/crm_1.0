import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getRecord, updateRecord, deleteRecord } from '@/lib/airtable';
import { checkRateLimit } from '@/lib/ratelimit';
import type { AirtableDevIssue, UpdateDevIssueInput } from '@/types/developer';

/**
 * GET /api/dev-issues/[id]
 * Fetch single dev issue by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only access
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rate limit check
    const { success, limit: rateLimit, remaining } = await checkRateLimit(session.user.email, 'read');
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const issue = await getRecord<AirtableDevIssue>('devIssues', id);

    return NextResponse.json(
      { issue },
      {
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error(`[API] GET /api/dev-issues/[id] error:`, error);
    
    if (error.statusCode === 404) {
      return NextResponse.json(
        { error: 'Issue not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to fetch issue', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/dev-issues/[id]
 * Update dev issue
 * 
 * Body: UpdateDevIssueInput (partial)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only access
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rate limit check
    const { success, limit: rateLimit, remaining } = await checkRateLimit(session.user.email, 'write');
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    // Parse body
    const body: UpdateDevIssueInput = await request.json();

    // Update issue
    const issue = await updateRecord<AirtableDevIssue>('devIssues', id, body);

    return NextResponse.json(
      { issue },
      {
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error(`[API] PATCH /api/dev-issues/[id] error:`, error);
    
    if (error.statusCode === 404) {
      return NextResponse.json(
        { error: 'Issue not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to update issue', code: 'UPDATE_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dev-issues/[id]
 * Delete dev issue (hard delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only access
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rate limit check
    const { success, limit: rateLimit, remaining } = await checkRateLimit(session.user.email, 'write');
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    await deleteRecord('devIssues', id);

    return NextResponse.json(
      { success: true, message: 'Issue deleted successfully' },
      {
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error(`[API] DELETE /api/dev-issues/[id] error:`, error);
    
    if (error.statusCode === 404) {
      return NextResponse.json(
        { error: 'Issue not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to delete issue', code: 'DELETE_ERROR' },
      { status: 500 }
    );
  }
}
