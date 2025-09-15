import { kv } from '@vercel/kv';

// Chiavi KV per le configurazioni email
const EMAIL_KEYS = {
  RESEND_API_KEY: 'email:resend:api_key',
  EMAIL_FROM: 'email:config:from_address',
  EMAIL_ENABLED: 'email:config:enabled',
} as const;

/**
 * Recupera API key Resend da KV
 */
export async function getResendApiKey(): Promise<string | null> {
  try {
    const apiKey = await kv.get(EMAIL_KEYS.RESEND_API_KEY);
    
    if (!apiKey) {
      console.warn('⚠️ [EMAIL-KEYS] Resend API key not found in KV store');
      return null;
    }
    
    console.log('✅ [EMAIL-KEYS] Resend API key retrieved from KV');
    return apiKey as string;
    
  } catch (error) {
    console.error('❌ [EMAIL-KEYS] Error retrieving Resend API key:', error);
    return null;
  }
}

/**
 * Salva API key Resend in KV
 */
export async function setResendApiKey(apiKey: string): Promise<boolean> {
  try {
    if (!apiKey || !apiKey.startsWith('re_')) {
      throw new Error('Invalid Resend API key format');
    }
    
    await kv.set(EMAIL_KEYS.RESEND_API_KEY, apiKey);
    console.log('✅ [EMAIL-KEYS] Resend API key saved to KV');
    return true;
    
  } catch (error) {
    console.error('❌ [EMAIL-KEYS] Error saving Resend API key:', error);
    return false;
  }
}

/**
 * Recupera indirizzo FROM per le email
 */
export async function getEmailFromAddress(): Promise<string> {
  try {
    const fromAddress = await kv.get(EMAIL_KEYS.EMAIL_FROM);
    
    if (!fromAddress) {
      console.warn('⚠️ [EMAIL-KEYS] Email FROM address not set, using default');
      return 'CRM 1.0 <noreply@localhost>';
    }
    
    return fromAddress as string;
    
  } catch (error) {
    console.error('❌ [EMAIL-KEYS] Error retrieving email FROM address:', error);
    return 'CRM 1.0 <noreply@localhost>';
  }
}

/**
 * Imposta indirizzo FROM per le email
 */
export async function setEmailFromAddress(fromAddress: string): Promise<boolean> {
  try {
    if (!fromAddress || !fromAddress.includes('@')) {
      throw new Error('Invalid email FROM address format');
    }
    
    await kv.set(EMAIL_KEYS.EMAIL_FROM, fromAddress);
    console.log('✅ [EMAIL-KEYS] Email FROM address saved to KV');
    return true;
    
  } catch (error) {
    console.error('❌ [EMAIL-KEYS] Error saving email FROM address:', error);
    return false;
  }
}

/**
 * Verifica se il servizio email è abilitato
 */
export async function isEmailEnabled(): Promise<boolean> {
  try {
    const enabled = await kv.get(EMAIL_KEYS.EMAIL_ENABLED);
    
    if (enabled === null) {
      // Default: abilitato se c'è una API key valida
      const apiKey = await getResendApiKey();
      return apiKey !== null;
    }
    
    return enabled === 'true' || enabled === true;
    
  } catch (error) {
    console.error('❌ [EMAIL-KEYS] Error checking if email is enabled:', error);
    return false;
  }
}

/**
 * Abilita/disabilita servizio email
 */
export async function setEmailEnabled(enabled: boolean): Promise<boolean> {
  try {
    await kv.set(EMAIL_KEYS.EMAIL_ENABLED, enabled.toString());
    console.log(`✅ [EMAIL-KEYS] Email service ${enabled ? 'enabled' : 'disabled'}`);
    return true;
    
  } catch (error) {
    console.error('❌ [EMAIL-KEYS] Error setting email enabled status:', error);
    return false;
  }
}

/**
 * Verifica configurazione email completa
 */
export async function validateEmailConfiguration(): Promise<{
  valid: boolean;
  issues: string[];
  config: {
    hasApiKey: boolean;
    hasFromAddress: boolean;
    isEnabled: boolean;
  };
}> {
  const issues: string[] = [];
  const config = {
    hasApiKey: false,
    hasFromAddress: false,
    isEnabled: false,
  };
  
  try {
    // Verifica API key
    const apiKey = await getResendApiKey();
    config.hasApiKey = apiKey !== null && apiKey.startsWith('re_');
    if (!config.hasApiKey) {
      issues.push('Resend API key mancante o non valida');
    }
    
    // Verifica FROM address
    const fromAddress = await getEmailFromAddress();
    config.hasFromAddress = fromAddress !== 'CRM 1.0 <noreply@localhost>' && fromAddress.includes('@');
    if (!config.hasFromAddress) {
      issues.push('Indirizzo email FROM non configurato');
    }
    
    // Verifica se abilitato
    config.isEnabled = await isEmailEnabled();
    if (!config.isEnabled) {
      issues.push('Servizio email disabilitato');
    }
    
    const valid = issues.length === 0;
    
    console.log(`🔍 [EMAIL-KEYS] Configuration validation: ${valid ? 'VALID' : 'INVALID'}`);
    if (issues.length > 0) {
      console.log(`❌ [EMAIL-KEYS] Issues found: ${issues.join(', ')}`);
    }
    
    return { valid, issues, config };
    
  } catch (error) {
    console.error('❌ [EMAIL-KEYS] Error validating email configuration:', error);
    return {
      valid: false,
      issues: ['Errore nella validazione della configurazione'],
      config
    };
  }
}

/**
 * Configurazione iniziale email (per script di setup)
 */
export async function setupEmailConfiguration(apiKey: string, fromAddress: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log('🚀 [EMAIL-KEYS] Setting up email configuration...');
    
    // Salva API key
    const apiKeyResult = await setResendApiKey(apiKey);
    if (!apiKeyResult) {
      return { success: false, error: 'Failed to save Resend API key' };
    }
    
    // Salva FROM address
    const fromResult = await setEmailFromAddress(fromAddress);
    if (!fromResult) {
      return { success: false, error: 'Failed to save email FROM address' };
    }
    
    // Abilita servizio
    const enableResult = await setEmailEnabled(true);
    if (!enableResult) {
      return { success: false, error: 'Failed to enable email service' };
    }
    
    console.log('✅ [EMAIL-KEYS] Email configuration setup completed');
    return { success: true };
    
  } catch (error) {
    console.error('❌ [EMAIL-KEYS] Error setting up email configuration:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown setup error'
    };
  }
}

/**
 * Reset configurazione email (per testing/cleanup)
 */
export async function resetEmailConfiguration(): Promise<boolean> {
  try {
    console.log('🧹 [EMAIL-KEYS] Resetting email configuration...');
    
    await Promise.all([
      kv.del(EMAIL_KEYS.RESEND_API_KEY),
      kv.del(EMAIL_KEYS.EMAIL_FROM),
      kv.del(EMAIL_KEYS.EMAIL_ENABLED),
    ]);
    
    console.log('✅ [EMAIL-KEYS] Email configuration reset completed');
    return true;
    
  } catch (error) {
    console.error('❌ [EMAIL-KEYS] Error resetting email configuration:', error);
    return false;
  }
}