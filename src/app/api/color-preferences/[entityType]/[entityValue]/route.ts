import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  deleteColorPreference,
  type EntityType,
} from '@/lib/color-preferences';

/**
 * DELETE /api/color-preferences/[entityType]/[entityValue]
 * 
 * Reset preferenza a default di sistema
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ entityType: string; entityValue: string }> }
) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      );
    }

    const { entityType, entityValue } = await params;

    if (!entityType || !entityValue) {
      return NextResponse.json(
        { error: 'entityType e entityValue richiesti' },
        { status: 400 }
      );
    }

    const userId = session.user.id;
    await deleteColorPreference(
      entityType as EntityType,
      decodeURIComponent(entityValue),
      userId
    );

    return NextResponse.json({ 
      success: true,
      message: 'Preferenza resettata a default'
    });

  } catch (error: any) {
    console.error('Error in DELETE /api/color-preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Errore server' },
      { status: 500 }
    );
  }
}
