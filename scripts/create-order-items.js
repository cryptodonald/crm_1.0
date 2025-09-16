#!/usr/bin/env node

/**
 * Script per creare Order_Items
 * Righe ordine con prodotti e configurazioni
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

async function createOrderItems() {
  const { apiKey, baseId } = getCredentials();
  
  const config = {
    name: 'Order_Items',
    description: 'Righe ordine con prodotti e configurazioni',
    fields: [
      { name: 'Riga_ID', type: 'singleLineText' },
      {
        name: 'ID_Ordine',
        type: 'multipleRecordLinks',
        options: { linkedTableId: 'tblkqfCMabBpVD1fP' } // Orders
      },
      {
        name: 'ID_Prodotto',
        type: 'multipleRecordLinks', 
        options: { linkedTableId: 'tblEFvr3aT2jQdYUL' } // Products
      },
      {
        name: 'Configurazione_Varianti',
        type: 'multipleRecordLinks',
        options: { linkedTableId: 'tblGnZgea6HlO2pJ4' } // Product_Variants
      },
      { name: 'Quantita', type: 'number', options: { precision: 0 } },
      { name: 'Prezzo_Unitario', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Costo_Unitario', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Sconto_Percentuale', type: 'number', options: { precision: 2 } },
      { name: 'Sconto_Importo', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Prezzo_Finale_Unitario', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Totale_Riga', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Configurazione_JSON', type: 'multilineText' },
      { name: 'Note_Configurazione', type: 'multilineText' },
      { name: 'Codice_Prodotto_Configurato', type: 'singleLineText' },
      { name: 'Nome_Prodotto_Personalizzato', type: 'singleLineText' },
      { name: 'Dimensioni_Finali', type: 'singleLineText' },
      { name: 'Peso_Stimato', type: 'number', options: { precision: 2 } },
      { 
        name: 'Stato_Produzione',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Da_Ordinare' },
          { name: 'In_Lavorazione' },
          { name: 'Pronto' },
          { name: 'Spedito' }
        ]}
      },
      { name: 'Data_Consegna_Prevista', type: 'date', options: { dateFormat: { name: 'european' } } },
      { name: 'Giorni_Lavorazione', type: 'number', options: { precision: 0 } },
      { name: 'Priorita', type: 'singleSelect', options: { choices: [{ name: 'Bassa' }, { name: 'Media' }, { name: 'Alta' }, { name: 'Urgente' }] } }
    ]
  };
  
  try {
    console.log('🛠️  Creando Order_Items...');
    
    const response = await request({
      hostname: 'api.airtable.com',
      path: `/v0/meta/bases/${baseId}/tables`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }, config);
    
    console.log('✅ Order_Items creata con successo!');
    console.log(`🆔 ID: ${response.id}`);
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

createOrderItems();