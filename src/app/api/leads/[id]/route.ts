import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getLeadById, updateLead, deleteLead } from '@/lib/postgres';
import { checkRateLimit } from '@/lib/ratelimit';
import type { LeadUpdateInput } from '@/types/database';

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

    const lead = await getLeadById(id);

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
  } catch (error: unknown) {
    console.error('[API] GET /api/leads/[id] error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to fetch lead' }, { status: 500 });
  }
}

/**
 * PATCH /api/leads/[id]
 * Update lead (partial update)
 * 
 * Body: Partial<LeadUpdateInput> (snake_case fields)
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

    // Map to Postgres schema (accept snake_case)
    const input: LeadUpdateInput = {};
    if (body.name !== undefined) input.name = body.name;
    if (body.phone !== undefined) input.phone = body.phone;
    if (body.email !== undefined) input.email = body.email;
    if (body.address !== undefined) input.address = body.address;
    if (body.postal_code !== undefined) input.postal_code = body.postal_code;
    if (body.city !== undefined) input.city = body.city;
    if (body.needs !== undefined) input.needs = body.needs;
    if (body.status !== undefined) input.status = body.status;
    if (body.gender !== undefined) input.gender = body.gender;
    if (body.source_id !== undefined) input.source_id = body.source_id;
    if (body.assigned_to !== undefined) input.assigned_to = body.assigned_to;
    if (body.referral_lead_id !== undefined) input.referral_lead_id = body.referral_lead_id;

    const lead = await updateLead(id, input);

    return NextResponse.json(
      { lead },
      {
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: unknown) {
    console.error('[API] PATCH /api/leads/[id] error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update lead' }, { status: 500 });
  }
}

/**
 * DELETE /api/leads/[id]
 * Hard delete lead from database
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
  } catch (error: unknown) {
    console.error('[API] DELETE /api/leads/[id] error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to delete lead' }, { status: 500 });
  }
}
