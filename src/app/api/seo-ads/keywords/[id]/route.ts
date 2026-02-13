import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { checkRateLimit } from '@/lib/ratelimit';
import {
  getSeoKeywordById,
  updateSeoKeyword,
  deleteSeoKeyword,
  getLatestKeywordMetrics,
} from '@/lib/seo-ads/queries';
import { z } from 'zod';

const updateKeywordSchema = z.object({
  keyword: z.string().min(1).max(200).optional(),
  cluster: z.string().min(1).optional(),
  landing_page: z.string().url().nullable().optional(),
  priority: z.enum(['alta', 'media', 'bassa']).optional(),
  is_active: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const keyword = await getSeoKeywordById(id);
    if (!keyword) {
      return NextResponse.json({ error: 'Keyword not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    // Include latest metrics
    const metrics = await getLatestKeywordMetrics(id);

    return NextResponse.json({ keyword, metrics });
  } catch (error: unknown) {
    console.error('[API] GET /api/seo-ads/keywords/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      return NextResponse.json({ error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' }, { status: 429 });
    }

    const body = await request.json();
    const parsed = updateKeywordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { id } = await params;
    // Convert null to undefined for landing_page (Zod allows null, TS type needs undefined)
    const { landing_page, ...rest } = parsed.data;
    const updateData = {
      ...rest,
      ...(landing_page !== undefined && { landing_page: landing_page ?? undefined }),
    };
    const keyword = await updateSeoKeyword(id, updateData);
    return NextResponse.json({ keyword });
  } catch (error: unknown) {
    console.error('[API] PATCH /api/seo-ads/keywords/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update keyword', code: 'UPDATE_ERROR' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      return NextResponse.json({ error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' }, { status: 429 });
    }

    const { id } = await params;
    await deleteSeoKeyword(id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[API] DELETE /api/seo-ads/keywords/[id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete keyword', code: 'DELETE_ERROR' },
      { status: 500 }
    );
  }
}
