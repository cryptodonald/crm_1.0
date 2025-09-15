import { NextRequest, NextResponse } from 'next/server';
import { 
  getAirtableKey, 
  getAirtableBaseId, 
  getAirtableUsersTableId 
} from '@/lib/api-keys-service';
import { isValidEmail } from '@/lib/auth';

interface UserProfile {
  nome: string;
  email: string;
  telefono?: string;
  avatar_url?: string;
  ruolo: string;
}

/**
 * Estrae info utente dal token JWT
 */
function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  
  if (!token) {
    throw new Error('Token mancante');
  }
  
  try {
    // Importiamo verifyToken per decodificare il JWT
    const { verifyToken } = require('@/lib/auth');
    
    const payload = verifyToken(token);
    
    if (!payload) {
      throw new Error('Token non valido o scaduto');
    }
    
    return { 
      userId: payload.userId, 
      email: payload.email,
      nome: payload.nome
    };
  } catch (error) {
    throw new Error('Token non valido');
  }
}

/**
 * Recupera profilo utente da Airtable
 */
async function getUserProfile(userId: string): Promise<UserProfile | null> {
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

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const data = await response.json();
    const fields = data.fields;

    // Gestisci avatar - prioritizza Avatar_URL semplice
    let avatarUrl = '';
    if (fields.Avatar_URL) {
      avatarUrl = fields.Avatar_URL;
    } else if (fields.Avatar && Array.isArray(fields.Avatar) && fields.Avatar.length > 0) {
      // Fallback per vecchi attachment
      avatarUrl = fields.Avatar[0].url || '';
    }

    return {
      nome: fields.Nome || '',
      email: fields.Email || '',
      telefono: fields.Telefono || fields.Phone || '', // Supporta entrambi i nomi
      avatar_url: avatarUrl,
      ruolo: fields.Ruolo || 'Sales'
    };

  } catch (error) {
    console.error('❌ [PROFILE] Error fetching user profile:', error);
    throw error;
  }
}

/**
 * Aggiorna profilo utente in Airtable
 */
async function updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<boolean> {
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

    // Prepara campi da aggiornare
    const fields: any = {};
    
    if (profileData.nome) fields.Nome = profileData.nome;
    if (profileData.email) fields.Email = profileData.email;
    
    // Gestisci telefono - solo se definito
    if (profileData.telefono !== undefined) {
      fields.Telefono = profileData.telefono;
    }
    
    // Gestisci avatar - solo se definito  
    if (profileData.avatar_url !== undefined) {
      // Usa campo URL semplice invece di attachment
      fields.Avatar_URL = profileData.avatar_url;
      console.log('🖼️ [PROFILE] Setting Avatar_URL field to:', profileData.avatar_url);
    }
    
    console.log('📝 [PROFILE] Airtable fields to update:', fields);
    console.log('🆔 [PROFILE] Updating user:', userId);

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Airtable API error:', response.status, errorText);
      throw new Error(`Airtable API error: ${response.status}`);
    }

    console.log(`✅ [PROFILE] Profile updated for user: ${userId}`);
    return true;

  } catch (error) {
    console.error('❌ [PROFILE] Error updating user profile:', error);
    throw error;
  }
}

/**
 * GET - Recupera profilo utente corrente
 */
export async function GET(request: NextRequest) {
  try {
    console.log('👤 [PROFILE] Fetching user profile...');
    
    const user = getUserFromToken(request);
    const profile = await getUserProfile(user.userId);
    
    if (!profile) {
      return NextResponse.json({
        success: false,
        error: 'Profilo utente non trovato'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      profile
    });
    
  } catch (error) {
    console.error('❌ [PROFILE] Error fetching profile:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Errore recupero profilo';
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}

/**
 * PUT - Aggiorna profilo utente
 */
export async function PUT(request: NextRequest) {
  try {
    console.log('✏️ [PROFILE] Updating user profile...');
    
    const user = getUserFromToken(request);
    const body = await request.json();
    
    const { nome, email, telefono, avatar_url } = body;
    console.log('🔍 [PROFILE] Update request data:', { nome, email, telefono, avatar_url });
    
    // Validazioni
    if (nome && nome.length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Nome deve essere di almeno 2 caratteri'
      }, { status: 400 });
    }
    
    if (email && !isValidEmail(email)) {
      return NextResponse.json({
        success: false,
        error: 'Email non valida'
      }, { status: 400 });
    }
    
    if (telefono && telefono.length > 0 && telefono.length < 8) {
      return NextResponse.json({
        success: false,
        error: 'Numero di telefono non valido'
      }, { status: 400 });
    }
    
    // Aggiorna profilo
    const updateData: Partial<UserProfile> = {};
    if (nome !== undefined) updateData.nome = nome;
    if (email !== undefined) updateData.email = email;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    
    console.log('💾 [PROFILE] Data to update:', updateData);
    console.log('🆔 [PROFILE] User ID:', user.userId);
    
    await updateUserProfile(user.userId, updateData);
    
    // Recupera profilo aggiornato
    const updatedProfile = await getUserProfile(user.userId);
    
    return NextResponse.json({
      success: true,
      message: 'Profilo aggiornato con successo',
      profile: updatedProfile
    });
    
  } catch (error) {
    console.error('❌ [PROFILE] Error updating profile:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Errore aggiornamento profilo';
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}