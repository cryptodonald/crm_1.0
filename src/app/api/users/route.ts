import { NextRequest, NextResponse } from 'next/server';
import {
  getAirtableKey,
  getAirtableBaseId,
  getAirtableUsersTableId,
} from '@/lib/api-keys-service';

interface AirtableUser {
  id: string;
  fields: {
    Nome: string;
    Email?: string;
    Ruolo?: string;
    Avatar?: string;
    Telefono?: string;
  };
  createdTime: string;
}

interface UserData {
  id: string;
  nome: string;
  email?: string;
  ruolo: string;
  avatar?: string;
  telefono?: string;
}

async function fetchAllUsers(
  apiKey: string,
  baseId: string,
  tableId: string
): Promise<UserData[]> {
  const users: UserData[] = [];
  let offset: string | undefined;

  try {
    do {
      const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
      // Limit fields to reduce payload and improve performance
      url.searchParams.append('fields[]', 'Nome');
      url.searchParams.append('fields[]', 'Email');
      url.searchParams.append('fields[]', 'Ruolo');
      url.searchParams.append('fields[]', 'Avatar');
      url.searchParams.append('fields[]', 'Telefono');

      if (offset) {
        url.searchParams.append('offset', offset);
      }

      console.log('🔗 Fetching users from:', url.toString());

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        next: { revalidate: 300 },
      });

      if (!response.ok) {
        console.error(
          '❌ Airtable API error:',
          response.status,
          response.statusText
        );
        throw new Error(
          `Airtable API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Trasforma i dati Airtable nel nostro formato
      const transformedUsers = data.records.map((record: AirtableUser) => ({
        id: record.id,
        nome: record.fields.Nome || '',
        email: record.fields.Email || '',
        ruolo: record.fields.Ruolo || 'Staff',
        avatar: record.fields.Avatar || '',
        telefono: record.fields.Telefono || '',
      }));

      users.push(...transformedUsers);
      offset = data.offset;

      console.log(
        `📦 Loaded ${transformedUsers.length} users, total: ${users.length}`
      );
    } while (offset);

    console.log(`✅ Completed: ${users.length} total users loaded`);
    return users;
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 [Users API] Starting request');

    // Get Airtable credentials using dynamic service
    const [apiKey, baseId, tableId] = await Promise.all([
      getAirtableKey(),
      getAirtableBaseId(),
      getAirtableUsersTableId(),
    ]);

    if (!apiKey || !baseId || !tableId) {
      console.error('❌ Missing Airtable credentials:', {
        hasApiKey: !!apiKey,
        hasBaseId: !!baseId,
        hasTableId: !!tableId,
      });
      return NextResponse.json(
        { error: 'Missing Airtable credentials' },
        { status: 500 }
      );
    }

    const users = await fetchAllUsers(apiKey, baseId, tableId);

    // Trasforma in un oggetto con chiave ID per lookup veloce
    const usersById: Record<string, UserData> = {};
    users.forEach(user => {
      usersById[user.id] = user;
    });

    console.log(`✅ [Users API] Returning ${users.length} users`);

    return NextResponse.json({
      users: usersById,
      count: users.length,
      success: true,
    });
  } catch (error) {
    console.error('❌ [Users API] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch users',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
