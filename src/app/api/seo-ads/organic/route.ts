import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { checkRateLimit } from '@/lib/ratelimit';
import { getOrganicRankings } from '@/lib/seo-ads/queries';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isDev = process.env.NODE_ENV === 'development';
    const { success } = isDev
      ? { success: true }
      : await checkRateLimit(session.user.email, 'read');
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const filters = {
      keyword_id: searchParams.get('keyword_id') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
      sort_by: searchParams.get('sort_by') || undefined,
      sort_order: (searchParams.get('sort_order') as 'asc' | 'desc') || undefined,
    };

    const result = await getOrganicRankings(filters);
    return NextResponse.json({
      rankings: result.data,
      total: result.pagination.total,
      pagination: result.pagination,
    });
  } catch (error: unknown) {
    console.error('[API] GET /api/seo-ads/organic error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }
}
