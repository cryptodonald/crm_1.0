'use client';

import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { LeadActivitiesList } from '@/components/features/activities/LeadActivitiesList';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { ActivitiesStats } from '@/components/activities/activities-stats';
import { useActivitiesData } from '@/hooks/use-activities-data';

export default function ActivitiesPage() {
  // Hook per ottenere i dati delle attività per le statistiche
  const {
    allActivities,
    loading,
    error,
  } = useActivitiesData({
    loadAll: true,
  });

  return (
    <AppLayoutCustom>
      <div className="flex-1 space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-6">
        <PageBreadcrumb pageName="Attività" />
        
        {/* Statistics Cards */}
        <ActivitiesStats 
          activities={allActivities} 
          loading={loading} 
          error={error} 
        />
        
        <LeadActivitiesList className="" />
      </div>
    </AppLayoutCustom>
  );
}

