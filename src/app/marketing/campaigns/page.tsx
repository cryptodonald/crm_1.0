'use client';

import { useState, useEffect } from 'react';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, TrendingUp, Euro, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { MarketingCostDialog } from '@/components/marketing/marketing-cost-dialog';
import { CampaignExpensesDialog } from '@/components/marketing/campaign-expenses-dialog';
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
import type { LeadSource } from '@/types/analytics';

interface MarketingCost {
  id: string;
  name: string;
  fonte: LeadSource;
  budget: number;
  costoMensile?: number;
  dataInizio?: string;
  dataFine?: string;
  note?: string;
  createdTime: string;
}

export default function MarketingCampaignsPage() {
  const [costs, setCosts] = useState<MarketingCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCost, setSelectedCost] = useState<MarketingCost | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [costToDelete, setCostToDelete] = useState<MarketingCost | null>(null);
  const [expensesDialogOpen, setExpensesDialogOpen] = useState(false);
  const [selectedCampaignForExpenses, setSelectedCampaignForExpenses] = useState<{ id: string; name: string } | null>(null);

  const fetchCosts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/marketing/costs');
      const result = await response.json();

      if (result.success) {
        setCosts(result.data);
      } else {
        toast.error('Errore nel caricamento dei dati');
      }
    } catch (error) {
      console.error('Error fetching costs:', error);
      toast.error('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCosts();
  }, []);

  const handleCreate = () => {
    setSelectedCost(null);
    setDialogOpen(true);
  };

  const handleEdit = (cost: MarketingCost) => {
    setSelectedCost(cost);
    setDialogOpen(true);
  };

  const handleDeleteClick = (cost: MarketingCost) => {
    setCostToDelete(cost);
    setDeleteDialogOpen(true);
  };

  const handleViewExpenses = (cost: MarketingCost) => {
    setSelectedCampaignForExpenses({ id: cost.id, name: cost.name });
    setExpensesDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!costToDelete) return;

    try {
      const response = await fetch(`/api/marketing/costs/${costToDelete.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Campagna eliminata');
        fetchCosts();
      } else {
        toast.error(result.error || 'Errore durante l\'eliminazione');
      }
    } catch (error) {
      console.error('Error deleting cost:', error);
      toast.error('Errore di connessione');
    } finally {
      setDeleteDialogOpen(false);
      setCostToDelete(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const totalBudget = costs.reduce((sum, cost) => sum + cost.budget, 0);
  const activeCampaigns = costs.filter(c => {
    if (!c.dataFine) return true;
    return new Date(c.dataFine) >= new Date();
  }).length;

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="Campagne Marketing" />

        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-6 w-6" />
                  <h1 className="text-2xl font-bold tracking-tight">Campagne Marketing</h1>
                </div>
                <p className="text-muted-foreground">
                  Gestisci budget e costi delle campagne marketing
                </p>
              </div>
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Nuova Campagna
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Totale</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
            <p className="text-xs text-muted-foreground">
              Allocato su {costs.length} campagne
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campagne Attive</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              In corso o senza data fine
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Medio</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(costs.length > 0 ? totalBudget / costs.length : 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per campagna
            </p>
          </CardContent>
            </Card>
            </div>

            {/* Table */}
            <Card>
        <CardHeader>
          <CardTitle>Elenco Campagne</CardTitle>
          <CardDescription>
            Tutte le campagne marketing con budget e periodo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Caricamento...</div>
            </div>
          ) : costs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground mb-4">Nessuna campagna creata</p>
              <Button onClick={handleCreate} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Crea la prima campagna
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead className="text-right">Costo/Mese</TableHead>
                  <TableHead className="text-right">Budget Tot.</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell className="font-medium">{cost.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{cost.fonte}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {cost.costoMensile ? formatCurrency(cost.costoMensile) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(cost.budget)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(cost.dataInizio)} → {cost.dataFine ? formatDate(cost.dataFine) : '∞'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {cost.note || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewExpenses(cost)}
                          title="Visualizza spese"
                        >
                          <DollarSign className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(cost)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(cost)}
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
      <MarketingCostDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        cost={selectedCost}
        onSuccess={fetchCosts}
      />

      <CampaignExpensesDialog
        open={expensesDialogOpen}
        onOpenChange={setExpensesDialogOpen}
        campaignId={selectedCampaignForExpenses?.id || ''}
        campaignName={selectedCampaignForExpenses?.name || ''}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare la campagna "{costToDelete?.name}"?
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayoutCustom>
  );
}
