import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🚪 [LOGOUT] Processing logout request...');

  try {
    // Crea response
    const response = NextResponse.json({
      success: true,
      message: 'Logout effettuato con successo'
    });

    // Rimuovi cookie httpOnly
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, // Scade immediatamente
    });

    console.log('✅ [LOGOUT] User logged out successfully');

    return response;

  } catch (error) {
    console.error('❌ [LOGOUT] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Errore durante il logout'
      },
      { status: 500 }
    );
  }
}