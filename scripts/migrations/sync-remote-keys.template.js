#!/usr/bin/env node

/**
 * Script per sincronizzare API keys remote
 * 
 * SETUP:
 * 1. Copia questo file: cp scripts/sync-remote-keys.template.js scripts/sync-remote-keys.js
 * 2. Modifica scripts/sync-remote-keys.js inserendo le tue credenziali
 * 3. Esegui: npm run sync-keys
 * 
 * SICUREZZA: scripts/sync-remote-keys.js è nel .gitignore per proteggere le credenziali
 */

const { createHash } = require('crypto');
const fs = require('fs');
const path = require('path');

// ⚠️ CONFIGURAZIONE - INSERIRE LE TUE CREDENZIALI QUI
const CONFIG = {
  REMOTE_KV_URL: 'https://mint-mammal-42977.upstash.io',
  REMOTE_KV_TOKEN: '', // 🔑 INSERIRE QUI IL TOKEN KV
  ENCRYPTION_KEY: '', // 🔐 INSERIRE QUI LA MASTER KEY
  USER_ID: 'user_admin_001',
  TENANT_ID: 'tenant_doctorbed',
};

// Funzione AES decrypt - usa AES-256-CBC come nel sistema originale
function decrypt(encryptedData, key) {
  if (!encryptedData || !key) {
    return null;
  }
  
  try {
    const crypto = require('crypto');
    
    // Handle legacy base64 format for backward compatibility
    if (encryptedData.startsWith('ENC:')) {
      const base64Data = encryptedData.substring(4);
      const plaintext = Buffer.from(base64Data, 'base64').toString('utf8');
      return plaintext;
    }

    // Modern AES-256-CBC format (iv:encrypted)
    if (encryptedData.includes(':')) {
      const [ivHex, encryptedHex] = encryptedData.split(':');
      
      // Validate format
      if (ivHex.length !== 32 || !encryptedHex) {
        console.error(`⚠️ Invalid AES format for key`);
        return null;
      }
      
      const iv = Buffer.from(ivHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');
      
      // Create decipher with AES-256-CBC
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    }
    
    return null;
    
  } catch (error) {
    console.error(`⚠️ Errore decrittografia:`, error.message);
    return null;
  }
}

// Funzione per chiamare HGETALL su KV (per chiavi API)
async function kvHGetAll(key, token, url) {
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['HGETALL', key]
    ]),
  });
  
  if (!response.ok) {
    console.error(`KV HGETALL Error for key ${key}: ${response.status}`);
    throw new Error(`KV API Error: ${response.status}`);
  }
  
  const data = await response.json();
  const result = data[0]?.result;
  
  // HGETALL restituisce un array [key1, value1, key2, value2, ...]
  // Convertiamolo in un oggetto
  if (Array.isArray(result) && result.length > 0) {
    const obj = {};
    for (let i = 0; i < result.length; i += 2) {
      obj[result[i]] = result[i + 1];
    }
    return obj;
  }
  
  return null;
}

// Funzione per ottenere membri di un set usando POST
async function kvSmembers(key, token, url) {
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['SMEMBERS', key]
    ]),
  });
  
  if (!response.ok) {
    console.error(`KV SMEMBERS Error for key ${key}: ${response.status}`);
    throw new Error(`KV API Error: ${response.status}`);
  }
  
  const data = await response.json();
  return data[0]?.result;
}

