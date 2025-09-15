import { Resend } from 'resend';
import { getResendApiKey, getEmailFromAddress, isEmailEnabled } from './email-keys-service';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailOptions {
  to: string;
  template: EmailTemplate;
  from?: string;
}

/**
 * Crea istanza Resend con API key da KV
 */
async function createResendClient(): Promise<Resend | null> {
  try {
    const apiKey = await getResendApiKey();
    
    if (!apiKey) {
      console.error('❌ [EMAIL] Resend API key not found in KV store');
      return null;
    }
    
    return new Resend(apiKey);
  } catch (error) {
    console.error('❌ [EMAIL] Error creating Resend client:', error);
    return null;
  }
}

/**
 * Template per email di reset password
 */
export function createPasswordResetTemplate(resetLink: string, userName: string): EmailTemplate {
  return {
    subject: 'Reset Password - CRM 1.0',
    html: `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <title>Reset Password - CRM 1.0</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #000;
            background-color: #fff;
            margin: 0;
            padding: 20px;
          }
          
          @media (prefers-color-scheme: dark) {
            body { color: #fff; background-color: #000; }
            .container { background-color: #111 !important; border-color: #333 !important; }
            .header { border-color: #333 !important; }
            .content { color: #fff; }
            .muted { color: #999 !important; }
            .border { border-color: #333 !important; }
            .button { background-color: #333 !important; color: #fff !important; border: 1px solid #555; }
            .code { background-color: #222; color: #fff; }
          }
          
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #fff;
            border: 1px solid #eee;
            border-radius: 4px;
          }
          
          .header {
            padding: 24px;
            border-bottom: 1px solid #eee;
            text-align: center;
          }
          
          .header h1 {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
          }
          
          .content {
            padding: 24px;
          }
          
          .content h2 {
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 16px 0;
          }
          
          .content p {
            margin: 0 0 16px 0;
            font-size: 14px;
          }
          
          .button {
            display: inline-block;
            background-color: #000;
            color: #fff;
            text-decoration: none;
            padding: 10px 16px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            margin: 16px 0;
          }
          
          .muted {
            color: #666;
            font-size: 12px;
          }
          
          .border {
            border-top: 1px solid #eee;
            padding-top: 16px;
            margin-top: 16px;
          }
          
          .footer {
            padding: 16px 24px;
            border-top: 1px solid #eee;
            text-align: center;
          }
          
          .code {
            font-family: monospace;
            background-color: #f5f5f5;
            padding: 8px;
            border-radius: 2px;
            font-size: 13px;
            word-break: break-all;
            margin: 8px 0;
            display: block;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CRM 1.0 - Reset Password</h1>
          </div>
          <div class="content">
            <h2>Ciao ${userName},</h2>
            <p>Hai richiesto di resettare la password per il tuo account.</p>
            <p>Clicca sul pulsante qui sotto per impostare una nuova password:</p>
            
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Reimposta Password</a>
            </div>
            
            <div class="border">
              <p><strong>Importante:</strong></p>
              <p class="muted">Questo link è valido per 1 ora e può essere utilizzato una sola volta. Se non hai richiesto questo reset, ignora questa email.</p>
            </div>
            
            <p>Se il pulsante non funziona, copia questo link:</p>
            <div class="code">${resetLink}</div>
          </div>
          <div class="footer">
            <p class="muted">CRM 1.0 © 2024</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Reset Password - CRM 1.0

Ciao ${userName},

Hai richiesto di resettare la password per il tuo account.

Clicca su questo link per impostare una nuova password:
${resetLink}

Importante:
- Questo link è valido per 1 ora
- Può essere utilizzato una sola volta
- Se non hai richiesto questo reset, ignora questa email

---
CRM 1.0 © 2024
    `
  };
}

/**
 * Template per email di registrazione
 */
