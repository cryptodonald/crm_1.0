import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { notes, maxLength } = await request.json();

    if (!notes || typeof notes !== 'string') {
      return NextResponse.json(
        { error: 'Note non valide', details: 'Il campo note è obbligatorio' },
        { status: 400 }
      );
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    const USE_DEMO_MODE = false; // Cambia in true per testing senza API
    
    if (!OPENROUTER_API_KEY || USE_DEMO_MODE) {
      console.log('[AI Rewrite Notes] Using demo mode (OpenRouter disabled)');
      // Fallback: versione demo - formattazione base del testo
      const sentences = notes.trim().split(/[.!?]+/);
      const rewrittenSentences = sentences
        .filter(s => s.trim().length > 0)
        .map(s => {
          const trimmed = s.trim();
          return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
        });
      
      const demoRewrite = rewrittenSentences.join('. ') + '.';
      
      return NextResponse.json({
        success: true,
        rewrittenNotes: demoRewrite,
        originalLength: notes.length,
        newLength: demoRewrite.length,
        demo: true,
      });
    }

    // Prompt specifico per note attività
    const systemPrompt = `Sei un assistente che aiuta a riscrivere le note delle attività in un CRM in modo professionale.

Riscrivi il testo fornito seguendo queste regole:
1. Mantieni il contenuto CONCISO - NON aggiungere dettagli superflui o ovvi
2. Correggi grammatica e ortografia
3. Rendi il testo chiaro e ben strutturato
4. Usa un tono professionale ma accessibile
5. Mantieni la lunghezza simile all'originale (max ${maxLength} caratteri)
6. NON inventare informazioni che non sono nel testo originale
7. Se il testo contiene informazioni su risultati, esiti o prossimi passi, mantienili chiari e actionable

Rispondi SOLO con il testo riscritto, senza introduzioni, commenti o note aggiuntive.`;

    // Chiamata a OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'CRM 2.0 - Activity Notes Rewriter',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini', // Ottimo rapporto qualità/prezzo
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: notes,
          },
        ],
        temperature: 0.7,
        max_tokens: Math.min(Math.ceil(maxLength * 1.5), 1000), // Buffer per la riscrittura
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[AI Rewrite Notes] OpenRouter error:', errorData);
      throw new Error(errorData.error?.message || 'Errore nella chiamata a OpenRouter API');
    }

    const data = await response.json();
    const rewrittenNotes = data.choices?.[0]?.message?.content?.trim();

    if (!rewrittenNotes) {
      throw new Error('Nessun testo riscritto nella risposta');
    }

    // Tronca se supera maxLength
    const finalNotes = rewrittenNotes.length > maxLength 
      ? rewrittenNotes.substring(0, maxLength - 3) + '...'
      : rewrittenNotes;

    return NextResponse.json({
      success: true,
      rewrittenNotes: finalNotes,
      originalLength: notes.length,
      newLength: finalNotes.length,
    });

  } catch (error: any) {
    console.error('[AI Rewrite Notes] Error:', error);
    return NextResponse.json(
      { 
        error: 'Errore durante la riscrittura',
        details: error.message || 'Riprova più tardi'
      },
      { status: 500 }
    );
  }
}
