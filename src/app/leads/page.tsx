'use client';

import { useState, useMemo } from 'react';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { useLeadsData } from '@/hooks/use-leads-data';
import { LeadsStats } from '@/components/leads/leads-stats';
import { LeadsDataTable } from '@/components/leads-modified/leads-data-table-improved';
import { NewLeadModal } from '@/components/leads/new-lead-modal';
import { LeadsFilters, LeadData } from '@/types/leads';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LeadsPage() {
  const [filters, setFilters] = useState<LeadsFilters>({});
  const [newLeadModalOpen, setNewLeadModalOpen] = useState(false);

  const {
    leads,
    loading: leadsLoading,
    error: leadsError,
    totalCount,
    hasMore,
    loadMore,
    refresh: refreshLeads,
  } = useLeadsData({ 
    // NON passiamo più i filtri qui! I filtri saranno applicati lato client nella tabella
    loadAll: true, // Carica tutto il database SENZA FILTRI
    pageSize: 100 // Mantiene comunque pageSize per eventuali usi futuri
  });

  // Calcola statistiche lato client dai leads caricati
  const stats = useMemo(() => {
    if (!leads.length) return null;
    
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Lead degli ultimi 7 giorni
    const nuoviUltimi7Giorni = leads.filter(lead => {
      if (!lead.Data) return false;
      const leadDate = new Date(lead.Data);
      return leadDate >= sevenDaysAgo;
    }).length;
    
    // Conteggio per stato
    const byStato: Record<string, number> = {};
    leads.forEach(lead => {
      byStato[lead.Stato] = (byStato[lead.Stato] || 0) + 1;
    });
    
    // Conteggio per provenienza
    const byProvenienza: Record<string, number> = {};
    leads.forEach(lead => {
      byProvenienza[lead.Provenienza] = (byProvenienza[lead.Provenienza] || 0) + 1;
    });
    
    // Calcoli per i tassi
    const totale = leads.length;
    const qualificati = byStato['Qualificato'] || 0;
    const clienti = byStato['Cliente'] || 0;
    
    const tassoQualificazione = totale > 0 ? Math.round((qualificati / totale) * 100) : 0;
    const tassoConversione = totale > 0 ? Math.round((clienti / totale) * 100) : 0;
    
    return {
      totale,
      nuoviUltimi7Giorni,
      contattatiEntro48h: 0, // TODO: Implementare logica per contattati
      tassoQualificazione,
      tassoConversione,
      byStato,
      byProvenienza
    };
  }, [leads]);

  const loading = leadsLoading;
  const error = leadsError;

  const refresh = () => {
    refreshLeads(true); // Forza il refresh bypassando la cache
  };

  // Handle create new lead
  const handleCreateClick = () => {
    setNewLeadModalOpen(true);
  };

  // Handle successful lead creation
  const handleLeadCreated = () => {
    refreshLeads();
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
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                  />
                  Aggiorna
                </Button>
                <Button size="sm" onClick={handleCreateClick}>
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
            <LeadsStats stats={stats} loading={loading} error={error} />

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
      
      {/* New Lead Modal */}
      <NewLeadModal
        open={newLeadModalOpen}
        onOpenChange={setNewLeadModalOpen}
        onSuccess={handleLeadCreated}
      />
    </AppLayoutCustom>
  );
}
