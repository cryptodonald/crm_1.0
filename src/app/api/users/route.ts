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
      const baseUrl = `https://api.airtable.com/v0/${baseId}/${tableId}`;

      const buildUrl = (includeFields: boolean) => {
        const u = new URL(baseUrl);
        if (offset) {
          u.searchParams.append('offset', offset);
        }
        if (includeFields) {
          u.searchParams.append('fields[]', 'Nome');
          u.searchParams.append('fields[]', 'Email');
          u.searchParams.append('fields[]', 'Ruolo');
          u.searchParams.append('fields[]', 'Avatar');
          u.searchParams.append('fields[]', 'Telefono');
        }
        return u;
      };

      let response: Response;

      const doFetch = async (fullUrl: string) =>
        fetch(fullUrl, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          next: { revalidate: 300 },
        });

      // First attempt with fields[]
      const urlTryFields = buildUrl(true);
      console.log('🔗 Fetching users from:', urlTryFields.toString());
      response = await doFetch(urlTryFields.toString());

      // Fallback: remove fields[] if Airtable rejects with 422
      if (response.status === 422) {
        console.warn('⚠️ Airtable 422 with fields[] filter. Retrying without fields...');
        const urlNoFields = buildUrl(false);
        console.log('🔁 Retrying users fetch:', urlNoFields.toString());
        response = await doFetch(urlNoFields.toString());
      }

      if (!response.ok) {
        const errText = await response.text();
        console.error('❌ Airtable API error:', response.status, errText);
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
