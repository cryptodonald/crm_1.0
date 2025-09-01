'use client';

import { useState } from 'react';
import { AppLayoutCustom } from "@/components/layout/app-layout-custom"
import { PageBreadcrumb } from "@/components/layout/page-breadcrumb"
import { useLeadsData, useLeadsStats } from '@/hooks/use-leads-data';
import { LeadsStats } from '@/components/leads/leads-stats';
import { LeadsDataTable } from '@/components/leads/leads-data-table';
import { LeadsFilters } from '@/types/leads';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LeadsPage() {
  const [filters, setFilters] = useState<LeadsFilters>({});
  
  const {
    leads,
    loading: leadsLoading,
    error: leadsError,
    totalCount,
    hasMore,
    loadMore,
    refresh: refreshLeads
  } = useLeadsData({ filters });
  
  const {
    stats,
    loading: statsLoading,
    error: statsError,
    refresh: refreshStats
  } = useLeadsStats(filters);
  
  const loading = leadsLoading || statsLoading;
  const error = leadsError || statsError;
  
  const refresh = () => {
    refreshLeads();
    refreshStats();
  };

  // Handle create new lead
  const handleCreateClick = () => {
    // TODO: Implement create lead functionality
    console.log('Create new lead');
  };

  const clearError = () => {
    // TODO: Implement error clearing
    console.log('Clear error');
  };

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="Leads" />
        
        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
                <p className="text-muted-foreground">
                  Gestisci e monitora tutti i tuoi leads dal sistema CRM
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  disabled={loading}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Aggiorna
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleCreateClick}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nuovo Lead
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
            <LeadsStats stats={stats} />

            {/* Leads Table */}
            <LeadsDataTable
              leads={leads}
              loading={leadsLoading}
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
