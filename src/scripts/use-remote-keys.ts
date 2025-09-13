/**
 * Script per lo sviluppo locale che utilizza le API keys remote
 * 
 * Questo script permette di sviluppare in locale usando le API keys
 * dal sistema di produzione, senza necessità di configurare un .env.local completo
 */

import { createHash } from 'crypto';
import { kv } from '@vercel/kv';
import { decrypt } from '@/lib/encryption';
import fs from 'fs';
import path from 'path';

// Configurazione minima necessaria
const REMOTE_KV_URL = 'https://mint-mammal-42977.upstash.io';
const REMOTE_KV_TOKEN = ''; // Inserire il token KV qui
const ENCRYPTION_KEY = ''; // Inserire la master key qui
const USER_ID = 'user_admin_001';
const TENANT_ID = 'tenant_doctorbed';

// Definizione chiavi da recuperare
const KEYS_TO_FETCH = [
  'airtable',
  'airtable-base-id',
  'airtable-leads-table',
  'airtable-users-table',
  'airtable-activities-table',
  'airtable-orders-table',
  'airtable-products-table',
  'airtable-automations-table',
  'airtable-webhook',
  'github-token',
  'github-app-private-key',
  'github-webhook-secret',
  'google-maps-api',
  'nextauth-secret',
  'whatsapp-webhook-url',
  'airtable-webhook-url'
];

// Funzione per decriptare le chiavi
function decryptApiKey(encryptedKey: string, masterKey: string): string {
  try {
    const key = createHash('sha256').update(masterKey).digest();
    return decrypt(encryptedKey, key);
  } catch (error) {
    console.error('Errore nella decrittografia:', error);
    return '';
  }
}

// Funzione principale
async function syncRemoteKeys() {
  if (!REMOTE_KV_TOKEN || !ENCRYPTION_KEY) {
    console.error('⛔️ Errore: Inserire REMOTE_KV_TOKEN e ENCRYPTION_KEY nello script');
    return;
  }

  console.log('🔄 Sincronizzazione chiavi remote...');
  
  try {
    // Configurazione KV remoto
    const remoteKv = kv.withConfig({
      url: REMOTE_KV_URL,
      token: REMOTE_KV_TOKEN,
    });

    // Recupero tutte le chiavi dell'utente
    const userApiKeys = await remoteKv.smembers(`user_api_keys:${USER_ID}`);
    if (!userApiKeys || userApiKeys.length === 0) {
      console.error('❌ Nessuna chiave trovata per questo utente');
      return;
    }

    // Recupero dettagli di ogni chiave
    const envVars: Record<string, string> = {};
    let foundKeys = 0;

    for (const keyId of userApiKeys) {
      const keyData = await remoteKv.get(`api_key:${keyId}`);
      if (!keyData || !keyData.service || !keyData.key || !keyData.isActive) {
        continue;
      }

      // Controllo se è una chiave che ci interessa
      const service = keyData.service as string;
      if (!KEYS_TO_FETCH.includes(service)) {
        continue;
      }

      // Decripta la chiave
      const decryptedKey = decryptApiKey(keyData.key as string, ENCRYPTION_KEY);
      if (!decryptedKey) {
        console.warn(`⚠️ Impossibile decriptare la chiave: ${service}`);
        continue;
      }

      // Mappatura al formato env var
      switch (service) {
        case 'airtable':
          envVars['AIRTABLE_API_KEY'] = decryptedKey;
          break;
        case 'airtable-base-id':
          envVars['AIRTABLE_BASE_ID'] = decryptedKey;
          break;
        case 'airtable-leads-table':
          envVars['AIRTABLE_LEADS_TABLE_ID'] = decryptedKey;
          break;
        case 'airtable-users-table':
          envVars['AIRTABLE_USERS_TABLE_ID'] = decryptedKey;
          break;
        case 'airtable-activities-table':
          envVars['AIRTABLE_ACTIVITIES_TABLE_ID'] = decryptedKey;
          break;
        case 'airtable-orders-table':
          envVars['AIRTABLE_ORDER_TABLE_ID'] = decryptedKey;
          break;
        case 'airtable-products-table':
          envVars['AIRTABLE_PRODUTCS_TABLE_ID'] = decryptedKey;
          break;
        case 'airtable-automations-table':
          envVars['AIRTABLE_AUTOMATIONS_TABLE_ID'] = decryptedKey;
          break;
        case 'airtable-webhook':
          envVars['AIRTABLE_WEBHOOK_SECRET'] = decryptedKey;
          break;
        case 'github-token':
          envVars['GITHUB_TOKEN'] = decryptedKey;
          break;
        case 'github-app-private-key':
          envVars['GITHUB_APP_PRIVATE_KEY'] = decryptedKey;
          break;
        case 'github-webhook-secret':
          envVars['GITHUB_WEBHOOK_SECRET'] = decryptedKey;
          break;
        case 'google-maps-api':
          envVars['NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'] = decryptedKey;
          break;
        case 'nextauth-secret':
          envVars['NEXTAUTH_SECRET'] = decryptedKey;
          break;
        case 'whatsapp-webhook-url':
          envVars['WHATSAPP_WEBHOOK_URL'] = decryptedKey;
          break;
        case 'airtable-webhook-url':
          envVars['AIRTABLE_WEBHOOK_URL'] = decryptedKey;
          break;
      }

      foundKeys++;
      console.log(`✅ Chiave recuperata: ${service}`);
    }

    // Aggiungi variabili di base
    envVars['KV_REST_API_URL'] = REMOTE_KV_URL;
    envVars['KV_REST_API_TOKEN'] = REMOTE_KV_TOKEN;
    envVars['ENCRYPTION_MASTER_KEY'] = ENCRYPTION_KEY;
    envVars['CURRENT_USER_ID'] = USER_ID;
    envVars['CURRENT_TENANT_ID'] = TENANT_ID;
    envVars['NEXTAUTH_URL'] = 'http://localhost:3000';

    // Crea file .env.local
    const envContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    const envPath = path.join(process.cwd(), '.env.local');
    fs.writeFileSync(envPath, envContent);

    console.log(`\n🎉 Sincronizzazione completata! ${foundKeys} chiavi recuperate`);
    console.log(`📝 File .env.local creato in: ${envPath}`);

  } catch (error) {
    console.error('❌ Errore durante la sincronizzazione:', error);
  }
}

// Esegui lo script
syncRemoteKeys();