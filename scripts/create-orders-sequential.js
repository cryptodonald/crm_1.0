#!/usr/bin/env node

/**
 * Script per creare tabelle sistema ordini nell'ordine corretto
 * Segue le dipendenze: Products → Variants → History → Orders → Items → Payments
 */

const https = require('https');
const path = require('path');

// Credenziali
function getCredentials() {
  require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
  return {
    apiKey: process.env.AIRTABLE_API_KEY,
    baseId: process.env.AIRTABLE_BASE_ID
  };
}

// HTTP Request
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
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.error?.message || body}`));
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

// Get existing tables
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

// Create table
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

// 📋 CONFIGURAZIONI TABELLE IN ORDINE
const TABLE_CONFIGS = [
  // 1. Products (no dipendenze)
  {
    name: 'Products',
    description: 'Catalogo prodotti',
    fields: [
      { name: 'Codice_Matrice', type: 'singleLineText' },
      { name: 'Nome_Prodotto', type: 'singleLineText' },
      { name: 'Descrizione', type: 'multilineText' },
      { 
        name: 'Categoria', 
        type: 'singleSelect',
        options: { choices: [
          { name: 'Materassi' }, { name: 'Accessori' }, { name: 'Cuscini' }, { name: 'Basi' }, { name: 'Altro' }
        ]}
      },
      { name: 'Prezzo_Listino_Attuale', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Costo_Attuale', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Margine_Standard', type: 'percent', options: { precision: 2 } },
      { name: 'Percentuale_Provvigione_Standard', type: 'number', options: { precision: 2 } },
      {
        name: 'Base_Provvigionale',
        type: 'singleSelect', 
        options: { choices: [{ name: 'Prezzo_Vendita' }, { name: 'Margine' }] }
      },
      { name: 'Foto_Prodotto', type: 'multipleAttachments' },
      { name: 'Schede_Tecniche', type: 'multipleAttachments' },
      { name: 'Manuali', type: 'multipleAttachments' },
      { name: 'Certificazioni', type: 'multipleAttachments' },
      { name: 'Attivo', type: 'checkbox', options: { icon: 'check', color: 'greenBright' } },
      { name: 'In_Evidenza', type: 'checkbox', options: { icon: 'star', color: 'yellowBright' } }
    ]
  },

  // 2. Product_Variants (dipende da Products)
  {
    name: 'Product_Variants',
    description: 'Varianti prodotti',
    dependencies: ['Products'],
    fields: [
      // ID_Prodotto verrà aggiunto dinamicamente
      {
        name: 'Tipo_Variante',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Dimensione' }, { name: 'Taglia' }, { name: 'Topper' }, { name: 'Cover' }, { name: 'Accessorio' }
        ]}
      },
      { name: 'Codice_Variante', type: 'singleLineText' },
      { name: 'Nome_Variante', type: 'singleLineText' },
      { name: 'Prezzo_Aggiuntivo_Attuale', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Costo_Aggiuntivo_Attuale', type: 'currency', options: { symbol: '€', precision: 2 } },
      {
        name: 'Posizione',
        type: 'singleSelect',
        options: { choices: [
          { name: 'Sinistra' }, { name: 'Destra' }, { name: 'Entrambi' }, { name: 'Nessuna' }
        ]}
      },
      { name: 'Obbligatorio', type: 'checkbox', options: { icon: 'warning', color: 'redBright' } },
      { name: 'Attivo', type: 'checkbox', options: { icon: 'check', color: 'greenBright' } }
    ]
  },

  // 3. Product_Price_History (dipende da Products, Users)
  {
    name: 'Product_Price_History',
    description: 'Storico prezzi prodotti',
    dependencies: ['Products', 'User'],
    fields: [
      { name: 'Variazione_Prezzo', type: 'singleLineText' }, // Primary field
      // ID_Prodotto e Utente_Modifica aggiunti dinamicamente  
      { name: 'Data_Validità', type: 'date' },
      { name: 'Prezzo_Listino', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Costo_Prodotto', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Motivo_Variazione', type: 'multilineText' }
    ]
  },

  // 4. Orders (dipende da Leads, Users)
  {
    name: 'Orders',
    description: 'Ordini master',
    dependencies: ['Lead', 'User'],
    fields: [
      // ID_Lead, Agente_Vendita, Utente_Creatore aggiunti dinamicamente
      { name: 'Numero_Ordine', type: 'autonumber', options: { format: 'ORD-{00000}' } },
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
      { name: 'Finanziamento_Richiesto', type: 'checkbox', options: { icon: 'credit-card', color: 'blueBright' } },
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
      { name: 'Note_Interne', type: 'multilineText' }
    ]
  },

  // 5. Order_Items (dipende da Orders, Products)
  {
    name: 'Order_Items', 
    description: 'Righe ordine',
    dependencies: ['Orders', 'Products'],
    fields: [
      { name: 'Codice_Prodotto_Completo', type: 'singleLineText' }, // Primary field
      // ID_Ordine, ID_Prodotto aggiunti dinamicamente
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
  },

  // 6. Commission_Payments (dipende da Users, Orders)
  {
    name: 'Commission_Payments',
    description: 'Liquidazioni provvigioni',
    dependencies: ['User', 'Orders'],
    fields: [
      { name: 'Liquidazione', type: 'singleLineText' }, // Primary field
      // ID_Agente, Ordini_Inclusi aggiunti dinamicamente
      { name: 'Periodo_Da', type: 'date' },
      { name: 'Periodo_A', type: 'date' },
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
  },

  // 7. Payment_Transactions (dipende da Orders)
  {
    name: 'Payment_Transactions',
    description: 'Transazioni pagamenti',
    dependencies: ['Orders'],
    fields: [
      { name: 'Transazione', type: 'singleLineText' }, // Primary field
      // ID_Ordine aggiunto dinamicamente
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
  }
];

// Aggiungi link fields dinamicamente
function addLinkFields(config, existingTables) {
  const fields = [...config.fields];
  
  if (config.dependencies) {
    config.dependencies.forEach(dep => {
      if (existingTables[dep]) {
        switch (config.name) {
          case 'Product_Variants':
            if (dep === 'Products') {
              // Inserisci dopo il primo campo (primary field)
              fields.splice(1, 0, {
                name: 'ID_Prodotto',
                type: 'multipleRecordLinks',
                options: {
                  linkedTableId: existingTables[dep]
                }
              });
            }
            break;
          case 'Product_Price_History':
            if (dep === 'Products') {
              // Inserisci dopo il primo campo
              fields.splice(1, 0, {
                name: 'ID_Prodotto',
                type: 'multipleRecordLinks',
                options: {
                  linkedTableId: existingTables[dep]
                }
              });
            } else if (dep === 'User') {
              fields.push({
                name: 'Utente_Modifica',
                type: 'multipleRecordLinks',
                options: {
                  linkedTableId: existingTables[dep]
                }
              });
            }
            break;
                }
              });
            }
            break;
          case 'Orders':
            if (dep === 'Lead') {
              // Orders ha già Numero_Ordine come primary field (autonumber)
              fields.splice(1, 0, {
                name: 'ID_Lead',
                type: 'multipleRecordLinks',
                options: {
                  linkedTableId: existingTables[dep]
                }
              });
            } else if (dep === 'User') {
              fields.splice(11, 0, {
                name: 'Agente_Vendita',
                type: 'multipleRecordLinks',
                options: {
                  linkedTableId: existingTables[dep]
                }
              });
              fields.push({
                name: 'Utente_Creatore',
                type: 'multipleRecordLinks',
                options: {
                  linkedTableId: existingTables[dep]
                }
              });
            }
            break;
                  
                  
                }
              });
            }
            break;
          case 'Order_Items':
            if (dep === 'Orders') {
              fields.splice(1, 0, {
                name: 'ID_Ordine',
                type: 'multipleRecordLinks',
                options: {
                  linkedTableId: existingTables[dep]
                }
              });
            } else if (dep === 'Products') {
              fields.splice(2, 0, {
                name: 'ID_Prodotto',
                type: 'multipleRecordLinks',
                options: {
                  linkedTableId: existingTables[dep]
                }
              });
            }
            break;
                }
              });
            }
            break;
          case 'Commission_Payments':
            if (dep === 'User') {
              fields.splice(1, 0, {
                name: 'ID_Agente',
                type: 'multipleRecordLinks',
                options: {
                  linkedTableId: existingTables[dep]
                }
              });
            } else if (dep === 'Orders') {
              fields.splice(4, 0, {
                name: 'Ordini_Inclusi',
                type: 'multipleRecordLinks',
                options: {
                  linkedTableId: existingTables[dep]
                }
              });
            }
            break;
          case 'Payment_Transactions':
            if (dep === 'Orders') {
              fields.splice(1, 0, {
                name: 'ID_Ordine',
                type: 'multipleRecordLinks',
                options: {
                  linkedTableId: existingTables[dep]
                }
              });
            }
            break;
                  
                }
              });
            }
            break;
        }
      }
    });
  }
  
  return { ...config, fields };
}

// MAIN FUNCTION
async function main() {
  console.log('🛠️  Creazione Sequenziale Tabelle Ordini');
  console.log('==========================================\n');

  const { apiKey, baseId } = getCredentials();
  if (!apiKey || !baseId) {
    throw new Error('Credenziali mancanti in .env.local');
  }

  console.log(`✅ Credenziali OK - Base: ${baseId.substring(0, 8)}...`);

  // Get existing tables
  console.log('\n🔍 Controllo tabelle esistenti...');
  const existingTables = await getExistingTables(apiKey, baseId);
  console.log(`📋 Trovate ${Object.keys(existingTables).length} tabelle:`, Object.keys(existingTables).join(', '));

  // Create tables in order
  console.log('\n📋 Creazione tabelle in ordine sequenziale...');
  
  for (let i = 0; i < TABLE_CONFIGS.length; i++) {
    const config = TABLE_CONFIGS[i];
    console.log(`\n${i + 1}. 📋 ${config.name}`);

    if (existingTables[config.name]) {
      console.log(`   ⚠️  Esiste già, saltata`);
      continue;
    }

    // Add dynamic link fields
    const finalConfig = addLinkFields(config, existingTables);
    console.log(`   📝 ${finalConfig.fields.length} campi totali`);

    // Create table
    const result = await createTable(apiKey, baseId, finalConfig);

    if (result.success) {
      if (result.existed) {
        console.log(`   ⚠️  Esisteva già`);
      } else {
        console.log(`   ✅ Creata con successo`);
        console.log(`   🆔 ID: ${result.id}`);
        existingTables[config.name] = result.id;
      }
    } else {
      console.error(`   ❌ Errore: ${result.error}`);
    }

    // Pause between requests
    if (i < TABLE_CONFIGS.length - 1) {
      console.log(`   ⏳ Pausa 2 secondi...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Final summary
  console.log('\n🎉 CREAZIONE COMPLETATA!');
  console.log('\n📊 TABELLE SISTEMA ORDINI:');
  TABLE_CONFIGS.forEach((config, i) => {
    const status = existingTables[config.name] ? '✅' : '❌';
    console.log(`${i + 1}. ${status} ${config.name}`);
  });

  // Save table IDs
  const fs = require('fs');
  const idsPath = path.join(__dirname, '../orders-table-ids.json');
  fs.writeFileSync(idsPath, JSON.stringify(existingTables, null, 2));
  console.log(`\n💾 ID tabelle salvati: orders-table-ids.json`);

  console.log('\n🎯 PROSSIMI PASSI:');
  console.log('1. Verifica tabelle su Airtable');
  console.log('2. Aggiungi formule e lookup se necessario');
  console.log('3. Implementa frontend sistema ordini');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };