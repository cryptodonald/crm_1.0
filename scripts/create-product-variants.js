#!/usr/bin/env node

/**
 * Script semplificato per creare solo Product_Variants
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
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function createProductVariants() {
  const { apiKey, baseId } = getCredentials();
  
  const config = {
    name: 'Product_Variants',
    description: 'Varianti prodotti per configuratore',
    fields: [
      { name: 'Nome_Variante', type: 'singleLineText' },
      {
        name: 'ID_Prodotto',
        type: 'multipleRecordLinks',
        options: { linkedTableId: 'tblEFvr3aT2jQdYUL' } // Products table ID
      },
      {
        name: 'Tipo_Variante',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Dimensione' },
          { name: 'Taglia' },
          { name: 'Topper' },
          { name: 'Cover' },
          { name: 'Accessorio' }
        ]}
      },
      { name: 'Codice_Variante', type: 'singleLineText' },
      { name: 'Prezzo_Aggiuntivo_Attuale', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Costo_Aggiuntivo_Attuale', type: 'currency', options: { symbol: '€', precision: 2 } },
      {
        name: 'Posizione',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Sinistra' },
          { name: 'Destra' }, 
          { name: 'Entrambi' },
          { name: 'Nessuna' }
        ]}
      },
      { name: 'Obbligatorio', type: 'checkbox', options: { icon: 'check', color: 'greenBright' } },
      { name: 'Attivo', type: 'checkbox', options: { icon: 'check', color: 'greenBright' } }
    ]
  };
  
  try {
    console.log('🛠️  Creando Product_Variants...');
    console.log('Config:', JSON.stringify(config, null, 2));
    
    const response = await request({
      hostname: 'api.airtable.com',
      path: `/v0/meta/bases/${baseId}/tables`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }, config);
    
    console.log('✅ Product_Variants creata con successo!');
    console.log(`🆔 ID: ${response.id}`);
    console.log('\n🎯 Ora puoi:');
    console.log('1. Verificare la tabella su Airtable');
    console.log('2. Aggiungere varianti di esempio');
    console.log('3. Creare le altre tabelle manualmente se necessario');
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

createProductVariants();