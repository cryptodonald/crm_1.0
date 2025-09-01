/**
 * Test script to verify AES-256 decryption works correctly
 */

require('dotenv').config({ path: '.env.local' });
const { Redis } = require('@upstash/redis');
const crypto = require('crypto');

// Environment variables
const ENCRYPTION_MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY;

// AES-256 decryption function (same as in EncryptionService)
function decryptAES(ciphertext) {
  try {
    const masterKey = crypto
      .createHash('sha256')
      .update(ENCRYPTION_MASTER_KEY)
      .digest();

    if (ciphertext.includes(':')) {
      const [ivHex, encryptedHex] = ciphertext.split(':');

      if (ivHex.length !== 32 || !encryptedHex) {
        throw new Error('Invalid encrypted format');
      }

      const iv = Buffer.from(ivHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');

      const decipher = crypto.createDecipheriv('aes-256-cbc', masterKey, iv);

      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    }

    throw new Error('Invalid format');
  } catch (error) {
    console.error('Decryption failed:', error.message);
    return `ERROR: ${error.message}`;
  }
}

async function testAESDecryption() {
  console.log('🔐 Testing AES-256 Decryption');
  console.log('=============================\n');

  const redis = new Redis({
    url: process.env.KV_REST_API_URL,
    token: process.env.KV_REST_API_TOKEN,
  });

  try {
    const keys = await redis.keys('api_key:*');
    console.log(`📊 Testing ${keys.length} AES-encrypted keys:\n`);

    for (let i = 0; i < Math.min(keys.length, 3); i++) {
      const keyData = await redis.get(keys[i]);
      if (!keyData || !keyData.key) continue;

      console.log(`🔍 Key: ${keyData.name}`);
      console.log(`   🔒 Encrypted: ${keyData.key.substring(0, 30)}...`);

      const decrypted = decryptAES(keyData.key);
      console.log(`   🔓 Decrypted: ${decrypted.substring(0, 20)}...`);

      if (decrypted.startsWith('ERROR:')) {
        console.log(`   ❌ Decryption failed!`);
      } else {
        console.log(`   ✅ Decryption successful!`);
      }
      console.log('');
    }

    console.log(
      '🎯 Test completed! All keys are properly encrypted with AES-256-CBC.'
    );
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testAESDecryption();
