/**
 * Test script for /api/leads endpoints
 * 
 * Run with: npx tsx scripts/test-leads-api.ts
 * 
 * Tests:
 * 1. GET /api/leads (list)
 * 2. POST /api/leads (create)
 * 3. GET /api/leads/[id] (single)
 * 4. PATCH /api/leads/[id] (update)
 * 5. DELETE /api/leads/[id] (soft delete)
 */

import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';

// Helper to make authenticated requests
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${endpoint}`;
  
  console.log(`\n🔍 ${options.method || 'GET'} ${endpoint}`);
  
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await res.json();

    console.log(`   Status: ${res.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 500));

    return { status: res.status, data };
  } catch (error: any) {
    console.error(`   ❌ Error:`, error.message);
    return { status: 0, data: null };
  }
}

async function runTests() {
  console.log('========================================');
  console.log('🧪 Testing /api/leads endpoints');
  console.log('========================================');
  console.log('⚠️  Make sure dev server is running: npm run dev');
  console.log('⚠️  You need to be logged in (cookie-based auth)');
  console.log('========================================\n');

  let createdLeadId: string | null = null;

  // Test 1: GET /api/leads (list)
  console.log('\n--- Test 1: GET /api/leads (list) ---');
  const listResult = await fetchAPI('/api/leads');
  
  if (listResult.status === 401) {
    console.log('\n❌ UNAUTHORIZED: You need to login first');
    console.log('   1. Go to http://localhost:3000/login');
    console.log('   2. Login with demo@crm.local / demo1234');
    console.log('   3. Run this script again');
    return;
  }

  if (listResult.status === 200) {
    console.log(`   ✅ Found ${listResult.data.total} leads`);
  }

  // Test 2: POST /api/leads (create)
  console.log('\n--- Test 2: POST /api/leads (create) ---');
  const createResult = await fetchAPI('/api/leads', {
    method: 'POST',
    body: JSON.stringify({
      Nome: 'Test Lead Script',
      Telefono: '3331234567',
      Email: 'test@example.com',
      Città: 'Milano',
      Esigenza: 'Test automatico da script',
      Stato: 'Nuovo',
      Note: 'Creato da test script - può essere cancellato',
    }),
  });

  if (createResult.status === 201) {
    createdLeadId = createResult.data.lead.id;
    console.log(`   ✅ Lead created with ID: ${createdLeadId}`);
  } else {
    console.log(`   ❌ Failed to create lead`);
  }

  if (!createdLeadId) {
    console.log('\n❌ Cannot continue tests without created lead');
    return;
  }

  // Test 3: GET /api/leads/[id] (single)
  console.log('\n--- Test 3: GET /api/leads/[id] (single) ---');
  const getResult = await fetchAPI(`/api/leads/${createdLeadId}`);

  if (getResult.status === 200) {
    console.log(`   ✅ Lead fetched: ${getResult.data.lead.fields.Nome}`);
  }

  // Test 4: PATCH /api/leads/[id] (update)
  console.log('\n--- Test 4: PATCH /api/leads/[id] (update) ---');
  const updateResult = await fetchAPI(`/api/leads/${createdLeadId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      Stato: 'Contattato',
      Note: 'Aggiornato da test script',
    }),
  });

  if (updateResult.status === 200) {
    console.log(`   ✅ Lead updated: Stato = ${updateResult.data.lead.fields.Stato}`);
  }

  // Test 5: DELETE /api/leads/[id] (soft delete)
  console.log('\n--- Test 5: DELETE /api/leads/[id] (soft delete) ---');
  const deleteResult = await fetchAPI(`/api/leads/${createdLeadId}`, {
    method: 'DELETE',
  });

  if (deleteResult.status === 200) {
    console.log(`   ✅ Lead deleted (soft delete: Stato = Chiuso)`);
  }

  // Verify deletion
  console.log('\n--- Test 6: Verify soft delete ---');
  const verifyResult = await fetchAPI(`/api/leads/${createdLeadId}`);

  if (verifyResult.status === 200) {
    const stato = verifyResult.data.lead.fields.Stato;
    if (stato === 'Chiuso') {
      console.log(`   ✅ Verified: Lead still exists but Stato = Chiuso`);
    } else {
      console.log(`   ⚠️  Warning: Expected Stato = Chiuso, got ${stato}`);
    }
  }

  console.log('\n========================================');
  console.log('✅ All tests completed!');
  console.log('========================================\n');
}

// Run tests
runTests().catch(console.error);
