import { NextRequest, NextResponse } from 'next/server';
import {
  getAirtableKey,
  getAirtableBaseId,
  getAirtableUsersTableId,
} from '@/lib/api-keys-service';
import { createRegistrationToken } from '@/lib/token-manager';
import { sendRegistrationEmail, getBaseUrl } from '@/lib/email-service';
import { isValidEmail } from '@/lib/auth';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';

interface RegisterRequest {
  nome: string;
  email: string;
  ruolo?: string;
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
 * Verifica se email già esiste in Airtable
 */
async function checkEmailExists(email: string): Promise<boolean> {
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

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const data = await response.json();
    return data.records && data.records.length > 0;
  } catch (error) {
    console.error('❌ [REGISTER] Error checking email:', error);
    throw error;
  }
}

/**
 * Crea nuovo utente in Airtable
 */
async function createUser(userData: RegisterRequest): Promise<AirtableUser> {
  try {
    const [apiKey, baseId, tableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableUsersTableId(),
    ]);

    if (!apiKey || !baseId || !tableId) {
      throw new Error('Missing Airtable credentials');
    }

    const url = `https://api.airtable.com/v0/${baseId}/${tableId}`;

    console.log(`👤 [REGISTER] Creating user: ${userData.nome} (${userData.email})`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          Nome: userData.nome,
          Email: userData.email,
          Ruolo: userData.ruolo || 'Sales',
          // Password verrà impostata durante l'attivazione
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('❌ Airtable API error:', response.status, errText);
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ [REGISTER] User created with ID: ${result.id}`);
    
    return result as AirtableUser;
  } catch (error) {
    console.error('❌ [REGISTER] Error creating user:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const requestStart = performance.now();

  try {
    console.log('📝 [REGISTER] Processing registration request...');

    const body: RegisterRequest = await request.json();
    const { nome, email, ruolo } = body;

    // Validazione input
    if (!nome || !email) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Nome e email sono richiesti' 
        },
        { status: 400 }
      );
    }

    if (nome.length < 2) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Nome deve essere di almeno 2 caratteri' 
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

    // Verifica se email già esiste
    const emailExists = await checkEmailExists(email);
    
    if (emailExists) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Un account con questa email esiste già. Usa \"Password dimenticata?\" per accedere.' 
        },
        { status: 409 }
      );
    }

    // Crea utente in Airtable
    const newUser = await createUser({ nome, email, ruolo });

    // Genera token di attivazione
    const registrationToken = await createRegistrationToken(email, {
      userId: newUser.id,
      nome,
      ruolo: ruolo || 'Sales'
    });

    // Invia email di attivazione
    const baseUrl = getBaseUrl(request);
    
    console.log(`📧 [REGISTER] Sending registration email to ${email}`);
    
    const emailResult = await sendRegistrationEmail(
      email,
      nome,
      registrationToken,
      baseUrl
    );

    const totalTime = performance.now() - requestStart;
    recordApiLatency('auth_register', totalTime, false);

    if (emailResult.success) {
      console.log(`✅ [REGISTER] Registration completed for ${email} in ${totalTime.toFixed(2)}ms`);

      return NextResponse.json({
        success: true,
        message: `Registrazione completata! Controlla l'email ${email} per attivare l'account.`,
        userId: newUser.id
      });
    } else {
      console.error(`❌ [REGISTER] Failed to send email to ${email}:`, emailResult.error);
      
      // TODO: Implementare rollback (eliminare utente creato se email fallisce)
      
      return NextResponse.json(
        {
          success: false,
          error: 'Utente creato ma errore nell\'invio dell\'email di attivazione. Contatta il supporto.'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    recordError('auth_register', errorMessage);
    recordApiLatency('auth_register', totalTime, false);
    
    console.error(`❌ [REGISTER] Error in ${totalTime.toFixed(2)}ms:`, error);
    
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