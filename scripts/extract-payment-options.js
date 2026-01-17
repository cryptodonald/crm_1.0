#!/usr/bin/env node

/**
 * Script per estrarre tutte le opzioni di Stato_Pagamento e Modalita_Pagamento
 * dai record ordini già salvati in Airtable
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

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?([^"]*)"?$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

if (!env.KV_REST_API_URL || !env.KV_REST_API_TOKEN) {
  console.error('❌ KV_REST_API_URL o KV_REST_API_TOKEN mancanti in .env.local');
  process.exit(1);
}

const KV_URL = env.KV_REST_API_URL;
const KV_TOKEN = env.KV_REST_API_TOKEN;
const BASE_ID = 'app359c17lK0Ta8Ws';
const ORDERS_TABLE_ID = 'tblkqfCMabBpVD1fP';

console.log('✅ Credenziali caricate\n');

/**
 * Effettua una richiesta REST a Vercel KV
 */
function kvRequest(key) {
  return new Promise((resolve, reject) => {
    const url = new URL(KV_URL);
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
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`KV Error ${res.statusCode}: ${JSON.stringify(parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse KV response: ${data}`));
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
  console.log('🚀 Estrazione opzioni di pagamento dai record ordini\n');
  console.log('═'.repeat(70));

  try {
    // Step 1: Ottieni l'API key da KV
    console.log('\n📝 Step 1: Lettura API key da Vercel KV...');
    
    const kvResponse = await kvRequest('apikey:airtable');
    
    if (!kvResponse.result) {
      console.error('❌ API key non trovata in KV');
      process.exit(1);
    }

    const airtableKey = kvResponse.result;
    console.log(`✅ API key recuperata: ${airtableKey.substring(0, 15)}...`);

    // Step 2: Recupera TUTTI i record ordini
    console.log('\n📝 Step 2: Recupero record ordini da Airtable...');
    
    let allRecords = [];
    let offset = undefined;
    let pageCount = 0;

    do {
      pageCount++;
      const params = new URLSearchParams();
      params.set('pageSize', '100');
      if (offset) {
        params.set('offset', offset);
      }
      
      const airtableUrl = `https://api.airtable.com/v0/${BASE_ID}/${ORDERS_TABLE_ID}?${params.toString()}`;
      
      console.log(`   📡 Pagina ${pageCount}...`);
      
      const response = await httpsRequest(airtableUrl, {
        'Authorization': `Bearer ${airtableKey}`,
      });

      if (response.records) {
        allRecords.push(...response.records);
        offset = response.offset;
      } else {
        offset = undefined;
      }
    } while (offset);

    console.log(`✅ ${allRecords.length} record recuperati`);

    // Step 3: Estrai le opzioni valide
    console.log('\n📝 Step 3: Estrazione opzioni valide...\n');
    
    const paymentStatuses = new Set();
    const paymentMethods = new Set();

    allRecords.forEach(record => {
      const fields = record.fields;
      
      if (fields.Stato_Pagamento && fields.Stato_Pagamento.trim()) {
        paymentStatuses.add(fields.Stato_Pagamento);
      }
      
      if (fields.Modalita_Pagamento && fields.Modalita_Pagamento.trim()) {
        paymentMethods.add(fields.Modalita_Pagamento);
      }
    });

    // Step 4: Mostra i risultati
    console.log('═'.repeat(70));
    console.log('\n✅ OPZIONI ESTRATTE DA AIRTABLE:\n');

    console.log('🎯 Stato_Pagamento:');
    if (paymentStatuses.size > 0) {
      const statuses = Array.from(paymentStatuses).sort();
      statuses.forEach((status, idx) => {
        console.log(`   ${idx + 1}. "${status}"`);
      });
      
      console.log('\n📝 Codice per route.ts:');
      console.log('```typescript');
      console.log('const PAYMENT_STATUSES = [');
      statuses.forEach(status => {
        console.log(`  '${status}',`);
      });
      console.log('];');
      console.log('```\n');
    } else {
      console.log('   ⚠️  Nessun valore trovato (il campo potrebbe essere vuoto in tutti i record)\n');
    }

    console.log('🎯 Modalita_Pagamento:');
    if (paymentMethods.size > 0) {
      const methods = Array.from(paymentMethods).sort();
      methods.forEach((method, idx) => {
        console.log(`   ${idx + 1}. "${method}"`);
      });
      
      console.log('\n📝 Codice per route.ts:');
      console.log('```typescript');
      console.log('const PAYMENT_METHODS = [');
      methods.forEach(method => {
        console.log(`  '${method}',`);
      });
      console.log('];');
      console.log('```\n');
    } else {
      console.log('   ⚠️  Nessun valore trovato (il campo potrebbe essere vuoto in tutti i record)\n');
    }

    // Step 5: Statistiche
    console.log('═'.repeat(70));
    console.log('\n📊 STATISTICHE:\n');
    console.log(`Total record ordini: ${allRecords.length}`);
    console.log(`Record con Stato_Pagamento: ${Array.from(allRecords).filter(r => r.fields.Stato_Pagamento).length}`);
    console.log(`Record con Modalita_Pagamento: ${Array.from(allRecords).filter(r => r.fields.Modalita_Pagamento).length}`);
    console.log(`\nOpzioni uniche Stato_Pagamento: ${paymentStatuses.size}`);
    console.log(`Opzioni uniche Modalita_Pagamento: ${paymentMethods.size}\n`);

  } catch (error) {
    console.error('\n❌ Errore:', error.message);
    process.exit(1);
  }

  console.log('═'.repeat(70));
  console.log('\n✅ Estrazione completata!\n');
}

main().catch(err => {
  console.error('❌ Errore fatale:', err);
  process.exit(1);
});
