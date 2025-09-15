import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('👤 [ME] Checking user session...');

    // Estrai token dal cookie httpOnly
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      console.log('❌ [ME] No auth token found');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token di autenticazione non trovato',
          authenticated: false 
        },
        { status: 401 }
      );
    }

    // Verifica token JWT
    const payload = verifyToken(token);

    if (!payload) {
      console.log('❌ [ME] Invalid or expired token');
      
      // Rimuovi cookie scaduto
      const response = NextResponse.json(
        { 
          success: false, 
          error: 'Token di autenticazione non valido o scaduto',
          authenticated: false 
        },
        { status: 401 }
      );

      response.cookies.set('auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
      });

      return response;
    }

    // Costruisci dati utente dal payload JWT
    const userData = {
      id: payload.userId,
      nome: payload.nome,
      email: payload.email || '',
      ruolo: payload.ruolo,
      avatar: '', // TODO: recuperare da Airtable se necessario
      telefono: '',
    };

    console.log(`✅ [ME] User session valid: ${userData.nome} (${userData.email})`);

    return NextResponse.json({
      success: true,
      user: userData,
      authenticated: true,
      expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null
    });

  } catch (error) {
    console.error('❌ [ME] Error checking session:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Errore nella verifica della sessione',
        authenticated: false
      },
      { status: 500 }
    );
  }
}