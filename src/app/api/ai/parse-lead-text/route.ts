/**
 * API Route: AI Parse Lead Text
 * 
 * Estrae automaticamente dati strutturati di un lead da testo libero
 * usando OpenRouter (GPT-4 o modello configurato)
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { env } from '@/env';

// OpenRouter configurato come OpenAI-compatible endpoint
const openai = new OpenAI({
  apiKey: env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': env.NEXTAUTH_URL,
    'X-Title': 'CRM Doctorbed - Parse Lead',
  },
});

interface ParsedLeadData {
  Nome?: string;
  Cognome?: string;
  Telefono?: string;
  Email?: string;
  Città?: string;
  CAP?: number;
  Esigenza?: string;
  Note?: string;
  Fonte?: string; // Piattaforma/canale di provenienza
}

/**
 * POST /api/ai/parse-lead-text
 * 
 * Body:
 * - text: string (testo da analizzare)
 */
export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length < 20) {
      return NextResponse.json(
        { error: 'Text must be at least 20 characters' },
        { status: 400 }
      );
    }

    console.log('[AI Parse Lead] Processing text:', text.substring(0, 100) + '...');

    // System prompt per estrarre dati strutturati
    const systemPrompt = `Sei un assistente AI esperto nell'estrazione di dati strutturati da testo libero per CRM.
Il tuo compito è estrarre informazioni di contatto e business da form di contatto, email, messaggi WhatsApp o testo libero.

REGOLE:
1. Estrai SOLO le informazioni presenti nel testo - NON inventare dati
2. Rispondi ESCLUSIVAMENTE con un JSON valido, senza altro testo
3. Se un campo non è presente, omettilo completamente dal JSON (non usare null o valori vuoti)
4. Per il telefono, normalizza il formato (rimuovi spazi, mantieni prefisso +39 o 0 per fissi)
5. Per l'email, estrai solo email valide
6. Per il CAP, estrai solo codici postali italiani validi (5 cifre)
7. Nome può includere nome e cognome insieme se non sono separati chiaramente
8. Esigenza: riassumi brevemente cosa cerca/vuole il cliente (max 2-3 frasi)
9. Fonte/Piattaforma: estrai la fonte se presente. Nomi validi: Meta (per Facebook), Instagram, Google, Sito, Organico, Referral

FORMATO JSON ATTESO:
{
  "Nome": "Mario Rossi",
  "Telefono": "+39 333 1234567",
  "Email": "mario.rossi@example.com",
  "Città": "Milano",
  "CAP": 20100,
  "Esigenza": "Cerca un materasso memory foam per problemi di schiena",
  "Fonte": "Meta"
}

Rispondi SOLO con il JSON, senza introduzioni, spiegazioni o markdown.`;

    const userPrompt = `Estrai i dati strutturati dal seguente testo:

${text}`;

    // Chiamata a OpenRouter
    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-4o-mini', // Modello economico e veloce
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3, // Bassa temperatura per output deterministico
      max_tokens: 800,
      response_format: { type: 'json_object' }, // Forza output JSON
    });

    const resultText = completion.choices[0]?.message?.content?.trim();

    if (!resultText) {
      throw new Error('No response from AI model');
    }

    console.log('[AI Parse Lead] Raw AI response:', resultText);

    // Parse JSON response
    let parsedData: ParsedLeadData;
    try {
      parsedData = JSON.parse(resultText);
    } catch (parseError) {
      console.error('[AI Parse Lead] JSON parse error:', parseError);
      console.error('[AI Parse Lead] Invalid JSON:', resultText);
      throw new Error('AI returned invalid JSON format');
    }

    // Validate and clean parsed data
    const cleanedData: ParsedLeadData = {};

    // Nome (required for lead)
    if (parsedData.Nome && typeof parsedData.Nome === 'string' && parsedData.Nome.trim()) {
      cleanedData.Nome = parsedData.Nome.trim();
    }

    // Telefono
    if (parsedData.Telefono && typeof parsedData.Telefono === 'string' && parsedData.Telefono.trim()) {
      cleanedData.Telefono = parsedData.Telefono.trim();
    }

    // Email
    if (parsedData.Email && typeof parsedData.Email === 'string' && parsedData.Email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(parsedData.Email.trim())) {
        cleanedData.Email = parsedData.Email.trim().toLowerCase();
      }
    }

    // Città
    if (parsedData.Città && typeof parsedData.Città === 'string' && parsedData.Città.trim()) {
      cleanedData.Città = parsedData.Città.trim();
    }

    // CAP (convert to number if string)
    if (parsedData.CAP) {
      const cap = typeof parsedData.CAP === 'number' ? parsedData.CAP : parseInt(String(parsedData.CAP), 10);
      if (!isNaN(cap) && cap >= 10000 && cap <= 99999) {
        cleanedData.CAP = cap;
      }
    }

    // Esigenza
    if (parsedData.Esigenza && typeof parsedData.Esigenza === 'string' && parsedData.Esigenza.trim()) {
      cleanedData.Esigenza = parsedData.Esigenza.trim();
    }

    // Note (optional)
    if (parsedData.Note && typeof parsedData.Note === 'string' && parsedData.Note.trim()) {
      cleanedData.Note = parsedData.Note.trim();
    }

    // Fonte (optional - Piattaforma/canale)
    if (parsedData.Fonte && typeof parsedData.Fonte === 'string' && parsedData.Fonte.trim()) {
      // Normalizza nomi comuni di fonti per match con database
      // Database fonti: Meta, Instagram, Google, Sito, Organico, Referral
      const fonteNormalized = parsedData.Fonte.trim();
      const fonteMap: Record<string, string> = {
        // Meta/Facebook
        'facebook': 'Meta',
        'fb': 'Meta',
        'meta': 'Meta',
        'meta ads': 'Meta',
        'facebook ads': 'Meta',
        
        // Instagram
        'instagram': 'Instagram',
        'ig': 'Instagram',
        'insta': 'Instagram',
        
        // Google
        'google': 'Google',
        'google ads': 'Google',
        'adwords': 'Google',
        
        // Sito
        'sito': 'Sito',
        'website': 'Sito',
        'sito web': 'Sito',
        'web': 'Sito',
        
        // WhatsApp (mappa a Organico se non esiste fonte specifica)
        'whatsapp': 'Organico',
        'wa': 'Organico',
        
        // Email
        'email': 'Organico',
        'mail': 'Organico',
        
        // Referral
        'referral': 'Referral',
        'passaparola': 'Referral',
        'raccomandazione': 'Referral',
        
        // Organico
        'organico': 'Organico',
        'organic': 'Organico',
        'diretto': 'Organico',
      };
      
      const fonteLower = fonteNormalized.toLowerCase();
      cleanedData.Fonte = fonteMap[fonteLower] || fonteNormalized;
    }

    console.log('[AI Parse Lead] Cleaned data:', cleanedData);

    // Check if we extracted at least something useful
    const hasUsefulData = Object.keys(cleanedData).length > 0 && (
      cleanedData.Nome || 
      cleanedData.Telefono || 
      cleanedData.Email
    );

    if (!hasUsefulData) {
      return NextResponse.json({
        success: false,
        error: 'No useful data could be extracted from the text',
        data: {},
      }, { status: 200 });
    }

    return NextResponse.json({
      success: true,
      data: cleanedData,
      extractedFields: Object.keys(cleanedData).length,
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('[API] POST /api/ai/parse-lead-text error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse lead text',
      details: error instanceof Error ? error.stack : 'Unknown error',
    }, { status: 500 });
  }
}
