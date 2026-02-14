import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { updateAnalysisConfig } from '@/lib/postgres';
import { checkRateLimit } from '@/lib/ratelimit';

const uuidSchema = z.string().uuid('Invalid UUID format');

const patchConfigSchema = z.object({
  base_density: z.enum(['soft', 'medium', 'hard']).optional(),
  topper_level: z.number().int().min(1).max(6).optional(),
  cylinder_shoulders: z.enum(['none', 'super_soft_6', 'soft_8', 'medium_8', 'firm_8']).optional(),
  cylinder_lumbar: z.enum(['soft_8', 'medium_8', 'firm_8']).optional(),
  cylinder_legs: z.enum(['none', 'super_soft_6', 'soft_8', 'medium_8', 'firm_8']).optional(),
});

type RouteParams = {
  params: Promise<{ id: string; analysisId: string; configId: string }>;
};

/**
 * PATCH /api/leads/[id]/analyses/[analysisId]/configs/[configId]
 * Override manuale di una singola configurazione
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { success, limit: rateLimit, remaining } = await checkRateLimit(session.user.email, 'write');
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const { configId } = await params;
    if (!uuidSchema.safeParse(configId).success) {
      return NextResponse.json({ error: 'Config ID must be a valid UUID' }, { status: 400 });
    }

    const body = await request.json();
    const validation = patchConfigSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const updates = validation.data;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const config = await updateAnalysisConfig(configId, updates);

    return NextResponse.json(
      { config },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      },
    );
  } catch (error: unknown) {
    console.error('[API Config PATCH] Error:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
