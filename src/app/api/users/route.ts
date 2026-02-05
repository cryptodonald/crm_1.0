import { NextResponse } from 'next/server';
import { findRecords } from '@/lib/airtable';
import { AirtableUser } from '@/types/airtable';

/**
 * GET /api/users
 * 
 * Ritorna tutti gli utenti attivi dal sistema
 * Utilizzato per popolare select Assegnatario nei form
 */
export async function GET() {
  try {
    // Fetch solo utenti attivi
    const records = await findRecords<AirtableUser['fields']>('users', {
      filterByFormula: '{Attivo} = TRUE()',
      sort: [{ field: 'Nome', direction: 'asc' }],
    });

    // Trasforma in formato lookup per performance
    const usersLookup: Record<string, {
      id: string;
      nome: string;
      email?: string;
      ruolo: string;
      avatar?: string;
      avatarUrl?: string;
      telefono?: string;
    }> = {};

    records.forEach((record) => {
      const user = record.fields;
      usersLookup[record.id] = {
        id: record.id,
        nome: user.Nome,
        email: user.Email,
        ruolo: user.Ruolo,
        avatar: user.Avatar_URL,
        avatarUrl: user.Avatar_URL,
        telefono: user.Telefono,
      };
    });

    return NextResponse.json({
      success: true,
      users: usersLookup,
      count: records.length,
    });
  } catch (error: any) {
    console.error('[API] /api/users error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch users',
        users: {},
        count: 0,
      },
      { status: 500 }
    );
  }
}
