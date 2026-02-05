/**
 * Webhook endpoint per nuovi lead creati su Airtable
 * Inferisce automaticamente il Gender se mancante
 */

import { NextRequest, NextResponse } from 'next/server';
import Airtable from 'airtable';
import { inferGenderFromName } from '@/lib/infer-gender';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY! }).base(
  process.env.AIRTABLE_BASE_ID!
);

// Secret per validare che la richiesta venga da Airtable
const WEBHOOK_SECRET = process.env.AIRTABLE_WEBHOOK_SECRET || 'change-me-in-production';

interface AirtableWebhookPayload {
  recordId: string;
  fields: {
    Nome?: string;
    Cognome?: string;
    Gender?: string;
    [key: string]: any;
  };
}

export async function POST(request: NextRequest) {
  try {
    // 1. Validazione autenticazione webhook
    const authHeader = request.headers.get('x-webhook-secret');
    if (authHeader !== WEBHOOK_SECRET) {
      console.warn('⚠️ Webhook call with invalid secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse payload
    const payload: AirtableWebhookPayload = await request.json();
    console.log('📥 Webhook ricevuto per lead:', payload.recordId);

    const { recordId, fields } = payload;

    // 3. Verifica se Gender è già popolato
    if (fields.Gender && fields.Gender.trim() !== '') {
      console.log('✅ Gender già presente, skip');
      return NextResponse.json({ 
        success: true, 
        message: 'Gender already set',
        recordId 
      });
    }

    // 4. Verifica che ci sia un Nome
    const nome = fields.Nome?.trim();
    if (!nome) {
      console.log('⚠️ Nome mancante, impossibile inferire gender');
      return NextResponse.json({
        success: true,
        message: 'No name provided, cannot infer gender',
        recordId,
      });
    }

    // 5. Inferisci gender usando AI
    console.log(`🤖 Inferisco gender per nome: "${nome}"`);
    const result = await inferGenderFromName(nome);

    if (!result.gender) {
      console.log(`⚠️ Impossibile inferire gender (confidence: ${result.confidence})`);
      return NextResponse.json({
        success: true,
        message: 'Could not infer gender',
        recordId,
        reasoning: result.reasoning,
      });
    }

    console.log(`✅ Gender inferito: ${result.gender} (confidence: ${result.confidence})`);

    // 6. Aggiorna record su Airtable
    try {
      await base(process.env.AIRTABLE_LEADS_TABLE_ID!).update(recordId, {
        Gender: result.gender,
      });

      console.log(`✅ Gender aggiornato su Airtable per lead ${recordId}`);

      return NextResponse.json({
        success: true,
        message: 'Gender inferred and updated',
        recordId,
        gender: result.gender,
        confidence: result.confidence,
        reasoning: result.reasoning,
      });
    } catch (updateError) {
      console.error('❌ Errore aggiornamento Airtable:', updateError);
      return NextResponse.json(
        {
          error: 'Failed to update Airtable',
          details: updateError instanceof Error ? updateError.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Errore webhook:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Opzionale: endpoint GET per verificare che il webhook sia attivo
export async function GET() {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/webhooks/airtable/new-lead',
    description: 'Webhook per auto-inferire Gender sui nuovi lead',
  });
}
