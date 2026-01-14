'use client';

import { useState, useEffect } from 'react';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Filter, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { SourceDialog } from '@/components/marketing/source-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MarketingSource {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  color?: string;
  createdTime: string;
}

export default function MarketingSourcesPage() {
  const [sources, setSources] = useState<MarketingSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<MarketingSource | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sourceToDelete, setSourceToDelete] = useState<MarketingSource | null>(null);
  const [deleteError, setDeleteError] = useState<{
    message: string;
    usage?: { leads: number; costs: number; total: number };
  } | null>(null);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/marketing/sources');
      const result = await response.json();

      if (result.success) {
        setSources(result.data);
      } else {
        toast.error('Errore nel caricamento delle fonti');
      }
    } catch (error) {
      console.error('Error fetching sources:', error);
      toast.error('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSources();
  }, []);

  const handleCreate = () => {
    setSelectedSource(null);
    setDialogOpen(true);
  };

  const handleEdit = (source: MarketingSource) => {
    setSelectedSource(source);
    setDialogOpen(true);
  };

  const handleDeleteClick = (source: MarketingSource) => {
    setSourceToDelete(source);
    setDeleteError(null);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!sourceToDelete) return;

    try {
      const response = await fetch(`/api/marketing/sources/${sourceToDelete.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Fonte eliminata');
        fetchSources();
        setDeleteDialogOpen(false);
        setSourceToDelete(null);
        setDeleteError(null);
      } else {
        // Show error with usage info
        setDeleteError({
          message: result.message || result.error,
          usage: result.usage,
        });
      }
    } catch (error) {
      console.error('Error deleting source:', error);
      toast.error('Errore di connessione');
    }
  };

  const activeSources = sources.filter(s => s.active).length;
  const inactiveSources = sources.length - activeSources;

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="Fonti Marketing" />

        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Filter className="h-6 w-6" />
                  <h1 className="text-2xl font-bold tracking-tight">Fonti Marketing</h1>
                </div>
                <p className="text-muted-foreground">
                  Gestisci i canali marketing per tracciare lead e campagne
                </p>
              </div>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Nuova Fonte
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Fonti Totali</CardTitle>
                  <Filter className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{sources.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Canali configurati
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Fonti Attive</CardTitle>
                  <Badge variant="default" className="h-5">Attive</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeSources}</div>
                  <p className="text-xs text-muted-foreground">
                    Utilizzabili per nuove campagne
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Fonti Inattive</CardTitle>
                  <Badge variant="outline" className="h-5">Inattive</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{inactiveSources}</div>
                  <p className="text-xs text-muted-foreground">
                    Non utilizzabili
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Table */}
            <Card>
              <CardHeader>
                <CardTitle>Elenco Fonti</CardTitle>
                <CardDescription>
                  Tutti i canali marketing configurati nel sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-muted-foreground">Caricamento...</div>
                  </div>
                ) : sources.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-muted-foreground mb-4">Nessuna fonte creata</p>
                    <Button onClick={handleCreate} variant="outline">
                      <Plus className="mr-2 h-4 w-4" />
                      Crea la prima fonte
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrizione</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead>Colore</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sources.map((source) => (
                        <TableRow key={source.id}>
                          <TableCell className="font-medium">{source.name}</TableCell>
                          <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                            {source.description || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={source.active ? 'default' : 'outline'}>
                              {source.active ? 'Attiva' : 'Inattiva'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded border"
                                style={{ backgroundColor: source.color || '#3B82F6' }}
                              />
                              <span className="text-xs text-muted-foreground">
                                {source.color || '#3B82F6'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(source)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(source)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <SourceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        source={selectedSource}
        onSuccess={fetchSources}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              {!deleteError ? (
                `Sei sicuro di voler eliminare la fonte "${sourceToDelete?.name}"?`
              ) : (
                <div className="space-y-3">
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      {deleteError.message}
                    </AlertDescription>
                  </Alert>
                  
                  {deleteError.usage && (
                    <div className="space-y-2 text-sm">
                      <p className="font-medium">Utilizzo rilevato:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        {deleteError.usage.leads > 0 && (
                          <li>{deleteError.usage.leads} lead nella tabella Leads</li>
                        )}
                        {deleteError.usage.costs > 0 && (
                          <li>{deleteError.usage.costs} campagne nella tabella Marketing Costs</li>
                        )}
                      </ul>
                      
                      <div className="mt-4 p-3 bg-muted rounded-md">
                        <p className="font-medium mb-2">💡 Alternative:</p>
                        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                          <li>Vai su Airtable e modifica manualmente i record che utilizzano questa fonte</li>
                          <li>Disattiva la fonte invece di eliminarla (modifica → deseleziona "Fonte attiva")</li>
                          <li>Crea una nuova fonte e migra gradualmente i dati</li>
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setDeleteError(null);
              setSourceToDelete(null);
            }}>
              {deleteError ? 'Chiudi' : 'Annulla'}
            </AlertDialogCancel>
            {!deleteError && (
              <AlertDialogAction onClick={handleDeleteConfirm}>
                Elimina
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayoutCustom>
  );
}
