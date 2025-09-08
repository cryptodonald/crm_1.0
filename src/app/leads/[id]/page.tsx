'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
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
  
  // Funzione per forzare il refresh della pagina
  const forceRefresh = useCallback(() => {
    console.log('🔄 [LeadDetailPage] Force refresh triggered');
    setRefreshKey(prev => prev + 1);
  }, []);

  // Hook personalizzati
  const {
    lead,
    loading,
    error,
    updating,
    deleting,
    refresh,
    updateLead,
    deleteLead,
  } = useLeadDetail({ leadId: id, refreshKey });

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
        <PageBreadcrumb pageName={`${lead.Nome || lead.ID}`} />


        {/* Header profilo lead */}
        <LeadProfileHeader 
          key={`${lead.ID}-${lead.Stato}-${lead.Nome}-${lead.Data}-${refreshKey}`} 
          lead={lead} 
          onRefresh={async () => {
            await refresh();
            forceRefresh();
          }} 
        />


        {/* Contenuto profilo lead (Tabs) */}
        <LeadProfileContent lead={lead} />
      </div>


    </AppLayoutCustom>
  );
}
