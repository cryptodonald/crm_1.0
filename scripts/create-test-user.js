#!/usr/bin/env node

// Script per creare un utente di test
require('dotenv').config({ path: '.env.local' });

async function createTestUser() {
  console.log('👤 Creating test user for password reset...\n');

  const testUser = {
    Nome: 'Test User',
    Email: 'test@crm.doctorbed.app', // Usa il dominio configurato
    Ruolo: 'Admin',
    // Nessuna password iniziale - verrà impostata via reset
  };

  try {
    const airtableApiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const usersTableId = process.env.AIRTABLE_USERS_TABLE_ID;

    if (!airtableApiKey || !baseId || !usersTableId) {
      console.error('❌ Missing Airtable configuration');
      return;
    }

    console.log('📋 User to create:');
    console.log(`   Nome: ${testUser.Nome}`);
    console.log(`   Email: ${testUser.Email}`);
    console.log(`   Ruolo: ${testUser.Ruolo}`);
    console.log('');

    const url = `https://api.airtable.com/v0/${baseId}/${usersTableId}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${airtableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: testUser,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Airtable API error:', response.status, errorText);
      return;
    }

    const result = await response.json();
    
    console.log('✅ Test user created successfully!');
    console.log(`📧 User ID: ${result.id}`);
    console.log('');
    console.log('🧪 Now you can test:');
    console.log('1. Go to http://localhost:3000/forgot-password');
    console.log(`2. Enter email: ${testUser.Email}`);
    console.log('3. Check email logs in console');
    console.log('4. Copy reset link and test password setting');
    console.log('');
    console.log('🚀 Start dev server: npm run dev');

  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
  }
}

createTestUser();