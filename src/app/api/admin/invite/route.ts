import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import {
  getAirtableKey,
  getAirtableBaseId,
  getAirtableUsersTableId,
} from '@/lib/api-keys-service';
import { createRegistrationToken } from '@/lib/token-manager';
import { createInviteTemplate, sendEmail, getBaseUrl } from '@/lib/email-service';
import { isValidEmail } from '@/lib/auth';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';

interface InviteRequest {
  nome: string;
  email: string;
  ruolo: 'Admin' | 'Sales';
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
    console.error('❌ [INVITE] Error checking email:', error);
    throw error;
  }
}

/**
 * Crea nuovo utente in Airtable
 */
async function createUser(userData: InviteRequest): Promise<AirtableUser> {
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

    console.log(`👤 [INVITE] Creating user: ${userData.nome} (${userData.email})`);

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
          Ruolo: userData.ruolo,
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
    console.log(`✅ [INVITE] User created with ID: ${result.id}`);
    
    return result as AirtableUser;
  } catch (error) {
    console.error('❌ [INVITE] Error creating user:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const requestStart = performance.now();

  try {
    console.log('🎯 [INVITE] Processing admin invite request...');

    // Verifica autenticazione
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token di autenticazione mancante' },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Token non valido' },
        { status: 401 }
      );
    }

    // Verifica che l'utente sia admin
    if (payload.ruolo !== 'Admin') {
      return NextResponse.json(
        { success: false, error: 'Permessi insufficienti. Solo gli admin possono invitare utenti.' },
        { status: 403 }
      );
    }

    const body: InviteRequest = await request.json();
    const { nome, email, ruolo } = body;

    // Validazione input
    if (!nome || !email || !ruolo) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Nome, email e ruolo sono richiesti' 
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

    if (!['Admin', 'Sales'].includes(ruolo)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Ruolo deve essere Admin o Sales' 
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
          error: 'Un utente con questa email esiste già nel sistema.' 
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
      ruolo,
      invitedBy: payload.nome
    });

    // Invia email di invito
    const baseUrl = getBaseUrl(request);
    const activationLink = `${baseUrl}/register/activate?token=${registrationToken}`;
    
    console.log(`📧 [INVITE] Sending invite email to ${email}`);
    
    const template = createInviteTemplate(activationLink, nome, payload.nome);
    const emailResult = await sendEmail({
      to: email,
      template,
    });

    const totalTime = performance.now() - requestStart;
    recordApiLatency('admin_invite', totalTime, false);

    if (emailResult.success) {
      console.log(`✅ [INVITE] Invite completed for ${email} by ${payload.nome} in ${totalTime.toFixed(2)}ms`);

      return NextResponse.json({
        success: true,
        message: `Invito inviato con successo a ${email}. L'utente riceverà un'email per impostare la password.`,
        userId: newUser.id,
        emailId: emailResult.messageId
      });
    } else {
      console.error(`❌ [INVITE] Failed to send email to ${email}:`, emailResult.error);
      
      // Anche se l'email non è stata inviata, l'utente è stato creato
      return NextResponse.json({
        success: true,
        message: `Utente creato ma email di invito non inviata. Contatta ${email} manualmente.`,
        userId: newUser.id,
        warning: 'Email non inviata: ' + emailResult.error
      });
    }

  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    recordError('admin_invite', errorMessage);
    recordApiLatency('admin_invite', totalTime, false);
    
    console.error(`❌ [INVITE] Error in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Errore interno durante l\'invito',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}