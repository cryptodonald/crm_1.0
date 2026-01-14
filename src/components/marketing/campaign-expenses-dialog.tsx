'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2, Plus, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { MonthlyExpenseDialog } from './monthly-expense-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Expense {
  id: string;
  nome: string;
  dataInizio: string;
  dataFine: string;
  amount: number;
  note?: string;
}

interface CampaignExpensesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
}

export function CampaignExpensesDialog({
  open,
  onOpenChange,
  campaignId,
  campaignName,
}: CampaignExpensesDialogProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  // Carica spese quando il dialog si apre
  useEffect(() => {
    if (open && campaignId) {
      loadExpenses();
    }
  }, [open, campaignId]);

  const loadExpenses = async () => {
    setLoading(true);
    try {
      console.log('🔍 [Dialog] Loading expenses for campaign:', campaignId);
      const response = await fetch(`/api/marketing/expenses?campaignId=${campaignId}`);
      if (!response.ok) {
        console.error('❌ [Dialog] Response not OK:', response.status);
        throw new Error('Errore nel caricamento delle spese');
      }
      
      const data = await response.json();
      console.log('✅ [Dialog] Received data:', data);
      console.log('📊 [Dialog] Expenses count:', data.expenses?.length || 0);
      setExpenses(data.expenses || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
      toast.error('Errore nel caricamento delle spese');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setExpenseDialogOpen(true);
  };

  const handleDeleteClick = (expenseId: string) => {
    setDeletingExpenseId(expenseId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingExpenseId) return;

    try {
      const response = await fetch(`/api/marketing/expenses/${deletingExpenseId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Errore nella eliminazione');

      toast.success('Spesa eliminata');
      loadExpenses(); // Ricarica lista
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Errore nella eliminazione della spesa');
    } finally {
      setDeleteDialogOpen(false);
      setDeletingExpenseId(null);
    }
  };

  const handleExpenseSaved = () => {
    setExpenseDialogOpen(false);
    setEditingExpense(null);
    loadExpenses(); // Ricarica lista
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const calculateTotal = () => {
    return expenses.reduce((sum, exp) => sum + exp.amount, 0);
  };

  const calculateDuration = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Spese Campagna: {campaignName}</DialogTitle>
            <DialogDescription>
              Visualizza e gestisci tutte le spese registrate per questa campagna.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">Caricamento...</p>
              </div>
            ) : expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-lg mb-2">Nessuna spesa registrata</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Inizia a registrare le spese per questa campagna
                </p>
                <Button onClick={() => setExpenseDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi Spesa
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Lista Card-style invece di tabella */}
                <div className="space-y-3">
                  {expenses.map((expense) => {
                    const duration = calculateDuration(expense.dataInizio, expense.dataFine);
                    return (
                      <div
                        key={expense.id}
                        className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-4">
                          {/* Date e Durata */}
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground">Inizio</span>
                              <span className="font-medium">{formatDate(expense.dataInizio)}</span>
                            </div>
                            <span className="text-muted-foreground">→</span>
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground">Fine</span>
                              <span className="font-medium">{formatDate(expense.dataFine)}</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-xs text-muted-foreground">Durata</span>
                              <span className="text-sm font-medium text-primary">
                                {duration} {duration === 1 ? 'giorno' : 'giorni'}
                              </span>
                            </div>
                          </div>

                          {/* Importo e Azioni */}
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-2xl font-bold">{formatCurrency(expense.amount)}</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(expense)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(expense.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Note sotto */}
                        {expense.note && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm text-muted-foreground">{expense.note}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Totale */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Totale Spese Registrate</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {expenses.length} {expenses.length === 1 ? 'registrazione' : 'registrazioni'}
                    </p>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(calculateTotal())}</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setExpenseDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuova Spesa
            </Button>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Chiudi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog per aggiungere/modificare spesa */}
      <MonthlyExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        onSuccess={handleExpenseSaved}
        campaignId={campaignId}
        campaignName={campaignName}
        expense={editingExpense}
      />

      {/* Dialog conferma eliminazione */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa spesa? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
