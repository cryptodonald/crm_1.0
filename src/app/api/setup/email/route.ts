import { NextRequest, NextResponse } from 'next/server';
import { 
  setupEmailConfiguration, 
  validateEmailConfiguration,
  resetEmailConfiguration 
} from '@/lib/email-keys-service';
import { recordApiLatency, recordError } from '@/lib/performance-monitor';

interface SetupEmailRequest {
  apiKey: string;
  fromAddress: string;
}

/**
 * GET - Verifica configurazione email attuale
 */
export async function GET(request: NextRequest) {
  const requestStart = performance.now();
  
  try {
    console.log('🔍 [EMAIL-SETUP] Checking email configuration...');

    const validation = await validateEmailConfiguration();
    
    const totalTime = performance.now() - requestStart;
    recordApiLatency('email_setup_check', totalTime, false);

    console.log(`✅ [EMAIL-SETUP] Configuration check completed in ${totalTime.toFixed(2)}ms`);

    return NextResponse.json({
      success: true,
      configuration: validation,
      _timing: {
        total: Math.round(totalTime),
        cached: false,
      }
    });

  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    recordError('email_setup_check', errorMessage);
    recordApiLatency('email_setup_check', totalTime, false);
    
    console.error(`❌ [EMAIL-SETUP] Error checking configuration in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check email configuration',
        details: errorMessage,
        _timing: {
          total: Math.round(totalTime),
          cached: false,
        }
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Configura servizio email
 */
export async function POST(request: NextRequest) {
  const requestStart = performance.now();
  
  try {
    console.log('⚙️ [EMAIL-SETUP] Setting up email configuration...');

    const body: SetupEmailRequest = await request.json();
    const { apiKey, fromAddress } = body;

    // Validazione input
    if (!apiKey || !fromAddress) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'API key e indirizzo FROM sono richiesti' 
        },
        { status: 400 }
      );
    }

    if (!apiKey.startsWith('re_')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'API key Resend deve iniziare con "re_"' 
        },
        { status: 400 }
      );
    }

    if (!fromAddress.includes('@')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Indirizzo FROM deve essere un email valido' 
        },
        { status: 400 }
      );
    }

    // Configura email
    const result = await setupEmailConfiguration(apiKey, fromAddress);

    const totalTime = performance.now() - requestStart;
    recordApiLatency('email_setup', totalTime, false);

    if (result.success) {
      console.log(`✅ [EMAIL-SETUP] Email configuration completed in ${totalTime.toFixed(2)}ms`);

      // Verifica configurazione finale
      const validation = await validateEmailConfiguration();

      return NextResponse.json({
        success: true,
        message: 'Configurazione email completata con successo',
        configuration: validation,
        _timing: {
          total: Math.round(totalTime),
          cached: false,
        }
      });

    } else {
      console.error(`❌ [EMAIL-SETUP] Setup failed in ${totalTime.toFixed(2)}ms:`, result.error);
      
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Errore durante la configurazione email',
          _timing: {
            total: Math.round(totalTime),
            cached: false,
          }
        },
        { status: 500 }
      );
    }

  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    recordError('email_setup', errorMessage);
    recordApiLatency('email_setup', totalTime, false);
    
    console.error(`❌ [EMAIL-SETUP] Error in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Errore interno durante la configurazione',
        details: errorMessage,
        _timing: {
          total: Math.round(totalTime),
          cached: false,
        }
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Reset configurazione email
 */
export async function DELETE(request: NextRequest) {
  const requestStart = performance.now();
  
  try {
    console.log('🧹 [EMAIL-SETUP] Resetting email configuration...');

    const success = await resetEmailConfiguration();

    const totalTime = performance.now() - requestStart;
    recordApiLatency('email_setup_reset', totalTime, false);

    if (success) {
      console.log(`✅ [EMAIL-SETUP] Configuration reset completed in ${totalTime.toFixed(2)}ms`);

      return NextResponse.json({
        success: true,
        message: 'Configurazione email resettata con successo',
        _timing: {
          total: Math.round(totalTime),
          cached: false,
        }
      });

    } else {
      console.error(`❌ [EMAIL-SETUP] Reset failed in ${totalTime.toFixed(2)}ms`);
      
      return NextResponse.json(
        {
          success: false,
          error: 'Errore durante il reset della configurazione',
          _timing: {
            total: Math.round(totalTime),
            cached: false,
          }
        },
        { status: 500 }
      );
    }

  } catch (error) {
    const totalTime = performance.now() - requestStart;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    recordError('email_setup_reset', errorMessage);
    recordApiLatency('email_setup_reset', totalTime, false);
    
    console.error(`❌ [EMAIL-SETUP] Error resetting configuration in ${totalTime.toFixed(2)}ms:`, error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Errore interno durante il reset',
        details: errorMessage,
        _timing: {
          total: Math.round(totalTime),
          cached: false,
        }
      },
      { status: 500 }
    );
  }
}