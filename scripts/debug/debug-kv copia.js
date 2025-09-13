require('dotenv').config({ path: '../../.env.local' });
const { Redis } = require('@upstash/redis');

async function debugKV() {
  try {
    console.log('🔧 URL KV:', process.env.KV_REST_API_URL ? 'Present' : 'Missing');
    console.log('🔧 TOKEN KV:', process.env.KV_REST_API_TOKEN ? 'Present' : 'Missing');
    
    // Inizializza Redis con le variabili di ambiente
    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    console.log('🔍 Esplorando il database KV...\n');

    // 1. Vedi tutte le chiavi nel database
    console.log('📋 Tutte le chiavi nel database:');
    const allKeys = await redis.keys('*');
    console.log(allKeys);
    console.log(`\n📊 Totale chiavi: ${allKeys.length}\n`);

    // 2. Filtra le API keys
    const apiKeys = allKeys.filter(key => key.startsWith('api_key:'));
    console.log('🔑 API Keys trovate:');
    console.log(apiKeys);
    console.log(`\n📊 Totale API Keys: ${apiKeys.length}\n`);

    // 3. Mostra i dettagli delle prime 3 API keys
    for (let i = 0; i < Math.min(3, apiKeys.length); i++) {
      const keyId = apiKeys[i];
      console.log(`🔍 Dettagli di ${keyId}:`);
      const keyData = await redis.get(keyId);
      
      if (keyData) {
        console.log('  Nome:', keyData.name);
        console.log('  Valore (criptato):', keyData.key.substring(0, 20) + '...');
        console.log('  Permessi:', keyData.permissions);
        console.log('  Attiva:', keyData.isActive);
        console.log('  Creata il:', new Date(keyData.createdAt).toLocaleString());
        console.log('  Utilizzi:', keyData.usageCount);
      }
      console.log('');
    }

    // 4. Vedi le chiavi dell'utente
    console.log('👤 Chiavi dell\'utente user_dev_001:');
    const userKeys = await redis.smembers('user_api_keys:user_dev_001');
    console.log(userKeys);
    console.log('');

    // 5. Vedi le statistiche
    const statsKeys = allKeys.filter(key => key.includes('usage'));
    console.log('📈 Chiavi di statistiche:');
    console.log(statsKeys);

  } catch (error) {
    console.error('❌ Errore:', error);
  }
}

// Esegui il debug
debugKV();
