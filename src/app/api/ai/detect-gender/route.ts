import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { env } from '@/env';

// OpenRouter configurato come OpenAI-compatible endpoint
const openai = new OpenAI({
  apiKey: env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': env.NEXTAUTH_URL,
  },
});

/**
 * POST /api/ai/detect-gender
 * 
 * Detect gender from first name using OpenAI
 */
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Extract first name
    const firstName = name.trim().split(' ')[0];

    if (firstName.length < 2) {
      return NextResponse.json({ gender: 'unknown' }, { status: 200 });
    }

    // Call OpenRouter for gender detection
    const completion = await openai.chat.completions.create({
      model: 'openai/gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a gender detection assistant. Respond with ONLY one word: "male", "female", or "unknown". No explanations.',
        },
        {
          role: 'user',
          content: `Detect the gender of this Italian first name: "${firstName}"`,
        },
      ],
      temperature: 0.3,
      max_tokens: 10,
    });

    const result = completion.choices[0]?.message?.content?.trim().toLowerCase();
    
    let gender: 'male' | 'female' | 'unknown' = 'unknown';
    if (result === 'male' || result === 'female') {
      gender = result;
    }

    console.log(`[AI Gender Detection] "${firstName}" -> ${gender}`);

    return NextResponse.json({ gender }, { status: 200 });
  } catch (error: unknown) {
    console.error('[AI Gender Detection] Error:', error instanceof Error ? error.message : error);
    
    // Fallback to unknown on error
    return NextResponse.json({ gender: 'unknown' }, { status: 200 });
  }
}