export function createInviteTemplate(activationLink: string, userName: string, invitedBy: string): EmailTemplate {
  return {
    subject: 'Invito CRM 1.0 - Imposta la tua password',
    html: `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta name="color-scheme" content="light dark">
        <meta name="supported-color-schemes" content="light dark">
        <title>Invito CRM 1.0</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #000;
            background-color: #fff;
            margin: 0;
            padding: 20px;
          }
          
          @media (prefers-color-scheme: dark) {
            body { color: #fff; background-color: #000; }
            .container { background-color: #111 !important; border-color: #333 !important; }
            .header { border-color: #333 !important; }
            .content { color: #fff; }
            .muted { color: #999 !important; }
            .border { border-color: #333 !important; }
            .button { background-color: #333 !important; color: #fff !important; border: 1px solid #555; }
            .code { background-color: #222; color: #fff; }
          }
          
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #fff;
            border: 1px solid #eee;
            border-radius: 4px;
          }
          
          .header {
            padding: 24px;
            border-bottom: 1px solid #eee;
            text-align: center;
          }
          
          .header h1 {
            font-size: 18px;
            font-weight: 600;
            margin: 0;
          }
          
          .content {
            padding: 24px;
          }
          
          .content h2 {
            font-size: 16px;
            font-weight: 600;
            margin: 0 0 16px 0;
          }
          
          .content p {
            margin: 0 0 16px 0;
            font-size: 14px;
          }
          
          .button {
            display: inline-block;
            background-color: #000;
            color: #fff;
            text-decoration: none;
            padding: 10px 16px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            margin: 16px 0;
          }
          
          .muted {
            color: #666;
            font-size: 12px;
          }
          
          .border {
            border-top: 1px solid #eee;
            padding-top: 16px;
            margin-top: 16px;
          }
          
          .footer {
            padding: 16px 24px;
            border-top: 1px solid #eee;
            text-align: center;
          }
          
          .code {
            font-family: monospace;
            background-color: #f5f5f5;
            padding: 8px;
            border-radius: 2px;
            font-size: 13px;
            word-break: break-all;
            margin: 8px 0;
            display: block;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>CRM 1.0 - Invito</h1>
          </div>
          <div class="content">
            <h2>Ciao ${userName},</h2>
            <p>Sei stato invitato da <strong>${invitedBy}</strong> a partecipare al CRM 1.0.</p>
            <p>Clicca sul pulsante qui sotto per impostare la tua password e accedere al sistema:</p>
            
            <div style="text-align: center;">
              <a href="${activationLink}" class="button">Imposta Password</a>
            </div>
            
            <div class="border">
              <p><strong>Prossimi passi:</strong></p>
              <p class="muted">1. Clicca sul link sopra<br>2. Crea una password sicura<br>3. Accedi al CRM</p>
            </div>
            
            <p>Se il pulsante non funziona, copia questo link:</p>
            <div class="code">${activationLink}</div>
            
            <p class="muted">Questo link è valido per 24 ore.</p>
          </div>
          <div class="footer">
            <p class="muted">CRM 1.0 © 2024</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Invito CRM 1.0

Ciao ${userName},

Sei stato invitato da ${invitedBy} a partecipare al CRM 1.0.

Clicca su questo link per impostare la tua password:
${activationLink}

Prossimi passi:
1. Clicca sul link sopra
2. Crea una password sicura
3. Accedi al CRM

Questo link è valido per 24 ore.

---
CRM 1.0 © 2024
    `
  };
}

/**
 * Invia email usando Resend con configurazione da KV
 */
export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    console.log(`📧 [EMAIL] Attempting to send email to ${options.to}...`);

    // Verifica se il servizio email è abilitato
    const emailEnabled = await isEmailEnabled();
    if (!emailEnabled) {
      console.warn('⚠️ [EMAIL] Email service is disabled');
      return {
        success: false,
        error: 'Email service is disabled'
      };
    }

    // Crea client Resend
    const resend = await createResendClient();
    if (!resend) {
      return {
        success: false,
        error: 'Email service not properly configured'
      };
    }

    // Ottieni indirizzo FROM
    const fromEmail = options.from || await getEmailFromAddress();

    console.log(`📬 [EMAIL] Sending from ${fromEmail} to ${options.to}`);
    console.log(`📋 [EMAIL] Subject: ${options.template.subject}`);

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.template.subject,
      html: options.template.html,
      text: options.template.text,
    });

    if (error) {
      console.error('❌ [EMAIL] Resend error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }

    console.log(`✅ [EMAIL] Email sent successfully to ${options.to} (ID: ${data?.id})`);

    return {
      success: true,
      messageId: data?.id
    };

  } catch (error) {
    console.error('❌ [EMAIL] Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown email error'
    };
  }
}

/**
 * Invia email di reset password
 */
export async function sendPasswordResetEmail(
  email: string,
  userName: string,
  resetToken: string,
  baseUrl: string
): Promise<{ success: boolean; error?: string }> {
  const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
  const template = createPasswordResetTemplate(resetLink, userName);
  
  console.log(`🔑 [EMAIL] Preparing password reset email for ${email}`);
  
  const result = await sendEmail({
    to: email,
    template,
  });

  if (result.success) {
    console.log(`✅ [EMAIL] Password reset email sent to ${email}`);
  } else {
    console.error(`❌ [EMAIL] Failed to send password reset to ${email}:`, result.error);
  }

  return result;
}

/**
 * Invia email di registrazione
 */
export async function sendRegistrationEmail(
  email: string,
  userName: string,
  registrationToken: string,
  baseUrl: string
): Promise<{ success: boolean; error?: string }> {
  const activationLink = `${baseUrl}/register/activate?token=${registrationToken}`;
  const template = createRegistrationTemplate(activationLink, userName);
  
  console.log(`🎉 [EMAIL] Preparing registration email for ${email}`);
  
  const result = await sendEmail({
    to: email,
    template,
  });

  if (result.success) {
    console.log(`✅ [EMAIL] Registration email sent to ${email}`);
  } else {
    console.error(`❌ [EMAIL] Failed to send registration email to ${email}:`, result.error);
  }

  return result;
}

/**
 * Utility per ottenere base URL dal request
 */
export function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}