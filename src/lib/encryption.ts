import * as crypto from 'crypto';

/**
 * Encryption service for API keys and sensitive data
 * Uses AES-256-CBC encryption with ENCRYPTION_MASTER_KEY
 */
export class EncryptionService {
  private masterKey: Buffer;

  constructor() {
    // Get master key from environment
    const masterKeyString = process.env.ENCRYPTION_MASTER_KEY;
    if (!masterKeyString) {
      throw new Error('ENCRYPTION_MASTER_KEY environment variable is required');
    }

    // Derive AES-256 key from master key using SHA-256
    this.masterKey = crypto
      .createHash('sha256')
      .update(masterKeyString)
      .digest();
  }

  /**
   * Encrypt a string value using AES-256-CBC
   */
  encrypt(plaintext: string): string {
    try {
      // Generate random IV for each encryption
      const iv = crypto.randomBytes(16);

      // Create cipher with AES-256-CBC
      const cipher = crypto.createCipheriv('aes-256-cbc', this.masterKey, iv);

      // Encrypt the plaintext
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Return IV + encrypted data (format: iv:encrypted)
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt a string value - handles both new AES and legacy formats
   */
  decrypt(ciphertext: string): string {
    try {
      // Handle legacy base64 format for backward compatibility
      if (ciphertext.startsWith('ENC:')) {
        // Legacy base64 format - decode and return plaintext
        const base64Data = ciphertext.substring(4);
        const plaintext = Buffer.from(base64Data, 'base64').toString('utf8');
        return plaintext;
      }

      // Modern AES-256-CBC format (iv:encrypted)
      if (ciphertext.includes(':')) {
        const [ivHex, encryptedHex] = ciphertext.split(':');

        // Validate format
        if (ivHex.length !== 32 || !encryptedHex) {
          console.warn('Invalid AES format, showing preview');
          return this.createPreview(ciphertext);
        }

        try {
          const iv = Buffer.from(ivHex, 'hex');
          const encrypted = Buffer.from(encryptedHex, 'hex');

          // Create decipher
          const decipher = crypto.createDecipheriv(
            'aes-256-cbc',
            this.masterKey,
            iv
          );

          // Decrypt the data
          let decrypted = decipher.update(encrypted, undefined, 'utf8');
          decrypted += decipher.final('utf8');

          return decrypted;
        } catch (aesError) {
          console.error('AES decryption failed:', aesError);
          // If AES fails, show preview instead of throwing
          return this.createPreview(ciphertext);
        }
      }

      // Unknown format - show partial preview for safety
      return this.createPreview(ciphertext);
    } catch (error) {
      console.error('Decryption failed:', error);
      return this.createPreview(ciphertext);
    }
  }

  /**
   * Create a safe preview of encrypted data
   */
  private createPreview(ciphertext: string): string {
    if (ciphertext.length > 8) {
      const start = ciphertext.substring(0, 4);
      const end = ciphertext.slice(-4);
      return `${start}...${end}`;
    } else {
      return ciphertext.substring(0, 4) + '...';
    }
  }

  /**
   * Create a masked version of an API key for display
   */
  maskApiKey(apiKey: string, visibleChars: number = 4): string {
    if (!apiKey || apiKey.length <= visibleChars) {
      return '***';
    }

    const visible = apiKey.slice(-visibleChars);
    const masked = '*'.repeat(Math.max(8, apiKey.length - visibleChars));

    return `${masked}${visible}`;
  }

  /**
   * Generate a secure random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash a value using SHA-256
   */
  hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  /**
   * Validate if a string looks like an encrypted value
   */
  isEncrypted(value: string): boolean {
    try {
      const buffer = Buffer.from(value, 'base64');
      const combined = buffer.toString();
      return combined.includes(':') && combined.length > 32;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const encryptionService = new EncryptionService();
