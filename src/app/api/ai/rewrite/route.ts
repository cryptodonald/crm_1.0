import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text, context, noteType } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const USE_DEMO_MODE = false; // Usa GPT-4o-mini
    
    if (!OPENROUTER_API_KEY || USE_DEMO_MODE) {
      console.log('[AI Rewrite] Using demo mode (OpenRouter disabled)');
      // Fallback: versione demo - formattazione base del testo
      const sentences = text.trim().split(/[.!?]+/);
      const rewrittenSentences = sentences
        .filter(s => s.trim().length > 0)
        .map(s => {
          const trimmed = s.trim();
          return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
        });
      
      const demoRewrite = rewrittenSentences.join('. ') + '.';
      
      return NextResponse.json({
        success: true,
        rewrittenText: demoRewrite,
        originalText: text,
        demo: true,
      });
    }

    // Definisci il prompt in base al contesto
    let systemPrompt = '';
    if (context === 'note') {
      const notePrompts: Record<string, string> = {
        Riflessione: 'Riscrivi il seguente testo come una riflessione professionale chiara e ben strutturata per un CRM. Mantieni il tono professionale ma accessibile. NON aggiungere dettagli superflui o ovvi. Mantieni la lunghezza simile all\'originale.',
        Promemoria: 'Riscrivi il seguente testo come un promemoria chiaro e actionable. Usa bullet points se necessario e assicurati che sia conciso. NON ampliare il contenuto, mantieni SOLO le informazioni essenziali.',
        'Follow-up': 'Riscrivi il seguente testo come una nota di follow-up professionale. Evidenzia le azioni da compiere e le tempistiche. NON aggiungere dettagli ovvi o introduzioni. Mantieni il focus sull\'essenziale.',
        'Info Cliente': 'Riscrivi il seguente testo come informazioni sul cliente ben organizzate e facili da leggere. Mantieni SOLO i fatti rilevanti. NON aggiungere supposizioni o dettagli superflui.'
      };
      systemPrompt = notePrompts[noteType] || 'Riscrivi il seguente testo in modo professionale e chiaro per una nota CRM. NON ampliare il contenuto.';
      systemPrompt += ' IMPORTANTE: correggi grammatica e ortografia, migliora la chiarezza, ma NON aggiungere informazioni che non sono nel testo originale. Mantieni la lunghezza simile. Rispondi SOLO con il testo riscritto, senza introduzioni o commenti.';
    } else if (context === 'esigenza_lead') {
      systemPrompt = `Sei un assistente che aiuta a riformulare le esigenze dei lead in modo professionale e chiaro.
Riscrivi il testo fornito rendendolo:
- Più professionale e conciso
- Chiaro e specifico
- Focalizzato sui bisogni del cliente
- Privo di errori grammaticali

Rispondi SOLO con il testo riscritto, senza introduzioni o spiegazioni.`;
    } else if (context === 'task_completo') {
      systemPrompt = `Sei un assistente che ottimizza task operativi mantenendoli CONCISI.
Riceverai un task con formato:
Titolo: [titolo attuale]
Descrizione: [descrizione attuale]

Regole IMPORTANTI:
1. TITOLO: verbo all'infinito + oggetto (max 6-8 parole). Esempi: "Chiamare CC Cover per ritardi ordini", "Inviare preventivo a Mario Rossi"
2. DESCRIZIONE: mantieni BREVE e DIRETTA. Correggi grammatica/ortografia, ma NON aggiungere dettagli superflui o ovvi. Max 1-2 frasi.
3. Se il testo originale è già chiaro, miglioralo minimamente senza appesantire.

Rispondi ESATTAMENTE in questo formato:
Titolo: [titolo ottimizzato]
Descrizione: [descrizione ottimizzata]

NON aggiungere introduzioni, note, o dettagli ovvi come "assicurarsi di annotare", "importante ottenere informazioni", ecc.`;
    } else {
      systemPrompt = 'Riscrivi il seguente testo in modo più chiaro e professionale. Rispondi SOLO con il testo riscritto.';
    }

    // Chiamata a OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'CRM 2.0 - Lead Rewriter',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // Migliore qualità/prezzo per riscrittura
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[AI Rewrite] OpenRouter error:', errorData);
      throw new Error('Failed to rewrite text with AI');
    }

    const data = await response.json();
    const rewrittenText = data.choices?.[0]?.message?.content?.trim();

    if (!rewrittenText) {
      throw new Error('No rewritten text in response');
    }

    return NextResponse.json({
      success: true,
      rewrittenText,
      originalText: text,
    });

  } catch (error: any) {
    console.error('[AI Rewrite] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to rewrite text',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
