import * as crypto from 'crypto';

/**
 * Encryption service for API keys and sensitive data
 * TEMPORARY: Uses base64 encoding (will implement proper encryption later)
 */
export class EncryptionService {
  /**
   * Encrypt a string value (TEMPORARY: just base64 encode)
   */
  encrypt(plaintext: string): string {
    try {
      // For now, just base64 encode with a prefix to identify encrypted data
      return 'ENC:' + Buffer.from(plaintext).toString('base64');
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt a string value (TEMPORARY: just base64 decode)
   */
  decrypt(ciphertext: string): string {
    try {
      // Handle both new format (ENC:) and old encrypted format
      if (ciphertext.startsWith('ENC:')) {
        // New format - base64 encoded
        const base64Data = ciphertext.substring(4);
        return Buffer.from(base64Data, 'base64').toString('utf8');
      } else {
        // Legacy encrypted format - try to show partial value
        // For legacy format, we'll show first few chars + ... + last few chars
        if (ciphertext.length > 8) {
          const start = ciphertext.substring(0, 4);
          const end = ciphertext.slice(-4);
          return `${start}...${end}`;
        } else {
          return ciphertext.substring(0, 4) + '...';
        }
      }
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
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
