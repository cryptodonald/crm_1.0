import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getLeadById, updateLead, deleteLead } from '@/lib/postgres';
import { checkRateLimit } from '@/lib/ratelimit';
import type { LeadUpdateInput } from '@/types/database';

const uuidSchema = z.string().uuid('Invalid UUID format');

const updateLeadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().max(30).nullish(),
  email: z.string().email('Invalid email').max(255).nullish(),
  city: z.string().max(100).nullish(),
  address: z.string().max(500).nullish(),
  postal_code: z.union([z.number().int(), z.string(), z.null()]).optional(),
  gender: z.string().max(20).nullish(),
  needs: z.string().max(10000).nullish(),
  status: z.string().max(50).nullish(),
  source_id: z.string().uuid().nullish(),
  assigned_to: z.union([z.array(z.string().uuid()), z.string().uuid(), z.null()]).optional(),
  referral_lead_id: z.string().uuid().nullish(),
}).refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

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

    // Validate UUID path param
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid lead ID format' }, { status: 400 });
    }

    const body = await request.json();
    const validation = updateLeadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Map validated data to Postgres schema (body is safe after Zod validation)
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
