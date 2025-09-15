import { NextRequest, NextResponse } from 'next/server';
import { 
  validateEmailConfiguration, 
  getResendApiKey, 
  getEmailFromAddress, 
  isEmailEnabled,
  setResendApiKey,
  setEmailFromAddress,
  setEmailEnabled
} from '@/lib/email-keys-service';

/**
 * GET - Recupera configurazione email corrente
 */
export async function GET() {
  try {
    console.log('🔍 [EMAIL-CONFIG] Retrieving email configuration...');
    
    const validation = await validateEmailConfiguration();
    
    return NextResponse.json({
      success: true,
      configuration: validation,
      message: 'Configurazione email recuperata con successo'
    });
    
  } catch (error) {
    console.error('❌ [EMAIL-CONFIG] Error retrieving email configuration:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nel recupero della configurazione email'
    }, { status: 500 });
  }
}

/**
 * PUT - Aggiorna configurazione email
 */
export async function PUT(request: NextRequest) {
  try {
    console.log('⚙️ [EMAIL-CONFIG] Updating email configuration...');
    
    const body = await request.json();
    const { action, apiKey, fromAddress, enabled } = body;
    
    if (!action) {
      return NextResponse.json({
        success: false,
        error: 'Campo action richiesto'
      }, { status: 400 });
    }
    
    let result = false;
    let message = '';
    
    switch (action) {
      case 'update_api_key':
        if (!apiKey) {
          return NextResponse.json({
            success: false,
            error: 'API key richiesta'
          }, { status: 400 });
        }
        
        if (!apiKey.startsWith('re_')) {
          return NextResponse.json({
            success: false,
            error: 'API key Resend deve iniziare con "re_"'
          }, { status: 400 });
        }
        
        result = await setResendApiKey(apiKey);
        message = result ? 'API key Resend aggiornata con successo' : 'Errore aggiornamento API key';
        break;
        
      case 'update_from_address':
        if (!fromAddress) {
          return NextResponse.json({
            success: false,
            error: 'Indirizzo FROM richiesto'
          }, { status: 400 });
        }
        
        if (!fromAddress.includes('@')) {
          return NextResponse.json({
            success: false,
            error: 'Indirizzo email non valido'
          }, { status: 400 });
        }
        
        result = await setEmailFromAddress(fromAddress);
        message = result ? 'Indirizzo FROM aggiornato con successo' : 'Errore aggiornamento indirizzo FROM';
        break;
        
      case 'toggle_enabled':
        if (typeof enabled !== 'boolean') {
          return NextResponse.json({
            success: false,
            error: 'Campo enabled deve essere boolean'
          }, { status: 400 });
        }
        
        result = await setEmailEnabled(enabled);
        message = result 
          ? `Servizio email ${enabled ? 'abilitato' : 'disabilitato'} con successo`
          : 'Errore modifica stato servizio email';
        break;
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Azione non valida'
        }, { status: 400 });
    }
    
    if (!result) {
      return NextResponse.json({
        success: false,
        error: message
      }, { status: 500 });
    }
    
    // Restituisci configurazione aggiornata
    const updatedConfig = await validateEmailConfiguration();
    
    console.log(`✅ [EMAIL-CONFIG] Email configuration updated: ${action}`);
    
    return NextResponse.json({
      success: true,
      message,
      configuration: updatedConfig
    });
    
  } catch (error) {
    console.error('❌ [EMAIL-CONFIG] Error updating email configuration:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore interno del server'
    }, { status: 500 });
  }
}

/**
 * PATCH - Recupera valori attuali (senza mostrare chiavi sensibili)
 */
export async function PATCH() {
  try {
    console.log('👀 [EMAIL-CONFIG] Retrieving current email values...');
    
    const fromAddress = await getEmailFromAddress();
    const enabled = await isEmailEnabled();
    const hasApiKey = (await getResendApiKey()) !== null;
    
    return NextResponse.json({
      success: true,
      values: {
        fromAddress,
        enabled,
        hasApiKey,
        // Non restituiamo mai la API key per sicurezza
        apiKeyStatus: hasApiKey ? 'Configurata (nascosta per sicurezza)' : 'Non configurata'
      }
    });
    
  } catch (error) {
    console.error('❌ [EMAIL-CONFIG] Error retrieving email values:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Errore nel recupero dei valori'
    }, { status: 500 });
  }
}