#!/usr/bin/env node

/**
 * Script per creare Orders
 * Tabella principale degli ordini
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

async function createOrders() {
  const { apiKey, baseId } = getCredentials();
  
  const config = {
    name: 'Orders',
    description: 'Tabella principale ordini CRM',
    fields: [
      { name: 'Numero_Ordine', type: 'singleLineText' },
      {
        name: 'ID_Lead',
        type: 'multipleRecordLinks',
        options: { linkedTableId: 'tblKIZ9CDjcQorONA' } // Lead
      },
      {
        name: 'ID_Venditore',
        type: 'multipleRecordLinks', 
        options: { linkedTableId: 'tbl141xF7ZQskCqGh' } // User
      },
      { name: 'Data_Ordine', type: 'date', options: { dateFormat: { name: 'european' } } },
      { name: 'Data_Consegna_Richiesta', type: 'date', options: { dateFormat: { name: 'european' } } },
      { 
        name: 'Stato_Ordine',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Bozza' },
          { name: 'Confermato' },
          { name: 'In_Produzione' },
          { name: 'Spedito' },
          { name: 'Consegnato' },
          { name: 'Annullato' }
        ]}
      },
      { 
        name: 'Stato_Pagamento',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Non_Pagato' },
          { name: 'Pagamento_Parziale' },
          { name: 'Pagato' },
          { name: 'Rimborsato' }
        ]}
      },
      { 
        name: 'Modalita_Pagamento',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Contanti' },
          { name: 'Bonifico' },
          { name: 'Carta_Credito' },
          { name: 'Finanziamento' },
          { name: 'Assegno' },
          { name: 'PayPal' }
        ]}
      },
      { name: 'Totale_Lordo', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Totale_Sconto', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Totale_Netto', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Totale_IVA', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Totale_Finale', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Percentuale_Sconto', type: 'number', options: { precision: 2 } },
      { name: 'Percentuale_Commissione', type: 'number', options: { precision: 2 } },
      { name: 'Importo_Commissione', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Indirizzo_Consegna', type: 'multilineText' },
      { name: 'Note_Cliente', type: 'multilineText' },
      { name: 'Note_Interne', type: 'multilineText' },
      { name: 'Codice_Tracking', type: 'singleLineText' },
      { name: 'Finanziamento_Richiesto', type: 'checkbox', options: { icon: 'check', color: 'blueBright' } },
      { name: 'Rata_Mensile', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Numero_Rate', type: 'number', options: { precision: 0 } },
      { name: 'Tasso_Interesse', type: 'number', options: { precision: 2 } },
      { 
        name: 'Stato_Finanziamento',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Non_Richiesto' },
          { name: 'In_Valutazione' },
          { name: 'Approvato' },
          { name: 'Rifiutato' }
        ]}
      },
      { name: 'Data_Creazione', type: 'dateTime', options: { dateFormat: { name: 'european' }, timeFormat: { name: '24hour' }, timeZone: 'Europe/Rome' } },
      { name: 'Ultima_Modifica', type: 'dateTime', options: { dateFormat: { name: 'european' }, timeFormat: { name: '24hour' }, timeZone: 'Europe/Rome' } }
    ]
  };
  
  try {
    console.log('🛠️  Creando Orders...');
    
    const response = await request({
      hostname: 'api.airtable.com',
      path: `/v0/meta/bases/${baseId}/tables`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }, config);
    
    console.log('✅ Orders creata con successo!');
    console.log(`🆔 ID: ${response.id}`);
    
  } catch (error) {
    console.error('❌ Errore:', error.message);
  }
}

createOrders();