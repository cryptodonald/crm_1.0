#!/usr/bin/env node

/**
 * Script per creare Product_Price_History
 * Storico prezzi per prodotti e varianti
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

async function createProductPriceHistory() {
  const { apiKey, baseId } = getCredentials();
  
  const config = {
    name: 'Product_Price_History',
    description: 'Storico prezzi per prodotti e varianti',
    fields: [
      { name: 'Storico_ID', type: 'singleLineText' },
      {
        name: 'ID_Prodotto',
        type: 'multipleRecordLinks',
        options: { linkedTableId: 'tblEFvr3aT2jQdYUL' } // Products
      },
      {
        name: 'ID_Variante',
        type: 'multipleRecordLinks', 
        options: { linkedTableId: 'tblGnZgea6HlO2pJ4' } // Product_Variants
      },
      { name: 'Prezzo_Vendita', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Prezzo_Costo', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Data_Validita_Da', type: 'date', options: { dateFormat: { name: 'european' } } },
      { name: 'Data_Validita_A', type: 'date', options: { dateFormat: { name: 'european' } } },
      { 
        name: 'Tipo_Prezzo',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Base' },
          { name: 'Promo' },
          { name: 'Scontato' },
          { name: 'Speciale' }
        ]}
      },
      { 
        name: 'Motivo_Cambio',
        type: 'singleSelect', 
        options: { choices: [
          { name: 'Aggiornamento_Listino' },
          { name: 'Promozione' },
          { name: 'Correzione_Errore' },
          { name: 'Cambio_Fornitore' },
          { name: 'Inflazione' }
        ]}
      },
      { name: 'Creato_Da', type: 'singleLineText' },
      { name: 'Note', type: 'multilineText' },
      { name: 'Attivo', type: 'checkbox', options: { icon: 'check', color: 'greenBright' } }
    ]
  };
  
  try {
    console.log('🛠️  Creando Product_Price_History...');
    
    const response = await request({
      hostname: 'api.airtable.com',
      path: `/v0/meta/bases/${baseId}/tables`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }, config);
    
    console.log('✅ Product_Price_History creata con successo!');
    console.log(`🆔 ID: ${response.id}`);
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

createProductPriceHistory();