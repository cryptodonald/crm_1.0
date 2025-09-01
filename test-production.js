const { Redis } = require('@upstash/redis');

async function testProductionAPI() {
  console.log('🔍 Test API di Produzione Vercel');
  console.log('===============================\n');

  // Test 1: Homepage
  try {
    const homeResponse = await fetch('https://crm-1-0-b11y48geq-doctorbed.vercel.app');
    console.log('🏠 Homepage Status:', homeResponse.status);
    if (homeResponse.status !== 200) {
      const text = await homeResponse.text();
      console.log('📄 Content preview:', text.slice(0, 200) + '...');
    }
  } catch (err) {
    console.error('❌ Homepage error:', err.message);
  }

  // Test 2: API Stats
  try {
    const statsResponse = await fetch('https://crm-1-0-b11y48geq-doctorbed.vercel.app/api/api-keys/stats');
    console.log('\n📊 API Stats Status:', statsResponse.status);
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('📈 Stats:', stats);
    } else {
      const errorText = await statsResponse.text();
      console.log('❌ Stats Error:', errorText.slice(0, 200));
    }
  } catch (err) {
    console.error('❌ Stats API error:', err.message);
  }

  // Test 3: API Keys List
  try {
    const keysResponse = await fetch('https://crm-1-0-b11y48geq-doctorbed.vercel.app/api/api-keys');
    console.log('\n🔑 API Keys Status:', keysResponse.status);
    if (keysResponse.ok) {
      const keys = await keysResponse.json();
      console.log('🗂️  Keys count:', keys.apiKeys?.length || 0);
    } else {
      const errorText = await keysResponse.text();
      console.log('❌ Keys Error:', errorText.slice(0, 200));
    }
  } catch (err) {
    console.error('❌ API Keys error:', err.message);
  }

  // Test 4: Direct database connection with production vars (simulate)
  console.log('\n🔍 Test Connessione Database (usando env locali):');
  try {
    require('dotenv').config({ path: '.env.local' });
    
    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    const keys = await redis.keys('api_key:*');
    console.log('📊 Chiavi nel database:', keys.length);
    
    if (keys.length > 0) {
      // Test decryption
      const firstKey = await redis.get(keys[0]);
      console.log('🔓 Primo record trovato:', firstKey?.name || 'Unknown');
    }

  } catch (err) {
    console.error('❌ Database test error:', err.message);
  }

  console.log('\n✅ Test completato!');
}

testProductionAPI();
