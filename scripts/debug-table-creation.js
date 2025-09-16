#!/usr/bin/env node

/**
 * Script di debug per testare la creazione di una singola tabella
 * e vedere l'errore completo
 */

const https = require('https');
const path = require('path');

function getCredentials() {
  require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
  return {
    apiKey: process.env.AIRTABLE_API_KEY,
    baseId: process.env.AIRTABLE_BASE_ID
  };
}

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed, null, 2)}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}. Body: ${body}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function testTableCreation() {
  const { apiKey, baseId } = getCredentials();
  
  // Test config semplificato per Product_Variants
  const testConfig = {
    name: 'Test_Product_Variants',
    description: 'Test varianti prodotti',
    fields: [
      { name: 'Nome_Variante', type: 'singleLineText' }, // Primary field deve essere primo
      {
        name: 'ID_Prodotto',
        type: 'multipleRecordLinks',
        options: {
          linkedTableId: 'tblEFvr3aT2jQdYUL' // ID Products dalla precedente esecuzione
        }
      },
      {
        name: 'Tipo_Variante',
        type: 'singleSelect',
        options: { 
          choices: [
            { name: 'Dimensione' }, 
            { name: 'Taglia' }
          ]
        }
      },
      { name: 'Codice_Variante', type: 'singleLineText' }
    ]
  };
  
  console.log('🧪 Testing table creation...');
  console.log('Config:', JSON.stringify(testConfig, null, 2));
  
  try {
    const response = await request({
      hostname: 'api.airtable.com',
      path: `/v0/meta/bases/${baseId}/tables`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }, testConfig);
    
    console.log('✅ Success:', response);
  } catch (error) {
    console.error('❌ Full error:', error.message);
  }
}

testTableCreation();