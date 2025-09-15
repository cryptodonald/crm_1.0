'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { useEnvVars } from '@/hooks/use-env-vars';
import { useAuth } from '@/contexts/auth-context';
import { ApiKeysStats } from '@/components/api-keys/api-keys-stats';
import { ApiKeysDataTable } from '@/components/api-keys/api-keys-data-table';
import { CreateApiKeyButton } from '@/components/api-keys/create-api-key-button';
import { ApiKeysEditDialog } from '@/components/api-keys/api-keys-edit-dialog';
import { ApiKeyDetailsDialog } from '@/components/api-keys/api-keys-details-dialog';
import { ApiKeyData } from '@/lib/kv';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ApiKeysPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const {
    apiKeys,
    stats,
    loading,
    error,
    creating,
    updating,
    deleting,
    createApiKey,
    updateApiKey,
    deleteApiKey,
    clearError,
    refresh,
  } = useEnvVars();
  
  // Verifica se l'utente è admin
  const isAdmin = user?.ruolo === 'Admin';
  
  // Effetto per reindirizzare non-admin
  useEffect(() => {
    if (!authLoading && user && !isAdmin) {
      console.log('🚫 [ApiKeysPage] Non-admin user attempting access, redirecting to dashboard');
      router.push('/dashboard');
    }
  }, [user, isAdmin, authLoading, router]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApiKey, setEditingApiKey] = useState<ApiKeyData | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKeyData | null>(null);

  // Handle create new API key
  const handleCreateClick = () => {
    setEditingApiKey(null);
    setDialogOpen(true);
  };

  // Handle edit API key
  const handleEdit = (apiKey: ApiKeyData) => {
    setEditingApiKey(apiKey);
    setDialogOpen(true);
  };

  // Handle view API key details
  const handleView = (apiKey: ApiKeyData) => {
    setSelectedApiKey(apiKey);
    setDetailsDialogOpen(true);
  };

  // Handle successful creation/update
  const handleSuccess = () => {
    setDialogOpen(false);
    setEditingApiKey(null);
    refresh();
  };

  // Loading state durante autenticazione
  if (authLoading) {
    return (
      <AppLayoutCustom>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Verifica autorizzazioni...</p>
          </div>
        </div>
      </AppLayoutCustom>
    );
  }
  
  // Accesso negato per non-admin
  if (user && !isAdmin) {
    return (
      <AppLayoutCustom>
        <div className="flex items-center justify-center h-64">
          <div className="text-center max-w-md">
            <ShieldX className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Accesso Negato
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Solo gli amministratori possono accedere alla gestione delle API Keys.
            </p>
            <Button onClick={() => router.push('/dashboard')} variant="outline">
              Torna alla Dashboard
            </Button>
          </div>
        </div>
      </AppLayoutCustom>
    );
  }

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="Chiavi API" />

        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">
                  Chiavi API
                </h1>
                <p className="text-muted-foreground">
                  Gestisci le tue chiavi API per un accesso sicuro alle API del
                  CRM
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
                <CreateApiKeyButton
                  onClick={handleCreateClick}
                  loading={creating}
                />
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
            <ApiKeysStats stats={stats} />

            {/* API Keys Table */}
            <ApiKeysDataTable
              apiKeys={apiKeys}
              loading={loading}
              onEdit={handleEdit}
              onDelete={deleteApiKey}
              onView={handleView}
            />
          </div>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <ApiKeysEditDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        apiKey={editingApiKey}
        onCreate={createApiKey}
        onUpdate={updateApiKey}
        loading={creating || updating}
      />

      {/* Details Dialog */}
      <ApiKeyDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        apiKey={selectedApiKey}
      />
    </AppLayoutCustom>
  );
}
