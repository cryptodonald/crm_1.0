/**
 * Demo User Creation Script
 * 
 * This script helps create a demo user in Airtable for testing authentication.
 * 
 * Usage:
 *   npx tsx scripts/create-demo-user.ts
 * 
 * Or to just generate a password hash:
 *   npx tsx scripts/create-demo-user.ts --hash-only <password>
 */

// IMPORTANT: Load dotenv BEFORE any other imports that use process.env
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Now import modules that depend on environment variables
import bcrypt from 'bcryptjs';
import { createRecord, findRecords } from '../src/lib/airtable';
import { AirtableUser } from '../src/types/airtable';

const DEMO_USER = {
  email: 'demo@crm.local',
  name: 'Demo User',
  password: 'demo1234', // Will be hashed
  role: 'admin' as const,
  status: 'active' as const,
};

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function createDemoUser() {
  console.log('🔍 Checking if demo user already exists...');
  
  try {
    // Check if user exists
    const existingUsers = await findRecords<AirtableUser['fields']>('users', {
      filterByFormula: `{Email} = '${DEMO_USER.email}'`,
      maxRecords: 1,
    });

    if (existingUsers && existingUsers.length > 0) {
      console.log('✅ Demo user already exists!');
      console.log(`   Email: ${DEMO_USER.email}`);
      console.log(`   Password: ${DEMO_USER.password}`);
      console.log(`   Record ID: ${existingUsers[0].id}`);
      return;
    }

    console.log('🔐 Hashing password...');
    const passwordHash = await hashPassword(DEMO_USER.password);

    console.log('📝 Creating demo user in Airtable...');
    const newUser = await createRecord<AirtableUser['fields']>('users', {
      Email: DEMO_USER.email,
      Nome: DEMO_USER.name,           // "Nome" not "Name"
      Password: passwordHash,         // "Password" not "PasswordHash"
      Ruolo: 'Admin',                 // "Ruolo" not "Role", with capital A
      Attivo: true,                   // "Attivo" boolean not "Status" string
    });

    console.log('✅ Demo user created successfully!');
    console.log('');
    console.log('📋 Login Credentials:');
    console.log(`   Email: ${DEMO_USER.email}`);
    console.log(`   Password: ${DEMO_USER.password}`);
    console.log(`   Role: ${DEMO_USER.role}`);
    console.log(`   Record ID: ${newUser.id}`);
    console.log('');
    console.log('🚀 You can now login at http://localhost:3000/login');
  } catch (error: any) {
    console.error('❌ Error creating demo user:', error.message);
    
    if (error.message.includes('AIRTABLE')) {
      console.error('');
      console.error('💡 Make sure:');
      console.error('   1. Your .env.local file has valid Airtable credentials');
      console.error('   2. The Users table exists in your Airtable base');
      console.error('   3. The table has these fields: Email, Name, PasswordHash, Role, Status, CreatedAt');
    }
    
    process.exit(1);
  }
}

async function generateHashOnly(password: string) {
  console.log('🔐 Generating password hash...');
  const hash = await hashPassword(password);
  console.log('');
  console.log('✅ Password hash generated:');
  console.log(hash);
  console.log('');
  console.log('📋 Add this to your Airtable Users table in the PasswordHash field');
}

// Main execution
const args = process.argv.slice(2);

if (args[0] === '--hash-only' && args[1]) {
  generateHashOnly(args[1]);
} else if (args.length === 0) {
  createDemoUser();
} else {
  console.log('Usage:');
  console.log('  npx tsx scripts/create-demo-user.ts              # Create demo user');
  console.log('  npx tsx scripts/create-demo-user.ts --hash-only <password>  # Generate hash only');
  process.exit(1);
}
