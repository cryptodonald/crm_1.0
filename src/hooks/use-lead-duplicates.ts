import { useMemo } from 'react';
import { LeadData } from '@/types/leads';
import { detectDuplicates } from '@/lib/lead-deduplication';

export function useLeadDuplicates(lead: LeadData, allLeads: LeadData[]) {
  const duplicates = useMemo(() => {
    if (!lead || !allLeads || allLeads.length === 0) return [];

    const groups = detectDuplicates(allLeads, 0.85);
    
    for (const group of groups) {
      if (group.masterId === lead.id) {
        // Lead è il master, ritorna i duplicati
        return group.duplicateIds
          .map(id => allLeads.find(l => l.id === id))
          .filter((l): l is LeadData => l !== undefined);
      }
      if (group.duplicateIds.includes(lead.id)) {
        // Lead è un duplicato, ritorna il master e gli altri duplicati
        const master = allLeads.find(l => l.id === group.masterId);
        if (!master) return [];
        
        const otherDupes = group.duplicateIds
          .filter(id => id !== lead.id)
          .map(id => allLeads.find(l => l.id === id))
          .filter((l): l is LeadData => l !== undefined);
        
        return [master, ...otherDupes];
      }
    }
    
    return [];
  }, [lead, allLeads]);

  return {
    hasDuplicates: duplicates.length > 0,
    duplicateCount: duplicates.length,
    duplicates,
  };
}
