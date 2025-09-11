'use client';

import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { LeadActivitiesKanban } from '@/components/features/activities/LeadActivitiesKanban';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { ActivitiesStats } from '@/components/activities/activities-stats';
import { useActivitiesClean } from '@/hooks/use-activities-clean';

export default function ActivitiesPage() {
  // Hook per ottenere i dati delle attività per le statistiche
  // Senza leadId specifico = mostra TUTTE le attività
  const {
    activities,
    loading,
    error,
  } = useActivitiesClean(undefined, { // Non specifichiamo leadId per caricare tutte le attività
    loadAll: true, // Carica tutte le attività per statistiche complete
  });
  
  // Per compatibilità con ActivitiesStats che si aspetta allActivities
  const allActivities = activities;

  return (
    <AppLayoutCustom>
      <div className="flex-1 space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-6">
        <PageBreadcrumb pageName="Tutte le Attività" />
        
        {/* Statistics Cards - Mostra statistiche di tutte le attività */}
        <ActivitiesStats 
          activities={allActivities} 
          loading={loading} 
          error={error} 
        />
        
        {/* Kanban ottimizzato - Mostra TUTTE le attività (leadId non specificato) */}
        <LeadActivitiesKanban 
          className="" 
          // leadId non specificato = mostra tutte le attività di tutti i lead
        />
      </div>
    </AppLayoutCustom>
  );
}

