// Test script per DEBUG dell'API PUT /api/leads/[id]
const https = require('http');

const testData = {
  Nome: "Test Update Debug",
  Telefono: "0987654321"
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/leads/rec0RzG6UhpF94a64',
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  },
  timeout: 10000 // 10 secondi timeout
};

console.log('🚀 Testing PUT /api/leads/rec0RzG6UhpF94a64...');
console.log('📤 Data da inviare:', testData);
console.log('📏 Content-Length:', Buffer.byteLength(postData));

const req = https.request(options, (res) => {
  console.log('📡 Response status:', res.statusCode);
  console.log('📡 Response headers:', res.headers);
  
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
    console.log('📦 Received chunk:', chunk.length, 'bytes');
  });

  res.on('end', () => {
    console.log('✅ Response complete');
    try {
      const jsonData = JSON.parse(data);
      console.log('📦 Response JSON:', jsonData);
      
      if (jsonData.success) {
        console.log('✅ SUCCESS: Lead aggiornato!');
      } else {
        console.log('❌ FAILURE: Update fallito');
        console.log('💬 Error:', jsonData.error || 'N/A');
      }
    } catch (e) {
      console.log('📦 Raw response:', data);
      console.error('💥 JSON Parse Error:', e.message);
    }
  });
});

req.on('error', (e) => {
  console.error('💥 Request Error:', e);
});

req.on('timeout', () => {
  console.error('⏰ Request TIMEOUT after 10s!');
  req.destroy();
});

req.write(postData);
req.end();

console.log('📡 Request sent, waiting for response...');
