#!/usr/bin/env node

/**
 * Script per creare Commission_Payments
 * Pagamenti commissioni venditori
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

async function createCommissionPayments() {
  const { apiKey, baseId } = getCredentials();
  
  const config = {
    name: 'Commission_Payments',
    description: 'Pagamenti commissioni venditori',
    fields: [
      { name: 'Pagamento_ID', type: 'singleLineText' },
      {
        name: 'ID_Ordine',
        type: 'multipleRecordLinks',
        options: { linkedTableId: 'tblkqfCMabBpVD1fP' } // Orders
      },
      {
        name: 'ID_Venditore',
        type: 'multipleRecordLinks', 
        options: { linkedTableId: 'tbl141xF7ZQskCqGh' } // User
      },
      { name: 'Importo_Vendita', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Percentuale_Commissione', type: 'number', options: { precision: 2 } },
      { name: 'Importo_Commissione', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Data_Maturazione', type: 'date', options: { dateFormat: { name: 'european' } } },
      { name: 'Data_Pagamento', type: 'date', options: { dateFormat: { name: 'european' } } },
      { 
        name: 'Stato_Pagamento',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Da_Pagare' },
          { name: 'Pagato' },
          { name: 'Sospeso' },
          { name: 'Annullato' }
        ]}
      },
      { 
        name: 'Modalita_Pagamento',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Bonifico' },
          { name: 'Contanti' },
          { name: 'Assegno' },
          { name: 'Trattenuta' }
        ]}
      },
      { name: 'Numero_Bonifico', type: 'singleLineText' },
      { name: 'IBAN_Destinazione', type: 'singleLineText' },
      { name: 'Note_Pagamento', type: 'multilineText' },
      { name: 'Riferimento_Contabile', type: 'singleLineText' },
      { name: 'Trimestre_Competenza', type: 'singleLineText' },
      { name: 'Anno_Competenza', type: 'number', options: { precision: 0 } },
      { name: 'Data_Creazione', type: 'dateTime', options: { dateFormat: { name: 'european' }, timeFormat: { name: '24hour' }, timeZone: 'Europe/Rome' } }
    ]
  };
  
  try {
    console.log('🛠️  Creando Commission_Payments...');
    
    const response = await request({
      hostname: 'api.airtable.com',
      path: `/v0/meta/bases/${baseId}/tables`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }, config);
    
    console.log('✅ Commission_Payments creata con successo!');
    console.log(`🆔 ID: ${response.id}`);
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

createCommissionPayments();