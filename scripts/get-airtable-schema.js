#!/usr/bin/env node

/**
 * Script per ottenere la struttura esatta dei campi Airtable
 * Legge le credenziali da .env.local e interroga il Metadata API di Airtable
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Leggi .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ File .env.local non trovato');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};

// Parse .env file
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?([^"]*)"?$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

// Valida le credenziali
if (!env.KV_REST_API_URL || !env.KV_REST_API_TOKEN) {
  console.error('❌ KV_REST_API_URL o KV_REST_API_TOKEN mancanti in .env.local');
  process.exit(1);
}

const KV_URL = env.KV_REST_API_URL;
const KV_TOKEN = env.KV_REST_API_TOKEN;
const BASE_ID = 'app359c17lK0Ta8Ws';
const ORDERS_TABLE_ID = 'tblkqfCMabBpVD1fP';

console.log('✅ Credenziali caricate da .env.local');
console.log(`📊 KV URL: ${KV_URL}`);

/**
 * Effettua una richiesta REST a Vercel KV
 */
function kvRequest(key) {
  return new Promise((resolve, reject) => {
    const url = new URL(KV_URL);
    
    // Vercel KV REST API: GET /key
    const requestPath = `${url.pathname}/${encodeURIComponent(key)}`;

    const options = {
      hostname: url.hostname,
      path: requestPath,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${KV_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 400) {
            reject(new Error(`KV Error ${res.statusCode}: ${JSON.stringify(parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse KV response: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/**
 * Effettua una richiesta HTTPS generica
 */
function httpsRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
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
 * Funzione principale
 */
async function main() {
  console.log('\n🚀 Recuperando struttura tabella Ordini da Airtable\n');
  console.log('═'.repeat(70));

  try {
    // Step 1: Ottieni l'API key da KV
    console.log('\n📝 Step 1: Lettura API key da Vercel KV...');
    
    const kvResponse = await kvRequest('airtable');
    
    if (!kvResponse.result) {
      console.error('❌ API key non trovata in KV');
      console.log('💡 Possibili cause:');
      console.log('   - Le credenziali non sono state salvate in KV');
      console.log('   - La chiave è diversa da "crm:airtable:api_key"');
      process.exit(1);
    }

    // Decripta la chiave (dovrebbe essere già in chiaro o decripta automaticamente)
    const airtableKey = kvResponse.result;
    console.log(`✅ API key recuperata: ${airtableKey.substring(0, 15)}...`);

    // Step 2: Interroga Airtable per la struttura della tabella
    console.log('\n📝 Step 2: Interrogazione Metadata API di Airtable...');
    
    const metaUrl = `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables/${ORDERS_TABLE_ID}`;
    console.log(`🔗 URL: ${metaUrl}`);

    const schema = await httpsRequest(metaUrl, {
      'Authorization': `Bearer ${airtableKey}`,
    });

    if (!schema.fields) {
      console.error('❌ Metadata API non disponibile o non autorizzato');
      console.log('💡 Il Metadata API potrebbe richiedere un piano Airtable a pagamento');
      process.exit(1);
    }

    // Step 3: Estrai e mostra i campi
    console.log('\n✅ Schema recuperato!\n');
    console.log('═'.repeat(70));
    console.log('\n📋 TUTTI I CAMPI DELLA TABELLA ORDINI:\n');

    const fields = schema.fields;
    
    fields.forEach((field, idx) => {
      console.log(`${idx + 1}. ${field.name}`);
      console.log(`   Type: ${field.type}`);
      
      if (field.options?.choices) {
        console.log(`   Options (${field.options.choices.length}):`);
        field.options.choices.forEach(choice => {
          console.log(`     • "${choice.name}"`);
        });
      } else if (field.options) {
        console.log(`   Options: ${JSON.stringify(field.options)}`);
      }
      console.log();
    });

    // Step 4: Estrai specificamente i campi di pagamento
    console.log('═'.repeat(70));
    console.log('\n🎯 CAMPI DI PAGAMENTO:\n');

    const paymentStatusField = fields.find(f => f.name === 'Stato_Pagamento');
    const paymentMethodField = fields.find(f => f.name === 'Modalita_Pagamento');

    if (paymentStatusField) {
      console.log('✅ Stato_Pagamento trovato:');
      if (paymentStatusField.options?.choices) {
        console.log('   Opzioni disponibili:');
        const options = paymentStatusField.options.choices.map(c => `'${c.name}'`).join(', ');
        console.log(`   ${options}\n`);
        console.log('   📝 Codice per route.ts:');
        console.log('   ```typescript');
        console.log('   const PAYMENT_STATUSES = [');
        paymentStatusField.options.choices.forEach(c => {
          console.log(`     '${c.name}',`);
        });
        console.log('   ];');
        console.log('   ```\n');
      }
    } else {
      console.log('❌ Stato_Pagamento NON TROVATO');
    }

    if (paymentMethodField) {
      console.log('✅ Modalita_Pagamento trovato:');
      if (paymentMethodField.options?.choices) {
        console.log('   Opzioni disponibili:');
        const options = paymentMethodField.options.choices.map(c => `'${c.name}'`).join(', ');
        console.log(`   ${options}\n`);
        console.log('   📝 Codice per route.ts:');
        console.log('   ```typescript');
        console.log('   const PAYMENT_METHODS = [');
        paymentMethodField.options.choices.forEach(c => {
          console.log(`     '${c.name}',`);
        });
        console.log('   ];');
        console.log('   ```\n');
      }
    } else {
      console.log('❌ Modalita_Pagamento NON TROVATO');
    }

  } catch (error) {
    console.error('\n❌ Errore:', error.message);
    
    if (error.message.includes('PERMISSION_DENIED') || error.message.includes('401')) {
      console.log('\n💡 Possibili cause:');
      console.log('   - API key scaduta o non valida');
      console.log('   - KV non contiene la chiave corretta');
      console.log('   - Permessi insufficienti');
    }
    
    process.exit(1);
  }

  console.log('═'.repeat(70));
  console.log('\n✅ Struttura recuperata con successo!\n');
}

main().catch(err => {
  console.error('❌ Errore fatale:', err);
  process.exit(1);
});
