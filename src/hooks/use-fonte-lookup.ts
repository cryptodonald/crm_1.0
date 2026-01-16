'use client';

import { useState, useEffect, useMemo } from 'react';

// Cache per evitare lookup ripetuti
const sourceCache = new Map<string, { name: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minuti

export function useFonteLookup(fonteIds?: string[]): {
  names: string[];
  loading: boolean;
  error: string | null;
} {
  const [names, setNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoizza gli IDs per evitare lookup ripetuti
  const memoizedIds = useMemo(() => {
    return fonteIds && Array.isArray(fonteIds) ? fonteIds : [];
  }, [fonteIds?.join(',')]);

  useEffect(() => {
    if (memoizedIds.length === 0) {
      setNames([]);
      return;
    }

    const fetchSourceNames = async () => {
      try {
        setLoading(true);
        setError(null);

        const idsToFetch: string[] = [];
        const cachedResults: Record<string, string> = {};

        // Separa cache hits da cache misses
        for (const id of memoizedIds) {
          const cached = sourceCache.get(id);
          if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            cachedResults[id] = cached.name;
          } else {
            idsToFetch.push(id);
          }
        }

        // Fetch i record non cachati
        const resultNames: string[] = [];
        if (idsToFetch.length > 0) {
          for (const recordId of idsToFetch) {
            try {
              const response = await fetch(
                `/api/marketing/sources/${recordId}`,
                {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                }
              );

              if (response.ok) {
                const data = await response.json();
                const sourceName = data.name || data.Name || 'Unknown';
                sourceCache.set(recordId, {
                  name: sourceName,
                  timestamp: Date.now(),
                });
                resultNames.push(sourceName);
              } else {
                console.warn(
                  `⚠️ [useFonteLookup] Failed to fetch source ${recordId}: ${response.status}`
                );
                resultNames.push('Unknown');
              }
            } catch (err) {
              console.error(
                `❌ [useFonteLookup] Error fetching source ${recordId}:`,
                err
              );
              resultNames.push('Unknown');
            }
          }
        }

        // Ricostruisci l'array nel corretto ordine
        const finalNames = memoizedIds.map((id) => {
          return cachedResults[id] || resultNames.shift() || 'Unknown';
        });

        setNames(finalNames);
      } catch (err) {
        console.error('❌ [useFonteLookup] Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setNames([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSourceNames();
  }, [memoizedIds]);

  return { names, loading, error };
}
