import { NextRequest, NextResponse } from 'next/server';
import {
  getAirtableKey,
  getAirtableBaseId,
  getAirtableUsersTableId,
} from '@/lib/api-keys-service';
import { verifyToken, hashPassword, verifyPassword, isValidPassword } from '@/lib/auth';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

interface AirtableUser {
  id: string;
  fields: {
    Nome: string;
    Email?: string;
    Password?: string;
  };
}

/**
 * Recupera utente da Airtable per ID
 */
async function getUserById(userId: string): Promise<AirtableUser | null> {
  try {
    const [apiKey, baseId, tableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableUsersTableId(),
    ]);

    if (!apiKey || !baseId || !tableId) {
      throw new Error('Missing Airtable credentials');
    }

    const url = `https://api.airtable.com/v0/${baseId}/${tableId}/${userId}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      const errText = await response.text();
      console.error('❌ Airtable API error:', response.status, errText);
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const data = await response.json();
    return data as AirtableUser;
  } catch (error) {
    console.error('❌ [CHANGE-PWD] Error fetching user:', error);
    throw error;
  }
}

/**
 * Aggiorna password utente in Airtable
 */
async function updatePassword(userId: string, hashedPassword: string): Promise<boolean> {
  try {
    const [apiKey, baseId, tableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableUsersTableId(),
    ]);

    if (!apiKey || !baseId || !tableId) {
      throw new Error('Missing Airtable credentials');
    }

    const url = `https://api.airtable.com/v0/${baseId}/${tableId}/${userId}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          Password: hashedPassword,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('❌ Airtable API error:', response.status, errText);
      throw new Error(`Airtable API error: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('❌ [CHANGE-PWD] Error updating password:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const requestStart = performance.now();

  try {
    console.log('🔒 [CHANGE-PWD] Processing password change request...');

    // Estrai token dal cookie httpOnly
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Non autenticato' 
        },
        { status: 401 }
      );
    }

    // Verifica token JWT
    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token di autenticazione non valido' 
        },
        { status: 401 }
      );
    }

    const body: ChangePasswordRequest = await request.json();
    const { currentPassword, newPassword } = body;

    // Validazione input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Password attuale e nuova password sono richieste' 
        },
        { status: 400 }
      );
    }

    if (!isValidPassword(newPassword)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'La nuova password deve essere di almeno 6 caratteri' 
        },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'La nuova password deve essere diversa da quella attuale' 
        },
        { status: 400 }
      );
    }

    // Recupera utente da Airtable
    const user = await getUserById(payload.userId);

    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Utente non trovato' 
        },
        { status: 404 }
      );
    }

    // Verifica password attuale
    const currentHashedPassword = user.fields.Password;

    if (!currentHashedPassword) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Account non configurato per il cambio password' 
        },
        { status: 400 }
      );
    }

    const isCurrentPasswordValid = await verifyPassword(currentPassword, currentHashedPassword);

    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Password attuale non corretta' 
        },
        { status: 401 }
      );
    }

    // Hash della nuova password
    const newHashedPassword = await hashPassword(newPassword);

    // Aggiorna password
    await updatePassword(payload.userId, newHashedPassword);

    const totalTime = performance.now() - requestStart;
    recordApiLatency('auth_change_password', totalTime, false);

    console.log(`✅ [CHANGE-PWD] Password changed successfully for user: ${payload.nome} (${payload.email}) in ${totalTime.toFixed(2)}ms`);

    return NextResponse.json({
      success: true,
      message: 'Password cambiata con successo'
    });

  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    recordError('auth_change_password', errorMessage);
    recordApiLatency('auth_change_password', totalTime, false);
    
    console.error(`❌ [CHANGE-PWD] Error in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Errore interno del server',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}