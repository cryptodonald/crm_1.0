/**
 * Script per analizzare i metadata della tabella leads di Airtable
 */

const AIRTABLE_BASE_ID = 'app359c17lK0Ta8Ws';
const AIRTABLE_TABLE_NAME = 'leads'; // o l'ID della tabella leads

async function getAirtableKey() {
  try {
    // Chiama l'API del servizio per ottenere la chiave
    const response = await fetch('http://localhost:3000/api/api-keys?stats=false');
    const data = await response.json();
    
    // Trova la chiave Airtable
    const airtableKey = data.apiKeys?.find(key => 
      key.service === 'airtable' && key.isActive
    );
    
    if (!airtableKey) {
      console.error('❌ Chiave API Airtable non trovata o non attiva');
      return null;
    }
    
    console.log('✅ Chiave API Airtable trovata:', airtableKey.name);
    return airtableKey.keyPreview; // Dovrai usare quella completa per le chiamate reali
  } catch (error) {
    console.error('❌ Errore nel recupero chiave API:', error.message);
    return null;
  }
}

async function getTableSchema(apiKey) {
  if (!apiKey || !AIRTABLE_BASE_ID) {
    console.error('❌ Mancano API Key o Base ID');
    return null;
  }

  try {
    // Primo: ottieni il schema della base
    const schemaUrl = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`;
    const schemaResponse = await fetch(schemaUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!schemaResponse.ok) {
      throw new Error(`Schema API error: ${schemaResponse.status} - ${await schemaResponse.text()}`);
    }

    const schemaData = await schemaResponse.json();
    console.log('🔍 Schema Base ricevuto');
    
    // Trova la tabella leads
    const leadsTable = schemaData.tables?.find(table => 
      table.name.toLowerCase() === 'leads' || 
      table.name.toLowerCase() === 'lead' ||
      table.id === 'leads'
    );

    if (!leadsTable) {
      console.log('📋 Tabelle disponibili:', schemaData.tables?.map(t => ({ id: t.id, name: t.name })));
      throw new Error('Tabella leads non trovata');
    }

    console.log(`✅ Tabella trovata: "${leadsTable.name}" (ID: ${leadsTable.id})`);
    return leadsTable;
    
  } catch (error) {
    console.error('❌ Errore nel recupero schema:', error.message);
    return null;
  }
}

async function getSampleData(apiKey, tableId) {
  try {
    const dataUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableId}?maxRecords=3`;
    const dataResponse = await fetch(dataUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!dataResponse.ok) {
      throw new Error(`Data API error: ${dataResponse.status}`);
    }

    const data = await dataResponse.json();
    return data.records || [];
  } catch (error) {
    console.error('❌ Errore nel recupero dati campione:', error.message);
    return [];
  }
}

function analyzeFields(fields) {
  console.log('\n📊 ANALISI CAMPI DELLA TABELLA LEADS:');
  console.log('═'.repeat(60));
  
  const fieldsByType = {};
  
  fields.forEach((field, index) => {
    const type = field.type;
    if (!fieldsByType[type]) {
      fieldsByType[type] = [];
    }
    fieldsByType[type].push(field);
    
    console.log(`${index + 1}. ${field.name}`);
    console.log(`   Tipo: ${field.type}`);
    
    if (field.options) {
      if (field.options.choices) {
        console.log(`   Opzioni: ${field.options.choices.map(c => c.name).join(', ')}`);
      }
      if (field.options.linkedTableId) {
        console.log(`   Collegato a: ${field.options.linkedTableId}`);
      }
    }
    console.log('');
  });
  
  console.log('\n📈 RIASSUNTO PER TIPO:');
  console.log('═'.repeat(40));
  Object.entries(fieldsByType).forEach(([type, fields]) => {
    console.log(`${type}: ${fields.length} campi`);
    fields.forEach(field => {
      console.log(`  - ${field.name}`);
    });
    console.log('');
  });
}

function proposeColumnGrouping(fields) {
  console.log('\n🎯 PROPOSTA RAGGRUPPAMENTO COLONNE:');
  console.log('═'.repeat(50));
  
  // Cerca campi comuni
  const nameFields = fields.filter(f => 
    f.name.toLowerCase().includes('nome') || 
    f.name.toLowerCase().includes('name') ||
    f.name.toLowerCase().includes('azienda') ||
    f.name.toLowerCase().includes('company')
  );
  
  const contactFields = fields.filter(f =>
    f.name.toLowerCase().includes('email') ||
    f.name.toLowerCase().includes('telefono') ||
    f.name.toLowerCase().includes('phone') ||
    f.name.toLowerCase().includes('cellulare') ||
    f.name.toLowerCase().includes('mobile')
  );
  
  const addressFields = fields.filter(f =>
    f.name.toLowerCase().includes('indirizzo') ||
    f.name.toLowerCase().includes('address') ||
    f.name.toLowerCase().includes('via') ||
    f.name.toLowerCase().includes('cap') ||
    f.name.toLowerCase().includes('città') ||
    f.name.toLowerCase().includes('city')
  );
  
  const statusFields = fields.filter(f =>
    f.name.toLowerCase().includes('stato') ||
    f.name.toLowerCase().includes('status') ||
    f.name.toLowerCase().includes('provenienza') ||
    f.name.toLowerCase().includes('source') ||
    f.name.toLowerCase().includes('origine')
  );
  
  const dateFields = fields.filter(f =>
    f.type === 'date' ||
    f.type === 'dateTime' ||
    f.type === 'createdTime' ||
    f.type === 'lastModifiedTime'
  );
  
  const referenceFields = fields.filter(f =>
    f.name.toLowerCase().includes('referenza') ||
    f.name.toLowerCase().includes('reference') ||
    f.name.toLowerCase().includes('ref')
  );
  
  console.log('1. 👤 COLONNA CLIENTE:');
  console.log('   - Avatar (generato dal nome)');
  nameFields.forEach(f => console.log(`   - ${f.name}`));
  addressFields.forEach(f => console.log(`   - ${f.name}`));
  
  console.log('\n2. 📞 COLONNA CONTATTI:');
  contactFields.forEach(f => console.log(`   - ${f.name}`));
  
  console.log('\n3. 🔗 COLONNA REFERENZE:');
  referenceFields.forEach(f => console.log(`   - ${f.name}`));
  
  console.log('\n4. 📈 COLONNA BUSINESS:');
  statusFields.forEach(f => console.log(`   - ${f.name}`));
  
  console.log('\n5. 📅 COLONNA TEMPORALE:');
  dateFields.forEach(f => console.log(`   - ${f.name}`));
  
  console.log('\n6. 💼 COLONNA VALORE:');
  const valueFields = fields.filter(f =>
    f.name.toLowerCase().includes('valore') ||
    f.name.toLowerCase().includes('value') ||
    f.name.toLowerCase().includes('prezzo') ||
    f.name.toLowerCase().includes('price') ||
    f.name.toLowerCase().includes('budget') ||
    f.type === 'currency' ||
    f.type === 'number'
  );
  valueFields.forEach(f => console.log(`   - ${f.name}`));
}

