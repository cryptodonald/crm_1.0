import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  getColorPreferences,
  saveColorPreference,
  getAllUserPreferences,
  type EntityType,
} from '@/lib/color-preferences';

/**
 * GET /api/color-preferences
 * 
 * Query params:
 * - entityType: EntityType (required)
 * - all: 'true' per tutte le preferenze utente (optional)
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check (opzionale per system defaults)
    const session = await getServerSession(authOptions);

    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get('entityType') as EntityType | null;
    const all = searchParams.get('all') === 'true';

    // Se richieste tutte le preferenze utente (richiede auth)
    if (all) {
      if (!session?.user?.id) {
        return NextResponse.json(
          { error: 'Non autenticato' },
          { status: 401 }
        );
      }
      const userId = session.user.id;
      const preferences = await getAllUserPreferences(userId);
      
      return NextResponse.json({ preferences });
    }

    // Altrimenti filtra per entityType
    if (!entityType) {
      return NextResponse.json(
        { error: 'entityType richiesto' },
        { status: 400 }
      );
    }

    // Carica colori (con userId se autenticato, altrimenti solo system defaults)
    const userId = session?.user?.id;
    const colors = await getColorPreferences(entityType, userId);

    return NextResponse.json({ 
      entityType,
      colors 
    });

  } catch (error: any) {
    console.error('Error in GET /api/color-preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Errore server' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/color-preferences
 * 
 * Body:
 * {
 *   entityType: EntityType,
 *   entityValue: string,
 *   colorClass: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check (obbligatorio per salvare preferenze)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { entityType, entityValue, colorClass } = body;

    // Validation
    if (!entityType || !entityValue || !colorClass) {
      return NextResponse.json(
        { error: 'entityType, entityValue e colorClass richiesti' },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;
    await saveColorPreference(entityType, entityValue, colorClass, userId);

    return NextResponse.json({ 
      success: true,
      message: 'Preferenza salvata'
    });

  } catch (error: any) {
    console.error('Error in POST /api/color-preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Errore server' },
      { status: 500 }
    );
  }
}
