import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { findRecords, updateRecord } from '@/lib/airtable';
import { passwordResetTokens } from '@/lib/redis';
import { AirtableUser } from '@/types/airtable';

/**
 * POST /api/auth/reset-password
 * 
 * Validates reset token and updates user password in Airtable.
 */
export async function POST(request: Request) {
  try {
    const { email, token, newPassword } = await request.json();

    // Validate inputs
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email obbligatoria' },
        { status: 400 }
      );
    }

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token obbligatorio' },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json(
        { error: 'Password obbligatoria' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'La password deve essere di almeno 8 caratteri' },
        { status: 400 }
      );
    }

    // Verify token from Redis
    const isValid = await passwordResetTokens.verify(email, token);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Token non valido o scaduto' },
        { status: 400 }
      );
    }

    // Find user
    const users = await findRecords<AirtableUser['fields']>('users', {
      filterByFormula: `{Email} = '${email}'`,
      maxRecords: 1,
    });

    if (!users || users.length === 0) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      );
    }

    const user = users[0];

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password in Airtable
    await updateRecord<AirtableUser['fields']>('users', user.id, {
      Password: passwordHash,
    });

    // Delete token from Redis (one-time use)
    await passwordResetTokens.delete(email);

    console.log(`[Password Reset] Password updated for: ${email}`);

    return NextResponse.json({
      success: true,
      message: 'Password aggiornata con successo',
    });
  } catch (error: any) {
    console.error('[Password Reset] Error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
