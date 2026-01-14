#!/usr/bin/env node

/**
 * Script per configurare Airtable con tabelle e campi per analytics
 * 
 * Questo script:
 * 1. Crea la tabella "Marketing Costs" se non esiste
 * 2. Inserisce dati di esempio
 * 3. Verifica struttura tabelle esistenti
 * 
 * Usage: node scripts/setup-airtable-analytics.js
 */

const https = require('https');
global.fetch = require('node-fetch');

// Carica .env.local
require('dotenv').config({ path: '.env.local' });

const crypto = require('crypto');

// Carica le API keys dinamicamente dal KV
let AIRTABLE_API_KEY, AIRTABLE_BASE_ID;

function decrypt(encryptedData, masterKey) {
  try {
    if (!encryptedData || !encryptedData.includes(':')) return null;
    
    const [ivHex, encryptedHex] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const key = crypto.createHash('sha256').update(masterKey).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return null;
  }
}

async function loadAirtableCredentials() {
  try {
    const KV_URL = process.env.KV_REST_API_URL;
    const KV_TOKEN = process.env.KV_REST_API_TOKEN;
    const ENCRYPTION_KEY = process.env.ENCRYPTION_MASTER_KEY;
    
    console.log('Debug - KV_URL:', KV_URL ? 'OK' : 'MISSING');
    console.log('Debug - KV_TOKEN:', KV_TOKEN ? 'OK' : 'MISSING');
    console.log('Debug - ENCRYPTION_KEY:', ENCRYPTION_KEY ? 'OK' : 'MISSING');
    
    if (!KV_URL || !KV_TOKEN || !ENCRYPTION_KEY) {
      throw new Error('Missing KV credentials in .env.local');
    }
    
    // Get all API keys
    console.log('Fetching all API keys...');
    const keysResponse = await fetch(`${KV_URL}/keys/api_key:*`, {
      headers: { 'Authorization': `Bearer ${KV_TOKEN}` }
    });
    const keysData = await keysResponse.json();
    const allKeys = keysData.result || [];
    console.log(`Found ${allKeys.length} API keys`);
    
    // Fetch all keys and find the ones we need
    for (const keyId of allKeys) {
      const response = await fetch(`${KV_URL}/hgetall/${keyId}`, {
        headers: { 'Authorization': `Bearer ${KV_TOKEN}` }
      });
      
      if (!response.ok) continue;
      
      const data = await response.json();
      const result = data.result;
      
      // Convert array to object
      const obj = {};
      for (let i = 0; i < result.length; i += 2) {
        obj[result[i]] = result[i + 1];
      }
      
      // Check service field
      if (obj.service === 'airtable' && !AIRTABLE_API_KEY) {
        console.log('Found Airtable API key');
        AIRTABLE_API_KEY = decrypt(obj.key, ENCRYPTION_KEY);
      }
      
      if (obj.service === 'airtable-base-id' && !AIRTABLE_BASE_ID) {
        console.log('Found Airtable Base ID');
        AIRTABLE_BASE_ID = decrypt(obj.key, ENCRYPTION_KEY);
      }
      
      // Stop if we have both
      if (AIRTABLE_API_KEY && AIRTABLE_BASE_ID) {
        console.log('Got both credentials!');
        break;
      }
    }
    
    return !!(AIRTABLE_API_KEY && AIRTABLE_BASE_ID);
  } catch (error) {
    console.error('Errore caricamento credenziali:', error.message);
    return false;
  }
}

// Helper per chiamate Airtable API
function airtableRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.airtable.com',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
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

// Funzione per creare record in Marketing Costs
async function createMarketingCostsRecords() {
  console.log('📊 Creando record di esempio in Marketing Costs...');
  
  const sampleData = [
    {
      fields: {
        'Name': 'Meta Ads - Novembre 2024',
        'Fonte': 'Meta',
        'Budget': 1500,
        'Data Inizio': '2024-11-01',
        'Data Fine': '2024-11-30',
        'Note': 'Campagna Black Friday su Facebook e Instagram'
      }
    },
    {
      fields: {
        'Name': 'Google Ads - Novembre 2024',
        'Fonte': 'Google',
        'Budget': 1200,
        'Data Inizio': '2024-11-01',
        'Data Fine': '2024-11-30',
        'Note': 'Campagne Search e Display Network'
      }
    },
    {
      fields: {
        'Name': 'Instagram Influencer - Novembre',
        'Fonte': 'Instagram',
        'Budget': 800,
        'Data Inizio': '2024-11-01',
        'Data Fine': '2024-11-30',
        'Note': 'Collaborazione con micro-influencer'
      }
    },
    {
      fields: {
        'Name': 'Referral Program - Q4',
        'Fonte': 'Referral',
        'Budget': 0,
        'Data Inizio': '2024-10-01',
        'Data Fine': '2024-12-31',
        'Note': 'Programma passaparola clienti esistenti'
      }
    },
    {
      fields: {
        'Name': 'Meta Ads - Dicembre 2024',
        'Fonte': 'Meta',
        'Budget': 2000,
        'Data Inizio': '2024-12-01',
        'Data Fine': '2024-12-31',
        'Note': 'Campagne Natale con targeting lookalike'
      }
    },
    {
      fields: {
        'Name': 'Google Ads - Dicembre 2024',
        'Fonte': 'Google',
        'Budget': 1500,
        'Data Inizio': '2024-12-01',
        'Data Fine': '2024-12-31',
        'Note': 'Campagne Shopping per prodotti natalizi'
      }
    }
  ];

  try {
    const result = await airtableRequest(
      'POST',
      `/v0/${AIRTABLE_BASE_ID}/Marketing%20Costs`,
      { records: sampleData }
    );
    
    console.log(`✅ Creati ${result.records.length} record di esempio`);
    return result;
  } catch (error) {
    console.error('❌ Errore nella creazione dei record:', error.message);
    throw error;
  }
}

