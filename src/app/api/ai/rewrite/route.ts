/**
 * API Route: AI Text Rewrite
 * 
 * Riscrive testi usando OpenRouter (GPT-4 o modello configurato)
 * Usato per migliorare note di esigenza, note lead, ecc.
 */

import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Modelli disponibili su OpenRouter (configurabili)
const DEFAULT_MODEL = 'openai/gpt-4o-mini'; // Più economico e veloce

interface RewriteRequest {
  text: string;
  context?: 'esigenza_lead' | 'note_lead' | 'note_attivita' | 'generic';
  tone?: 'professional' | 'casual' | 'concise';
}

/**
 * POST /api/ai/rewrite
 * 
 * Body:
 * - text: string (testo da riscrivere)
 * - context: string (contesto: esigenza_lead, note_lead, etc.)
 * - tone: string (tono: professional, casual, concise)
 */
export async function POST(request: NextRequest) {
  try {
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { 
          error: 'OpenRouter API key not configured',
          details: 'OPENROUTER_API_KEY missing in environment variables'
        },
        { status: 500 }
      );
    }

    const body: RewriteRequest = await request.json();
    const { text, context = 'generic', tone = 'professional' } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Costruisci il prompt basato sul contesto
    const systemPrompt = getSystemPrompt(context, tone);
    const userPrompt = `Riscrivi il seguente testo migliorandolo:\n\n${text}`;

    // Chiamata a OpenRouter
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://crm.doctorbed.app',
        'X-Title': 'CRM Doctorbed - AI Rewrite',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[AI Rewrite] OpenRouter error:', errorData);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const rewrittenText = data.choices?.[0]?.message?.content?.trim();

    if (!rewrittenText) {
      throw new Error('No rewritten text received from OpenRouter');
    }

    return NextResponse.json({
      success: true,
      rewrittenText,
      originalLength: text.length,
      rewrittenLength: rewrittenText.length,
    });

  } catch (error: unknown) {
    console.error('[API] POST /api/ai/rewrite error:', error);
    return NextResponse.json(
      {
        error: 'Failed to rewrite text',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Costruisce il system prompt basato sul contesto
 */
function getSystemPrompt(context: string, tone: string): string {
  const basePrompt = 'Sei un assistente esperto nella riscrittura di testi per CRM aziendali.';
  
  let contextPrompt = '';
  switch (context) {
    case 'esigenza_lead':
      contextPrompt = 'Riscrivi l\'esigenza del cliente in forma COMPATTA e sintetica. RIASSUMI mantenendo SOLO i punti chiave. Massimo 2-3 frasi brevi. Elimina ridondanze e dettagli superflui. NON aggiungere informazioni.';
      break;
    case 'note_lead':
      contextPrompt = 'Riscrivi le note del lead in modo ultra-conciso. Mantieni solo le informazioni essenziali. Massimo 2-3 frasi.';
      break;
    case 'note_attivita':
      contextPrompt = 'Riscrivi le note dell\'attività in modo sintetico. Evidenzia solo azioni chiave e prossimi passi. Massimo 2-3 frasi.';
      break;
    default:
      contextPrompt = 'Riscrivi il testo in modo più chiaro e compatto.';
  }

  let tonePrompt = '';
  switch (tone) {
    case 'professional':
      tonePrompt = 'Tono professionale ma diretto.';
      break;
    case 'casual':
      tonePrompt = 'Tono informale appropriato.';
      break;
    case 'concise':
      tonePrompt = 'Massima sintesi. Solo informazioni essenziali.';
      break;
  }

  return `${basePrompt}\n\n${contextPrompt}\n${tonePrompt}\n\nREGOLE FERREE:\n1. NON INVENTARE nulla: usa ESCLUSIVAMENTE le informazioni presenti nel testo originale\n2. NON aggiungere dettagli, interpretazioni, ipotesi o informazioni nuove\n3. Riassumi e riorganizza il messaggio migliorando la leggibilità\n4. Mantieni TUTTI i particolari e i dati presenti nell'originale, senza perderne nessuno\n5. Elimina solo ripetizioni e riformulazioni ridondanti\n6. Massimo 2-3 frasi compatte\n7. Rispondi SOLO con il testo riscritto, senza introduzioni, commenti o formattazioni`;
}
