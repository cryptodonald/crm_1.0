/**
 * AI Chat Service - GPT-5.2 with Native Function Calling
 * Completely rewritten for intelligent database queries and natural responses
 */

import { OpenAI } from 'openai';
import { env } from './env';
import { AI_FUNCTIONS, executeFunctionCall } from './ai-functions';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class AIChatService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  /**
   * Chat with GPT-5.2 with automatic function calling
   */
  async chat(userMessage: string, history: ChatMessage[] = []): Promise<string> {
    console.log('🤖 [AI Chat] Starting chat with GPT-5.2');
    console.log('📝 [AI Chat] Message:', userMessage);

    const messages: any[] = [
      {
        role: 'system',
        content: `Sei un assistente AI per un CRM aziendale. Hai accesso al database Airtable tramite funzioni.

**Il tuo comportamento:**
- Rispondi sempre in italiano con tono naturale e amichevole (usa "tu")
- Quando l'utente chiede informazioni, USA LE FUNZIONI per ottenere dati reali
- Non dire "non ho accesso" - HAI accesso tramite le funzioni
- Esegui le azioni richieste senza chiedere conferma eccessiva
- Sii conciso ma completo

**Data e ora corrente:**
- Data: ${new Date().toLocaleDateString('it-IT')}
- Ora: ${new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}

**Stato disponibili per i lead:**
- "Nuovo", "Contattato", "Qualificato", "In Negoziazione", "Cliente", "Perso"

**Esempi di come usare le funzioni:**
- "Quanti lead in negoziazione?" → query_leads con filters.stato="In Negoziazione"
- "Lead chiamati Christian" → query_leads con filters.nome="Christian"
- "Attività di oggi" → query_activities con date="today"
- "Crea attività" → create_activity con i parametri forniti

IMPORTANTE: Usa SEMPRE le funzioni invece di rispondere teoricamente.`,
      },
      ...history.map(m => ({ role: m.role, content: m.content })),
      {
        role: 'user',
        content: userMessage,
      },
    ];

    let response = await this.openai.chat.completions.create({
      model: 'gpt-5.2',
      messages,
      tools: AI_FUNCTIONS as any[],
      tool_choice: 'auto',
      temperature: 0.7,
      max_completion_tokens: 2000,
    });

    console.log('📦 [AI Chat] Response received');

    // Handle function calls in a loop (GPT might call multiple functions)
    let iterations = 0;
    const maxIterations = 5;

    while (response.choices[0].message.tool_calls && iterations < maxIterations) {
      iterations++;
      console.log(`🔄 [AI Chat] Iteration ${iterations}: Processing ${response.choices[0].message.tool_calls.length} function calls`);

      const toolCalls = response.choices[0].message.tool_calls;

      // Add assistant's message with tool calls
      messages.push(response.choices[0].message);

      // Execute each function call
      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        console.log(`🔧 [AI Chat] Calling function: ${functionName}`, functionArgs);

        try {
          const functionResult = await executeFunctionCall(functionName, functionArgs);
          console.log(`✅ [AI Chat] Function result:`, functionResult);

          // Add function result to messages
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(functionResult),
          });
        } catch (error) {
          console.error(`❌ [AI Chat] Function error:`, error);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
          });
        }
      }

      // Get next response from GPT with function results
      response = await this.openai.chat.completions.create({
        model: 'gpt-5.2',
        messages,
        tools: AI_FUNCTIONS as any[],
        tool_choice: 'auto',
        temperature: 0.7,
        max_completion_tokens: 2000,
      });

      console.log('📦 [AI Chat] Follow-up response received');
    }

    const finalMessage = response.choices[0].message.content || 'Mi dispiace, non riesco a rispondere.';
    console.log('✅ [AI Chat] Final response:', finalMessage.substring(0, 100));

    return finalMessage;
  }
}

// Singleton instance
let aiChatServiceInstance: AIChatService | null = null;

export function getAIChatService(): AIChatService {
  if (!aiChatServiceInstance) {
    aiChatServiceInstance = new AIChatService();
  }
  return aiChatServiceInstance;
}
