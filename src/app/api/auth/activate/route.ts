import { NextRequest, NextResponse } from 'next/server';
import {
  getAirtableKey,
  getAirtableBaseId,
  getAirtableUsersTableId,
} from '@/lib/api-keys-service';
import { getToken, markTokenAsUsed } from '@/lib/token-manager';
import { hashPassword, isValidPassword } from '@/lib/auth';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';

interface ActivateAccountRequest {
  token: string;
  password: string;
}

/**
 * Aggiorna password utente per attivazione account
 */
async function activateUserAccount(userId: string, hashedPassword: string): Promise<boolean> {
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

    console.log(`🔄 [ACTIVATE] Activating account for user: ${userId}`);

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

    console.log(`✅ [ACTIVATE] Account activated successfully for user: ${userId}`);
    return true;
  } catch (error) {
    console.error('❌ [ACTIVATE] Error activating account:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const requestStart = performance.now();

  try {
    console.log('🎉 [ACTIVATE] Processing account activation...');

    const body: ActivateAccountRequest = await request.json();
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

    // Verifica e recupera token di registrazione
    const tokenData = await getToken(token, 'registration');
    
    if (!tokenData) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token di attivazione non valido, scaduto o già utilizzato' 
        },
        { status: 400 }
      );
    }

    // Verifica che il token contenga i dati necessari
    if (!tokenData.metadata?.userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token non valido per l\'attivazione dell\'account' 
        },
        { status: 400 }
      );
    }

    console.log(`🔑 [ACTIVATE] Valid registration token found for email: ${tokenData.email}`);

    // Hash della password
    const hashedPassword = await hashPassword(password);

    // Attiva l'account (imposta la password)
    await activateUserAccount(tokenData.metadata.userId, hashedPassword);

    // Marca token come utilizzato
    await markTokenAsUsed(token, 'registration');

    const totalTime = performance.now() - requestStart;
    recordApiLatency('auth_activate', totalTime, false);

    console.log(`✅ [ACTIVATE] Account activated successfully for ${tokenData.email} in ${totalTime.toFixed(2)}ms`);

    return NextResponse.json({
      success: true,
      message: 'Account attivato con successo! Puoi ora accedere con le tue credenziali.',
      user: {
        email: tokenData.email,
        nome: tokenData.metadata?.nome || 'Utente',
      }
    });

  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    recordError('auth_activate', errorMessage);
    recordApiLatency('auth_activate', totalTime, false);
    
    console.error(`❌ [ACTIVATE] Error in ${totalTime.toFixed(2)}ms:`, error);
    
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