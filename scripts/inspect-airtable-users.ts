/**
 * Airtable Schema Inspector - Users Table
 * 
 * This script inspects the actual schema of the Users table in Airtable.
 * Use this to verify field names before updating TypeScript types.
 * 
 * Usage:
 *   NODE_OPTIONS='--require dotenv/config' DOTENV_CONFIG_PATH=.env.local npx tsx scripts/inspect-airtable-users.ts
 * 
 * Purpose:
 * - Verify actual field names in Airtable (e.g., "Nome" vs "Name")
 * - Check field types (string, boolean, array, etc.)
 * - Validate existing user records
 * - Debug authentication issues
 */

// IMPORTANT: Load dotenv BEFORE any other imports
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Now import modules that depend on environment variables
import { findRecords } from '../src/lib/airtable';
import { AirtableUser } from '../src/types/airtable';

async function inspectUsers() {
  console.log('🔍 Fetching users from Airtable Users table...\n');
  console.log('Table ID:', process.env.AIRTABLE_USERS_TABLE_ID);
  console.log('');
  
  try {
    const users = await findRecords<AirtableUser['fields']>('users', {
      maxRecords: 5, // Solo primi 5 per sicurezza
    });

    if (!users || users.length === 0) {
      console.log('❌ No users found in table');
      return;
    }

    console.log(`✅ Found ${users.length} user(s)\n`);

    users.forEach((user, index) => {
      console.log(`--- User ${index + 1} ---`);
      console.log(`ID: ${user.id}`);
      console.log(`Fields:`, JSON.stringify(user.fields, null, 2));
      console.log('');
    });

    // Trova l'utente demo
    const demoUser = users.find(u => u.fields.Email === 'demo@crm.local');
    if (demoUser) {
      console.log('🎯 Demo User Found:');
      console.log('Email:', demoUser.fields.Email);
      console.log('Nome:', demoUser.fields.Nome);
      console.log('Ruolo:', demoUser.fields.Ruolo);
      console.log('Attivo:', demoUser.fields.Attivo);
      console.log('Attivo type:', typeof demoUser.fields.Attivo);
      console.log('Has Password:', !!demoUser.fields.Password);
      console.log('\n⚠️  Active Check:');
      console.log(`  Attivo === true: ${demoUser.fields.Attivo === true}`);
      console.log(`  Attivo === false: ${demoUser.fields.Attivo === false}`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

inspectUsers();
