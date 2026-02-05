import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import Airtable from 'airtable';
import { env } from '@/env';
import type { AirtableNotes } from '@/types/airtable.generated';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// Validation schema
const createNoteSchema = z.object({
  leadId: z.string().min(1, 'Lead ID obbligatorio'),
  content: z.string().min(1, 'Contenuto obbligatorio'),
  type: z.enum(['Riflessione', 'Promemoria', 'Follow-up', 'Info Cliente']).default('Riflessione'),
  pinned: z.boolean().default(false),
});

const updateNoteSchema = z.object({
  content: z.string().min(1).optional(),
  type: z.enum(['Riflessione', 'Promemoria', 'Follow-up', 'Info Cliente']).optional(),
  pinned: z.boolean().optional(),
});

/**
 * GET /api/notes
 * Fetch notes for a specific lead
 * Query params: leadId (required)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const leadId = searchParams.get('leadId');

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId query parameter required' },
        { status: 400 }
      );
    }

    const airtable = new Airtable({ apiKey: env.AIRTABLE_API_KEY });
    const base = airtable.base(env.AIRTABLE_BASE_ID);
    const notesTable = base(env.AIRTABLE_NOTES_TABLE_ID);

    // Fetch notes for this lead, ordered by creation date DESC
    const records = await notesTable
      .select({
        filterByFormula: `SEARCH("${leadId}", ARRAYJOIN({Lead}))`,
        sort: [{ field: 'CreatedAt', direction: 'desc' }],
      })
      .all();

    const notes: AirtableNotes[] = records.map((record) => ({
      id: record.id,
      createdTime: record._rawJson.createdTime,
      fields: record.fields as AirtableNotes['fields'],
    }));

    return NextResponse.json({ notes }, { status: 200 });
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
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createNoteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { leadId, content, type, pinned } = validation.data;

    // Get user ID from email
    const airtable = new Airtable({ apiKey: env.AIRTABLE_API_KEY });
    const base = airtable.base(env.AIRTABLE_BASE_ID);
    const usersTable = base(env.AIRTABLE_USERS_TABLE_ID);
    const userRecords = await usersTable
      .select({
        filterByFormula: `{Email} = "${session.user.email}"`,
        maxRecords: 1,
      })
      .firstPage();

    if (!userRecords.length) {
      return NextResponse.json(
        { error: 'User not found in Airtable' },
        { status: 404 }
      );
    }

    const userId = userRecords[0].id;

    // Create note
    const notesTable = base(env.AIRTABLE_NOTES_TABLE_ID);
    const newRecord = await notesTable.create({
      Lead: [leadId],
      User: [userId],
      Content: content,
      Type: type,
      Pinned: pinned,
    });

    const note: AirtableNotes = {
      id: newRecord.id,
      createdTime: newRecord._rawJson.createdTime,
      fields: newRecord.fields as AirtableNotes['fields'],
    };

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error('[API Notes POST] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notes/[id]
 * Update a note (handled in dynamic route)
 */
export async function PATCH(request: NextRequest) {
  return NextResponse.json(
    { error: 'Use /api/notes/[id] for updates' },
    { status: 400 }
  );
}

/**
 * DELETE /api/notes/[id]
 * Delete a note (handled in dynamic route)
 */
export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { error: 'Use /api/notes/[id] for deletion' },
    { status: 400 }
  );
}
