'use client';

import { useState } from 'react';
import { LeadFormData } from '@/types/leads';

export interface ParsedLeadData {
  Nome?: string;
  Cognome?: string;
  Email?: string;
  Telefono?: string;
  Città?: string;
  Esigenza?: string;
  confidence: number;
}

export function useParseLeadText() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseText = async (testo: string): Promise<ParsedLeadData | null> => {
    if (!testo?.trim()) {
      setError('Inserisci del testo da analizzare');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🤖 [useParseLead] Parsing in corso...');

      const response = await fetch('/api/ai/parse-lead-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testo }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.details || errorData.error || 'Errore durante il parsing'
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Parsing non riuscito');
      }

      console.log('✅ [useParseLead] Parsing completato:', result.data);

      return result.data as ParsedLeadData;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore sconosciuto';
      console.error('❌ [useParseLead] Error:', message);
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { parseText, loading, error };
}