// Funzione per verificare se la tabella esiste
async function checkTableExists(tableName) {
  try {
    const result = await airtableRequest(
      'GET',
      `/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}?maxRecords=1`
    );
    return true;
  } catch (error) {
    return false;
  }
}

// Funzione principale
async function main() {
  console.log('🚀 Setup Airtable Analytics\n');

  // Carica credenziali
  console.log('🔑 Caricando credenziali Airtable...');
  const loaded = await loadAirtableCredentials();
  
  if (!loaded || !AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.error('❌ Errore: Impossibile caricare le credenziali Airtable');
    console.error('Verifica che .env.local sia configurato correttamente');
    process.exit(1);
  }

  console.log('✅ Credenziali Airtable caricate');
  console.log(`📍 Base ID: ${AIRTABLE_BASE_ID}\n`);

  try {
    // Step 1: Verifica se Marketing Costs esiste
    console.log('🔍 Verificando tabella Marketing Costs...');
    const marketingCostsExists = await checkTableExists('Marketing Costs');

    if (!marketingCostsExists) {
      console.log('⚠️  La tabella "Marketing Costs" non esiste ancora.');
      console.log('\n📝 AZIONE MANUALE RICHIESTA:');
      console.log('1. Vai su Airtable: https://airtable.com');
      console.log(`2. Apri la base: ${CONFIG.AIRTABLE_BASE_ID}`);
      console.log('3. Crea una nuova tabella chiamata "Marketing Costs"');
      console.log('4. Aggiungi questi campi:');
      console.log('   - Name (Single line text) - già presente di default');
      console.log('   - Fonte (Single select): Meta, Instagram, Google, Sito, Referral, Organico');
      console.log('   - Budget (Currency - Euro €)');
      console.log('   - Data Inizio (Date)');
      console.log('   - Data Fine (Date)');
      console.log('   - Note (Long text)');
      console.log('\n5. Poi riesegui questo script per inserire i dati di esempio\n');
      process.exit(1);
    }

    console.log('✅ Tabella Marketing Costs trovata!');

    // Step 2: Crea record di esempio
    await createMarketingCostsRecords();

    // Step 3: Istruzioni per Products
    console.log('\n📦 Setup tabella Products:');
    console.log('Aggiungi manualmente questi campi alla tabella Products in Airtable:');
    console.log('   - Costo Prodotto (Currency - Euro €)');
    console.log('   - Prezzo Vendita (Currency - Euro €)');
    console.log('   - Margine % (Formula): ({Prezzo Vendita} - {Costo Prodotto}) / {Prezzo Vendita} * 100');

    // Step 4: Verifica Orders
    console.log('\n📋 Verifica tabella Orders:');
    const ordersExists = await checkTableExists('Orders');
    if (ordersExists) {
      console.log('✅ Tabella Orders trovata');
      console.log('Verifica che abbia questi campi:');
      console.log('   - Totale Ordine (Currency)');
      console.log('   - Lead (Link to Leads)');
      console.log('   - Data (Date)');
      console.log('   - Stato (Single select)');
    } else {
      console.log('⚠️  Tabella Orders non trovata - verifica il nome corretto');
    }

    console.log('\n✨ Setup completato con successo!');
    console.log('\n🎯 Prossimi passi:');
    console.log('1. Compila i campi Costo/Prezzo nei prodotti esistenti');
    console.log('2. Verifica che gli ordini siano collegati ai lead');
    console.log('3. Testa la dashboard analytics: http://localhost:3000/dashboard');

  } catch (error) {
    console.error('\n❌ Errore durante il setup:', error.message);
    process.exit(1);
  }
}

// Esegui script
main();
