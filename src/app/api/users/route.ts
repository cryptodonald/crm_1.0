import { NextRequest, NextResponse } from 'next/server';
import {
  getAirtableKey,
  getAirtableBaseId,
  getAirtableUsersTableId,
} from '@/lib/api-keys-service';
import { getCachedUsers } from '@/lib/cache';
// import { fetchAirtableRecords } from '@/lib/airtable-batch'; // Temporaneamente disabilitato
import { recordApiLatency, recordError } from '@/lib/performance-monitor';

interface AirtableUser {
  id: string;
  fields: {
    Nome: string;
    Email?: string;
    Ruolo?: string;
    Avatar?: string;
    Avatar_URL?: string;
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
          u.searchParams.append('fields[]', 'Avatar_URL');
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
      const transformedUsers = data.records.map((record: AirtableUser) => {
        // Prioritizza Avatar_URL sui vecchi attachment Avatar
        let avatarUrl = '';
        if (record.fields.Avatar_URL) {
          avatarUrl = record.fields.Avatar_URL;
        } else if (record.fields.Avatar) {
          // Fallback per vecchi attachment (se ancora presenti)
          if (Array.isArray(record.fields.Avatar) && record.fields.Avatar.length > 0) {
            avatarUrl = (record.fields.Avatar as any)[0].url || '';
          } else if (typeof record.fields.Avatar === 'string') {
            avatarUrl = record.fields.Avatar;
          }
        }
        
        return {
          id: record.id,
          nome: record.fields.Nome || '',
          email: record.fields.Email || '',
          ruolo: record.fields.Ruolo || 'Staff',
          avatar: avatarUrl,
          telefono: record.fields.Telefono || '',
        };
      });

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
  const requestStart = performance.now();
  
  try {
    console.log('👥 [GET USERS] Starting fetch...');

    // 🚀 Usa il sistema di caching per ottimizzare performance
    const result = await getCachedUsers(async () => {
      const credentialsStart = performance.now();
      
      // Get Airtable credentials using dynamic service
      const [apiKey, baseId, tableId] = await Promise.all([
        getAirtableKey(),
        getAirtableBaseId(),
        getAirtableUsersTableId(),
      ]);
      
      const credentialsTime = performance.now() - credentialsStart;
      console.log(`🔑 [TIMING] Users credentials: ${credentialsTime.toFixed(2)}ms`);

      if (!apiKey || !baseId || !tableId) {
        throw new Error('Missing Airtable credentials');
      }

      const fetchStart = performance.now();
      
      // 🔄 Usa la funzione originale (più affidabile) mantenendo ottimizzazioni
      const users = await fetchAllUsers(apiKey, baseId, tableId);
      const fetchTime = performance.now() - fetchStart;
      console.log(`🚀 [TIMING] Complete users fetch: ${fetchTime.toFixed(2)}ms`);

      // Trasforma in un oggetto con chiave ID per lookup veloce
      const usersById: Record<string, UserData> = {};
      users.forEach(user => {
        usersById[user.id] = user;
      });

      return {
        users: usersById,
        count: Object.keys(usersById).length,
        success: true,
      };
    });
    
    const totalTime = performance.now() - requestStart;
    const wasCached = totalTime < 100; // Assume cached if under 100ms
    
    // 📈 Record performance metrics
    recordApiLatency('users_api', totalTime, wasCached);
    
    console.log(`✅ [GET USERS] Completed: ${result.count} users in ${totalTime.toFixed(2)}ms (cached: ${wasCached})`);

    return NextResponse.json({
      ...result,
      _timing: {
        total: Math.round(totalTime),
        cached: wasCached,
      }
    });
  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // 📈 Record error metrics
    recordError('users_api', errorMessage);
    recordApiLatency('users_api', totalTime, false); // Non-cached error
    
    console.error(`❌ [GET USERS] Error in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch users',
        success: false,
        users: {},
        count: 0,
        details: errorMessage,
        _timing: {
          total: Math.round(totalTime),
          cached: false,
        }
      },
      { status: 500 }
    );
  }
}
