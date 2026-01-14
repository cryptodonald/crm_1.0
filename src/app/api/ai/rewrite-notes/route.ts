import { NextRequest, NextResponse } from 'next/server';
import { apiKeyService } from '@/lib/api-keys-service';

export async function POST(request: NextRequest) {
  try {
    const { notes, maxLength = 1000 } = await request.json();

    if (!notes || typeof notes !== 'string' || notes.trim().length === 0) {
      return NextResponse.json(
        { error: 'Note non valide' },
        { status: 400 }
      );
    }

    // Recupera la chiave OpenAI dal sistema API keys
    const openaiApiKey = await apiKeyService.getApiKey('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      console.error('❌ OPENAI_API_KEY non trovata nel sistema API keys');
      return NextResponse.json(
        { error: 'Servizio AI non configurato. Aggiungi la chiave OpenAI in /developers/api-keys' },
        { status: 500 }
      );
    }

    console.log('🤖 [AI Rewrite] Riscrittura note in corso...');
    console.log('📝 [AI Rewrite] Lunghezza originale:', notes.length);

    // Usa gpt-5.2 con formato input strutturato corretto
    const systemMessage = `Sei un assistente esperto specializzato nella gestione di CRM aziendali. Il tuo compito è riscrivere note disordinate in forma narrativa professionale.

CARATTERISTICHE DEL TUO OUTPUT:
- Formato narrativo e discorsivo (NON usare titoli in grassetto o bullet points)
- Scrivi in paragrafi scorrevoli come se stessi raccontando i fatti
- Linguaggio professionale ma naturale in italiano
- Inserisci le informazioni in modo fluido nel testo
- Tono neutro e oggettivo

NON aggiungere MAI:
- Titoli o intestazioni (es: **Esigenze**, **Contatto**, ecc.)
- Bullet points (•) o liste puntate
- Introduzioni o saluti
- Commenti meta sul processo
- Informazioni non presenti nelle note originali
- Interpretazioni o supposizioni`;

    const userMessage = `Riscrivi queste note in forma narrativa professionale.

**REGOLE:**
✓ Scrivi in paragrafi discorsivi, come se stessi raccontando i fatti in sequenza
✓ Non usare titoli, grassetto o bullet points
✓ Mantieni TUTTI i dettagli: nomi propri, numeri, date, orari, importi, quantità
✓ Formatta numeri e date in modo naturale (es: euro 1.500, 15 gennaio 2025)
✓ Rimani sotto i ${maxLength} caratteri
✓ Non inventare informazioni non presenti

**ESEMPIO:**
"Il cliente Mario Rossi ha chiamato oggi alle 15:30 per richiedere informazioni su materassi ortopedici. Ha spiegato di soffrire di mal di schiena e di essere interessato a un modello memory foam. Il budget indicativo è di circa 1.500 euro. Si è concordato di inviargli il catalogo via email e fissare un appuntamento in showroom per la prossima settimana."

**NOTE DA RISCRIVERE:**
${notes}`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.2',
        temperature: 0.3,
        max_output_tokens: 2000,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: systemMessage
              }
            ]
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: userMessage
              }
            ]
          }
        ]
      }),
    });

    const rawResponse = await response.text();
    if (!response.ok) {
      console.error('❌ [AI Rewrite] API Error:', rawResponse);
      throw new Error(`OpenAI API error: ${rawResponse}`);
    }

    const data = JSON.parse(rawResponse);
    console.log('📦 [AI Rewrite] Response data:', JSON.stringify(data, null, 2).substring(0, 500));

    // Estrazione robusta della risposta (con fallback)
    const rewrittenNotes = 
      data.output_text ?? 
      data.output?.[0]?.content?.[0]?.text ?? 
      notes;
    
    console.log('📝 [AI Rewrite] Rewritten notes:', rewrittenNotes.substring(0, 200) + '...');

    // Assicurati che non superi il maxLength
    const finalNotes = rewrittenNotes.length > maxLength
      ? rewrittenNotes.substring(0, maxLength - 3) + '...'
      : rewrittenNotes;

    console.log('✅ [AI Rewrite] Completato');
    console.log('📝 [AI Rewrite] Lunghezza originale:', notes.length, '-> Lunghezza finale:', finalNotes.length);
    console.log('🔄 [AI Rewrite] Changed:', notes !== finalNotes);

    return NextResponse.json({
      rewrittenNotes: finalNotes,
      originalLength: notes.length,
      newLength: finalNotes.length,
    });

  } catch (error) {
    console.error('❌ [AI Rewrite] Errore:', error);
    
    // Errori specifici di OpenAI
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Errore servizio AI', 
          details: error.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Errore durante la riscrittura delle note' },
      { status: 500 }
    );
  }
}
