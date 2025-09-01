/**
 * Migration script to import existing API keys from environment variables into KV database
 * Run with: node scripts/migrate-api-keys.js
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { kv } = require('@vercel/kv');
const { nanoid } = require('nanoid');

// Import encryption service (we'll need to adapt for Node.js)
const crypto = require('crypto');

// Environment variables
const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;
const ENCRYPTION_MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY;
const CURRENT_USER_ID = process.env.CURRENT_USER_ID || 'user_admin_001';
const CURRENT_TENANT_ID = process.env.CURRENT_TENANT_ID || 'tenant_doctorbed';

// Simplified encryption for migration using modern Node.js crypto API
function encrypt(text) {
  try {
    const key = crypto
      .createHash('sha256')
      .update(ENCRYPTION_MASTER_KEY)
      .digest();
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV + encrypted data (format compatible with our system)
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

// API Keys to migrate from .env.local
const apiKeysToMigrate = [
  {
    name: 'Vercel Blob Storage',
    key: process.env.BLOB_READ_WRITE_TOKEN,
    description: 'Vercel Blob Storage read/write token for file uploads',
    permissions: ['read', 'write'],
    service: 'vercel-blob',
  },
  {
    name: 'Airtable CRM API',
    key: process.env.AIRTABLE_API_KEY,
    description: 'Airtable API key for CRM data synchronization',
    permissions: ['read', 'write'],
    service: 'airtable',
  },
  {
    name: 'WhatsApp Business API',
    key: process.env.WHATSAPP_ACCESS_TOKEN,
    description: 'WhatsApp Business API access token for messaging',
    permissions: ['read', 'write'],
    service: 'whatsapp',
  },
  {
    name: 'GitHub Integration',
    key: process.env.GITHUB_TOKEN,
    description: 'GitHub personal access token for repository integration',
    permissions: ['read', 'write'],
    service: 'github',
  },
  {
    name: 'Google Maps API',
    key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    description: 'Google Maps API key for location services',
    permissions: ['read'],
    service: 'google-maps',
  },
];

// KV key prefixes (same as in kv.ts)
const KV_PREFIXES = {
  API_KEY: 'api_key:',
  USER_API_KEYS: 'user_api_keys:',
  TENANT_API_KEYS: 'tenant_api_keys:',
};

async function migrateApiKeys() {
  console.log('🚀 Starting API Keys migration...');
  console.log(`📊 Found ${apiKeysToMigrate.length} API keys to migrate`);

  let migrated = 0;
  let skipped = 0;

  for (const apiKeyConfig of apiKeysToMigrate) {
    try {
      // Skip if key is not defined or empty
      if (!apiKeyConfig.key || apiKeyConfig.key.trim() === '') {
        console.log(`⏭️  Skipping ${apiKeyConfig.name} (no key found)`);
        skipped++;
        continue;
      }

      // Generate API key data
      const apiKeyData = {
        id: nanoid(),
        name: apiKeyConfig.name,
        key: encrypt(apiKeyConfig.key), // Encrypt the API key
        userId: CURRENT_USER_ID,
        tenantId: CURRENT_TENANT_ID,
        permissions: apiKeyConfig.permissions,
        isActive: true,
        lastUsed: undefined,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: undefined,
        description: apiKeyConfig.description,
        ipWhitelist: undefined,
        // Additional metadata
        service: apiKeyConfig.service,
        migratedFrom: 'env_local',
        migratedAt: new Date(),
      };

      console.log(`📝 Migrating: ${apiKeyConfig.name}...`);

      // Store in KV
      const keyId = `${KV_PREFIXES.API_KEY}${apiKeyData.id}`;
      await kv.set(keyId, apiKeyData);

      // Add to user's API keys list
      const userKeysId = `${KV_PREFIXES.USER_API_KEYS}${apiKeyData.userId}`;
      await kv.sadd(userKeysId, apiKeyData.id);

      // Add to tenant's API keys list
      const tenantKeysId = `${KV_PREFIXES.TENANT_API_KEYS}${apiKeyData.tenantId}`;
      await kv.sadd(tenantKeysId, apiKeyData.id);

      console.log(
        `✅ Successfully migrated: ${apiKeyConfig.name} (ID: ${apiKeyData.id})`
      );
      migrated++;
    } catch (error) {
      console.error(`❌ Failed to migrate ${apiKeyConfig.name}:`, error);
    }
  }

  console.log('\n🎉 Migration completed!');
  console.log(`✅ Successfully migrated: ${migrated} API keys`);
  console.log(`⏭️  Skipped: ${skipped} API keys`);
  console.log(
    '\n📊 You can now view them in the dashboard at: http://localhost:3000/developers/api-keys'
  );
}

// Check if required environment variables are set
if (!KV_REST_API_URL || !KV_REST_API_TOKEN || !ENCRYPTION_MASTER_KEY) {
  console.error('❌ Missing required environment variables:');
  if (!KV_REST_API_URL) console.error('  - KV_REST_API_URL');
  if (!KV_REST_API_TOKEN) console.error('  - KV_REST_API_TOKEN');
  if (!ENCRYPTION_MASTER_KEY) console.error('  - ENCRYPTION_MASTER_KEY');
  process.exit(1);
}

// Run migration
migrateApiKeys()
  .then(() => {
    console.log('🎯 Migration script completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
