#!/usr/bin/env node

/**
 * Script per creare Payment_Transactions
 * Transazioni di pagamento ordini
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

async function createPaymentTransactions() {
  const { apiKey, baseId } = getCredentials();
  
  const config = {
    name: 'Payment_Transactions',
    description: 'Transazioni di pagamento ordini',
    fields: [
      { name: 'Transazione_ID', type: 'singleLineText' },
      {
        name: 'ID_Ordine',
        type: 'multipleRecordLinks',
        options: { linkedTableId: 'tblkqfCMabBpVD1fP' } // Orders
      },
      { name: 'Importo', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Data_Transazione', type: 'dateTime', options: { dateFormat: { name: 'european' }, timeFormat: { name: '24hour' }, timeZone: 'Europe/Rome' } },
      { 
        name: 'Tipo_Transazione',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Acconto' },
          { name: 'Saldo' },
          { name: 'Pagamento_Completo' },
          { name: 'Rimborso' },
          { name: 'Storno' }
        ]}
      },
      { 
        name: 'Modalita_Pagamento',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Contanti' },
          { name: 'Bonifico' },
          { name: 'Carta_Credito' },
          { name: 'Carta_Debito' },
          { name: 'PayPal' },
          { name: 'Assegno' },
          { name: 'Finanziamento' }
        ]}
      },
      { 
        name: 'Stato_Transazione',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Pending' },
          { name: 'Completata' },
          { name: 'Fallita' },
          { name: 'Annullata' },
          { name: 'Rimborsata' }
        ]}
      },
      { name: 'Riferimento_Esterno', type: 'singleLineText' },
      { name: 'ID_Transazione_Gateway', type: 'singleLineText' },
      { name: 'Codice_Autorizzazione', type: 'singleLineText' },
      { name: 'Numero_Ricevuta', type: 'singleLineText' },
      { name: 'IBAN_Mittente', type: 'singleLineText' },
      { name: 'Nome_Titolare', type: 'singleLineText' },
      { name: 'Commissioni_Gateway', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Tasso_Cambio', type: 'number', options: { precision: 4 } },
      { name: 'Valuta_Originale', type: 'singleLineText' },
      { name: 'Importo_Originale', type: 'number', options: { precision: 2 } },
      { name: 'Note_Transazione', type: 'multilineText' },
      { name: 'Data_Accredito', type: 'date', options: { dateFormat: { name: 'european' } } },
      { name: 'Verificata', type: 'checkbox', options: { icon: 'check', color: 'greenBright' } },
      { name: 'Riconciliata', type: 'checkbox', options: { icon: 'check', color: 'blueBright' } },
      { name: 'Log_Errori', type: 'multilineText' }
    ]
  };
  
  try {
    console.log('🛠️  Creando Payment_Transactions...');
    
    const response = await request({
      hostname: 'api.airtable.com',
      path: `/v0/meta/bases/${baseId}/tables`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }, config);
    
    console.log('✅ Payment_Transactions creata con successo!');
    console.log(`🆔 ID: ${response.id}`);
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

createPaymentTransactions();