async function syncRemoteKeys() {
  // Validazione configurazione
  if (!CONFIG.REMOTE_KV_TOKEN) {
    console.error('⛔️ Errore: REMOTE_KV_TOKEN non configurato');
    console.log('🔧 Modifica il file scripts/sync-remote-keys.js e inserisci le credenziali');
    console.log('💡 Puoi trovarle nel dashboard Vercel KV e nel file .env.local esistente');
    return;
  }

  if (!CONFIG.ENCRYPTION_KEY) {
    console.error('⛔️ Errore: ENCRYPTION_KEY non configurata');
    console.log('🔧 Modifica il file scripts/sync-remote-keys.js e inserisci la master key');
    console.log('💡 La trovi nella variabile ENCRYPTION_MASTER_KEY del .env.local esistente');
    return;
  }

  console.log('🔄 Sincronizzazione chiavi API remote...');
  
  try {
    // Recupera lista chiavi utente
    const userApiKeys = await kvSmembers(
      `user_api_keys:${CONFIG.USER_ID}`,
      CONFIG.REMOTE_KV_TOKEN,
      CONFIG.REMOTE_KV_URL
    );

    if (!userApiKeys || userApiKeys.length === 0) {
      console.error('❌ Nessuna chiave trovata per l\'utente');
      return;
    }

    console.log(`📊 Trovate ${userApiKeys.length} chiavi per l'utente`);

    // Mappatura servizio -> env var (COMPLETA basata sull'analisi KV)
    const serviceMap = {
      // Airtable
      'airtable': 'AIRTABLE_API_KEY',
      'airtable-base-id': 'AIRTABLE_BASE_ID',
      'airtable-leads-table': 'AIRTABLE_LEADS_TABLE_ID',
      'airtable-users-table': 'AIRTABLE_USERS_TABLE_ID',
      'airtable-activities-table': 'AIRTABLE_ACTIVITIES_TABLE_ID',
      'airtable-orders-table': 'AIRTABLE_ORDER_TABLE_ID',
      'airtable-products-table': 'AIRTABLE_PRODUTCS_TABLE_ID',
      'airtable-automations-table': 'AIRTABLE_AUTOMATIONS_TABLE_ID',
      'airtable-webhook': 'AIRTABLE_WEBHOOK_SECRET',
      'airtable-endpoint': 'AIRTABLE_WEBHOOK_URL',
      
      // GitHub (nomi corretti dal KV)
      'github-api': 'GITHUB_TOKEN',
      'github-app': 'GITHUB_APP_PRIVATE_KEY',
      'github-webhook': 'GITHUB_WEBHOOK_SECRET',
      
      // Altri servizi
      'google-maps': 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
      'nextauth': 'NEXTAUTH_SECRET',
      'vercel-blob': 'BLOB_READ_WRITE_TOKEN',
      'vercel-oidc': 'VERCEL_OIDC_TOKEN',
      'database': 'DATABASE_URL',
      
      // Webhook URLs
      'whatsapp-webhook-url': 'WHATSAPP_WEBHOOK_URL',
    };

    // Recupera dettagli delle chiavi
    const envVars = {};
    const allServices = [];
    let foundKeys = 0;

    console.log('\n📋 Analisi di tutte le chiavi disponibili:');

    for (const keyId of userApiKeys) {
      try {
        const keyData = await kvHGetAll(
          `api_key:${keyId}`,
          CONFIG.REMOTE_KV_TOKEN,
          CONFIG.REMOTE_KV_URL
        );

        if (!keyData || !keyData.service || !keyData.key) {
          console.log(`⚠️ Skipping ${keyId}: missing data`);
          continue;
        }

        // Aggiungi alla lista di tutti i servizi
        allServices.push({
          service: keyData.service,
          isActive: keyData.isActive === 'true' || keyData.isActive === true,
          hasMapping: !!serviceMap[keyData.service],
          keyPreview: keyData.key.substring(0, 20) + '...'
        });

        // Salta se non attivo
        if (!keyData.isActive || keyData.isActive === 'false') {
          continue;
        }

        // Decripta la chiave
        const masterKey = createHash('sha256').update(CONFIG.ENCRYPTION_KEY).digest();
        const decryptedKey = decrypt(keyData.key, masterKey);
        
        if (!decryptedKey) {
          console.warn(`⚠️ Impossibile decriptare: ${keyData.service} (potrebbe essere corrotta)`);
          continue;
        }

        const envVarName = serviceMap[keyData.service];
        if (envVarName) {
          envVars[envVarName] = decryptedKey;
          foundKeys++;
          console.log(`✅ ${keyData.service} -> ${envVarName}`);
        }

      } catch (error) {
        console.warn(`⚠️ Errore con chiave ${keyId}:`, error.message);
      }
    }

    // Aggiungi configurazioni di base
    envVars['KV_REST_API_URL'] = CONFIG.REMOTE_KV_URL;
    envVars['KV_REST_API_TOKEN'] = CONFIG.REMOTE_KV_TOKEN;
    envVars['ENCRYPTION_MASTER_KEY'] = CONFIG.ENCRYPTION_KEY;
    envVars['CURRENT_USER_ID'] = CONFIG.USER_ID;
    envVars['CURRENT_TENANT_ID'] = CONFIG.TENANT_ID;
    envVars['NEXTAUTH_URL'] = 'http://localhost:3000';

    // Crea il contenuto del file .env.local
    const envContent = [
      '# Generato automaticamente da sync-remote-keys',
      `# Data: ${new Date().toISOString()}`,
      '',
      ...Object.entries(envVars).map(([key, value]) => `${key}=${value}`)
    ].join('\n');

    // Scrivi il file .env.local
    const envPath = path.join(process.cwd(), '.env.local');
    fs.writeFileSync(envPath, envContent);

    // Riepilogo dettagliato
    console.log(`\n📋 Riepilogo servizi trovati:`);
    console.table(allServices.map(s => ({
      Servizio: s.service,
      Attivo: s.isActive ? '✅' : '❌',
      'Ha Mapping': s.hasMapping ? '✅' : '❌',
      'Preview': s.keyPreview
    })));

    const activeServices = allServices.filter(s => s.isActive);
    const mappedServices = allServices.filter(s => s.hasMapping);
    const activeMappedServices = allServices.filter(s => s.isActive && s.hasMapping);

    console.log(`\n📊 Statistiche:`);
    console.log(`🔑 Totale servizi nel KV: ${allServices.length}`);
    console.log(`✅ Servizi attivi: ${activeServices.length}`);
    console.log(`🏷️ Servizi con mapping: ${mappedServices.length}`);
    console.log(`✅🏷️ Servizi attivi + mappati: ${activeMappedServices.length}`);
    console.log(`✅ Chiavi decriptate con successo: ${foundKeys}`);

    console.log(`\n🎉 Sincronizzazione completata!`);
    console.log(`📝 File .env.local aggiornato`);
    console.log(`🚀 Ora puoi eseguire: npm run dev`);

  } catch (error) {
    console.error('❌ Errore durante la sincronizzazione:', error);
  }
}

// Esegui lo script se chiamato direttamente
if (require.main === module) {
  syncRemoteKeys();
}

module.exports = { syncRemoteKeys };