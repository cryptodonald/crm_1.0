import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { memoryCache } from '@/lib/memory-cache';
import { invalidate } from '@/lib/cache';

/**
 * POST /api/cache/invalidate
 * Invalidate cache (memory + Redis)
 * 
 * Body: { pattern: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const pattern = body.pattern || 'leads:page:*';

    // Invalidate memory cache (dev)
    if (process.env.NODE_ENV === 'development') {
      await memoryCache.invalidate(pattern);
      const stats = memoryCache.getStats();
      console.log(`[Cache] Invalidated memory cache: ${pattern} (${stats.size} keys remaining)`);
    }

    // Invalidate Redis (prod)
    await invalidate(pattern);

    return NextResponse.json({ 
      success: true,
      message: `Cache invalidated: ${pattern}`,
    });
  } catch (error: unknown) {
    console.error('[API] POST /api/cache/invalidate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to invalidate cache' },
      { status: 500 }
    );
  }
}
