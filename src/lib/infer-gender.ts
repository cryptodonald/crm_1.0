/**
 * Helper per inferire il genere da un nome usando OpenAI
 * Stessa logica dell'AI Text Parser
 */

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type Gender = 'Uomo' | 'Donna' | 'Altro';

interface InferGenderResult {
  gender: Gender | null;
  confidence: 'high' | 'low';
  reasoning?: string;
}

/**
 * Inferisce il genere da un nome italiano usando OpenAI
 * @param nome - Il nome da analizzare
 * @returns Gender inferito o null se ambiguo
 */
export async function inferGenderFromName(nome: string): Promise<InferGenderResult> {
  if (!nome || nome.trim().length === 0) {
    return { gender: null, confidence: 'low', reasoning: 'Nome vuoto' };
  }

  try {
    const prompt = `Analizza il nome italiano "${nome}" e determina il genere più probabile.

Regole:
- Se il nome è chiaramente maschile (es. Marco, Luca, Giovanni) → rispondi "Uomo"
- Se il nome è chiaramente femminile (es. Maria, Laura, Chiara) → rispondi "Donna"
- Se il nome è ambiguo, neutro, o straniero non identificabile → rispondi "Altro"
- Considera sia nomi singoli che doppi nomi (es. "Maria Rosa", "Gian Luca")

Rispondi SOLO con un oggetto JSON in questo formato (senza markdown):
{
  "gender": "Uomo" | "Donna" | "Altro",
  "confidence": "high" | "low",
  "reasoning": "breve spiegazione"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Sei un esperto di onomastica italiana. Analizza i nomi e determina il genere più probabile.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // Bassa temperatura per risposte più deterministiche
      max_tokens: 150,
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return { gender: null, confidence: 'low', reasoning: 'Nessuna risposta dall\'AI' };
    }

    // Parse JSON (con fallback per markdown)
    let parsed: InferGenderResult;
    try {
      // Rimuovi eventuali markdown code blocks
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (parseError) {
      console.error('Errore parsing risposta AI:', content);
      return { gender: null, confidence: 'low', reasoning: 'Risposta AI non valida' };
    }

    // Validazione
    const validGenders: Gender[] = ['Uomo', 'Donna', 'Altro'];
    if (!validGenders.includes(parsed.gender as Gender)) {
      return { gender: null, confidence: 'low', reasoning: 'Genere non valido nella risposta' };
    }

    return parsed;
  } catch (error) {
    console.error('Errore inferGenderFromName:', error);
    return {
      gender: null,
      confidence: 'low',
      reasoning: error instanceof Error ? error.message : 'Errore sconosciuto',
    };
  }
}

/**
 * Versione batch per processare più nomi in parallelo
 * Utile per script di migrazione
 */
export async function inferGenderBatch(
  nomi: string[],
  options: { maxConcurrent?: number } = {}
): Promise<Map<string, InferGenderResult>> {
  const { maxConcurrent = 5 } = options;
  const results = new Map<string, InferGenderResult>();

  // Processa in batch per evitare rate limiting
  for (let i = 0; i < nomi.length; i += maxConcurrent) {
    const batch = nomi.slice(i, i + maxConcurrent);
    const promises = batch.map(async (nome) => {
      const result = await inferGenderFromName(nome);
      return { nome, result };
    });

    const batchResults = await Promise.all(promises);
    batchResults.forEach(({ nome, result }) => {
      results.set(nome, result);
    });

    // Pausa tra batch per evitare rate limiting
    if (i + maxConcurrent < nomi.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}
