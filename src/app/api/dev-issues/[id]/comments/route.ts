import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { findRecords, createRecord } from '@/lib/airtable';
import { checkRateLimit } from '@/lib/ratelimit';
import type { AirtableDevIssueComment, CreateDevIssueCommentInput } from '@/types/developer';

/**
 * GET /api/dev-issues/[id]/comments
 * Fetch all comments for an issue
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

    // Admin-only access
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { success, limit: rateLimit, remaining } = await checkRateLimit(session.user.email, 'read');
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Fetch comments for this issue
    const comments = await findRecords<AirtableDevIssueComment>('devIssueComments', {
      filterByFormula: `FIND('${id}', ARRAYJOIN({Issue}))`,
      sort: [{ field: 'createdTime', direction: 'asc' }],
    });

    return NextResponse.json(
      { comments, total: comments.length },
      {
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error(`[API] GET /api/dev-issues/[id]/comments error:`, error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

/**
 * POST /api/dev-issues/[id]/comments
 * Create new comment on issue
 * 
 * Body: { content: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin-only access
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { success, limit: rateLimit, remaining } = await checkRateLimit(session.user.email, 'write');
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // Parse body
    const body = await request.json();

    // Validation
    if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Content is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Create comment
    const comment = await createRecord<AirtableDevIssueComment>('devIssueComments', {
      Content: body.content,
      Issue: [id],
      Author: session.user.id ? [session.user.id] : undefined,
    });

    // TODO: Send notification to issue assignee/watchers
    // Implement notification logic

    return NextResponse.json(
      { comment },
      {
        status: 201,
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error(`[API] POST /api/dev-issues/[id]/comments error:`, error);
    return NextResponse.json(
      { error: 'Failed to create comment', code: 'CREATE_ERROR' },
      { status: 500 }
    );
  }
}
