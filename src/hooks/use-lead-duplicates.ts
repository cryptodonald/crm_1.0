import { useMemo } from 'react';
import { LeadData } from '@/types/leads';
import { detectDuplicates } from '@/lib/lead-deduplication';

export function useLeadDuplicates(lead: LeadData, allLeads: LeadData[]) {
  const duplicates = useMemo(() => {
    const groups = detectDuplicates(allLeads, 0.85);
    
    for (const group of groups) {
      if (group.masterLead.id === lead.id) {
        return group.duplicateLeads;
      }
      if (group.duplicateLeads.some(dup => dup.id === lead.id)) {
        return [
          group.masterLead,
          ...group.duplicateLeads.filter(dup => dup.id !== lead.id),
        ];
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
