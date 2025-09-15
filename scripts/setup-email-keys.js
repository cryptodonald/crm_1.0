#!/usr/bin/env node

// Script per configurare API keys email in Vercel KV
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('📧 ===============================================');
console.log('🔧 Configurazione API Keys Email (Vercel KV)');
console.log('===============================================\n');

console.log('Questo script configurerà le API keys per il servizio email nel KV store.\n');

rl.question('🔑 Inserisci la tua API key Resend (inizia con "re_"): ', async (apiKey) => {
  if (!apiKey || !apiKey.startsWith('re_')) {
    console.log('❌ API key non valida. Deve iniziare con "re_"');
    rl.close();
    return;
  }

  rl.question('📧 Inserisci il tuo indirizzo FROM (es: "CRM 1.0 <noreply@tuodominio.com>"): ', async (emailFrom) => {
    if (!emailFrom || !emailFrom.includes('@')) {
      console.log('❌ Indirizzo email FROM non valido');
      rl.close();
      return;
    }

    console.log('\n⚙️  Salvando configurazione nel KV store...\n');
    
    try {
      // Importa il servizio email-keys
      const path = require('path');
      const { setupEmailConfiguration } = require(path.join(__dirname, '../src/lib/email-keys-service.ts'));
      
      const result = await setupEmailConfiguration(apiKey, emailFrom);
      
      if (result.success) {
        console.log('✅ Configurazione email salvata con successo!');
        console.log('\n📋 Configurazione attuale:');
        console.log(`   • API Key: ${apiKey.substring(0, 8)}... (nascosta)`);
        console.log(`   • Email FROM: ${emailFrom}`);
        console.log(`   • Servizio: Abilitato`);
        
        console.log('\n🚀 Puoi ora utilizzare il servizio email nel CRM!');
        console.log('   • Reset password via email');
        console.log('   • Registrazione nuovi utenti');
        console.log('   • Notifiche sistema');
        
      } else {
        console.error(`❌ Errore configurazione: ${result.error}`);
      }
      
    } catch (error) {
      console.error('❌ Errore durante la configurazione:', error.message);
      
      // Fallback: salva manualmente nel .env.local
      console.log('\n🔄 Tentativo fallback con .env.local...');
      
      const fs = require('fs');
      const envPath = path.join(__dirname, '../.env.local');
      let envContent = '';
      
      try {
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf8');
        }
      } catch (err) {
        console.log('⚠️ File .env.local non trovato, creando nuovo...');
      }

      // Rimuovi righe esistenti
      const lines = envContent.split('\n').filter(line => 
        !line.startsWith('RESEND_API_KEY=') && 
        !line.startsWith('EMAIL_FROM=')
      );

      // Aggiungi nuove configurazioni
      lines.push('');
      lines.push('# Email Service (Resend) - Fallback Configuration');
      lines.push(`RESEND_API_KEY=${apiKey}`);
      lines.push(`EMAIL_FROM=${emailFrom}`);

      try {
        fs.writeFileSync(envPath, lines.join('\n'));
        console.log('✅ Configurazione fallback salvata in .env.local');
        console.log('⚠️  IMPORTANTE: In produzione usa il KV store!');
      } catch (writeError) {
        console.error('❌ Errore salvataggio fallback:', writeError);
      }
    }

    rl.close();
  });
});

rl.on('close', () => {
  console.log('\n🔐 Configurazione completata!');
  console.log('💡 Per testare l\'invio email, prova la funzione di reset password.');
  console.log('📖 Docs: https://resend.com/docs');
});