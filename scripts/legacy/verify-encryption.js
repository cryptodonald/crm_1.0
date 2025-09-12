require('dotenv').config({ path: '../../.env.local' });
const { Redis } = require('@upstash/redis');
const crypto = require('crypto');

// Funzione di decrittografia (replica quella del servizio)
function decrypt(ciphertext) {
  try {
    if (ciphertext.startsWith('ENC:')) {
      // Nuovo formato Base64 - questo dovrebbe funzionare
      const base64Data = ciphertext.substring(4);
      return Buffer.from(base64Data, 'base64').toString('utf8');
    } else {
      // Formato legacy - mostriamo preview parziale come nel servizio
      if (ciphertext.length > 8) {
        const start = ciphertext.substring(0, 4);
        const end = ciphertext.slice(-4);
        return `${start}...${end}`;
      } else {
        return ciphertext.substring(0, 4) + '...';
      }
    }
  } catch (error) {
    return `DECRYPT_ERROR: ${error.message}`;
  }
}

async function verifyEncryption() {
  try {
    console.log('🔍 Verifica Corrispondenza: Upstash ↔ .env.local\n');

    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    // Mappa delle chiavi da verificare (nome nel KV → nome nel .env.local)
    const keyMappings = {
      'Airtable CRM API': 'AIRTABLE_API_KEY',
      'WhatsApp Business Access Token': 'WHATSAPP_ACCESS_TOKEN', 
      'GitHub Personal Access Token': 'GITHUB_TOKEN',
      'Google Maps API': 'GOOGLE_MAPS_API_KEY',
      'NextAuth Secret': 'NEXTAUTH_SECRET',
    };

    // Leggi tutte le API keys da Upstash
    const allKeys = await redis.keys('api_key:*');
    console.log(`📊 Trovate ${allKeys.length} chiavi su Upstash\n`);

    let matches = 0;
    let mismatches = 0;
    let notFound = 0;

    for (const keyId of allKeys) {
      const keyData = await redis.get(keyId);
      if (!keyData) continue;

      const envVarName = keyMappings[keyData.name];
      if (!envVarName) {
        console.log(`⚠️  ${keyData.name}: Non mappata in .env.local`);
        notFound++;
        continue;
      }

      const envValue = process.env[envVarName];
      if (!envValue) {
        console.log(`❌ ${keyData.name}: Variabile ${envVarName} non trovata in .env.local`);
        mismatches++;
        continue;
      }

      console.log(`🔑 ${keyData.name}:`);
      console.log(`   📄 .env.local (${envVarName}): ${envValue.substring(0, 15)}...`);
      console.log(`   💾 Upstash (criptato): ${keyData.key.substring(0, 15)}...`);
      
      const decryptedValue = decrypt(keyData.key);
      console.log(`   🔓 Upstash (decriptato): ${decryptedValue.substring(0, 15)}...`);
      
      if (decryptedValue === envValue) {
        console.log(`   ✅ MATCH! I valori corrispondono`);
        matches++;
      } else {
        console.log(`   ❌ MISMATCH! I valori sono diversi`);
        console.log(`      Original: ${envValue}`);
        console.log(`      Decrypted: ${decryptedValue}`);
        mismatches++;
      }
      console.log('');
    }

    console.log('📈 **RISULTATI VERIFICA:**');
    console.log(`   ✅ Corrispondenze: ${matches}`);
    console.log(`   ❌ Non corrispondenti: ${mismatches}`);
    console.log(`   ⚠️  Non mappate: ${notFound}`);
    console.log(`   📊 Totale verificate: ${matches + mismatches}`);

    if (mismatches === 0 && matches > 0) {
      console.log('\n🎉 **VERIFICA SUPERATA!** La crittografia funziona correttamente!');
    } else if (mismatches > 0) {
      console.log('\n⚠️  **ATTENZIONE:** Alcune chiavi non corrispondono. Potrebbero essere:');
      console.log('   • Chiavi legacy con formato di crittografia diverso');
      console.log('   • Chiavi aggiornate manualmente dopo la migrazione');
      console.log('   • Problemi nella decrittografia legacy');
    }

  } catch (error) {
    console.error('❌ Errore durante la verifica:', error.message);
  }
}

verifyEncryption();
