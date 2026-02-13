import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { checkRateLimit } from '@/lib/ratelimit';
import { getDashboardKPIs } from '@/lib/seo-ads/queries';

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

    // Default: last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const periodStart = searchParams.get('period_start') || thirtyDaysAgo.toISOString().split('T')[0];
    const periodEnd = searchParams.get('period_end') || now.toISOString().split('T')[0];

    const kpis = await getDashboardKPIs(periodStart, periodEnd);
    return NextResponse.json({ kpis });
  } catch (error: unknown) {
    console.error('[API] GET /api/seo-ads/dashboard error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }
}
