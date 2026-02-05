import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';

/**
 * API Route: Parse Lead Text with AI
 * POST /api/ai/parse-lead-text
 * 
 * Estrae dati strutturati da testo libero usando OpenRouter AI
 */

interface ParseLeadRequest {
  text: string;
}

interface ParsedLeadData {
  Nome?: string;
  Cognome?: string;
  Telefono?: string;
  Email?: string;
  Città?: string;
  CAP?: number;
  Esigenza?: string;
  Note?: string;
}

interface ParseLeadResponse {
  success: boolean;
  data?: ParsedLeadData;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ParseLeadRequest = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json<ParseLeadResponse>(
        { success: false, error: 'Testo richiesto' },
        { status: 400 }
      );
    }

    // Controlla se OpenRouter è configurato
    if (!env.OPENROUTER_API_KEY) {
      console.warn('[parse-lead-text] OPENROUTER_API_KEY non configurato');
      return NextResponse.json<ParseLeadResponse>(
        { success: false, error: 'AI non configurata' },
        { status: 500 }
      );
    }

    // Prompt per estrarre dati strutturati
    const prompt = `Sei un assistente che estrae dati di contatto da testo non strutturato.

TESTO DA ANALIZZARE:
"""
${text}
"""

COMPITO:
Estrai i seguenti dati dal testo sopra e restituiscili in formato JSON:
- Nome (solo il nome, senza cognome)
- Cognome (se presente, altrimenti null)
- Telefono (formato: solo numeri, es: 3338012158)
- Email (in minuscolo)
- Città (nome della città, non CAP)
- CAP (codice postale numerico, se presente)
- Esigenza (descrizione breve della richiesta/problema/prodotto, max 200 caratteri)
- Note (altre informazioni utili, max 500 caratteri)

REGOLE:
- Se un campo non è presente nel testo, usa null
- Telefono: rimuovi spazi, trattini, parentesi (solo numeri)
- Email: converti in minuscolo
- Esigenza: sintetizza in modo chiaro (es: "Materasso per mal di schiena")
- Note: includi dettagli extra (tipo prodotto, opzioni, ecc.)
- CAP: deve essere un numero a 5 cifre (es: 47899)
- Città: se trovi un numero a 5 cifre nel campo città, quello è il CAP, non la città

FORMATO RISPOSTA (JSON valido):
{
  "Nome": "string o null",
  "Cognome": "string o null",
  "Telefono": "string o null",
  "Email": "string o null",
  "Città": "string o null",
  "CAP": number o null,
  "Esigenza": "string o null",
  "Note": "string o null"
}

Rispondi SOLO con il JSON, senza testo aggiuntivo.`;

    // Chiama OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.NEXTAUTH_URL || 'https://crm.doctorbed.it',
        'X-Title': 'Doctorbed CRM - Lead Text Parser',
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1, // Bassa per output deterministico
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[parse-lead-text] OpenRouter error:', response.status, errorText);
      
      let userMessage = 'Errore nel servizio AI';
      if (response.status === 401) {
        userMessage = 'API Key non valida';
      } else if (response.status === 429) {
        userMessage = 'Troppi tentativi, riprova tra poco';
      } else if (response.status >= 500) {
        userMessage = 'Servizio AI temporaneamente non disponibile';
      }
      
      return NextResponse.json<ParseLeadResponse>(
        { success: false, error: userMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content?.trim();

    if (!aiResponse) {
      console.error('[parse-lead-text] Empty AI response');
      return NextResponse.json<ParseLeadResponse>(
        { success: false, error: 'Risposta AI vuota' },
        { status: 500 }
      );
    }

    console.log('[parse-lead-text] AI response:', aiResponse);

    // Parse JSON response
    let parsedData: ParsedLeadData;
    try {
      parsedData = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('[parse-lead-text] JSON parse error:', parseError);
      console.error('[parse-lead-text] AI response was:', aiResponse);
      
      // Prova a estrarre JSON da markdown code block se presente
      const jsonMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          parsedData = JSON.parse(jsonMatch[1].trim());
        } catch {
          return NextResponse.json<ParseLeadResponse>(
            { success: false, error: 'Formato risposta AI non valido. Riprova o inserisci i dati manualmente.' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json<ParseLeadResponse>(
          { success: false, error: 'Impossibile interpretare la risposta AI. Riprova o inserisci i dati manualmente.' },
          { status: 500 }
        );
      }
    }

    // Validazione base - se non ci sono dati, restituisci oggetto vuoto (non errore)
    // Il frontend mostrerà un warning
    if (!parsedData.Nome && !parsedData.Telefono && !parsedData.Email) {
      console.log('[parse-lead-text] No valid data extracted from text');
      return NextResponse.json<ParseLeadResponse>({
        success: true,
        data: {}, // Oggetto vuoto - nessun dato estratto
      });
    }

    // Pulizia dati
    if (parsedData.Telefono) {
      parsedData.Telefono = parsedData.Telefono.replace(/[^\d]/g, ''); // Solo numeri
    }

    if (parsedData.Email) {
      parsedData.Email = parsedData.Email.toLowerCase().trim();
    }

    // Combina Nome e Cognome se entrambi presenti
    if (parsedData.Nome && parsedData.Cognome) {
      parsedData.Nome = `${parsedData.Nome} ${parsedData.Cognome}`;
    }

    // Remove Cognome (non serve nel form)
    delete (parsedData as any).Cognome;

    return NextResponse.json<ParseLeadResponse>({
      success: true,
      data: parsedData,
    });
  } catch (error) {
    console.error('[parse-lead-text] Error:', error);
    return NextResponse.json<ParseLeadResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Errore sconosciuto',
      },
      { status: 500 }
    );
  }
}
