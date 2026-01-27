/**
 * POST /api/ai/chat-smart
 * New AI endpoint with GPT-5.2 function calling
 * Intelligently queries database and executes actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAIChatService } from '@/lib/ai-chat-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, conversationHistory = [] } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query richiesta' },
        { status: 400 }
      );
    }

    console.log('🚀 [Chat Smart API] New request');
    console.log('📝 [Chat Smart API] Query:', query);

    const aiService = getAIChatService();

    // Convert conversation history to expected format
    const history = conversationHistory.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    const response = await aiService.chat(query, history);

    console.log('✅ [Chat Smart API] Response generated');

    return NextResponse.json({
      success: true,
      message: response,
      response: response,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Errore sconosciuto';
    console.error('❌ [Chat Smart API] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Errore nell\'elaborazione',
        message: 'Mi dispiace, ho incontrato un errore. Riprova.',
        details: errorMsg,
      },
      { status: 500 }
    );
  }
}
