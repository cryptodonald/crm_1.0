'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSWRConfig } from 'swr';
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { differenceInDays, differenceInHours, subDays } from 'date-fns';
import type { Lead } from '@/types/database';

export default function LeadsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { mutate } = useSWRConfig();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [filters, setFilters] = useState<any>({});
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  
  // Server-side pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  // Fetch ALL leads once (no filters on API, we filter client-side)
  const { leads: allLeads, isLoading, error, mutate: mutateLocal } = useLeads({ limit: 5000 });
  
  // Client-side filtering and search
  const filteredLeads = useMemo(() => {
    if (!allLeads) return [];
    
    return allLeads.filter(lead => {
      // Search filter (instant - no debounce needed)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          lead.name?.toLowerCase().includes(searchLower) ||
          lead.phone?.includes(filters.search) ||
          lead.email?.toLowerCase().includes(searchLower) ||
          lead.city?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (filters.stato && filters.stato.length > 0) {
        if (!filters.stato.includes(lead.status)) return false;
      }
      
      // Source filter
      if (filters.fonte && filters.fonte.length > 0) {
        if (!filters.fonte.includes(lead.source_id)) return false;
      }
      
      // Date range filter
      if (filters.dateRange?.from || filters.dateRange?.to) {
        const leadDate = lead.created_at ? new Date(lead.created_at) : null;
        if (!leadDate) return false;
        
        if (filters.dateRange.from && leadDate < filters.dateRange.from) return false;
        if (filters.dateRange.to && leadDate > filters.dateRange.to) return false;
      }
      
      return true;
    });
  }, [allLeads, filters]);
  
  // Client-side pagination
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredLeads.slice(startIndex, endIndex);
  }, [filteredLeads, currentPage, itemsPerPage]);
  
  const total = filteredLeads.length;
  const leads = paginatedLeads;
  
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
      const leadDate = lead.created_at ? new Date(lead.created_at) : null;
      return leadDate && leadDate >= sevenDaysAgo;
    }).length;

    // Contattati entro 48h (lead con almeno un'attività entro 48h dalla creazione)
    const contattatiEntro48hCount = leads.filter(lead => {
      const leadDate = lead.created_at ? new Date(lead.created_at) : null;
      if (!leadDate) return false;
      
      // Per semplicità, consideriamo "contattato" se ha status diverso da Nuovo
      return lead.status !== 'Nuovo';
    }).length;

    const contattatiEntro48h = leads.length > 0 
      ? Math.round((contattatiEntro48hCount / leads.length) * 100)
      : 0;

    // Distribuzione per stato
    const byStato: Record<string, number> = {};
    leads.forEach(lead => {
      const stato = lead.status || 'Sconosciuto';
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
      if (lead.source_id) {
        const fonteName = sourcesLookup[lead.source_id] || 'Sconosciuta';
        byProvenienza[fonteName] = (byProvenienza[fonteName] || 0) + 1;
      }
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

  const handleDeleteLead = async (leadId: string): Promise<boolean> => {
    // Store original lead for rollback
    let deletedLead: Lead | null = null;

    try {
      console.log('[LeadsPage] Single delete (optimistic):', leadId);
      
      // FASE 1: Snapshot + Rimuovi IMMEDIATAMENTE dalla UI (optimistic)
      // Usa pattern matching per aggiornare tutte le cache variants
      mutate(
        (key) => typeof key === 'string' && key.startsWith('/api/leads'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (current: any) => {
          if (!current) return current;

          // Find and store the lead before removing
          deletedLead = current.leads?.find((l: Lead) => l.id === leadId) || null;
          
          if (!current.leads) return current;

          return {
            ...current,
            leads: current.leads.filter((l: Lead) => l.id !== leadId),
            total: Math.max(0, (current.total || 0) - 1),
          };
        },
        { revalidate: false }
      );
      
      console.log('[LeadsPage] Optimistic removal done, calling API...');

      // FASE 2: Delete on server in background
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete lead');
      }
      
      console.log('[LeadsPage] API delete success');
      return true;
      
    } catch (error) {
      console.error('[LeadsPage] Delete failed, rolling back:', error);

      // ROLLBACK: Ripristina lead eliminato
      if (deletedLead) {
        mutate(
          (key) => typeof key === 'string' && key.startsWith('/api/leads'),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (current: any) => {
            if (!current) return current;
            return {
              ...current,
              leads: [deletedLead, ...(current.leads || [])],
              total: (current.total || 0) + 1,
            };
          },
          { revalidate: false }
        );
      }

      return false;
    }
  };

  const handleDeleteMultipleLeads = async (
    leadIds: string[]
  ): Promise<number> => {
    // Store leads originali per rollback
    let deletedLeads: Lead[] = [];
    
    try {
      console.log('[LeadsPage] Batch delete (optimistic):', leadIds.length, 'leads');
      
      // FASE 1: Rimuovi IMMEDIATAMENTE dalla UI (optimistic)
      mutate(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (current: any) => {
          if (!current) return current;
          
          // Salva i lead che stiamo per rimuovere (per rollback)
          deletedLeads = current.leads.filter((l: Lead) => leadIds.includes(l.id));
          
          return {
            ...current,
            leads: current.leads.filter((l: Lead) => !leadIds.includes(l.id)),
            total: Math.max(0, (current.total || 0) - leadIds.length),
          };
        },
        { revalidate: false }
      );
      
      console.log('[LeadsPage] Optimistic removal done, calling API...');
      
      // FASE 2: Delete on server in background
      let deletedCount = 0;
      const errors: string[] = [];
      
      for (const leadId of leadIds) {
        try {
          const res = await fetch(`/api/leads/${leadId}`, {
            method: 'DELETE',
          });

          if (res.ok) {
            deletedCount++;
          } else {
            errors.push(leadId);
          }
        } catch (error) {
          console.error(`Error deleting lead ${leadId}:`, error);
          errors.push(leadId);
        }
      }
      
      // Se ci sono errori parziali, rollback solo per i lead che hanno fallito
      if (errors.length > 0 && errors.length < leadIds.length) {
        console.warn('[LeadsPage] Partial failure, rolling back failed deletions:', errors);
        
        const failedLeads = deletedLeads.filter(l => errors.includes(l.id));
        
        mutate(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (current: any) => {
            if (!current) return current;
            return {
              ...current,
              leads: [...failedLeads, ...(current.leads || [])],
              total: (current.total || 0) + failedLeads.length,
            };
          },
          { revalidate: false }
        );
      }
      
      // Se tutti i delete falliscono, rollback completo
      if (errors.length === leadIds.length) {
        throw new Error('All deletions failed');
      }
      
      console.log('[LeadsPage] Batch delete completed:', deletedCount, 'succeeded,', errors.length, 'failed');
      return deletedCount;
      
    } catch (error) {
      console.error('[LeadsPage] Batch delete failed completely, rolling back:', error);
      
      // ROLLBACK: Ripristina TUTTI i lead rimossi
      if (deletedLeads.length > 0) {
        mutate(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (current: any) => {
            if (!current) return current;
            return {
              ...current,
              leads: [...deletedLeads, ...(current.leads || [])],
              total: (current.total || 0) + deletedLeads.length,
            };
          },
          { revalidate: false }
        );
      }
      
      return 0;
    }
  };

  const handleUpdateLead = async (
    leadId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updates: Partial<any>
  ): Promise<boolean> => {
    // Store original lead for rollback
    let originalLead: Lead | null = null;

    try {
      console.log('[LeadsPage] Update lead (optimistic):', leadId);
      
      // FASE 1: Optimistic update IMMEDIATO (usa pattern matching)
      mutate(
        (key) => typeof key === 'string' && key.startsWith('/api/leads'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (current: any) => {
          if (!current || !current.leads) return current;

          const updatedLeads = current.leads.map((l: Lead) => {
            if (l.id === leadId) {
              originalLead = { ...l }; // Save original
              return {
                ...l,
                ...updates,
                updated_at: new Date().toISOString(),
              };
            }
            return l;
          });

          return {
            ...current,
            leads: updatedLeads,
          };
        },
        { revalidate: false }
      );
      
      console.log('[LeadsPage] Optimistic update done, calling API...');

      // FASE 2: Update on server in background
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        throw new Error('Failed to update lead');
      }
      
      console.log('[LeadsPage] API update success');
      return true;
      
    } catch (error) {
      console.error('[LeadsPage] Update failed, rolling back:', error);

      // ROLLBACK: Ripristina lead originale
      if (originalLead) {
        mutate(
          (key) => typeof key === 'string' && key.startsWith('/api/leads'),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (current: any) => {
            if (!current || !current.leads) return current;
            return {
              ...current,
              leads: current.leads.map((l: Lead) =>
                l.id === leadId ? originalLead : l
              ),
            };
          },
          { revalidate: false }
        );
      }

      return false;
    }
  };
  
  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  const handleItemsPerPageChange = (itemsPerPage: number) => {
    setItemsPerPage(itemsPerPage);
    setCurrentPage(1); // Reset to page 1 when changing items per page
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
                onClick={() => mutateLocal()}
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
            allLeads={filteredLeads}
            loading={loading}
            filters={filters}
            onFiltersChange={setFilters}
            totalCount={total}
            sourcesLookup={sourcesLookup}
            sourcesColorLookup={sourcesColorLookup}
            onDeleteLead={handleDeleteLead}
            onDeleteMultipleLeads={handleDeleteMultipleLeads}
            onUpdateLead={handleUpdateLead}
            currentPage={currentPage}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
            className="w-full"
          />
        </div>
      </div>

      {/* Modals */}
      <NewLeadModal
        open={showNewLeadModal}
        onOpenChange={setShowNewLeadModal}
      />
      </div>
    </AppLayoutCustom>
  );
}
