#!/usr/bin/env node

/**
 * Script finale per creare tabelle sistema ordini
 * Con primary fields corretti e posizionamento link appropriato
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
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.error?.message || JSON.stringify(parsed)}`));
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

async function getExistingTables(apiKey, baseId) {
  const response = await request({
    hostname: 'api.airtable.com',
    path: `/v0/meta/bases/${baseId}/tables`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  const tables = {};
  response.tables.forEach(table => {
    tables[table.name] = table.id;
  });
  return tables;
}

async function createTable(apiKey, baseId, config) {
  try {
    const response = await request({
      hostname: 'api.airtable.com',
      path: `/v0/meta/bases/${baseId}/tables`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }, config);
    
    return { success: true, id: response.id };
  } catch (error) {
    if (error.message.includes('already exists')) {
      return { success: true, existed: true };
    }
    return { success: false, error: error.message };
  }
}

// 1. Product_Variants
async function createProductVariants(apiKey, baseId, productsTableId) {
  const config = {
    name: 'Product_Variants',
    description: 'Varianti prodotti',
    fields: [
      { name: 'Nome_Variante', type: 'singleLineText' }, // Primary field
      {
        name: 'ID_Prodotto',
        type: 'multipleRecordLinks',
        options: { linkedTableId: productsTableId }
      },
      {
        name: 'Tipo_Variante',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Dimensione' }, { name: 'Taglia' }, { name: 'Topper' }, { name: 'Cover' }, { name: 'Accessorio' }
        ]}
      },
      { name: 'Codice_Variante', type: 'singleLineText' },
      { name: 'Prezzo_Aggiuntivo_Attuale', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Costo_Aggiuntivo_Attuale', type: 'currency', options: { symbol: '€', precision: 2 } },
      {
        name: 'Posizione',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Sinistra' }, { name: 'Destra' }, { name: 'Entrambi' }, { name: 'Nessuna' }
        ]}
      },
      { name: 'Obbligatorio', type: 'checkbox' },
      { name: 'Attivo', type: 'checkbox' }
    ]
  };
  
  return await createTable(apiKey, baseId, config);
}

// 2. Product_Price_History
async function createProductPriceHistory(apiKey, baseId, productsTableId, usersTableId) {
  const config = {
    name: 'Product_Price_History',
    description: 'Storico prezzi prodotti',
    fields: [
      { name: 'Variazione_Prezzo', type: 'singleLineText' }, // Primary field
      {
        name: 'ID_Prodotto',
        type: 'multipleRecordLinks',
        options: { linkedTableId: productsTableId }
      },
      { name: 'Data_Validità', type: 'date' },
      { name: 'Prezzo_Listino', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Costo_Prodotto', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Motivo_Variazione', type: 'multilineText' },
      {
        name: 'Utente_Modifica',
        type: 'multipleRecordLinks',
        options: { linkedTableId: usersTableId }
      }
    ]
  };
  
  return await createTable(apiKey, baseId, config);
}

// 3. Orders
async function createOrders(apiKey, baseId, leadsTableId, usersTableId) {
  const config = {
    name: 'Orders',
    description: 'Ordini master',
    fields: [
      { name: 'Numero_Ordine', type: 'autonumber', options: { format: 'ORD-{00000}' } }, // Primary field
      {
        name: 'ID_Lead',
        type: 'multipleRecordLinks',
        options: { linkedTableId: leadsTableId }
      },
      { name: 'Data_Ordine', type: 'date' },
      {
        name: 'Stato_Ordine',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Bozza', color: 'grayBright' },
          { name: 'Confermato', color: 'blueBright' },
          { name: 'In_Produzione', color: 'orangeBright' },
          { name: 'Spedito', color: 'purpleBright' },
          { name: 'Completato', color: 'greenBright' },
          { name: 'Annullato', color: 'redBright' }
        ]}
      },
      {
        name: 'Stato_Pagamento',
        type: 'singleSelect', 
        options: { choices: [
          { name: 'Non_Pagato', color: 'redBright' },
          { name: 'Acconto', color: 'orangeBright' },
          { name: 'Pagamento_Parziale', color: 'yellowBright' },
          { name: 'Pagato', color: 'greenBright' },
          { name: 'Rimborsato', color: 'grayBright' }
        ]}
      },
      {
        name: 'Tipo_Pagamento',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Contante' }, { name: 'Bonifico' }, { name: 'Carta' }, { name: 'Finanziamento' }, { name: 'Rateale' }
        ]}
      },
      { name: 'Subtotale', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Sconto_Percentuale', type: 'percent', options: { precision: 2 } },
      { name: 'Sconto_Importo', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Totale_Ordine', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Costo_Totale', type: 'currency', options: { symbol: '€', precision: 2 } },
      {
        name: 'Agente_Vendita',
        type: 'multipleRecordLinks',
        options: { linkedTableId: usersTableId }
      },
      { name: 'Percentuale_Provvigione', type: 'number', options: { precision: 2 } },
      {
        name: 'Stato_Provvigione',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Da_Calcolare', color: 'grayBright' },
          { name: 'Calcolata', color: 'yellowBright' },
          { name: 'Liquidata', color: 'greenBright' }
        ]}
      },
      { name: 'Importo_Acconto', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Data_Acconto', type: 'date' },
      { name: 'Importo_Saldo', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Data_Saldo', type: 'date' },
      { name: 'Scadenza_Pagamento', type: 'date' },
      { name: 'Note_Pagamento', type: 'multilineText' },
      { name: 'Finanziamento_Richiesto', type: 'checkbox',
      { name: 'Istituto_Finanziario', type: 'singleLineText' },
      { name: 'Importo_Finanziato', type: 'currency', options: { symbol: '€', precision: 2 } },
      {
        name: 'Stato_Finanziamento',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Richiesto', color: 'grayBright' },
          { name: 'In_Valutazione', color: 'yellowBright' },
          { name: 'Approvato', color: 'greenBright' },
          { name: 'Rifiutato', color: 'redBright' },
          { name: 'Erogato', color: 'blueBright' }
        ]}
      },
      { name: 'Numero_Rate', type: 'number' },
      { name: 'Tasso_Interesse', type: 'number', options: { precision: 2 } },
      { name: 'Contratto', type: 'multipleAttachments' },
      { name: 'Documenti_Finanziamento', type: 'multipleAttachments' },
      { name: 'Fatture', type: 'multipleAttachments' },
      { name: 'Altri_Documenti', type: 'multipleAttachments' },
      { name: 'Note_Ordine', type: 'multilineText' },
      { name: 'Note_Interne', type: 'multilineText' },
      {
        name: 'Utente_Creatore',
        type: 'multipleRecordLinks',
        options: { linkedTableId: usersTableId }
      }
    ]
  };
  
  return await createTable(apiKey, baseId, config);
}

// 4. Order_Items
async function createOrderItems(apiKey, baseId, ordersTableId, productsTableId) {
  const config = {
    name: 'Order_Items',
    description: 'Righe ordine',
    fields: [
      { name: 'Codice_Prodotto_Completo', type: 'singleLineText' }, // Primary field
      {
        name: 'ID_Ordine',
        type: 'multipleRecordLinks',
        options: { linkedTableId: ordersTableId }
      },
      {
        name: 'ID_Prodotto',
        type: 'multipleRecordLinks',
        options: { linkedTableId: productsTableId }
      },
      { name: 'Configurazione_JSON', type: 'multilineText' },
      { name: 'Quantità', type: 'number' },
      { name: 'Prezzo_Listino_Storico', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Costo_Unitario_Storico', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Sconto_Riga_Percentuale', type: 'percent', options: { precision: 2 } },
      { name: 'Sconto_Riga_Importo', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Base_Provvigionale', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Percentuale_Provvigione_Riga', type: 'number', options: { precision: 2 } },
      { name: 'Note_Riga', type: 'multilineText' }
    ]
  };
  
  return await createTable(apiKey, baseId, config);
}

// 5. Commission_Payments
async function createCommissionPayments(apiKey, baseId, usersTableId, ordersTableId) {
  const config = {
    name: 'Commission_Payments',
    description: 'Liquidazioni provvigioni',
    fields: [
      { name: 'Liquidazione', type: 'singleLineText' }, // Primary field
      {
        name: 'ID_Agente',
        type: 'multipleRecordLinks',
        options: { linkedTableId: usersTableId }
      },
      { name: 'Periodo_Da', type: 'date' },
      { name: 'Periodo_A', type: 'date' },
      {
        name: 'Ordini_Inclusi',
        type: 'multipleRecordLinks',
        options: { linkedTableId: ordersTableId }
      },
      { name: 'Totale_Provvigioni', type: 'currency', options: { symbol: '€', precision: 2 } },
      {
        name: 'Stato_Pagamento',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Da_Liquidare', color: 'redBright' },
          { name: 'Pagato', color: 'greenBright' }
        ]}
      },
      { name: 'Data_Pagamento', type: 'date' },
      { name: 'Note_Liquidazione', type: 'multilineText' }
    ]
  };
  
  return await createTable(apiKey, baseId, config);
}

// 6. Payment_Transactions
async function createPaymentTransactions(apiKey, baseId, ordersTableId) {
  const config = {
    name: 'Payment_Transactions',
    description: 'Transazioni pagamenti',
    fields: [
      { name: 'Transazione', type: 'singleLineText' }, // Primary field
      {
        name: 'ID_Ordine',
        type: 'multipleRecordLinks',
        options: { linkedTableId: ordersTableId }
      },
      {
        name: 'Tipo_Transazione',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Acconto', color: 'blueBright' },
          { name: 'Saldo', color: 'greenBright' },
          { name: 'Rimborso', color: 'redBright' },
          { name: 'Finanziamento', color: 'purpleBright' }
        ]}
      },
      { name: 'Importo', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Data_Transazione', type: 'date' },
      {
        name: 'Metodo_Pagamento',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Contante' }, { name: 'Bonifico' }, { name: 'Carta' }, { name: 'Assegno' }
        ]}
      },
      { name: 'Numero_Transazione', type: 'singleLineText' },
      { name: 'Note_Transazione', type: 'multilineText' },
      { name: 'Ricevuta', type: 'multipleAttachments' }
    ]
  };
  
  return await createTable(apiKey, baseId, config);
}

// MAIN FUNCTION
async function main() {
  console.log('🛠️  Creazione Finale Tabelle Ordini');
  console.log('====================================\n');

  const { apiKey, baseId } = getCredentials();
  if (!apiKey || !baseId) {
    throw new Error('Credenziali mancanti in .env.local');
  }

  console.log(`✅ Credenziali OK - Base: ${baseId.substring(0, 8)}...`);

  // Get existing tables
  console.log('\n🔍 Controllo tabelle esistenti...');
  const existingTables = await getExistingTables(apiKey, baseId);
  console.log(`📋 Trovate ${Object.keys(existingTables).length} tabelle:`, Object.keys(existingTables).join(', '));

  // Required tables
  const requiredTables = {
    Products: existingTables['Products'],
    Lead: existingTables['Lead'],
    User: existingTables['User']
  };

  // Check requirements
  for (const [name, id] of Object.entries(requiredTables)) {
    if (!id) {
      throw new Error(`Tabella richiesta non trovata: ${name}`);
    }
    console.log(`✅ ${name}: ${id}`);
  }

  console.log('\n📋 Creazione tabelle in ordine...');
  
  // 1. Product_Variants
  console.log('\n1. 📋 Product_Variants');
  if (existingTables['Product_Variants']) {
    console.log('   ⚠️  Esiste già');
  } else {
    const result = await createProductVariants(apiKey, baseId, requiredTables.Products);
    if (result.success) {
      console.log('   ✅ Creata con successo');
      if (result.id) {
        existingTables['Product_Variants'] = result.id;
        console.log(`   🆔 ID: ${result.id}`);
      }
    } else {
      console.error(`   ❌ Errore: ${result.error}`);
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 2. Product_Price_History
  console.log('\n2. 📋 Product_Price_History');
  if (existingTables['Product_Price_History']) {
    console.log('   ⚠️  Esiste già');
  } else {
    const result = await createProductPriceHistory(apiKey, baseId, requiredTables.Products, requiredTables.User);
    if (result.success) {
      console.log('   ✅ Creata con successo');
      if (result.id) {
        existingTables['Product_Price_History'] = result.id;
        console.log(`   🆔 ID: ${result.id}`);
      }
    } else {
      console.error(`   ❌ Errore: ${result.error}`);
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 3. Orders
  console.log('\n3. 📋 Orders');
  if (existingTables['Orders']) {
    console.log('   ⚠️  Esiste già');
  } else {
    const result = await createOrders(apiKey, baseId, requiredTables.Lead, requiredTables.User);
    if (result.success) {
      console.log('   ✅ Creata con successo');
      if (result.id) {
        existingTables['Orders'] = result.id;
        console.log(`   🆔 ID: ${result.id}`);
      }
    } else {
      console.error(`   ❌ Errore: ${result.error}`);
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 4. Order_Items
  console.log('\n4. 📋 Order_Items');
  if (existingTables['Order_Items']) {
    console.log('   ⚠️  Esiste già');
  } else if (!existingTables['Orders']) {
    console.log('   ⏭️  Saltata (Orders non creata)');
  } else {
    const result = await createOrderItems(apiKey, baseId, existingTables['Orders'], requiredTables.Products);
    if (result.success) {
      console.log('   ✅ Creata con successo');
      if (result.id) {
        existingTables['Order_Items'] = result.id;
        console.log(`   🆔 ID: ${result.id}`);
      }
    } else {
      console.error(`   ❌ Errore: ${result.error}`);
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 5. Commission_Payments
  console.log('\n5. 📋 Commission_Payments');
  if (existingTables['Commission_Payments']) {
    console.log('   ⚠️  Esiste già');
  } else if (!existingTables['Orders']) {
    console.log('   ⏭️  Saltata (Orders non creata)');
  } else {
    const result = await createCommissionPayments(apiKey, baseId, requiredTables.User, existingTables['Orders']);
    if (result.success) {
      console.log('   ✅ Creata con successo');
      if (result.id) {
        existingTables['Commission_Payments'] = result.id;
        console.log(`   🆔 ID: ${result.id}`);
      }
    } else {
      console.error(`   ❌ Errore: ${result.error}`);
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // 6. Payment_Transactions
  console.log('\n6. 📋 Payment_Transactions');
  if (existingTables['Payment_Transactions']) {
    console.log('   ⚠️  Esiste già');
  } else if (!existingTables['Orders']) {
    console.log('   ⏭️  Saltata (Orders non creata)');
  } else {
    const result = await createPaymentTransactions(apiKey, baseId, existingTables['Orders']);
    if (result.success) {
      console.log('   ✅ Creata con successo');
      if (result.id) {
        existingTables['Payment_Transactions'] = result.id;
        console.log(`   🆔 ID: ${result.id}`);
      }
    } else {
      console.error(`   ❌ Errore: ${result.error}`);
    }
  }

  // Final summary
  console.log('\n🎉 CREAZIONE COMPLETATA!');
  console.log('\n📊 TABELLE SISTEMA ORDINI:');
  
  const ordersTables = [
    'Products', 'Product_Variants', 'Product_Price_History', 
    'Orders', 'Order_Items', 'Commission_Payments', 'Payment_Transactions'
  ];
  
  ordersTables.forEach((name, i) => {
    const status = existingTables[name] ? '✅' : '❌';
    console.log(`${i + 1}. ${status} ${name}`);
  });

  // Save table IDs
  const fs = require('fs');
  const idsPath = path.join(__dirname, '../orders-table-ids-final.json');
  fs.writeFileSync(idsPath, JSON.stringify(existingTables, null, 2));
  console.log(`\n💾 ID tabelle salvati: orders-table-ids-final.json`);

  console.log('\n🎯 PROSSIMI PASSI:');
  console.log('1. Verifica tabelle su Airtable');
  console.log('2. Aggiungi formule e lookup se necessario');
  console.log('3. Implementa frontend sistema ordini');
  console.log('4. Crea configuratore prodotti');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };