import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getMarketingSources } from '@/lib/postgres';

/**
 * GET /api/marketing-sources
 * Fetch all active marketing sources
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all active marketing sources (sorted by name)
    const sources = await getMarketingSources();

    return NextResponse.json({
      sources,
      total: sources.length,
    });
  } catch (error: unknown) {
    console.error('[API] GET /api/marketing-sources error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch marketing sources' },
      { status: 500 }
    );
  }
}
