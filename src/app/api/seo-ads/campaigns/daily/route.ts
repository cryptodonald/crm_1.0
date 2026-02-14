import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { checkRateLimit } from '@/lib/ratelimit';
import { getCampaignKeywordDaily } from '@/lib/seo-ads/queries';

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
    const keywordId = searchParams.get('keyword_id');
    const campaignName = searchParams.get('campaign_name');
    const adGroupName = searchParams.get('ad_group_name');

    if (!keywordId || !campaignName || !adGroupName) {
      return NextResponse.json(
        { error: 'keyword_id, campaign_name and ad_group_name are required', code: 'VALIDATION_ERROR' },
        { status: 400 },
      );
    }

    const dateFrom = searchParams.get('date_from') || undefined;
    const dateTo = searchParams.get('date_to') || undefined;

    const rows = await getCampaignKeywordDaily(keywordId, campaignName, adGroupName, dateFrom, dateTo);

    return NextResponse.json({ rows });
  } catch (error: unknown) {
    console.error('[API] GET /api/seo-ads/campaigns/daily error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error', code: 'FETCH_ERROR' },
      { status: 500 },
    );
  }
}
