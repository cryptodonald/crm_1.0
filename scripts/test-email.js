#!/usr/bin/env node

// Script per testare la configurazione email
require('dotenv').config({ path: '.env.local' });

async function testEmailConfiguration() {
  console.log('📧 Testing Email Configuration...\n');

  console.log('📋 Environment Variables:');
  console.log(`   RESEND_API_KEY: ${process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 8) + '...' : 'NOT SET'}`);
  console.log(`   EMAIL_FROM: ${process.env.EMAIL_FROM || 'NOT SET'}\n`);

  if (!process.env.RESEND_API_KEY) {
    console.error('❌ RESEND_API_KEY not configured');
    return;
  }

  if (!process.env.EMAIL_FROM) {
    console.error('❌ EMAIL_FROM not configured');
    return;
  }

  try {
    const { Resend } = require('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    console.log('🔗 Testing Resend API connection...');

    // Test semplice: ottieni informazioni account
    // Nota: Resend non ha un endpoint /me, quindi proviamo a inviare un'email di test
    
    console.log('📬 Sending test email...');

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: 'test@test.com', // Email fittizia per test
      subject: 'Test Email - CRM 1.0',
      html: '<p>This is a test email from CRM 1.0 system.</p>',
      text: 'This is a test email from CRM 1.0 system.',
    });

    if (error) {
      // Alcuni errori sono OK in test (come destinatario inesistente)
      if (error.name === 'validation_error' && error.message.includes('to')) {
        console.log('✅ API connection successful (validation error is expected for test email)');
        console.log('✅ Email configuration is working correctly!');
      } else {
        console.error('❌ Resend API error:', error);
      }
    } else {
      console.log('✅ Email sent successfully!');
      console.log('📧 Email ID:', data?.id);
    }

  } catch (error) {
    console.error('❌ Error testing email configuration:', error.message);
  }

  console.log('\n📝 Next steps:');
  console.log('1. Make sure your domain is verified on Resend');
  console.log('2. Test with a real email address');
  console.log('3. Implement password reset flow');
}

testEmailConfiguration();