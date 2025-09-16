#!/usr/bin/env node

/**
 * Script per convertire campi primary field in formule RECORD_ID()
 * IMPORTANTE: Le formule non possono essere create via API,
 * questo script genera le istruzioni manuali per Airtable web
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

async function generateRecordIdInstructions() {
  const { apiKey, baseId } = getCredentials();
  
  // Tabelle che dovrebbero usare RECORD_ID() come primary field
  const tablesToConvert = {
    'tblXtMoiDwLEBG5WE': {
      name: 'Product_Price_History',
      currentField: 'Storico_ID',
      newFieldName: 'ID_Storico',
      description: 'ID univoco automatico per storico prezzi'
    },
    'tblxzhMCa5UJOMZqC': {
      name: 'Order_Items', 
      currentField: 'Riga_ID',
      newFieldName: 'ID_Riga',
      description: 'ID univoco automatico per riga ordine'
    },
    'tblbn6gRCwpmYICdZ': {
      name: 'Commission_Payments',
      currentField: 'Pagamento_ID', 
      newFieldName: 'ID_Commissione',
      description: 'ID univoco automatico per pagamento commissione'
    },
    'tbl2bzbSxMDch72CY': {
      name: 'Payment_Transactions',
      currentField: 'Transazione_ID',
      newFieldName: 'ID_Transazione', 
      description: 'ID univoco automatico per transazione'
    }
  };

  console.log('🔧 CONVERSIONE A RECORD_ID() - ISTRUZIONI MANUALI');
  console.log('==================================================\n');
  
  console.log('⚠️  IMPORTANTE: Le formule non possono essere create via API.');
  console.log('📋 Segui queste istruzioni per ogni tabella:\n');

  let stepCounter = 1;
  
  for (const [tableId, config] of Object.entries(tablesToConvert)) {
    console.log(`${stepCounter}. 📋 ${config.name} (${tableId})`);
    console.log('   -------------------------------');
    console.log(`   a) Apri https://airtable.com/${baseId}/${tableId}`);
    console.log(`   b) Aggiungi nuovo campo di tipo "Formula"`);
    console.log(`   c) Nome campo: "${config.newFieldName}"`);
    console.log(`   d) Formula: RECORD_ID()`);
    console.log(`   e) Salva il nuovo campo`);
    console.log(`   f) Vai in Table Settings > Primary Field`);  
    console.log(`   g) Cambia primary field da "${config.currentField}" a "${config.newFieldName}"`);
    console.log(`   h) Elimina il vecchio campo "${config.currentField}" se vuoto`);
    console.log(`   📝 Risultato: ${config.description}\n`);
    stepCounter++;
  }

  // Caso speciale per Orders - tenere Numero_Ordine come campo business
  console.log(`${stepCounter}. 📋 Orders - CASO SPECIALE`);
  console.log('   -------------------------------');
  console.log('   Per Orders, il Numero_Ordine dovrebbe rimanere come campo business separato');
  console.log('   a) Aggiungi nuovo campo "ID_Ordine" con formula RECORD_ID()');
  console.log('   b) Mantieni "Numero_Ordine" come campo text per codici business (es: ORD-2024-001)');
  console.log('   c) Cambia primary field in "ID_Ordine" se preferisci, oppure lascia "Numero_Ordine"\n');

  console.log('🎯 VANTAGGI RECORD_ID():');
  console.log('✅ ID univoci automatici senza duplicati');
  console.log('✅ Non modificabili accidentalmente');
  console.log('✅ Sempre presenti per ogni record');
  console.log('✅ Formato consistente (recXXXXXXXXXXXXXX)');
  console.log('✅ Ideali per relazioni e API calls\n');

  console.log('📱 AGGIORNAMENTO FRONTEND:');
  console.log('Dopo la conversione, aggiorna i tuoi hook React per usare:');
  console.log('- record.fields.ID_Storico invece di record.fields.Storico_ID');
  console.log('- record.fields.ID_Riga invece di record.fields.Riga_ID');
  console.log('- record.fields.ID_Commissione invece di record.fields.Pagamento_ID');
  console.log('- record.fields.ID_Transazione invece di record.fields.Transazione_ID\n');

  console.log('🔄 SCRIPT ALTERNATIVO:');
  console.log('Se preferisci, puoi anche eseguire lo script add-record-id-fields.js');
  console.log('per aggiungere i campi formula automaticamente (senza cambio primary field).\n');
}

// Versione alternativa che aggiunge i campi senza modificare primary fields
async function addRecordIdFields() {
  const { apiKey, baseId } = getCredentials();
  
  const recordIdFields = {
    'tblXtMoiDwLEBG5WE': { name: 'ID_Storico_Auto', description: 'ID univoco automatico' },
    'tblxzhMCa5UJOMZqC': { name: 'ID_Riga_Auto', description: 'ID univoco automatico' },
    'tblbn6gRCwpmYICdZ': { name: 'ID_Commissione_Auto', description: 'ID univoco automatico' },
    'tbl2bzbSxMDch72CY': { name: 'ID_Transazione_Auto', description: 'ID univoco automatico' }
  };

  console.log('\n🛠️  AGGIUNGENDO CAMPI RECORD_ID() AGGIUNTIVI...\n');
  
  for (const [tableId, config] of Object.entries(recordIdFields)) {
    try {
      console.log(`📎 Tentativo aggiunta ${config.name} alla tabella ${tableId}...`);
      
      // NOTA: Questo fallirà perché le formule non sono supportate via API
      const response = await request({
        hostname: 'api.airtable.com',
        path: `/v0/meta/bases/${baseId}/tables/${tableId}/fields`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }, {
        name: config.name,
        type: 'formula',
        options: {
          formula: 'RECORD_ID()'
        }
      });
      
      console.log(`  ✅ ${config.name} aggiunto con successo!`);
      
    } catch (error) {
      console.log(`  ❌ Fallito (previsto): ${error.message}`);
      console.log(`  💡 Usa le istruzioni manuali sopra invece`);
    }
  }
}

// Esegui le istruzioni manuali
generateRecordIdInstructions();

// Opzionalmente tenta anche l'aggiunta automatica (che fallirà ma mostra il tentativo)
console.log('\n='.repeat(80));
console.log('TENTATIVO AGGIUNTA AUTOMATICA (probabilmente fallirà):');
addRecordIdFields();