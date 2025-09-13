'use client';

import { useState, useMemo } from 'react';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { useClientsList } from '@/hooks/use-clients-list';
import { ClientsStats } from '@/components/clients/clients-stats';
import { LeadsDataTable } from '@/components/leads-modified/leads-data-table-improved';
import { LeadsFilters } from '@/types/leads';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ClientsPage() {
  const [filters, setFilters] = useState<Omit<LeadsFilters, 'stato'>>({});

  // 🚀 Sistema clienti basato su useClientsList con filtro automatico stato='Cliente'
  const {
    clients,
    loading,
    error,
    totalCount,
    refresh,
    updateClient,
    deleteClient,
    deleteMultipleClients,
  } = useClientsList({
    filters,
    enableSmartCache: false, // Cache busting per dati sempre freschi
    enabled: true,
  });

  // Handle client operations (adapter da LeadsDataTable a ClientsList)
  const handleDeleteClient = async (clientId: string): Promise<boolean> => {
    console.log('🗑️ [ClientsPage] Deleting client:', clientId);
    const success = await deleteClient(clientId);
    if (success) {
      console.log('✅ [ClientsPage] Client deleted successfully:', clientId);
    } else {
      console.log('❌ [ClientsPage] Failed to delete client:', clientId);
    }
    return success;
  };

  const handleDeleteMultipleClients = async (clientIds: string[]): Promise<number> => {
    console.log('🗑️ [ClientsPage] Deleting multiple clients:', clientIds.length);
    const successCount = await deleteMultipleClients(clientIds);
    console.log(`✅ [ClientsPage] Deleted ${successCount}/${clientIds.length} clients`);
    return successCount;
  };

  const handleUpdateClient = async (clientId: string, updates: Partial<any>): Promise<boolean> => {
    console.log('✏️ [ClientsPage] Updating client:', clientId, updates);
    const success = await updateClient(clientId, updates);
    if (success) {
      console.log('✅ [ClientsPage] Client updated successfully:', clientId);
    } else {
      console.log('❌ [ClientsPage] Failed to update client:', clientId);
    }
    return success;
  };

  // Converte filtri clienti a filtri leads (aggiungendo stato='Cliente' automaticamente)
  const leadsFilters: LeadsFilters = useMemo(() => {
    return {
      ...filters,
      stato: ['Cliente'], // ⭐ FILTRO FISSO: Solo clienti
    };
  }, [filters]);

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="Clienti" />

        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">
                  Clienti
                </h1>
                <p className="text-muted-foreground">
                  Gestisci e monitora tutti i tuoi clienti acquisiti
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  disabled={loading}
                  title="Aggiorna i dati clienti"
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                  />
                  {loading ? 'Aggiornando...' : 'Aggiorna'}
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
            {!loading && (
              <ClientsStats
                clients={clients}
                loading={loading}
                error={error}
                className="w-full"
              />
            )}

            {/* Data Table - Riutilizzo LeadsDataTable con adattatori per clienti */}
            <LeadsDataTable
              leads={clients} // ClientData è alias di LeadData
              loading={loading}
              filters={leadsFilters}
              onFiltersChange={(newFilters) => {
                // Rimuovi stato dai filtri (è sempre 'Cliente' fisso)
                const { stato, ...clientFilters } = newFilters;
                setFilters(clientFilters);
              }}
              totalCount={totalCount}
              hasMore={false}
              onLoadMore={() => {}}
              onDeleteLead={handleDeleteClient} // Adapter
              onDeleteMultipleLeads={handleDeleteMultipleClients} // Adapter
              onUpdateLead={handleUpdateClient} // Adapter
              className="w-full"
            />
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  );
}