function analyzeForKPIs(fields, sampleData) {
  console.log('\n📊 ANALISI PER KPI:');
  console.log('═'.repeat(40));
  
  // Campi utili per i KPI richiesti
  const statusField = fields.find(f => 
    f.name.toLowerCase().includes('stato') ||
    f.name.toLowerCase().includes('status')
  );
  
  const createdField = fields.find(f => 
    f.type === 'createdTime' ||
    f.name.toLowerCase().includes('created') ||
    f.name.toLowerCase().includes('creato')
  );
  
  const contactedField = fields.find(f =>
    f.name.toLowerCase().includes('contattato') ||
    f.name.toLowerCase().includes('contacted') ||
    f.name.toLowerCase().includes('primo_contatto')
  );
  
  console.log('🎯 KPI: Lead ultimi 7 giorni');
  console.log(`   Campo utilizzabile: ${createdField ? createdField.name : '❌ Campo data creazione non trovato'}`);
  
  console.log('\n🎯 KPI: Contattati entro 48h');  
  console.log(`   Campo utilizzabile: ${contactedField ? contactedField.name : '❌ Campo contatto non trovato'}`);
  
  console.log('\n🎯 KPI: Tasso di qualificazione');
  console.log(`   Campo utilizzabile: ${statusField ? statusField.name : '❌ Campo stato non trovato'}`);
  if (statusField && statusField.options && statusField.options.choices) {
    console.log('   Stati disponibili:');
    statusField.options.choices.forEach(choice => {
      console.log(`     - ${choice.name}`);
    });
  }
  
  console.log('\n🎯 KPI: Tasso di conversione');
  console.log(`   Campo utilizzabile: ${statusField ? statusField.name : '❌ Campo stato non trovato'}`);
  
  // Analizza i dati campione per capire i valori
  if (sampleData.length > 0) {
    console.log('\n🔍 ANALISI DATI CAMPIONE:');
    console.log(`   Record analizzati: ${sampleData.length}`);
    
    sampleData.forEach((record, index) => {
      console.log(`\n   Record ${index + 1}:`);
      Object.entries(record.fields).forEach(([key, value]) => {
        const displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
        console.log(`     ${key}: ${displayValue}`);
      });
    });
  }
}

async function main() {
  console.log('🚀 ANALISI METADATA TABELLA LEADS');
  console.log('═'.repeat(60));
  
  // Step 1: Recupera chiave API
  const apiKey = await getAirtableKey();
  if (!apiKey) {
    console.log('\n💡 SUGGERIMENTO: Assicurati che:');
    console.log('   - Il server Next.js sia in esecuzione su localhost:3000');
    console.log('   - Esista una chiave API Airtable attiva nel sistema');
    return;
  }
  
  // Usa la chiave API reale recuperata
  const REAL_API_KEY = 'patKEe4q8UeW13rVL.5f05611c9f7dbfc41c4196bfb1ae8cb52bde23ad4c6b9e30678027ac94c1a6ea';
  
  // Step 2: Ottieni schema tabella
  const tableSchema = await getTableSchema(REAL_API_KEY);
  if (!tableSchema) return;
  
  // Step 3: Ottieni dati campione
  const sampleData = await getSampleData(REAL_API_KEY, tableSchema.id);
  
  // Step 4: Analizza campi
  analyzeFields(tableSchema.fields);
  
  // Step 5: Proponi raggruppamento
  proposeColumnGrouping(tableSchema.fields);
  
  // Step 6: Analizza per KPI
  analyzeForKPIs(tableSchema.fields, sampleData);
  
  console.log('\n✅ ANALISI COMPLETATA');
  console.log('\n📋 PROSSIMI PASSI:');
  console.log('   1. Implementare i componenti React basati su questa analisi');
  console.log('   2. Creare gli hook per i KPI identificati'); 
  console.log('   3. Implementare la tabella con i raggruppamenti proposti');
  console.log('   4. Aggiungere filtri per provenienza e stato');
}

// Esegui solo se chiamato direttamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, analyzeFields, proposeColumnGrouping };
