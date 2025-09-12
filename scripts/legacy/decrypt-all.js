require('dotenv').config({ path: '../../.env.local' });
const { Redis } = require('@upstash/redis');

function decryptLegacy(ciphertext) {
  if (ciphertext.length > 8) {
    const start = ciphertext.substring(0, 6);
    const end = ciphertext.slice(-6);
    return `${start}...${end}`;
  } else {
    return ciphertext.substring(0, 6) + '...';
  }
}

function decryptNew(ciphertext) {
  try {
    if (ciphertext.startsWith('ENC:')) {
      const base64Data = ciphertext.substring(4);
      return Buffer.from(base64Data, 'base64').toString('utf8');
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function decryptAll() {
  try {
    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    console.log('🔓 Decrittando tutte le API Keys...\n');

    // Ottieni tutte le chiavi API
    const allKeys = await redis.keys('api_key:*');
    console.log(`📊 Trovate ${allKeys.length} API keys\n`);

    for (let i = 0; i < allKeys.length; i++) {
      const keyId = allKeys[i];
      const keyData = await redis.get(keyId);
      
      if (keyData) {
        console.log(`🔑 ${i + 1}. ${keyData.name}`);
        console.log(`   📋 ID: ${keyId}`);
        console.log(`   🛡️ Permessi: ${keyData.permissions.join(', ')}`);
        console.log(`   📊 Utilizzi: ${keyData.usageCount}`);
        
        const newDecrypted = decryptNew(keyData.key);
        if (newDecrypted) {
          console.log(`   🔓 Valore: ${newDecrypted}`);
          console.log(`   ✅ Formato: Nuovo (ENC)`);
        } else {
          console.log(`   👁️ Preview: ${decryptLegacy(keyData.key)}`);
          console.log(`   ⚠️ Formato: Legacy (usa dashboard per valore completo)`);
        }
        console.log('');
      }
    }

    console.log('💡 Suggerimenti:');
    console.log('   • Per le chiavi legacy, usa il dashboard web per copiarle');
    console.log('   • Per aggiornare al nuovo formato, modifica la chiave nel dashboard');
    console.log('   • Dashboard: http://localhost:3001/developers/api-keys');

  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

decryptAll();
