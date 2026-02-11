import { NextRequest, NextResponse } from 'next/server';
import { getColorPreferences, saveColorPreference, deleteColorPreference } from '@/lib/postgres';

/**
 * GET /api/color-preferences?entityType=LeadStato
 * 
 * Fetch color preferences per entity type
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');

    if (!entityType) {
      return NextResponse.json(
        { error: 'entityType query param required' },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const colors = await getColorPreferences(entityType as any);

    return NextResponse.json({ colors }, { status: 200 });
  } catch (error: unknown) {
    console.error('[Color Preferences API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/color-preferences
 * 
 * Save color preference
 * Body: { entityType, entityValue, colorClass }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entityType, entityValue, colorClass } = body;

    if (!entityType || !entityValue || !colorClass) {
      return NextResponse.json(
        { error: 'entityType, entityValue, and colorClass required' },
        { status: 400 }
      );
    }

    await saveColorPreference(entityType, entityValue, colorClass);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('[Color Preferences API] Save error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/color-preferences/{entityType}/{entityValue}
 * 
 * Delete color preference (reset to default)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Extract from URL path: /api/color-preferences/LeadStato/Nuovo
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // pathParts: ['api', 'color-preferences', entityType, entityValue]
    const entityType = pathParts[2];
    const entityValue = decodeURIComponent(pathParts[3] || '');

    if (!entityType || !entityValue) {
      return NextResponse.json(
        { error: 'entityType and entityValue required in URL' },
        { status: 400 }
      );
    }

    await deleteColorPreference(entityType, entityValue);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('[Color Preferences API] Delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
