import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getLead, updateLead, deleteLead } from '@/lib/airtable/leads';
import { checkRateLimit } from '@/lib/ratelimit';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/leads/[id]
 * Fetch single lead by ID
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check
    const { success, limit: rateLimit, remaining } = await checkRateLimit(session.user.email, 'read');
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { id } = await context.params;

    const lead = await getLead(id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    return NextResponse.json(
      { lead },
      {
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error('[API] GET /api/leads/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch lead' }, { status: 500 });
  }
}

/**
 * PATCH /api/leads/[id]
 * Update lead (partial update)
 * 
 * Body: Partial<AirtableLead['fields']>
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check
    const { success, limit: rateLimit, remaining } = await checkRateLimit(session.user.email, 'write');
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { id } = await context.params;
    const body = await request.json();

    // Basic validation
    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const lead = await updateLead(id, body);

    return NextResponse.json(
      { lead },
      {
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error('[API] PATCH /api/leads/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update lead' }, { status: 500 });
  }
}

/**
 * DELETE /api/leads/[id]
 * Soft delete lead (set Stato = 'Chiuso')
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check
    const { success, limit: rateLimit, remaining } = await checkRateLimit(session.user.email, 'write');
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { id } = await context.params;

    await deleteLead(id);

    return NextResponse.json(
      { success: true, message: 'Lead deleted' },
      {
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: any) {
    console.error('[API] DELETE /api/leads/[id] error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete lead' }, { status: 500 });
  }
}
