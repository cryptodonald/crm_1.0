#!/usr/bin/env node

/**
 * Script per creare automaticamente le tabelle del sistema ordini su Airtable
 * Usa le API di Airtable per creare tabelle e campi programmaticamente
 * 
 * Usage: node scripts/create-orders-tables.js
 */

const https = require('https');
const path = require('path');
const fs = require('fs');

// Funzione per ottenere le credenziali Airtable dalle variabili ambiente
function getAirtableCredentials() {
  const dotenv = require('dotenv');
  const path = require('path');
  
  // Carica .env.local
  const envPath = path.join(__dirname, '../.env.local');
  dotenv.config({ path: envPath });
  
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  
  return { apiKey, baseId };
}

console.log('🛠️  Creazione Tabelle Sistema Ordini');
console.log('=====================================\n');

// Configurazione tabelle da creare
const TABLES_CONFIG = [
  {
    name: 'Products',
    description: 'Catalogo prodotti con prezzi e configurazioni',
    fields: [
      { name: 'Codice_Matrice', type: 'singleLineText' },
      { name: 'Nome_Prodotto', type: 'singleLineText' },
      { name: 'Descrizione', type: 'multilineText' },
      { 
        name: 'Categoria', 
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'Materassi' },
            { name: 'Accessori' },
            { name: 'Cuscini' },
            { name: 'Basi' },
            { name: 'Altro' }
          ]
        }
      },
      { name: 'Prezzo_Listino_Attuale', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Costo_Attuale', type: 'currency', options: { symbol: '€', precision: 2 } },
      { name: 'Margine_Standard', type: 'percent', options: { precision: 2 } },
      { name: 'Percentuale_Provvigione_Standard', type: 'number', options: { precision: 2 } },
      {
        name: 'Base_Provvigionale',
        type: 'singleSelect', 
        options: {
          choices: [
            { name: 'Prezzo_Vendita' },
            { name: 'Margine' }
          ]
        }
      },
      { name: 'Foto_Prodotto', type: 'multipleAttachments' },
      { name: 'Schede_Tecniche', type: 'multipleAttachments' },
      { name: 'Manuali', type: 'multipleAttachments' },
      { name: 'Certificazioni', type: 'multipleAttachments' },
      { name: 'Attivo', type: 'checkbox', options: { icon: 'check', color: 'greenBright' } },
      { name: 'In_Evidenza', type: 'checkbox', options: { icon: 'star', color: 'yellowBright' } }
    ]
  },
  {
    name: 'Product_Variants',
    description: 'Varianti e opzioni per ogni prodotto',
    fields: [
      { name: 'ID_Prodotto', type: 'multipleRecordLinks', options: { linkedTableId: 'Products' } },
      {
        name: 'Tipo_Variante',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'Dimensione' },
            { name: 'Taglia' }, 
            { name: 'Topper' },
            { name: 'Cover' },
            { name: 'Accessorio' }
          ]
        }
      },
      { name: 'Codice_Variante', type: 'singleLineText' },
      { name: 'Nome_Variante', type: 'singleLineText' },
      { name: 'Prezzo_Aggiuntivo_Attuale', type: 'currency', options: { symbol: '€' } },
      { name: 'Costo_Aggiuntivo_Attuale', type: 'currency', options: { symbol: '€' } },
      {
        name: 'Posizione',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'Sinistra' },
            { name: 'Destra' },
            { name: 'Entrambi' },
            { name: 'Nessuna' }
          ]
        }
      },
      { name: 'Obbligatorio', type: 'checkbox', options: { icon: 'warning', color: 'redBright' } },
      { name: 'Attivo', type: 'checkbox', options: { icon: 'check', color: 'greenBright' } }
    ]
  },
  {
    name: 'Product_Price_History',
    description: 'Storico variazioni prezzi prodotti',
    fields: [
      { name: 'ID_Prodotto', type: 'multipleRecordLinks', options: { linkedTableId: 'Products' } },
      { name: 'Data_Validità', type: 'date' },
      { name: 'Prezzo_Listino', type: 'currency', options: { symbol: '€' } },
      { name: 'Costo_Prodotto', type: 'currency', options: { symbol: '€' } },
      { name: 'Motivo_Variazione', type: 'multilineText' },
      { name: 'Utente_Modifica', type: 'multipleRecordLinks', options: { linkedTableId: 'Users' } }
    ]
  },
  {
    name: 'Orders',
    description: 'Ordini master collegati ai lead',
    fields: [
      // Collegamenti
      { name: 'ID_Lead', type: 'multipleRecordLinks', options: { linkedTableId: 'Leads' } },
      { name: 'Cliente_Nome', type: 'lookup', options: { fieldIdInLinkedTable: 'Nome', recordLinkFieldId: 'ID_Lead' } },
      { name: 'Cliente_Email', type: 'lookup', options: { fieldIdInLinkedTable: 'Email', recordLinkFieldId: 'ID_Lead' } },
      { name: 'Cliente_Telefono', type: 'lookup', options: { fieldIdInLinkedTable: 'Telefono', recordLinkFieldId: 'ID_Lead' } },
      
      // Dati ordine
      { name: 'Numero_Ordine', type: 'autoNumber', options: { format: 'ORD-{00000}' } },
      { name: 'Data_Ordine', type: 'date' },
      {
        name: 'Stato_Ordine',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'Bozza', color: 'grayBright' },
            { name: 'Confermato', color: 'blueBright' },
            { name: 'In_Produzione', color: 'orangeBright' },
            { name: 'Spedito', color: 'purpleBright' },
            { name: 'Completato', color: 'greenBright' },
            { name: 'Annullato', color: 'redBright' }
          ]
        }
      },
      {
        name: 'Stato_Pagamento',
        type: 'singleSelect', 
        options: {
          choices: [
            { name: 'Non_Pagato', color: 'redBright' },
            { name: 'Acconto', color: 'orangeBright' },
            { name: 'Pagamento_Parziale', color: 'yellowBright' },
            { name: 'Pagato', color: 'greenBright' },
            { name: 'Rimborsato', color: 'grayBright' }
          ]
        }
      },
      {
        name: 'Tipo_Pagamento',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'Contante' },
            { name: 'Bonifico' },
            { name: 'Carta' },
            { name: 'Finanziamento' },
            { name: 'Rateale' }
          ]
        }
      },

      // Totali
      { name: 'Subtotale', type: 'currency', options: { symbol: '€' } },
      { name: 'Sconto_Percentuale', type: 'percent', options: { precision: 2 } },
      { name: 'Sconto_Importo', type: 'currency', options: { symbol: '€' } },
      { name: 'Totale_Ordine', type: 'currency', options: { symbol: '€' } },
      { name: 'Costo_Totale', type: 'currency', options: { symbol: '€' } },
      { 
        name: 'Margine_Lordo', 
        type: 'formula', 
        options: { 
          formula: 'IF({Totale_Ordine}, {Totale_Ordine} - {Costo_Totale}, 0)' 
        } 
      },
      { 
        name: 'Percentuale_Margine', 
        type: 'formula', 
        options: { 
          formula: 'IF({Totale_Ordine} > 0, {Margine_Lordo} / {Totale_Ordine}, 0)',
          result: { type: 'percent', options: { precision: 2 } }
        } 
      },

      // Provvigioni
      { name: 'Agente_Vendita', type: 'multipleRecordLinks', options: { linkedTableId: 'Users' } },
      { name: 'Percentuale_Provvigione', type: 'number', options: { precision: 2 } },
      { 
        name: 'Importo_Provvigione', 
        type: 'formula',
        options: { 
          formula: 'IF({Totale_Ordine}, {Totale_Ordine} * ({Percentuale_Provvigione} / 100), 0)',
          result: { type: 'currency', options: { symbol: '€' } }
        }
      },
      {
        name: 'Stato_Provvigione',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'Da_Calcolare', color: 'grayBright' },
            { name: 'Calcolata', color: 'yellowBright' },
            { name: 'Liquidata', color: 'greenBright' }
          ]
        }
      },

      // Pagamenti
      { name: 'Importo_Acconto', type: 'currency', options: { symbol: '€' } },
      { name: 'Data_Acconto', type: 'date' },
      { name: 'Importo_Saldo', type: 'currency', options: { symbol: '€' } },
      { name: 'Data_Saldo', type: 'date' },
      { name: 'Scadenza_Pagamento', type: 'date' },
      { name: 'Note_Pagamento', type: 'multilineText' },

      // Finanziamento
      { name: 'Finanziamento_Richiesto', type: 'checkbox', options: { icon: 'credit-card', color: 'blueBright' } },
      { name: 'Istituto_Finanziario', type: 'singleLineText' },
      { name: 'Importo_Finanziato', type: 'currency', options: { symbol: '€' } },
      {
        name: 'Stato_Finanziamento',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'Richiesto', color: 'grayBright' },
            { name: 'In_Valutazione', color: 'yellowBright' },
            { name: 'Approvato', color: 'greenBright' },
            { name: 'Rifiutato', color: 'redBright' },
            { name: 'Erogato', color: 'blueBright' }
          ]
        }
      },
      { name: 'Numero_Rate', type: 'number' },
      { name: 'Tasso_Interesse', type: 'number', options: { precision: 2 } },

      // Documenti
      { name: 'Contratto', type: 'multipleAttachments' },
      { name: 'Documenti_Finanziamento', type: 'multipleAttachments' },
      { name: 'Fatture', type: 'multipleAttachments' },
      { name: 'Altri_Documenti', type: 'multipleAttachments' },

      // Note e audit
      { name: 'Note_Ordine', type: 'multilineText' },
      { name: 'Note_Interne', type: 'multilineText' },
      { name: 'Utente_Creatore', type: 'multipleRecordLinks', options: { linkedTableId: 'Users' } }
    ]
  },
  {
    name: 'Order_Items', 
    description: 'Righe ordine con prezzi storici',
    fields: [
      // Collegamenti
      { name: 'ID_Ordine', type: 'multipleRecordLinks', options: { linkedTableId: 'Orders' } },
      { name: 'ID_Prodotto', type: 'multipleRecordLinks', options: { linkedTableId: 'Products' } },
      
      // Prodotto
      { name: 'Codice_Prodotto_Completo', type: 'singleLineText' },
      { name: 'Nome_Prodotto_Storico', type: 'lookup', options: { fieldIdInLinkedTable: 'Nome_Prodotto', recordLinkFieldId: 'ID_Prodotto' } },
      { name: 'Configurazione_JSON', type: 'multilineText' },

      // Quantità e prezzi
      { name: 'Quantità', type: 'number' },
      { name: 'Prezzo_Listino_Storico', type: 'currency', options: { symbol: '€' } },
      { name: 'Costo_Unitario_Storico', type: 'currency', options: { symbol: '€' } },
      { name: 'Sconto_Riga_Percentuale', type: 'percent', options: { precision: 2 } },
      { name: 'Sconto_Riga_Importo', type: 'currency', options: { symbol: '€' } },
      { 
        name: 'Prezzo_Unitario_Finale', 
        type: 'formula',
        options: { 
          formula: 'IF({Prezzo_Listino_Storico}, {Prezzo_Listino_Storico} - {Sconto_Riga_Importo}, 0)',
          result: { type: 'currency', options: { symbol: '€' } }
        }
      },
      { 
        name: 'Prezzo_Totale_Riga', 
        type: 'formula',
        options: { 
          formula: 'IF({Quantità}, {Quantità} * {Prezzo_Unitario_Finale}, 0)',
          result: { type: 'currency', options: { symbol: '€' } }
        }
      },
      { 
        name: 'Costo_Totale_Riga', 
        type: 'formula',
        options: { 
          formula: 'IF({Quantità}, {Quantità} * {Costo_Unitario_Storico}, 0)',
          result: { type: 'currency', options: { symbol: '€' } }
        }
      },
      { 
        name: 'Margine_Riga', 
        type: 'formula',
        options: { 
          formula: '{Prezzo_Totale_Riga} - {Costo_Totale_Riga}',
          result: { type: 'currency', options: { symbol: '€' } }
        }
      },

      // Provvigioni riga
      { name: 'Base_Provvigionale', type: 'currency', options: { symbol: '€' } },
      { name: 'Percentuale_Provvigione_Riga', type: 'number', options: { precision: 2 } },
      { 
        name: 'Importo_Provvigione_Riga', 
        type: 'formula',
        options: { 
          formula: 'IF({Base_Provvigionale}, {Base_Provvigionale} * ({Percentuale_Provvigione_Riga} / 100), 0)',
          result: { type: 'currency', options: { symbol: '€' } }
        }
      },

      { name: 'Note_Riga', type: 'multilineText' }
    ]
  },
  {
    name: 'Commission_Payments',
    description: 'Liquidazioni provvigioni agenti', 
    fields: [
      { name: 'ID_Agente', type: 'multipleRecordLinks', options: { linkedTableId: 'Users' } },
      { name: 'Periodo_Da', type: 'date' },
      { name: 'Periodo_A', type: 'date' },
      { name: 'Ordini_Inclusi', type: 'multipleRecordLinks', options: { linkedTableId: 'Orders' } },
      { name: 'Totale_Provvigioni', type: 'currency', options: { symbol: '€' } },
      {
        name: 'Stato_Pagamento',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'Da_Liquidare', color: 'redBright' },
            { name: 'Pagato', color: 'greenBright' }
          ]
        }
      },
      { name: 'Data_Pagamento', type: 'date' },
      { name: 'Note_Liquidazione', type: 'multilineText' }
    ]
  },
  {
    name: 'Payment_Transactions',
    description: 'Dettaglio transazioni pagamenti',
    fields: [
      { name: 'ID_Ordine', type: 'multipleRecordLinks', options: { linkedTableId: 'Orders' } },
      {
        name: 'Tipo_Transazione',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'Acconto', color: 'blueBright' },
            { name: 'Saldo', color: 'greenBright' },
            { name: 'Rimborso', color: 'redBright' },
            { name: 'Finanziamento', color: 'purpleBright' }
          ]
        }
      },
      { name: 'Importo', type: 'currency', options: { symbol: '€' } },
      { name: 'Data_Transazione', type: 'date' },
      {
        name: 'Metodo_Pagamento',
        type: 'singleSelect',
        options: {
          choices: [
            { name: 'Contante' },
            { name: 'Bonifico' },
            { name: 'Carta' },
            { name: 'Assegno' }
          ]
        }
      },
      { name: 'Numero_Transazione', type: 'singleLineText' },
      { name: 'Note_Transazione', type: 'multilineText' },
      { name: 'Ricevuta', type: 'multipleAttachments' }
    ]
  }
];

