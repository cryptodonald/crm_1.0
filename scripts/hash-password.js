#!/usr/bin/env node

const bcrypt = require('bcryptjs');

// Password di test
const testPasswords = [
  'admin123',
  'test123',
  'password123'
];

async function hashPasswords() {
  console.log('🔐 Generating password hashes for test users...\n');
  
  for (const password of testPasswords) {
    const hash = await bcrypt.hash(password, 12);
    console.log(`Password: "${password}"`);
    console.log(`Hash: ${hash}\n`);
  }
  
  console.log('📋 Instructions:');
  console.log('1. Copy the hash for your chosen password');
  console.log('2. Go to your Airtable "users" table');
  console.log('3. Create a new user record with:');
  console.log('   - Nome: Your Name');
  console.log('   - Email: your.email@test.com');  
  console.log('   - Ruolo: Admin');
  console.log('   - Password: [paste the hash here]');
  console.log('4. Test login with email and original password');
}

hashPasswords().catch(console.error);