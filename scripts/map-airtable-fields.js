#!/usr/bin/env node

/**
 * Script per mappare tutti i campi della tabella ordini direttamente da Airtable
 * Interroga il Metadata API per ottenere la struttura completa
 */

const https = require('https');

// Configurazione
const CONFIG = {
  AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
  BASE_ID: 'app359c17lK0Ta8Ws',
  ORDERS_TABLE_ID: 'tblkqfCMabBpVD1fP',
  ORDER_ITEMS_TABLE_ID: 'tblxzhMCa5UJOMZqC',
};

if (!CONFIG.AIRTABLE_API_KEY) {
  console.error('❌ AIRTABLE_API_KEY non configurato');
  process.exit(1);
}

/**
 * Effettua una richiesta HTTPS a Airtable API
 */
function makeRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Authorization': `Bearer ${CONFIG.AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Recupera i campi di una tabella
 */
async function getTableFields(baseId, tableId, tableName) {
  console.log(`\n📋 Recuperando campi per: ${tableName}`);
  console.log(`   Base: ${baseId}, Table: ${tableId}\n`);

  try {
    // Prova prima con il Metadata API (endpoint ufficiale)
    const metaUrl = `https://api.airtable.com/v0/meta/bases/${baseId}/tables/${tableId}`;
    console.log(`🔗 URL (Metadata): ${metaUrl}`);
    
    const result = await makeRequest(metaUrl);
    
    if (result.fields) {
      return result.fields;
    }
  } catch (error) {
    console.warn(`⚠️  Metadata API non disponibile: ${error.message}`);
    console.log(`📝 Nota: Il Metadata API richiede un piano Airtable a pagamento.\n`);
  }

  console.log('❌ Impossibile recuperare i campi direttamente da Airtable.');
  console.log('💡 Soluzione: Interrogare manualmente Airtable per la struttura della tabella.');
  return null;
}

/**
 * Funzione principale
 */
async function main() {
  console.log('🚀 Mapping Airtable Table Fields\n');
  console.log('═'.repeat(60));

  try {
    // Recupera i campi della tabella ordini
    const ordersFields = await getTableFields(
      CONFIG.BASE_ID,
      CONFIG.ORDERS_TABLE_ID,
      'Orders (Ordini)'
    );

    if (ordersFields) {
      console.log('✅ Campi Orders Table:');
      console.log(JSON.stringify(ordersFields, null, 2));
    } else {
      console.log('\n📌 ISTRUZIONI MANUALI:\n');
      console.log('1. Accedi a Airtable: https://airtable.com/app359c17lK0Ta8Ws');
      console.log('2. Apri la tabella "Ordini" (ID: tblkqfCMabBpVD1fP)');
      console.log('3. Clicca su "Grid view" → "Fields"');
      console.log('4. Documenta tutti i campi disponibili con i loro tipi');
      console.log('5. Per select fields, documenta tutte le opzioni disponibili\n');
      
      console.log('CAMPI ATTESI DALLA STRUTTURA ATTUALE:\n');
      
      const expectedFields = [
        { name: 'ID_Ordine', type: 'single_line_text', description: 'ID univoco ordine' },
        { name: 'Data_Ordine', type: 'date', description: 'Data creazione ordine' },
        { name: 'Data_Creazione', type: 'date', description: 'Data inserimento in sistema' },
        { name: 'Stato_Ordine', type: 'single_select', description: 'Status: Bozza, Confermato, In Produzione, Spedito, Consegnato, Annullato' },
        { name: 'ID_Lead', type: 'multiple_lookup_records', description: 'Link a Lead (cliente)' },
        { name: 'ID_Venditore', type: 'multiple_lookup_records', description: 'Link a utenti (venditori)' },
        { name: 'Indirizzo_Consegna', type: 'single_line_text', description: 'Indirizzo consegna' },
        { name: 'Data_Consegna_Richiesta', type: 'date', description: 'Data consegna richiesta' },
        { name: 'Totale_Lordo', type: 'number', description: 'Importo totale lordo' },
        { name: 'Totale_Sconto', type: 'number', description: 'Importo sconto totale' },
        { name: 'Totale_IVA', type: 'number', description: 'Importo IVA totale' },
        { name: 'Totale_Netto', type: 'number', description: 'Importo totale netto' },
        { name: 'Totale_Finale', type: 'number', description: 'Importo finale (quello da pagare)' },
        { name: 'Stato_Pagamento', type: 'single_select', description: '⚠️  MANCANTE - Documenta opzioni disponibili' },
        { name: 'Modalita_Pagamento', type: 'single_select', description: '⚠️  MANCANTE - Documenta opzioni disponibili' },
        { name: 'Order_Items', type: 'multiple_lookup_records', description: 'Link a righe ordine' },
        { name: 'URL_Contratto', type: 'text', description: 'URL o allegati contratto' },
        { name: 'URL_Documenti_Cliente', type: 'text', description: '⚠️  POTENZIALMENTE MANCANTE - Documenta se presente' },
        { name: 'URL_Schede_Cliente', type: 'text', description: 'URL o allegati schede cliente' },
        { name: 'Note_Cliente', type: 'long_text', description: 'Note per il cliente' },
        { name: 'Note_Interne', type: 'long_text', description: 'Note interne (non visibili al cliente)' },
        { name: 'Ultima_Modifica', type: 'date', description: 'Data ultima modifica' },
      ];
      
      expectedFields.forEach((field, idx) => {
        const marker = field.description.includes('⚠️') ? '⚠️ ' : '✅ ';
        console.log(`${marker}${idx + 1}. ${field.name} (${field.type})`);
        console.log(`   └─ ${field.description}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Errore:', error.message);
    process.exit(1);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('\n📌 AZIONI SUCCESSIVE:\n');
  console.log('1. Una volta confermata la struttura, create gli endpoint API:');
  console.log('   - GET /api/orders/payment-statuses');
  console.log('   - GET /api/orders/payment-methods\n');
  console.log('2. Aggiungere i campi ai form di creazione/modifica ordini\n');
  console.log('3. Creare la pagina di visualizzazione: /orders/[id]/view\n');
}

main().catch(console.error);
