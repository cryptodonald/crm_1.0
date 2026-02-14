import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getUserByEmail } from '@/lib/postgres';
import { passwordResetTokens } from '@/lib/redis';

/**
 * POST /api/auth/forgot-password
 * 
 * Generates a password reset token and stores it in Redis.
 * In production, would send email with reset link.
 * In development, logs token to console.
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email obbligatoria' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato email non valido' },
        { status: 400 }
      );
    }

    // Check if user exists (security: don't reveal if email exists or not)
    const user = await getUserByEmail(email);

    // Always return success (security best practice)
    // Don't reveal if email exists to prevent email enumeration attacks
    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'Se l\'email esiste, riceverai un link di reset',
      });
    }

    // Check if user is active
    if (!user.active) {
      // Still return success to not reveal account status
      return NextResponse.json({
        success: true,
        message: 'Se l\'email esiste, riceverai un link di reset',
      });
    }

    // Generate secure random token
    const token = randomBytes(32).toString('hex');

    // Save token to Redis (TTL: 1 hour)
    const saved = await passwordResetTokens.set(email, token);

    if (!saved) {
      console.error('[Password Reset] Failed to save token to Redis');
      return NextResponse.json(
        { error: 'Errore interno. Riprova più tardi.' },
        { status: 500 }
      );
    }

    // Build reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${token}?email=${encodeURIComponent(email)}`;

    // In development: log to console
    // In production: send email
    if (process.env.NODE_ENV === 'development') {
      console.log('\n========================================');
      console.log('🔐 PASSWORD RESET REQUEST');
      console.log('========================================');
      console.log(`Email: ${email}`);
      console.log(`Token: ${token}`);
      console.log(`Reset URL: ${resetUrl}`);
      console.log(`Expires: 1 hour`);
      console.log('========================================\n');
    } else {
      // TODO: Send email in production
      // await sendPasswordResetEmail(email, resetUrl);
      console.log('[Password Reset] Token generated');
    }

    return NextResponse.json({
      success: true,
      message: 'Se l\'email esiste, riceverai un link di reset',
      // Only include in development
      ...(process.env.NODE_ENV === 'development' && {
        devOnly: {
          token,
          resetUrl,
        },
      }),
    });
  } catch (error: unknown) {
    console.error('[Password Reset] Error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
