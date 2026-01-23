'use client';

import { useState } from 'react';
import { toast } from 'sonner';

export function useMergeLeads() {
  const [merging, setMerging] = useState(false);

  const mergeLead = async (masterId: string, duplicateIds: string[]) => {
    try {
      setMerging(true);
      console.log(`🔗 Merging ${duplicateIds.length} leads into ${masterId}`);

      const response = await fetch('/api/leads/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterId, duplicateIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Merge failed');
      }

      toast.success(`✅ Lead uniti con successo! ${duplicateIds.length} record consolidati.`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Merge failed';
      console.error('❌ Merge error:', error);
      toast.error(`Errore durante il merge: ${message}`);
      return false;
    } finally {
      setMerging(false);
    }
  };

  return { mergeLead, merging };
}
