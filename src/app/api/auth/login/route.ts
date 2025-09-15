import { NextRequest, NextResponse } from 'next/server';
import {
  getAirtableKey,
  getAirtableBaseId,
  getAirtableUsersTableId,
} from '@/lib/api-keys-service';
import { verifyPassword, generateToken, isValidEmail, isValidPassword } from '@/lib/auth';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';

interface AirtableUser {
  id: string;
  fields: {
    Nome: string;
    Email?: string;
    Ruolo?: string;
    Avatar?: string;
    Telefono?: string;
    Password?: string;
  };
}

interface LoginRequest {
  email: string;
  password: string;
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

    // Cerca per email usando filterByFormula
    const filterFormula = `{Email} = "${email}"`;
    const url = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula=${encodeURIComponent(filterFormula)}`;

    console.log('🔍 [LOGIN] Searching user by email:', email);

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
      console.log('❌ [LOGIN] User not found:', email);
      return null;
    }

    return data.records[0] as AirtableUser;
  } catch (error) {
    console.error('❌ [LOGIN] Error finding user:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const requestStart = performance.now();

  try {
    console.log('🔐 [LOGIN] Processing login request...');

    const body: LoginRequest = await request.json();
    const { email, password } = body;

    // Validazione input
    if (!email || !password) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email e password sono richiesti' 
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

    if (!isValidPassword(password)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Password deve essere di almeno 6 caratteri' 
        },
        { status: 400 }
      );
    }

    // Cerca utente
    const airtableUser = await findUserByEmail(email);
    
    if (!airtableUser) {
      // Delay per evitare timing attacks
      await new Promise(resolve => setTimeout(resolve, 1000));
      return NextResponse.json(
        { 
          success: false, 
          error: 'Credenziali non valide' 
        },
        { status: 401 }
      );
    }

    const hashedPassword = airtableUser.fields.Password;
    
    if (!hashedPassword) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Account non configurato per il login. Usa "Password dimenticata?" per impostare una password.',
          needsPasswordSetup: true
        },
        { status: 401 }
      );
    }

    // Verifica password
    const passwordValid = await verifyPassword(password, hashedPassword);
    
    if (!passwordValid) {
      console.log('❌ [LOGIN] Invalid password for user:', email);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Credenziali non valide' 
        },
        { status: 401 }
      );
    }

    // Crea oggetto utente
    const userData = {
      id: airtableUser.id,
      nome: airtableUser.fields.Nome || '',
      email: airtableUser.fields.Email || email,
      ruolo: airtableUser.fields.Ruolo || 'Staff',
      avatar: airtableUser.fields.Avatar || '',
      telefono: airtableUser.fields.Telefono || '',
    };

    // Genera JWT token
    const token = generateToken(userData);

    const totalTime = performance.now() - requestStart;
    recordApiLatency('auth_login', totalTime, false);

    console.log(`✅ [LOGIN] User logged in successfully: ${userData.nome} (${email}) in ${totalTime.toFixed(2)}ms`);

    // Imposta cookie httpOnly per sicurezza
    const response = NextResponse.json({
      success: true,
      user: userData,
      token,
      message: `Benvenuto, ${userData.nome}!`
    });

    // Cookie httpOnly (7 giorni)
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 giorni in secondi
    });

    return response;

  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    recordError('auth_login', errorMessage);
    recordApiLatency('auth_login', totalTime, false);
    
    console.error(`❌ [LOGIN] Error in ${totalTime.toFixed(2)}ms:`, error);
    
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