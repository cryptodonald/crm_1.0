import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { checkRateLimit } from '@/lib/ratelimit';
import { researchKeywords } from '@/lib/seo-ads/keyword-planner';
import { z } from 'zod';

const researchSchema = z.object({
  seeds: z.array(z.string().min(1)).min(1).max(10),
  geo_target_ids: z.array(z.number()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isDev = process.env.NODE_ENV === 'development';
    const { success } = isDev
      ? { success: true }
      : await checkRateLimit(session.user.email, 'write');
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = researchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const results = await researchKeywords(parsed.data.seeds, parsed.data.geo_target_ids);
    return NextResponse.json({ results, count: results.length });
  } catch (error: unknown) {
    console.error('[API] POST /api/seo-ads/keywords/research error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Research failed', code: 'RESEARCH_ERROR' },
      { status: 500 }
    );
  }
}
