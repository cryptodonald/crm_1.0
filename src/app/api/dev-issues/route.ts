import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { findRecords, createRecord } from '@/lib/airtable';
import { checkRateLimit } from '@/lib/ratelimit';
import type { AirtableDevIssue, CreateDevIssueInput } from '@/types/developer';

/**
 * GET /api/dev-issues
 * Fetch dev issues with optional filters
 * 
 * Query params:
 * - status: comma-separated status values
 * - priority: comma-separated priority values
 * - type: comma-separated type values
 * - assignedTo: user ID filter
 */
export async function GET(request: NextRequest) {
  try {
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
    const assignedTo = searchParams.get('assignedTo');

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

    if (assignedTo) {
      filters.push(`FIND('${assignedTo}', ARRAYJOIN({AssignedTo}))`);
    }

    const filterFormula = filters.length > 0 ? `AND(${filters.join(', ')})` : undefined;

    // Fetch issues
    const options: any = {
      sort: [{ field: 'Priority', direction: 'desc' }],
    };
    if (filterFormula) {
      options.filterByFormula = filterFormula;
    }
    const issues = await findRecords<AirtableDevIssue>('devIssues', options);

    return NextResponse.json(
      { issues, total: issues.length },
      {
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error('[API] GET /api/dev-issues error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dev issues', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dev-issues
 * Create new dev issue
 * 
 * Body: CreateDevIssueInput
 */
export async function POST(request: NextRequest) {
  try {
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
    const body: CreateDevIssueInput = await request.json();

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

    // Create issue
    const issue = await createRecord<AirtableDevIssue>('devIssues', {
      Title: body.Title,
      Description: body.Description,
      Type: body.Type,
      Status: body.Status || 'backlog',
      Priority: body.Priority || 'medium',
      Tags: body.Tags,
      RelatedTo: body.RelatedTo,
      GitCommit: body.GitCommit,
      CreatedBy: body.CreatedBy || (session.user.id ? [session.user.id] : undefined),
      AssignedTo: body.AssignedTo,
    });

    // TODO: Send notification if critical or assigned
    if (body.Priority === 'critical' || body.AssignedTo) {
      // Implement notification logic in next step
    }

    return NextResponse.json(
      { issue },
      {
        status: 201,
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error('[API] POST /api/dev-issues error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create dev issue', code: 'CREATE_ERROR' },
      { status: 500 }
    );
  }
}
