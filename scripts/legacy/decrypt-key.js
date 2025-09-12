require('dotenv').config({ path: '../../.env.local' });
const { Redis } = require('@upstash/redis');

async function decryptKey(keyId) {
  try {
    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    console.log(`🔍 Decriptando la chiave: ${keyId}...\n`);

    const keyData = await redis.get(keyId);
    
    if (!keyData) {
      console.log('❌ Chiave non trovata!');
      return;
    }

    console.log('📋 Dati della chiave:');
    console.log('  Nome:', keyData.name);
    console.log('  Descrizione:', keyData.description || 'Nessuna');
    console.log('  Attiva:', keyData.isActive);
    console.log('  Permessi:', keyData.permissions);
    console.log('  Utilizzi:', keyData.usageCount);
    console.log('  Creata:', new Date(keyData.createdAt).toLocaleString());

    // Decrittografia semplice (Base64)
    let decryptedValue = keyData.key;
    if (keyData.key.startsWith('ENC:')) {
      const base64Data = keyData.key.substring(4);
      decryptedValue = Buffer.from(base64Data, 'base64').toString('utf8');
      console.log('\n🔓 Valore decriptato:', decryptedValue);
    } else {
      console.log('\n🔒 Valore (criptato):', keyData.key.substring(0, 20) + '...');
      console.log('ℹ️  Formato legacy - non decriptabile con questo script');
    }

  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

// Uso: node decrypt-key.js [KEY_ID]
const keyId = process.argv[2];
if (!keyId) {
  console.log('❓ Uso: node decrypt-key.js <KEY_ID>');
  console.log('📝 Esempio: node decrypt-key.js api_key:0ieVNO-i8TEyeyzbhZm-c');
  process.exit(1);
}

decryptKey(keyId);
