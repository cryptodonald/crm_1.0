import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { env } from '@/env';

/**
 * Encryption Helper (AES-256-GCM)
 * 
 * Used to encrypt/decrypt sensitive data stored in the database,
 * specifically Google OAuth tokens.
 * 
 * Format: iv:authTag:ciphertext (all base64 encoded)
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Derives a 32-byte key from ENCRYPTION_MASTER_KEY.
 * Accepts either a 32-byte hex string (64 chars) or a base64 string.
 */
function getKey(): Buffer {
  const masterKey = env.ENCRYPTION_MASTER_KEY;
  
  if (!masterKey) {
    throw new Error('ENCRYPTION_MASTER_KEY is not configured');
  }

  // Try hex first (64 hex chars = 32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(masterKey)) {
    return Buffer.from(masterKey, 'hex');
  }

  // Try base64 (44 chars base64 = 32 bytes)
  const b64Buffer = Buffer.from(masterKey, 'base64');
  if (b64Buffer.length === 32) {
    return b64Buffer;
  }

  // Fallback: use first 32 bytes of UTF-8 encoding
  const utf8Buffer = Buffer.from(masterKey, 'utf-8');
  if (utf8Buffer.length >= 32) {
    return utf8Buffer.subarray(0, 32);
  }

  throw new Error(
    'ENCRYPTION_MASTER_KEY must be at least 32 bytes. ' +
    'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
  );
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * 
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format "iv:authTag:ciphertext" (base64)
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, 'utf-8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted,
  ].join(':');
}

/**
 * Decrypts an encrypted string produced by encrypt().
 * 
 * @param encrypted - The encrypted string in format "iv:authTag:ciphertext"
 * @returns The original plaintext string
 * @throws If decryption fails (wrong key, tampered data, etc.)
 */
export function decrypt(encrypted: string): string {
  const key = getKey();
  const parts = encrypted.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format. Expected "iv:authTag:ciphertext".');
  }

  const [ivB64, authTagB64, ciphertext] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'base64', 'utf-8');
  decrypted += decipher.final('utf-8');

  return decrypted;
}
