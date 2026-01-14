'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { DynamicBreadcrumb } from '@/components/layout/dynamic-breadcrumb';
import { useLeadDetail } from '@/hooks/use-lead-detail';
import { useUsers } from '@/hooks/use-users';
import { LeadProfileHeader } from '@/components/leads-profile/LeadProfileHeader';
import { LeadProfileContent } from '@/components/leads-profile/LeadProfileContent';
import { LeadActionsCard } from '@/components/leads-detail/LeadActionsCard';
import { LeadCompletenessCard } from '@/components/leads-detail/LeadCompletenessCard';
import { LeadActivityTimelineMock } from '@/components/leads-detail/LeadActivityTimelineMock';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function LeadDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  
  // Stati locali
  // Rimosso: dialog eliminazione/indietro. La modifica lead avviene dal pulsante nell'header.
  const [refreshKey, setRefreshKey] = useState(0);
  const [optimisticLeadState, setOptimisticLeadState] = useState<string | null>(null);
  
  // Funzione per forzare il refresh della pagina
  const forceRefresh = useCallback(() => {
    console.log('🔄 [LeadDetailPage] Force refresh triggered');
    setRefreshKey(prev => prev + 1);
  }, []);

  // Hook personalizzati
  const {
    lead: leadFromHook,
    loading,
    error,
    updating,
    deleting,
    refresh,
    updateLead,
    deleteLead,
  } = useLeadDetail({ leadId: id, refreshKey });
  
  // 🚀 Lead con stato ottimistico applicato
  const lead = leadFromHook ? {
    ...leadFromHook,
    Stato: optimisticLeadState || leadFromHook.Stato
  } : null;
  
  // Debug logging
  console.log('🔍 [LeadDetailPage] Lead state:', JSON.stringify({
    leadFromHook: leadFromHook?.Stato,
    optimisticLeadState,
    finalState: lead?.Stato,
  }, null, 2));

  // Attività disattivate temporaneamente (feature Activities rimossa)
  const activities: any[] = [];

  const {
    users: usersData,
  } = useUsers();

  // Gestione errori
  if (error) {
    return (
      <AppLayoutCustom>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
            <div>
              <h3 className="text-lg font-semibold">Errore nel caricamento</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <div className="flex justify-center space-x-2">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Torna indietro
              </Button>
              <Button onClick={refresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Riprova
              </Button>
            </div>
          </div>
        </div>
      </AppLayoutCustom>
    );
  }

  // Loading state
  if (loading || !lead) {
    return (
      <AppLayoutCustom>
        <div className="flex-1 space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-6">
          <Card>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <div className="flex items-start space-x-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            </div>
          </Card>
        </div>
      </AppLayoutCustom>
    );
  }

  // Handlers




  return (
    <AppLayoutCustom>
      <div className="flex-1 space-y-4 p-3 sm:space-y-6 sm:p-4 md:p-6">
        <DynamicBreadcrumb leadName={lead.Nome || lead.ID} />


        {/* Header profilo lead */}
        <LeadProfileHeader 
          key={`lead-header-${lead.ID}-${refreshKey}`} 
          lead={lead}
          onRefresh={async (data?: any) => {
            console.log('🎯 [LeadDetailPage onRefresh] Called with data:', JSON.stringify(data, null, 2));
            console.log('🎯 [LeadDetailPage onRefresh] Current lead.ID:', lead.ID);
            
            // 🚀 Gestisci update ottimistico dello stato
            if (data?.type === 'lead-state-change' && data.leadId === lead.ID) {
              console.log('🚀 [LeadDetailPage] Applicando stato ottimistico:', data.newState);
              setOptimisticLeadState(data.newState);
              return; // Non fare refresh ancora, aspetta la conferma
            }
            
            if (data?.type === 'lead-state-confirmed' && data.leadId === lead.ID) {
              console.log('✅ [LeadDetailPage] Stato confermato, facendo refresh:', data.newState);
              setOptimisticLeadState(null); // Rimuovi lo stato ottimistico
              await refresh();
              // NON fare forceRefresh() - mantieni le attività già caricate
              return;
            }
            
            if (data?.type === 'lead-state-rollback' && data.leadId === lead.ID) {
              console.log('❌ [LeadDetailPage] Rollback stato ottimistico');
              setOptimisticLeadState(null); // Rimuovi lo stato ottimistico
              return;
            }
            
            // Refresh normale per altri casi
            console.log('🔄 [LeadDetailPage] Doing normal refresh');
            await refresh();
            forceRefresh();
          }}
        />


        {/* Contenuto profilo lead (Tabs) */}
        <LeadProfileContent 
          lead={lead} 
          refreshKey={refreshKey}
          onLeadStateChange={async (data?: any) => {
            console.log('🎯 [LeadDetailPage onLeadStateChange] Called from Kanban with data:', JSON.stringify(data, null, 2));
            
            // Gestisci update ottimistico dello stato usando lo stesso handler di onRefresh
            if (data?.type === 'lead-state-change' && data.leadId === lead.ID) {
              console.log('🚀 [LeadDetailPage] Applicando stato ottimistico da Kanban:', data.newState);
              setOptimisticLeadState(data.newState);
              return;
            }
            
            if (data?.type === 'lead-state-confirmed' && data.leadId === lead.ID) {
              console.log('✅ [LeadDetailPage] Stato confermato da Kanban, facendo refresh:', data.newState);
              setOptimisticLeadState(null);
              await refresh();
              // NON fare forceRefresh() qui - causerebbe remount di LeadActivitiesKanban
              // e un fetch che potrebbe tornare dati non sincronizzati da Airtable
              return;
            }
            
            if (data?.type === 'lead-state-rollback' && data.leadId === lead.ID) {
              console.log('❌ [LeadDetailPage] Rollback stato ottimistico da Kanban');
              setOptimisticLeadState(null);
              return;
            }
          }}
        />
      </div>


    </AppLayoutCustom>
  );
}
