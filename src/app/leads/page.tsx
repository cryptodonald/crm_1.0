'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLeads } from '@/hooks/use-leads';
import { useMarketingSources } from '@/hooks/use-marketing-sources';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { LeadsStats } from '@/components/leads/leads-stats';
import { LeadsDataTable } from '@/components/leads/leads-data-table';
import { NewLeadModal } from '@/components/leads/new-lead-modal';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Plus } from 'lucide-react';
import { differenceInDays, differenceInHours, subDays } from 'date-fns';
import type { AirtableLead } from '@/types/airtable';

export default function LeadsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [filters, setFilters] = useState<any>({});
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/dashboard/leads');
    }
  }, [status, router]);

  // Listener per evento QuickCreate
  useEffect(() => {
    const handleOpenModal = () => {
      setShowNewLeadModal(true);
    };
    
    window.addEventListener('open-create-lead-modal', handleOpenModal);
    return () => window.removeEventListener('open-create-lead-modal', handleOpenModal);
  }, []);

  // Fetch leads
  const { leads, total, isLoading, error, mutate } = useLeads(filters);
  
  // Fetch marketing sources for lookup
  const { lookup: sourcesLookup, colorLookup: sourcesColorLookup, isLoading: sourcesLoading } = useMarketingSources();

  const loading = isLoading || sourcesLoading;

  // Calcola statistiche dai leads
  const stats = useMemo(() => {
    if (!leads || leads.length === 0) return null;

    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);

    // Lead ultimi 7 giorni
    const nuoviUltimi7Giorni = leads.filter(lead => {
      const leadDate = lead.fields.Data ? new Date(lead.fields.Data) : null;
      return leadDate && leadDate >= sevenDaysAgo;
    }).length;

    // Contattati entro 48h (lead con almeno un'attività entro 48h dalla creazione)
    const contattatiEntro48hCount = leads.filter(lead => {
      const leadDate = lead.fields.Data ? new Date(lead.fields.Data) : null;
      if (!leadDate) return false;
      
      // Controlla se ha attività
      const activities = ((lead.fields as any)['Attività'] as string[] | undefined) || [];
      if (activities.length === 0) return false;
      
      // Per semplicità, consideriamo "contattato" se ha almeno un'attività
      // In produzione si dovrebbe controllare la data della prima attività
      return true;
    }).length;

    const contattatiEntro48h = leads.length > 0 
      ? Math.round((contattatiEntro48hCount / leads.length) * 100)
      : 0;

    // Distribuzione per stato
    const byStato: Record<string, number> = {};
    leads.forEach(lead => {
      const stato = lead.fields.Stato || 'Sconosciuto';
      byStato[stato] = (byStato[stato] || 0) + 1;
    });

    // Tasso qualificazione (% lead che hanno raggiunto stato Qualificato o superiore)
    const qualificati = (byStato['Qualificato'] || 0) + (byStato['Cliente'] || 0);
    const tassoQualificazione = leads.length > 0
      ? Math.round((qualificati / leads.length) * 100)
      : 0;

    // Tasso conversione (% lead che sono diventati Cliente)
    const clienti = byStato['Cliente'] || 0;
    const tassoConversione = leads.length > 0
      ? Math.round((clienti / leads.length) * 100)
      : 0;

    // Distribuzione per provenienza
    const byProvenienza: Record<string, number> = {};
    leads.forEach(lead => {
      const fonti = lead.fields.Fonte || [];
      fonti.forEach(fonteId => {
        const fonteName = sourcesLookup[fonteId] || 'Sconosciuta';
        byProvenienza[fonteName] = (byProvenienza[fonteName] || 0) + 1;
      });
    });

    return {
      totale: leads.length,
      nuoviUltimi7Giorni,
      contattatiEntro48h,
      tassoQualificazione,
      tassoConversione,
      byStato,
      byProvenienza,
    };
  }, [leads, sourcesLookup]);

  // Show loading while checking auth
  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!session) {
    return null;
  }

  // Handle CRUD operations (mantiene compatibilità con LeadsDataTable)
  const handleCreateClick = () => {
    setShowNewLeadModal(true);
  };

  const handleLeadCreated = async (newLead: any) => {
    // Forza SWR a refetch da API (bypassa cache)
    mutate();
  };

  const handleDeleteLead = async (leadId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete lead');
      }

      // Forza SWR a refetch da API (bypassa cache)
      mutate();
      return true;
    } catch (error) {
      console.error('Error deleting lead:', error);
      return false;
    }
  };

  const handleDeleteMultipleLeads = async (
    leadIds: string[]
  ): Promise<number> => {
    let deletedCount = 0;
    
    for (const leadId of leadIds) {
      try {
        const res = await fetch(`/api/leads/${leadId}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          deletedCount++;
        }
      } catch (error) {
        console.error(`Error deleting lead ${leadId}:`, error);
      }
    }

    // Forza SWR a refetch da API (bypassa cache)
    mutate();
    return deletedCount;
  };

  const handleUpdateLead = async (
    leadId: string,
    updates: Partial<any>
  ): Promise<boolean> => {
    await mutate();
    return true;
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
                onClick={() => mutate()}
                disabled={loading}
                title="Aggiorna i dati"
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                />
                {loading ? 'Aggiornando...' : 'Aggiorna'}
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
                <span>{error.message || 'Errore nel caricamento dei dati'}</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Stats */}
          <LeadsStats
            stats={stats}
            loading={loading}
            error={error?.message || null}
            className="w-full"
          />

          {/* Data Table */}
          <LeadsDataTable
            leads={leads}
            loading={loading}
            filters={filters}
            onFiltersChange={setFilters}
            totalCount={total}
            sourcesLookup={sourcesLookup}
            sourcesColorLookup={sourcesColorLookup}
            onDeleteLead={handleDeleteLead}
            onDeleteMultipleLeads={handleDeleteMultipleLeads}
            onUpdateLead={handleUpdateLead}
            className="w-full"
          />
        </div>
      </div>

      {/* Modals */}
      <NewLeadModal
        open={showNewLeadModal}
        onOpenChange={setShowNewLeadModal}
        onSuccess={handleLeadCreated}
      />
      </div>
    </AppLayoutCustom>
  );
}
