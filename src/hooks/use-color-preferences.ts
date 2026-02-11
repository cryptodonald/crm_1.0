import useSWR from 'swr';
import { useState, useMemo } from 'react';
import type { EntityType } from '@/lib/color-preferences';
import { getDefaultColors } from '@/lib/default-badge-colors';

interface UseColorPreferencesOptions {
  entityType: EntityType;
}

interface UseColorPreferencesReturn {
  colors: Record<string, string> | undefined;
  isLoading: boolean;
  error: Error | undefined;
  saveColor: (entityValue: string, colorClass: string) => Promise<void>;
  resetColor: (entityValue: string) => Promise<void>;
  mutate: () => void;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Errore nel caricamento');
  }
  return res.json();
};

/**
 * Hook per gestire preferenze colori utente
 * 
 * @example
 * const { colors, saveColor, resetColor } = useColorPreferences({
 *   entityType: 'LeadStato'
 * });
 * 
 * // Usa colori
 * const nuovoColor = colors?.['Nuovo'];
 * 
 * // Salva personalizzazione
 * await saveColor('Nuovo', 'bg-red-500 text-white');
 * 
 * // Reset a default
 * await resetColor('Nuovo');
 */
export function useColorPreferences({
  entityType,
}: UseColorPreferencesOptions): UseColorPreferencesReturn {
  const [isSaving, setIsSaving] = useState(false);

  const { data, error, isLoading, mutate } = useSWR(
    `/api/color-preferences?entityType=${entityType}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
  
  // Merge default colors con user customizations
  const mergedColors = useMemo(() => {
    const defaults = getDefaultColors(entityType);
    const userColors = data?.colors || {};
    
    // User colors override defaults
    return { ...defaults, ...userColors };
  }, [entityType, data?.colors]);

  const saveColor = async (entityValue: string, colorClass: string) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/color-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityValue,
          colorClass,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Errore nel salvataggio');
      }

      // Ricarica dati
      await mutate();
    } finally {
      setIsSaving(false);
    }
  };

  const resetColor = async (entityValue: string) => {
    setIsSaving(true);
    try {
      const res = await fetch(
        `/api/color-preferences/${entityType}/${encodeURIComponent(entityValue)}`,
        {
          method: 'DELETE',
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Errore nel reset');
      }

      // Ricarica dati
      await mutate();
    } finally {
      setIsSaving(false);
    }
  };

  return {
    colors: mergedColors,
    isLoading: isLoading || isSaving,
    error,
    saveColor,
    resetColor,
    mutate,
  };
}

/**
 * Hook per ottenere un singolo colore
 */
export function useColor(entityType: EntityType, entityValue: string): string | undefined {
  const { colors } = useColorPreferences({ entityType });
  return colors?.[entityValue];
}
