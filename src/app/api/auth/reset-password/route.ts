import { NextRequest, NextResponse } from 'next/server';
import {
  getAirtableKey,
  getAirtableBaseId,
  getAirtableUsersTableId,
} from '@/lib/api-keys-service';
import { createPasswordResetToken } from '@/lib/token-manager';
import { sendPasswordResetEmail, getBaseUrl } from '@/lib/email-service';
import { isValidEmail } from '@/lib/auth';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';

interface ResetPasswordRequest {
  email: string;
}

interface AirtableUser {
  id: string;
  fields: {
    Nome: string;
    Email?: string;
    Ruolo?: string;
  };
}

/**
 * Trova utente per email in Airtable
 */
async function findUserByEmail(email: string): Promise<AirtableUser | null> {
  try {
    const [apiKey, baseId, tableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableUsersTableId(),
    ]);

    if (!apiKey || !baseId || !tableId) {
      throw new Error('Missing Airtable credentials');
    }

    const filterFormula = `{Email} = "${email}"`;
    const url = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula=${encodeURIComponent(filterFormula)}`;

    console.log('🔍 [RESET-PWD] Searching user by email:', email);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('❌ Airtable API error:', response.status, errText);
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.records || data.records.length === 0) {
      console.log('❌ [RESET-PWD] User not found:', email);
      return null;
    }

    return data.records[0] as AirtableUser;
  } catch (error) {
    console.error('❌ [RESET-PWD] Error finding user:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const requestStart = performance.now();

  try {
    console.log('🔑 [RESET-PWD] Processing password reset request...');

    const body: ResetPasswordRequest = await request.json();
    const { email } = body;

    // Validazione input
    if (!email) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email è richiesta' 
        },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email non valida' 
        },
        { status: 400 }
      );
    }

    // Cerca utente
    const airtableUser = await findUserByEmail(email);
    
    if (!airtableUser) {
      // Per sicurezza, non rivelare se l'email esiste o no
      // Delay per evitare timing attacks
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('⚠️ [RESET-PWD] User not found, but returning success for security');
      
      const totalTime = performance.now() - requestStart;
      recordApiLatency('auth_reset_password', totalTime, false);
      
      return NextResponse.json({
        success: true,
        message: 'Se l\'email esiste nel sistema, riceverai un link per il reset della password.'
      });
    }

    // Genera token reset
    const resetToken = await createPasswordResetToken(email, airtableUser.id);
    
    // Invia email reset
    const baseUrl = getBaseUrl(request);
    const userName = airtableUser.fields.Nome || 'Utente';
    
    console.log(`📧 [RESET-PWD] Sending reset email to ${email} for user: ${userName}`);
    
    const emailResult = await sendPasswordResetEmail(
      email,
      userName,
      resetToken,
      baseUrl
    );

    const totalTime = performance.now() - requestStart;
    recordApiLatency('auth_reset_password', totalTime, false);

    if (emailResult.success) {
      console.log(`✅ [RESET-PWD] Password reset email sent successfully to ${email} in ${totalTime.toFixed(2)}ms`);

      return NextResponse.json({
        success: true,
        message: 'Email di reset password inviata con successo. Controlla la tua casella di posta.'
      });
    } else {
      console.error(`❌ [RESET-PWD] Failed to send email to ${email}:`, emailResult.error);
      
      // Non esporre errori email specifici all'utente
      return NextResponse.json(
        {
          success: false,
          error: 'Errore nell\'invio dell\'email. Riprova più tardi.'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    recordError('auth_reset_password', errorMessage);
    recordApiLatency('auth_reset_password', totalTime, false);
    
    console.error(`❌ [RESET-PWD] Error in ${totalTime.toFixed(2)}ms:`, error);
    
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