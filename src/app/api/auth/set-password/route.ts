import { NextRequest, NextResponse } from 'next/server';
import {
  getAirtableKey,
  getAirtableBaseId,
  getAirtableUsersTableId,
} from '@/lib/api-keys-service';
import { getToken, markTokenAsUsed } from '@/lib/token-manager';
import { hashPassword, isValidPassword } from '@/lib/auth';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';

interface SetPasswordRequest {
  token: string;
  password: string;
}

/**
 * Aggiorna password utente in Airtable
 */
async function updateUserPassword(userId: string, hashedPassword: string): Promise<boolean> {
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

    console.log(`🔄 [SET-PWD] Updating password for user: ${userId}`);

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

    console.log(`✅ [SET-PWD] Password updated successfully for user: ${userId}`);
    return true;
  } catch (error) {
    console.error('❌ [SET-PWD] Error updating password:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const requestStart = performance.now();

  try {
    console.log('🔐 [SET-PWD] Processing set password request...');

    const body: SetPasswordRequest = await request.json();
    const { token, password } = body;

    // Validazione input
    if (!token || !password) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token e password sono richiesti' 
        },
        { status: 400 }
      );
    }

    if (!isValidPassword(password)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Password deve essere di almeno 6 caratteri' 
        },
        { status: 400 }
      );
    }

    // Verifica e recupera token
    const tokenData = await getToken(token, 'password-reset');
    
    if (!tokenData) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token non valido, scaduto o già utilizzato' 
        },
        { status: 400 }
      );
    }

    // Verifica che il token contenga un userId
    if (!tokenData.userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token non valido per questa operazione' 
        },
        { status: 400 }
      );
    }

    console.log(`🔑 [SET-PWD] Valid token found for email: ${tokenData.email}`);

    // Hash della nuova password
    const hashedPassword = await hashPassword(password);

    // Aggiorna password in Airtable
    await updateUserPassword(tokenData.userId, hashedPassword);

    // Marca token come utilizzato
    await markTokenAsUsed(token, 'password-reset');

    const totalTime = performance.now() - requestStart;
    recordApiLatency('auth_set_password', totalTime, false);

    console.log(`✅ [SET-PWD] Password updated successfully for ${tokenData.email} in ${totalTime.toFixed(2)}ms`);

    return NextResponse.json({
      success: true,
      message: 'Password aggiornata con successo. Puoi ora accedere con la nuova password.'
    });

  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    recordError('auth_set_password', errorMessage);
    recordApiLatency('auth_set_password', totalTime, false);
    
    console.error(`❌ [SET-PWD] Error in ${totalTime.toFixed(2)}ms:`, error);
    
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