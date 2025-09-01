'use client';

import { useState, useEffect } from 'react';
import { AppLayoutCustom } from "@/components/layout/app-layout-custom"
import { PageBreadcrumb } from "@/components/layout/page-breadcrumb"
import { useEnvVars } from '@/hooks/use-env-vars';
import { ApiKeysStats } from '@/components/api-keys/api-keys-stats';
import { ApiKeysDataTable } from '@/components/api-keys/api-keys-data-table';
import { CreateApiKeyButton } from '@/components/api-keys/create-api-key-button';
import { ApiKeysEditDialog } from '@/components/api-keys/api-keys-edit-dialog';
import { ApiKeyDetailsDialog } from '@/components/api-keys/api-keys-details-dialog';
import { ApiKeyData } from '@/lib/kv';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ApiKeysPage() {
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

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="Chiavi API" />
        
        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Chiavi API</h1>
                <p className="text-muted-foreground">
                  Gestisci le tue chiavi API per un accesso sicuro alle API del CRM
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
