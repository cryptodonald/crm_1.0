#!/usr/bin/env node

/**
 * Script per aggiungere le API keys NextAuth e Google OAuth al KV database
 * Uso: node scripts/add-nextauth-keys.js
 */

const https = require('https');
const crypto = require('crypto');

// Configurazione - Usare variabili d'ambiente
const KV_REST_API_URL = process.env.KV_REST_API_URL || 'https://mint-mammal-42977.upstash.io';
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;
const ENCRYPTION_MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY;
const USER_ID = process.env.CURRENT_USER_ID || 'user_admin_001';
const TENANT_ID = process.env.CURRENT_TENANT_ID || 'tenant_doctorbed';

// Valida che le credenziali siano disponibili
if (!KV_REST_API_TOKEN || !ENCRYPTION_MASTER_KEY) {
  console.error('❌ Errore: Variabili d\'ambiente mancanti!');
  console.error('Imposta: KV_REST_API_TOKEN e ENCRYPTION_MASTER_KEY');
  console.error('Copia dal file .env.local');
  process.exit(1);
}

// API keys da aggiungere - Usa variabili d'ambiente
const API_KEYS_TO_ADD = [
  {
    name: 'nextauth-secret',
    value: process.env.NEXTAUTH_SECRET,
    category: 'authentication',
    description: 'NextAuth JWT secret'
  },
  {
    name: 'nextauth-url',
    value: process.env.NEXTAUTH_URL || 'https://crm.doctorbed.app',
    category: 'authentication',
    description: 'NextAuth callback URL'
  },
  {
    name: 'google-oauth-client-id',
    value: process.env.GOOGLE_OAUTH_CLIENT_ID,
    category: 'google',
    description: 'Google OAuth Client ID for Google Calendar integration'
  },
  {
    name: 'google-oauth-client-secret',
    value: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    category: 'google',
    description: 'Google OAuth Client Secret for Google Calendar integration'
  }
].filter(key => key.value); // Filtra solo le chiavi che hanno un valore

// Funzione di crittografia
function encrypt(text, masterKey) {
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash('sha256').update(masterKey).digest();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

// Funzione per fare richieste al KV
function kvRequest(command, args = []) {
  return new Promise((resolve, reject) => {
    const payload = [command, ...args];
    const data = JSON.stringify(payload);
    
    const options = {
      hostname: 'mint-mammal-42977.upstash.io',
      port: 443,
      path: '/',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response.result);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Funzione principale
async function main() {
  console.log('🔐 Aggiunta API keys NextAuth e Google OAuth al KV database...\n');

  try {
    for (const apiKey of API_KEYS_TO_ADD) {
      console.log(`📝 Aggiungendo: ${apiKey.name}`);
      
      // Crittografa il valore
      const encrypted = encrypt(apiKey.value, ENCRYPTION_MASTER_KEY);
      
      // Salva su KV con chiave strutturata
      const kvKey = `api_key:${apiKey.name}`;
      const kvData = {
        name: apiKey.name,
        value: encrypted,
        category: apiKey.category,
        description: apiKey.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: USER_ID,
        tenantId: TENANT_ID,
        isActive: true
      };

      await kvRequest('SET', [kvKey, JSON.stringify(kvData)]);
      console.log(`✅ ${apiKey.name} aggiunto con successo`);
      
      // Aggiungi a lista user API keys
      await kvRequest('SADD', [`user_api_keys:${USER_ID}`, apiKey.name]);
      
      // Aggiungi a lista tenant API keys
      await kvRequest('SADD', [`tenant_api_keys:${TENANT_ID}`, apiKey.name]);
    }

    console.log('\n✅ Tutte le API keys sono state aggiunte al KV database!');
    console.log('\n🔍 Prossimi step:');
    console.log('1. Vai a: https://crm.doctorbed.app/developers/api-keys');
    console.log('2. Refresh la pagina (Cmd+R)');
    console.log('3. Le nuove API keys dovrebbero apparire nel dashboard');
    
  } catch (error) {
    console.error('\n❌ Errore:', error.message);
    process.exit(1);
  }
}

main();
