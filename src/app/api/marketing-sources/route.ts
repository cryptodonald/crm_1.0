import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { base } from '@/lib/airtable';

const MARKETING_SOURCES_TABLE_ID = process.env.AIRTABLE_MARKETING_SOURCES_TABLE_ID || 'tblXyEscyPcP8TMLG';

/**
 * GET /api/marketing-sources
 * Fetch all marketing sources
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all marketing sources
    const records = await base(MARKETING_SOURCES_TABLE_ID)
      .select({
        fields: ['ID', 'Name', 'Color', 'Description', 'Active'],
        filterByFormula: '{Active} = TRUE()', // Solo fonti attive
      })
      .all();

    const sources = records.map((record) => ({
      id: record.id,
      name: record.fields.Name as string,
      color: record.fields.Color as string | undefined,
      description: record.fields.Description as string | undefined,
      active: record.fields.Active as boolean | undefined,
    }));

    return NextResponse.json({
      sources,
      total: sources.length,
    });
  } catch (error: any) {
    console.error('[API] GET /api/marketing-sources error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch marketing sources' },
      { status: 500 }
    );
  }
}
