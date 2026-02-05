import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import Airtable from 'airtable';
import { env } from '@/env';
import type { AirtableNotes } from '@/types/airtable.generated';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const updateNoteSchema = z.object({
  content: z.string().min(1).optional(),
  type: z.enum(['Riflessione', 'Promemoria', 'Follow-up', 'Info Cliente']).optional(),
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
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: noteId } = await params;
    const body = await request.json();
    const validation = updateNoteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const updates: Record<string, any> = {};
    if (validation.data.content !== undefined) updates.Content = validation.data.content;
    if (validation.data.type !== undefined) updates.Type = validation.data.type;
    if (validation.data.pinned !== undefined) updates.Pinned = validation.data.pinned;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const airtable = new Airtable({ apiKey: env.AIRTABLE_API_KEY });
    const base = airtable.base(env.AIRTABLE_BASE_ID);
    const notesTable = base(env.AIRTABLE_NOTES_TABLE_ID);

    const updatedRecord = await notesTable.update(noteId, updates);

    const note: AirtableNotes = {
      id: updatedRecord.id,
      createdTime: updatedRecord._rawJson.createdTime,
      fields: updatedRecord.fields as AirtableNotes['fields'],
    };

    return NextResponse.json({ note }, { status: 200 });
  } catch (error: any) {
    console.error('[API Notes PATCH] Error:', error);
    
    if (error?.statusCode === 404) {
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
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: noteId } = await params;
    const airtable = new Airtable({ apiKey: env.AIRTABLE_API_KEY });
    const base = airtable.base(env.AIRTABLE_BASE_ID);
    const notesTable = base(env.AIRTABLE_NOTES_TABLE_ID);

    await notesTable.destroy(noteId);

    return NextResponse.json(
      { message: 'Note deleted successfully', id: noteId },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API Notes DELETE] Error:', error);

    if (error?.statusCode === 404) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
