/**
 * Migration script to upgrade existing Base64 keys to AES-256 encryption
 * Run with: node migrate-to-aes.js
 */

require('dotenv').config({ path: '.env.local' });
const { Redis } = require('@upstash/redis');
const crypto = require('crypto');

// Environment variables
const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;
const ENCRYPTION_MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY;

// AES-256 encryption function (same as in EncryptionService)
function encryptAES(plaintext) {
  try {
    const masterKey = crypto.createHash('sha256').update(ENCRYPTION_MASTER_KEY).digest();
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv('aes-256-cbc', masterKey, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

// Base64 decryption function
function decryptBase64(ciphertext) {
  if (ciphertext.startsWith('ENC:')) {
    const base64Data = ciphertext.substring(4);
    return Buffer.from(base64Data, 'base64').toString('utf8');
  }
  throw new Error('Not a Base64 encrypted value');
}

async function migrateToAES() {
  console.log('🔄 Migrating keys from Base64 to AES-256 encryption...');
  console.log('===============================================\n');

  if (!KV_REST_API_URL || !KV_REST_API_TOKEN || !ENCRYPTION_MASTER_KEY) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
  }

  const redis = new Redis({
    url: KV_REST_API_URL,
    token: KV_REST_API_TOKEN,
  });

  try {
    // Get all API keys
    const keys = await redis.keys('api_key:*');
    console.log(`📊 Found ${keys.length} API keys to analyze\n`);

    let base64Count = 0;
    let aesCount = 0;
    let migratedCount = 0;
    let errorCount = 0;

    for (const keyId of keys) {
      try {
        const keyData = await redis.get(keyId);
        if (!keyData || !keyData.key) {
          console.log(`⏭️  Skipping ${keyId} (no key data)`);
          continue;
        }

        console.log(`🔍 Analyzing: ${keyData.name}`);
        console.log(`   Current format: ${keyData.key.substring(0, 20)}...`);

        if (keyData.key.startsWith('ENC:')) {
          // This is Base64 format - migrate to AES
          console.log(`   📤 Migrating from Base64 to AES-256...`);
          
          try {
            // Decrypt the Base64 value
            const plaintext = decryptBase64(keyData.key);
            
            // Encrypt with AES-256
            const aesEncrypted = encryptAES(plaintext);
            
            // Update the key data
            keyData.key = aesEncrypted;
            keyData.updatedAt = new Date();
            keyData.encryptionFormat = 'AES-256-CBC';
            keyData.migratedToAES = new Date();
            
            // Save back to KV
            await redis.set(keyId, keyData);
            
            console.log(`   ✅ Successfully migrated to: ${aesEncrypted.substring(0, 20)}...`);
            migratedCount++;
            base64Count++;
            
          } catch (migrationError) {
            console.error(`   ❌ Migration failed:`, migrationError.message);
            errorCount++;
          }
          
        } else if (keyData.key.includes(':')) {
          // Already AES format
          console.log(`   ✅ Already AES-256 encrypted`);
          aesCount++;
          
        } else {
          // Unknown format
          console.log(`   ⚠️  Unknown format, leaving as-is`);
        }

        console.log(''); // Empty line for readability

      } catch (error) {
        console.error(`❌ Error processing ${keyId}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log('🎉 Migration completed!');
    console.log('======================');
    console.log(`📊 Total keys analyzed: ${keys.length}`);
    console.log(`🔄 Base64 keys found: ${base64Count}`);
    console.log(`🔐 AES keys found: ${aesCount}`);  
    console.log(`✅ Successfully migrated: ${migratedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (migratedCount > 0) {
      console.log('\n🎯 All Base64 keys have been upgraded to AES-256-CBC encryption!');
      console.log('🌐 Test your dashboard: http://localhost:3000/developers/api-keys');
      console.log('🚀 Deploy to production to apply the changes');
    }

  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
migrateToAES()
  .then(() => {
    console.log('\n✨ Migration script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
  });