// Funzione per fare richieste HTTPS
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsedBody = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsedBody);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsedBody.error?.message || body}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}. Body: ${body}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Funzione principale
async function createOrdersTables() {
  try {
    console.log('🔑 Recupero credenziali Airtable...');
    
    const { apiKey, baseId } = getAirtableCredentials();
    
    if (!apiKey || !baseId) {
      throw new Error('Credenziali Airtable mancanti. Configura AIRTABLE_API_KEY e AIRTABLE_BASE_ID nel file .env.local');
    }
    
    console.log(`✅ Credenziali OK - Base: ${baseId.substring(0, 8)}...`);
    
    // Map per salvare gli ID delle tabelle create
    const tableIds = {};
    
    // Crea ogni tabella
    for (const tableConfig of TABLES_CONFIG) {
      console.log(`\n📋 Creando tabella: ${tableConfig.name}`);
      
      try {
        const response = await makeRequest({
          hostname: 'api.airtable.com',
          path: `/v0/meta/bases/${baseId}/tables`,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }, {
          name: tableConfig.name,
          description: tableConfig.description,
          fields: tableConfig.fields
        });
        
        console.log(`   ✅ ${tableConfig.name} creata con ${tableConfig.fields.length} campi`);
        console.log(`   🆔 Table ID: ${response.id}`);
        
        // Salva l'ID della tabella per i riferimenti futuri
        tableIds[tableConfig.name] = response.id;
        
        // Attendi un po' tra le richieste per evitare rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`   ❌ Errore creando ${tableConfig.name}:`, error.message);
        
        // Se la tabella esiste già, continua
        if (error.message.includes('INVALID_REQUEST_BODY') && error.message.includes('already exists')) {
          console.log(`   ⚠️  ${tableConfig.name} esiste già, saltata`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('\n🎉 Tutte le tabelle sono state create con successo!');
    console.log('\n📋 TABELLE CREATE:');
    TABLES_CONFIG.forEach((table, index) => {
      console.log(`${index + 1}. ${table.name} (${table.fields.length} campi)`);
    });
    
    console.log('\n🎯 PROSSIMI PASSI:');
    console.log('1. Verifica le tabelle su Airtable');
    console.log('2. Configura eventuali lookup field manualmente se necessario');
    console.log('3. Testa i collegamenti tra tabelle');
    console.log('4. Implementa il frontend per il sistema ordini');
    
  } catch (error) {
    console.error('\n❌ Errore durante la creazione:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Verifica se lo script viene eseguito direttamente
if (require.main === module) {
  createOrdersTables();
}

module.exports = { createOrdersTables, TABLES_CONFIG };