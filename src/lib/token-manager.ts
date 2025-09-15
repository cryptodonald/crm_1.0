import { kv } from '@vercel/kv';
import crypto from 'crypto';

export type TokenType = 'password-reset' | 'email-verification' | 'registration';

export interface TokenData {
  email: string;
  userId?: string;
  type: TokenType;
  createdAt: Date;
  expiresAt: Date;
  used?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Genera un token sicuro
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Genera chiave KV per token
 */
function getTokenKey(token: string, type: TokenType): string {
  return `token:${type}:${token}`;
}

/**
 * Salva token temporaneo in KV store
 */
export async function saveToken(
  token: string,
  data: Omit<TokenData, 'createdAt' | 'expiresAt'>,
  expirationMinutes: number = 60
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000);
  
  const tokenData: TokenData = {
    ...data,
    createdAt: now,
    expiresAt,
  };

  const key = getTokenKey(token, data.type);
  
  // Salva con TTL automatico (in secondi)
  await kv.setex(key, expirationMinutes * 60, JSON.stringify(tokenData));
  
  console.log(`💾 [TOKEN] Saved ${data.type} token for ${data.email}, expires in ${expirationMinutes}min`);
}

/**
 * Recupera e valida token
 */
export async function getToken(token: string, type: TokenType): Promise<TokenData | null> {
  try {
    const key = getTokenKey(token, type);
    const rawData = await kv.get(key);
    
    if (!rawData) {
      console.log(`❌ [TOKEN] Token not found: ${type}/${token.substring(0, 8)}...`);
      return null;
    }
    
    // KV a volte restituisce oggetto direttamente, a volte stringa
    let tokenData: TokenData;
    if (typeof rawData === 'string') {
      tokenData = JSON.parse(rawData) as TokenData;
    } else {
      tokenData = rawData as TokenData;
    }
    
    // Verifica scadenza (doppio controllo)
    const now = new Date();
    if (now > new Date(tokenData.expiresAt)) {
      console.log(`⏰ [TOKEN] Token expired: ${type}/${token.substring(0, 8)}...`);
      await deleteToken(token, type);
      return null;
    }
    
    // Verifica se già utilizzato
    if (tokenData.used) {
      console.log(`♻️ [TOKEN] Token already used: ${type}/${token.substring(0, 8)}...`);
      return null;
    }
    
    console.log(`✅ [TOKEN] Valid token found: ${type} for ${tokenData.email}`);
    return tokenData;
    
  } catch (error) {
    console.error('❌ [TOKEN] Error retrieving token:', error);
    return null;
  }
}

/**
 * Marca token come utilizzato
 */
export async function markTokenAsUsed(token: string, type: TokenType): Promise<boolean> {
  try {
    const tokenData = await getToken(token, type);
    
    if (!tokenData) {
      return false;
    }
    
    const updatedData: TokenData = {
      ...tokenData,
      used: true,
    };
    
    const key = getTokenKey(token, type);
    
    // Calcola TTL rimanente per mantenere la scadenza originale
    const now = new Date();
    const remainingSeconds = Math.max(0, Math.floor((new Date(tokenData.expiresAt).getTime() - now.getTime()) / 1000));
    
    if (remainingSeconds > 0) {
      await kv.setex(key, remainingSeconds, JSON.stringify(updatedData));
      console.log(`✅ [TOKEN] Marked as used: ${type}/${token.substring(0, 8)}...`);
    } else {
      await deleteToken(token, type);
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ [TOKEN] Error marking token as used:', error);
    return false;
  }
}

/**
 * Elimina token
 */
export async function deleteToken(token: string, type: TokenType): Promise<void> {
  try {
    const key = getTokenKey(token, type);
    await kv.del(key);
    console.log(`🗑️ [TOKEN] Deleted token: ${type}/${token.substring(0, 8)}...`);
  } catch (error) {
    console.error('❌ [TOKEN] Error deleting token:', error);
  }
}

/**
 * Pulisce tutti i token scaduti per un email (utility)
 */
export async function cleanupExpiredTokensForEmail(email: string): Promise<void> {
  // Implementazione opzionale per cleanup massivo
  // Per ora KV gestisce automaticamente la scadenza con TTL
  console.log(`🧹 [TOKEN] Cleanup requested for ${email} (handled by TTL)`);
}

/**
 * Crea token per reset password
 */
export async function createPasswordResetToken(email: string, userId?: string): Promise<string> {
  const token = generateSecureToken();
  
  await saveToken(token, {
    email,
    userId,
    type: 'password-reset',
  }, 60); // 1 ora di validità
  
  return token;
}

/**
 * Crea token per registrazione/verifica email
 */
export async function createRegistrationToken(email: string, metadata?: Record<string, any>): Promise<string> {
  const token = generateSecureToken();
  
  await saveToken(token, {
    email,
    type: 'registration',
    metadata,
  }, 24 * 60); // 24 ore di validità per registrazione
  
  return token;
}