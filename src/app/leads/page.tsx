'use client';

import { useState, useMemo, useEffect } from 'react';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { useLeadsList } from '@/hooks/use-leads-list';
import { LeadsStats } from '@/components/leads/leads-stats';
import { LeadsDataTable } from '@/components/leads-modified/leads-data-table-improved';
import { NewLeadModal } from '@/components/leads/new-lead-modal';
import { LeadsFilters, LeadData } from '@/types/leads';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Plus } from 'lucide-react';
import { ActivityData } from '@/types/activities';

export default function LeadsPage() {
  const [filters, setFilters] = useState<LeadsFilters>({});
  const [newLeadModalOpen, setNewLeadModalOpen] = useState(false);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  // 🚀 Sistema leads ottimizzato (ex A/B test vincitore)
  const {
    leads,
    loading,
    error,
    totalCount,
    refresh,
    createLead,
    updateLead,
    deleteLead,
    deleteMultipleLeads,
  } = useLeadsList({
    filters,
    enableSmartCache: false, // Cache busting per dati sempre freschi
    enabled: true,
  });

  // Carica tutte le attività per calcolare i "contattati entro 48h"
  useEffect(() => {
    async function loadActivities() {
      if (!leads.length) return;
      
      setActivitiesLoading(true);
      try {
        const response = await fetch('/api/activities?loadAll=true');
        if (response.ok) {
          const data = await response.json();
          setActivities(data.data || []);
        }
      } catch (error) {
        console.error('Error loading activities:', error);
      } finally {
        setActivitiesLoading(false);
      }
    }

    loadActivities();
  }, [leads.length]); // Solo quando cambiano i leads

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
    
    // Lead "contattati" entro 48h - attività entro 48 ore dalla creazione del lead
    const leadContattatiEntro48h = leads.filter(lead => {
      // Verifica se il lead ha una data di creazione valida
      if (!lead.Data) return false;
      
      const leadCreationDate = new Date(lead.Data);
      const leadPlus48Hours = new Date(leadCreationDate.getTime() + 48 * 60 * 60 * 1000); // +48 ore dalla creazione
      
      // Trova se ci sono attività per questo lead entro 48 ore dalla sua creazione
      const hasActivityWithin48h = activities.some(activity => {
        // Verifica se l'attività è collegata a questo lead
        const activityLeadIds = activity['ID Lead'] || [];
        const isLinkedToLead = activityLeadIds.includes(lead.id) || activityLeadIds.includes(lead.ID);
        
        if (!isLinkedToLead || !activity.Data) return false;
        
        // Verifica se l'attività è stata creata entro 48 ore dalla creazione del lead
        const activityDate = new Date(activity.Data);
        return activityDate >= leadCreationDate && activityDate <= leadPlus48Hours;
      });
      
      return hasActivityWithin48h;
    }).length;
    
    console.log('📊 Leads:', leads.length, '| Attività:', activities.length, '| Contattati 48h:', leadContattatiEntro48h);
    
    // Calcoli per i tassi
    const totale = leads.length;
    
    // Calcola la percentuale dei lead contattati entro 48h
    const contattatiEntro48h = totale > 0 ? Math.round((leadContattatiEntro48h / totale) * 100) : 0;
    
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
    const qualificati = byStato['Qualificato'] || 0;
    const clienti = byStato['Cliente'] || 0;
    
    const tassoQualificazione = totale > 0 ? Math.round((qualificati / totale) * 100) : 0;
    const tassoConversione = totale > 0 ? Math.round((clienti / totale) * 100) : 0;
    
    return {
      totale,
      nuoviUltimi7Giorni,
      contattatiEntro48h,
      tassoQualificazione,
      tassoConversione,
      byStato,
      byProvenienza
    };
  }, [leads, activities]);

  // Handle create new lead
  const handleCreateClick = () => {
    setNewLeadModalOpen(true);
  };

  // Handle successful lead creation
  const handleLeadCreated = async (newLead: any) => {
    if (newLead) {
      const success = await createLead(newLead);
      if (!success) {
        console.log('❗ [LeadsPage] Failed to create lead');
      }
    }
  };

  // Handle lead operations
  const handleDeleteLead = async (leadId: string): Promise<boolean> => {
    console.log('🗑️ [LeadsPage] Deleting lead:', leadId);
    const success = await deleteLead(leadId);
    if (success) {
      console.log('✅ [LeadsPage] Lead deleted successfully:', leadId);
    } else {
      console.log('❌ [LeadsPage] Failed to delete lead:', leadId);
    }
    return success;
  };

  const handleDeleteMultipleLeads = async (leadIds: string[]): Promise<number> => {
    console.log('🗑️ [LeadsPage] Deleting multiple leads:', leadIds.length);
    const successCount = await deleteMultipleLeads(leadIds);
    console.log(`✅ [LeadsPage] Deleted ${successCount}/${leadIds.length} leads`);
    return successCount;
  };

  const handleUpdateLead = async (leadId: string, updates: Partial<any>): Promise<boolean> => {
    console.log('✏️ [LeadsPage] Updating lead:', leadId, updates);
    const success = await updateLead(leadId, updates);
    if (success) {
      console.log('✅ [LeadsPage] Lead updated successfully:', leadId);
    } else {
      console.log('❌ [LeadsPage] Failed to update lead:', leadId);
    }
    return success;
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
                  <span>{error}</span>
                </AlertDescription>
              </Alert>
            )}

            {/* Stats */}
            {stats && !loading && (
              <LeadsStats
                stats={stats}
                loading={loading}
                className="w-full"
              />
            )}

            {/* Data Table */}
            <LeadsDataTable
              leads={leads}
              loading={loading}
              filters={filters}
              onFiltersChange={setFilters}
              totalCount={totalCount}
              hasMore={false}
              onLoadMore={() => {}}
              onDeleteLead={handleDeleteLead}
              onDeleteMultipleLeads={handleDeleteMultipleLeads}
              onUpdateLead={handleUpdateLead}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <NewLeadModal
        open={newLeadModalOpen}
        onOpenChange={setNewLeadModalOpen}
        onSuccess={handleLeadCreated}
      />
    </AppLayoutCustom>
  );
}