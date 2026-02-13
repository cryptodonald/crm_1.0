import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { checkRateLimit } from '@/lib/ratelimit';
import { getSeoKeywords, createSeoKeyword } from '@/lib/seo-ads/queries';
import type { KeywordPriority } from '@/types/seo-ads';
import { z } from 'zod';

const createKeywordSchema = z.object({
  keyword: z.string().min(1, 'keyword is required').max(200),
  cluster: z.string().min(1, 'cluster is required'),
  landing_page: z.string().url().optional(),
  priority: z.enum(['alta', 'media', 'bassa']).optional(),
  is_active: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isDev = process.env.NODE_ENV === 'development';
    const { success, limit: rateLimit, remaining, reset } = isDev
      ? { success: true, limit: 1000, remaining: 999, reset: Date.now() + 60000 }
      : await checkRateLimit(session.user.email, 'read');

    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED', retryAfter: reset },
        { status: 429, headers: { 'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString() } }
      );
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      cluster: searchParams.get('cluster') || undefined,
      priority: (searchParams.get('priority') as KeywordPriority) || undefined,
      is_active: searchParams.has('is_active') ? searchParams.get('is_active') !== 'false' : undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
      sort_by: searchParams.get('sort_by') || undefined,
      sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || undefined,
    };

    const result = await getSeoKeywords(filters);

    return NextResponse.json(
      { keywords: result.data, total: result.pagination.total, pagination: result.pagination },
      { headers: { 'X-RateLimit-Limit': rateLimit.toString(), 'X-RateLimit-Remaining': remaining.toString() } }
    );
  } catch (error: unknown) {
    console.error('[API] GET /api/seo-ads/keywords error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }
}

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
    const parsed = createKeywordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const keyword = await createSeoKeyword(parsed.data);
    return NextResponse.json({ keyword }, { status: 201 });
  } catch (error: unknown) {
    console.error('[API] POST /api/seo-ads/keywords error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create keyword', code: 'CREATE_ERROR' },
      { status: 500 }
    );
  }
}
