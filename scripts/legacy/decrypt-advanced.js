require('dotenv').config({ path: '../../.env.local' });
const { Redis } = require('@upstash/redis');

// Replica la logica di decrittografia dal tuo servizio
function decryptLegacy(ciphertext) {
  try {
    // Per le chiavi legacy, mostriamo parte del valore reale
    if (ciphertext.length > 8) {
      const start = ciphertext.substring(0, 6);
      const end = ciphertext.slice(-6);
      return `${start}...${end}`;
    } else {
      return ciphertext.substring(0, 6) + '...';
    }
  } catch (error) {
    return 'Errore decrittografia legacy';
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

async function decryptAdvanced(keyId) {
  try {
    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    console.log(`🔍 Analizzando la chiave: ${keyId}...\n`);

    const keyData = await redis.get(keyId);
    
    if (!keyData) {
      console.log('❌ Chiave non trovata!');
      return;
    }

    console.log('📋 Informazioni della chiave:');
    console.log('  🏷️  Nome:', keyData.name);
    console.log('  📝  Descrizione:', keyData.description || 'Nessuna');
    console.log('  ✅  Attiva:', keyData.isActive ? 'Sì' : 'No');
    console.log('  🛡️  Permessi:', keyData.permissions.join(', '));
    console.log('  📊  Utilizzi:', keyData.usageCount);
    console.log('  📅  Creata:', new Date(keyData.createdAt).toLocaleString());
    console.log('  🔄  Aggiornata:', new Date(keyData.updatedAt).toLocaleString());
    
    if (keyData.expiresAt) {
      console.log('  ⏰  Scade:', new Date(keyData.expiresAt).toLocaleString());
    }
    
    if (keyData.ipWhitelist && keyData.ipWhitelist.length > 0) {
      console.log('  🌐  IP Whitelist:', keyData.ipWhitelist.join(', '));
    }

    console.log('\n🔐 Decrittografia del valore:');

    // Prova decrittografia nuovo formato
    const newDecrypted = decryptNew(keyData.key);
    if (newDecrypted) {
      console.log('  ✅ Formato nuovo (ENC:) rilevato');
      console.log('  🔓 Valore completo:', newDecrypted);
    } else {
      console.log('  ⚠️  Formato legacy rilevato');
      console.log('  🔐 Valore criptato originale:', keyData.key);
      console.log('  👁️  Preview parziale:', decryptLegacy(keyData.key));
      console.log('\n💡 Per vedere il valore completo delle chiavi legacy:');
      console.log('   1. Usa il tasto "Copia" nel dashboard web');
      console.log('   2. Oppure aggiorna la chiave con un nuovo valore');
    }

    console.log('\n📱 Link Dashboard:');
    console.log('   🌐 Web: http://localhost:3001/developers/api-keys');
    console.log('   📊 Upstash: https://console.upstash.com/');

  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

// Uso del script
const keyId = process.argv[2];
if (!keyId) {
  console.log('\n🚀 Script di Decrittografia Avanzata API Keys\n');
  console.log('📝 Uso: node decrypt-advanced.js <KEY_ID>');
  console.log('\n📋 Esempi:');
  console.log('   node decrypt-advanced.js api_key:0ieVNO-i8TEyeyzbhZm-c');
  console.log('   node decrypt-advanced.js api_key:Cq_GnqE89jEot9Rku1Dvr');
  console.log('\n💡 Per vedere tutte le chiavi disponibili:');
  console.log('   node debug-kv.js');
  process.exit(1);
}

decryptAdvanced(keyId);
