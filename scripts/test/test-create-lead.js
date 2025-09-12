// Test script per verificare l'API POST /api/leads
const fetch = require('node-fetch');

const testData = {
  Nome: "Test Lead API",
  Telefono: "1234567890",
  Email: "test@example.com", 
  Indirizzo: "Via Test, 1",
  CAP: 12345,
  Città: "Test City",
  Esigenza: "Test esigenza",
  Stato: "Nuovo",
  Provenienza: "Test",
  Note: "Test note automatiche",
  Referenza: [],
  Assegnatario: [],
  Avatar: "",
  Allegati: []
};

console.log('🚀 Testing POST /api/leads...');
console.log('📤 Data da inviare:', JSON.stringify(testData, null, 2));

fetch('http://localhost:3000/api/leads', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData)
})
.then(response => {
  console.log('📡 Response status:', response.status);
  console.log('📡 Response ok:', response.ok);
  return response.json();
})
.then(data => {
  console.log('📦 Response data:', JSON.stringify(data, null, 2));
  
  if (data.success) {
    console.log('✅ SUCCESS: Lead creato con successo!');
    console.log('🆔 Lead ID:', data.lead?.id || 'N/A');
  } else {
    console.log('❌ FAILURE: Creazione fallita');
    console.log('💬 Error:', data.error || 'N/A');
  }
})
.catch(error => {
  console.error('💥 Network/Parse Error:', error);
});
