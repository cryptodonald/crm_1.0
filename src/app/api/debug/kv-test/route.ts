import { NextRequest, NextResponse } from 'next/server';
import { kvApiKeyService } from '@/lib/kv';
import { getAirtableKey, getAirtableBaseId, getAirtableLeadsTableId, getAirtableUsersTableId } from '@/lib/api-keys-service';

/**
 * 🔍 Debug endpoint per testare KV connection e API keys retrieval
 * Accesso: GET /api/debug/kv-test
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [DEBUG] Starting KV debug test...');

    // Test 1: Environment variables
    const envCheck = {
      KV_REST_API_URL: !!process.env.KV_REST_API_URL,
      KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
      ENCRYPTION_MASTER_KEY: !!process.env.ENCRYPTION_MASTER_KEY,
      CURRENT_USER_ID: process.env.CURRENT_USER_ID || 'user_admin_001',
      CURRENT_TENANT_ID: process.env.CURRENT_TENANT_ID || 'tenant_doctorbed',
    };

    console.log('📋 [DEBUG] Environment check:', envCheck);

    // Test 2: KV connection - get user keys
    let userKeys = [];
    try {
      const userId = process.env.CURRENT_USER_ID || 'user_admin_001';
      userKeys = await kvApiKeyService.getUserApiKeys(userId);
      console.log(`🔑 [DEBUG] Found ${userKeys.length} keys for user: ${userId}`);
      
      // Log key services (without showing actual keys)
      const keyServices = userKeys.map(key => ({
        id: key.id?.substring(0, 8) + '...',
        service: key.service,
        name: key.name,
        isActive: key.isActive,
        hasKey: !!key.key,
        keyLength: key.key?.length || 0
      }));
      
      console.log('🔍 [DEBUG] Keys found:', keyServices);
    } catch (kvError) {
      console.error('❌ [DEBUG] KV error:', kvError);
      return NextResponse.json({
        success: false,
        error: 'KV connection failed',
        details: kvError.message,
        envCheck
      });
    }

    // Test 3: Specific API key retrieval
    const keyTests = {
      airtable: null,
      airtableBaseId: null,
      airtableLeadsTable: null,
      airtableUsersTable: null
    };

    try {
      console.log('🔍 [DEBUG] Testing specific key retrieval...');
      
      keyTests.airtable = await getAirtableKey();
      keyTests.airtableBaseId = await getAirtableBaseId();
      keyTests.airtableLeadsTable = await getAirtableLeadsTableId();
      keyTests.airtableUsersTable = await getAirtableUsersTableId();

      console.log('✅ [DEBUG] Key retrieval results:', {
        airtable: keyTests.airtable ? `${keyTests.airtable.substring(0, 8)}...` : 'NULL',
        airtableBaseId: keyTests.airtableBaseId ? `${keyTests.airtableBaseId.substring(0, 8)}...` : 'NULL',
        airtableLeadsTable: keyTests.airtableLeadsTable || 'NULL',
        airtableUsersTable: keyTests.airtableUsersTable || 'NULL'
      });

    } catch (keyError) {
      console.error('❌ [DEBUG] Key retrieval error:', keyError);
    }

    // Test 4: Find Airtable-related keys in user keys
    const airtableKeys = userKeys.filter(key => 
      key.service?.includes('airtable') || 
      key.name?.toLowerCase().includes('airtable') ||
      key.description?.toLowerCase().includes('airtable')
    );

    console.log(`🎯 [DEBUG] Found ${airtableKeys.length} Airtable-related keys`);

    // Return debug results
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: envCheck,
      kvConnection: {
        connected: true,
        totalKeys: userKeys.length,
        airtableKeysFound: airtableKeys.length
      },
      keyTests: {
        airtable: !!keyTests.airtable,
        airtableBaseId: !!keyTests.airtableBaseId, 
        airtableLeadsTable: !!keyTests.airtableLeadsTable,
        airtableUsersTable: !!keyTests.airtableUsersTable
      },
      airtableKeys: airtableKeys.map(key => ({
        id: key.id?.substring(0, 12) + '...',
        service: key.service,
        name: key.name,
        description: key.description,
        isActive: key.isActive,
        userId: key.userId,
        tenantId: key.tenantId,
        hasKey: !!key.key,
        keyPreview: key.key ? key.key.substring(0, 8) + '...' : 'NO KEY'
      })),
      diagnosis: {
        kvWorking: true,
        keysFound: userKeys.length > 0,
        airtableKeysPresent: airtableKeys.length > 0,
        apiKeyRetrievalWorking: !!keyTests.airtable,
        possibleIssues: [
          !keyTests.airtable && 'Airtable API key not retrievable',
          !keyTests.airtableBaseId && 'Airtable Base ID not retrievable', 
          !keyTests.airtableLeadsTable && 'Airtable Leads Table ID not retrievable',
          airtableKeys.length === 0 && 'No Airtable keys found in KV',
          userKeys.length === 0 && 'No keys found for current user'
        ].filter(Boolean)
      }
    });

  } catch (error) {
    console.error('💥 [DEBUG] Debug test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Debug test failed',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}