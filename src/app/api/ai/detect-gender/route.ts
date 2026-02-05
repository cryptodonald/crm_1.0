import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/env';
import type { Gender } from '@/lib/avatar-utils';

/**
 * API Route: AI Gender Detection
 * POST /api/ai/detect-gender
 * 
 * Usa OpenRouter per determinare il genere da un nome usando AI.
 * Fallback: se OpenRouter non disponibile, restituisce 'unknown'
 */

interface DetectGenderRequest {
  nome: string;
}

interface DetectGenderResponse {
  gender: Gender;
  confidence?: number;
  source: 'ai' | 'fallback';
}

export async function POST(request: NextRequest) {
  try {
    const body: DetectGenderRequest = await request.json();
    const { nome } = body;

    if (!nome || typeof nome !== 'string' || nome.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nome richiesto' },
        { status: 400 }
      );
    }

    // Controlla se OpenRouter è configurato
    if (!env.OPENROUTER_API_KEY) {
      console.warn('[detect-gender] OPENROUTER_API_KEY non configurato, fallback a unknown');
      return NextResponse.json<DetectGenderResponse>({
        gender: 'unknown',
        source: 'fallback',
      });
    }

    // Chiama OpenRouter con un prompt specifico
    const prompt = `Determina il genere della persona con questo nome: "${nome}".

Rispondi SOLO con una delle seguenti parole:
- "male" se è un nome maschile
- "female" se è un nome femminile  
- "unknown" se non riesci a determinarlo con certezza

Risposta (solo male/female/unknown):`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.NEXTAUTH_URL || 'https://crm.doctorbed.it',
        'X-Title': 'Doctorbed CRM - Gender Detection',
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo', // Più affidabile, meno rate limit
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1, // Bassa temperatura per risposte deterministiche
        max_tokens: 10, // Bastano poche parole
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[detect-gender] OpenRouter error:', response.status, errorText);
      return NextResponse.json<DetectGenderResponse>({
        gender: 'unknown',
        source: 'fallback',
      });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content?.trim().toLowerCase();

    console.log('[detect-gender] AI response:', aiResponse);

    // Parse la risposta AI
    let gender: Gender = 'unknown';
    if (aiResponse === 'male') {
      gender = 'male';
    } else if (aiResponse === 'female') {
      gender = 'female';
    }

    return NextResponse.json<DetectGenderResponse>({
      gender,
      source: 'ai',
      confidence: gender !== 'unknown' ? 0.9 : 0.5,
    });
  } catch (error) {
    console.error('[detect-gender] Error:', error);
    return NextResponse.json<DetectGenderResponse>(
      {
        gender: 'unknown',
        source: 'fallback',
      },
      { status: 200 } // Non è un errore dal punto di vista dell'utente
    );
  }
}
