import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getNotesByLeadId, createNote, getUserByEmail } from '@/lib/postgres';
import { checkRateLimit } from '@/lib/ratelimit';
import type { NoteCreateInput } from '@/types/database';

// Validation schemas
const uuidSchema = z.string().uuid('Invalid UUID format');

const createNoteSchema = z.object({
  lead_id: z.string().uuid('Lead ID must be valid UUID'),
  content: z.string().min(1, 'Content required'),
  pinned: z.boolean().default(false),
});

/**
 * GET /api/notes
 * Fetch notes for a specific lead
 * Query params: lead_id (required, UUID)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check
    const { success, limit: rateLimit, remaining } = await checkRateLimit(session.user.email, 'read');
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const searchParams = request.nextUrl.searchParams;
    const lead_id = searchParams.get('lead_id');

    if (!lead_id) {
      return NextResponse.json(
        { error: 'lead_id query parameter required' },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidResult = uuidSchema.safeParse(lead_id);
    if (!uuidResult.success) {
      return NextResponse.json(
        { error: 'lead_id must be a valid UUID' },
        { status: 400 }
      );
    }

    // Fetch notes for this lead (ordered by created_at DESC in query)
    const notes = await getNotesByLeadId(lead_id);

    return NextResponse.json(
      { notes },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error('[API Notes GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes
 * Create a new note
 * Body: { lead_id, content, highlighted?, user_id? }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit check
    const { success, limit: rateLimit, remaining } = await checkRateLimit(session.user.email, 'write');
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await request.json();
    const validation = createNoteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { lead_id, content, pinned } = validation.data;

    // Resolve user_id from session
    const user = await getUserByEmail(session.user.email);

    // Map input to Postgres schema
    const input: NoteCreateInput = {
      lead_id,
      content,
      pinned: pinned ?? false,
      ...(user && { user_id: user.id }),
    };

    // Create note
    const note = await createNote(input);

    return NextResponse.json(
      { note },
      {
        status: 201,
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error('[API Notes POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

