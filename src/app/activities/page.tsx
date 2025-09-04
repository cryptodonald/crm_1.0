'use client';

import { useState } from 'react';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { useActivitiesData, useActivitiesStats } from '@/hooks/use-activities-data';
import { ActivitiesStats } from '@/components/activities/activities-stats';
import { ActivitiesDataTable } from '@/components/activities/activities-data-table';
import { ActivityFilters } from '@/types/activity';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ActivitiesPage() {
  const [filters, setFilters] = useState<ActivityFilters>({});

  const {
    activities,
    loading: activitiesLoading,
    error: activitiesError,
    totalCount,
    hasMore,
    loadMore,
    refresh: refreshActivities,
  } = useActivitiesData({ filters });

  const {
    stats,
    loading: statsLoading,
    error: statsError,
    refresh: refreshStats,
  } = useActivitiesStats(filters);

  const loading = activitiesLoading || statsLoading;
  const error = activitiesError || statsError;

  const refresh = () => {
    refreshActivities();
    refreshStats();
  };

  // Handle create new activity
  const handleCreateClick = () => {
    // TODO: Implement create activity functionality
    console.log('Create new activity');
  };

  const clearError = () => {
    // TODO: Implement error clearing
    console.log('Clear error');
  };

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="Attività" />

        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Attività</h1>
                <p className="text-muted-foreground">
                  Gestisci e monitora tutte le attività del tuo CRM
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                  />
                  Aggiorna
                </Button>
                <Button size="sm" onClick={handleCreateClick}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuova Attività
                </Button>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{error}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearError}
                    className="h-6 px-2 text-xs"
                  >
                    Chiudi
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Statistics Cards */}
            <ActivitiesStats stats={stats} loading={statsLoading} error={statsError} />

            {/* Activities Table */}
            <ActivitiesDataTable
              activities={activities}
              loading={activitiesLoading}
              filters={filters}
              onFiltersChange={setFilters}
              totalCount={totalCount}
              hasMore={hasMore}
              onLoadMore={loadMore}
            />
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  );
}
