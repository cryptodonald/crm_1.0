import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { updateNote, deleteNote } from '@/lib/postgres';
import { checkRateLimit } from '@/lib/ratelimit';
import type { NoteUpdateInput } from '@/types/database';

const uuidSchema = z.string().uuid('Invalid UUID format');

const updateNoteSchema = z.object({
  content: z.string().min(1).optional(),
  pinned: z.boolean().optional(),
});

/**
 * PATCH /api/notes/[id]
 * Update a note
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: noteId } = await params;

    // Validate UUID format
    const uuidResult = uuidSchema.safeParse(noteId);
    if (!uuidResult.success) {
      return NextResponse.json(
        { error: 'Note ID must be a valid UUID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = updateNoteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Map to Postgres schema
    const input: NoteUpdateInput = {};
    if (validation.data.content !== undefined) input.content = validation.data.content;
    if (validation.data.pinned !== undefined) input.pinned = validation.data.pinned;

    if (Object.keys(input).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const note = await updateNote(noteId, input);

    return NextResponse.json(
      { note },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: unknown) {
    console.error('[API Notes PATCH] Error:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes/[id]
 * Delete a note
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: noteId } = await params;

    // Validate UUID format
    const deleteUuidResult = uuidSchema.safeParse(noteId);
    if (!deleteUuidResult.success) {
      return NextResponse.json(
        { error: 'Note ID must be a valid UUID' },
        { status: 400 }
      );
    }

    await deleteNote(noteId);

    return NextResponse.json(
      { success: true, message: 'Note deleted successfully', id: noteId },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': rateLimit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
        },
      }
    );
  } catch (error: unknown) {
    console.error('[API Notes DELETE] Error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
