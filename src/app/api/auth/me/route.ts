import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { 
  getAirtableKey, 
  getAirtableBaseId, 
  getAirtableUsersTableId 
} from '@/lib/api-keys-service';

/**
 * Recupera avatar utente da Airtable
 */
async function getUserAvatar(userId: string): Promise<string> {
  try {
    const [apiKey, baseId, tableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableUsersTableId(),
    ]);

    if (!apiKey || !baseId || !tableId) {
      return '';
    }

    const url = `https://api.airtable.com/v0/${baseId}/${tableId}/${userId}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return '';
    }

    const data = await response.json();
    const fields = data.fields;
    
    // Prioritizza Avatar_URL sui vecchi attachment
    if (fields?.Avatar_URL) {
      return fields.Avatar_URL;
    }
    
    // Fallback per vecchi attachment Avatar
    if (fields?.Avatar && Array.isArray(fields.Avatar) && fields.Avatar.length > 0) {
      return fields.Avatar[0].url || '';
    }
    
    return '';

  } catch (error) {
    console.error('❌ [ME] Error fetching user avatar:', error);
    return '';
  }
}

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
    const avatar = await getUserAvatar(payload.userId);
    
    const userData = {
      id: payload.userId,
      nome: payload.nome,
      email: payload.email || '',
      ruolo: payload.ruolo,
      avatar: avatar,
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