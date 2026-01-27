'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export function useMergeLeads() {
  const [merging, setMerging] = useState(false);

  const mergeLead = async (
    masterId: string,
    duplicateIds: string[],
    options?: { selectedState?: string; selectedAssignee?: string }
  ) => {
    try {
      setMerging(true);
      console.log(`🔗 [Merge Hook] Starting merge of ${duplicateIds.length} leads into ${masterId}`, { options });

      // Create abort controller with 120 second timeout (merge can be slow with many relations)
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        console.warn('⏱️  [Merge Hook] Request timeout after 120s, aborting...');
        controller.abort();
      }, 120000);

      try {
        console.log('[Merge Hook] Sending fetch request...');
        const response = await fetch('/api/leads/merge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ masterId, duplicateIds, ...options }),
          signal: controller.signal,
        });

        console.log('[Merge Hook] Fetch response received, clearing timeout...');
        clearTimeout(timeout);

        console.log('[Merge Hook] Parsing response JSON...');
        const parseTimeout = setTimeout(() => {
          console.warn('⏱️  [Merge Hook] Response parsing timeout, aborting...');
          controller.abort();
        }, 30000);
        
        const data = await response.json();
        clearTimeout(parseTimeout);
        console.log(`📊 [Merge Hook] Response status: ${response.status}`, data);

        if (!response.ok) {
          console.error(`❌ [Merge Hook] API returned error: ${data.error}`);
          throw new Error(data.error || `HTTP ${response.status}`);
        }

        console.log(`✅ [Merge Hook] Merge successful: ${data.message}`);
        console.log(`✅ [Merge Hook] Success response received, closing modal...`);
        // Cache invalidation is handled server-side in the merge API
        toast.success(`Consolidamento completato: ${duplicateIds.length} ${duplicateIds.length === 1 ? 'lead' : 'lead'} uniti con successo`);
        return true;
      } catch (fetchError) {
        clearTimeout(timeout);
        console.error('[Merge Hook] Fetch error:', fetchError);
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            console.error('[Merge Hook] AbortError - timeout 120s exceeded');
            throw new Error('Richiesta scaduta (timeout 120s) - merge potrebbe essere incompleto');
          }
          console.error(`[Merge Hook] Fetch error name: ${fetchError.name}, message: ${fetchError.message}`);
        }
        throw fetchError;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore sconosciuto';
      console.error('❌ [Merge Hook] Final error:', error);
      console.error('[Merge Hook] Error type:', typeof error, error instanceof Error ? error.name : 'not an Error');
      toast.error(`Errore nel consolidamento: ${message}`);
      return false;
    } finally {
      console.log('[Merge Hook] Setting merging=false');
      setMerging(false);
    }
  };

  return { mergeLead, merging };
}
