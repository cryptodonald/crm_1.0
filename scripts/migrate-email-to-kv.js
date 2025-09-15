#!/usr/bin/env node

// Script per salvare le API keys email da .env.local a Vercel KV
require('dotenv').config({ path: '.env.local' });

async function migrateEmailKeysToKV() {
  console.log('📧 Migrating email configuration from .env.local to Vercel KV...\n');

  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;

  if (!resendApiKey || !emailFrom) {
    console.error('❌ Missing RESEND_API_KEY or EMAIL_FROM in .env.local');
    console.log('Make sure these variables are set in your .env.local file:');
    console.log('- RESEND_API_KEY=re_xxxx');
    console.log('- EMAIL_FROM=CRM 1.0 <noreply@yourdomain.com>');
    return;
  }

  console.log('📋 Configuration found:');
  console.log(`   RESEND_API_KEY: ${resendApiKey.substring(0, 8)}... (hidden)`);
  console.log(`   EMAIL_FROM: ${emailFrom}\n`);

  try {
    console.log('🚀 Saving configuration to Vercel KV...');
    
    // Call API directly since we can't import ES modules from CommonJS
    const response = await fetch('http://localhost:3000/api/setup/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey: resendApiKey,
        fromAddress: emailFrom,
      }),
    });
    
    const result = await response.json();
    
    const result = await setupEmailConfiguration(resendApiKey, emailFrom);
    
    if (result.success) {
      console.log('✅ Email configuration migrated successfully to Vercel KV!');
      console.log('\n📝 Next steps:');
      console.log('1. The email system now uses Vercel KV for configuration');
      console.log('2. You can remove RESEND_API_KEY and EMAIL_FROM from .env.local if you want');
      console.log('3. The KV storage is now the source of truth for email config');
      console.log('4. Test the email system to ensure everything works');
      
    } else {
      console.error(`❌ Migration failed: ${result.error}`);
    }
    
  } catch (error) {
    console.error('❌ Error during migration:', error.message);
    console.log('\n💡 Make sure:');
    console.log('- Vercel KV is properly configured');
    console.log('- KV_REST_API_URL and KV_REST_API_TOKEN are set in .env.local');
    console.log('- The project is connected to a Vercel KV database');
  }
}

migrateEmailKeysToKV();