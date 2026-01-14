'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';
import { Calendar as CalendarIcon } from 'lucide-react';

interface MonthlyExpense {
  id: string;
  nome: string;
  campaignId: string;
  dataInizio: string;
  dataFine: string;
  amount: number;
  note?: string;
}

interface MonthlyExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId?: string;
  campaignName?: string;
  expense?: MonthlyExpense | null;
  onSuccess: () => void;
}

export function MonthlyExpenseDialog({
  open,
  onOpenChange,
  campaignId: propCampaignId,
  campaignName: propCampaignName,
  expense,
  onSuccess,
}: MonthlyExpenseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [campaignId, setCampaignId] = useState(propCampaignId || '');
  const [dataInizio, setDataInizio] = useState<Date | undefined>();
  const [dataFine, setDataFine] = useState<Date | undefined>();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (expense) {
      // Modalità modifica - carica dati esistenti
      setCampaignId(expense.campaignId);
      setDataInizio(expense.dataInizio ? new Date(expense.dataInizio) : undefined);
      setDataFine(expense.dataFine ? new Date(expense.dataFine) : undefined);
      setAmount(expense.amount.toString());
      setNote(expense.note || '');
    } else {
      // Reset form - imposta inizio mese corrente
      setCampaignId(propCampaignId || '');
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setDataInizio(startOfMonth);
      setDataFine(new Date());
      setAmount('');
      setNote('');
    }
  }, [expense, open, propCampaignId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!campaignId || !dataInizio || !dataFine || !amount) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    setLoading(true);

    try {
      const body = {
        campaignId,
        dataInizio: dataInizio.toISOString().split('T')[0],
        dataFine: dataFine.toISOString().split('T')[0],
        amount: parseFloat(amount),
        note,
      };

      const url = expense ? `/api/marketing/expenses/${expense.id}` : '/api/marketing/expenses';
      const method = expense ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Errore durante il salvataggio');
      }

      toast.success(expense ? 'Spesa aggiornata' : 'Spesa registrata');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  // Calcola durata in giorni
  const calculateDuration = () => {
    if (!dataInizio || !dataFine) return null;
    const diff = Math.ceil((dataFine.getTime() - dataInizio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff;
  };

  const duration = calculateDuration();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {expense ? 'Modifica Spesa Mensile' : 'Registra Spesa Mensile'}
          </DialogTitle>
          <DialogDescription>
            Registra quanto hai speso in un periodo specifico per questa campagna.
            {propCampaignName && (
              <span className="block mt-1 font-medium text-foreground">
                Campagna: {propCampaignName}
              </span>
            )}
            {duration && duration > 0 && (
              <span className="block mt-1 text-sm text-muted-foreground">
                Periodo: {duration} {duration === 1 ? 'giorno' : 'giorni'}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Inizio *</Label>
              <DatePicker
                value={dataInizio}
                onChange={setDataInizio}
                placeholder="Seleziona data"
              />
            </div>

            <div className="space-y-2">
              <Label>Data Fine *</Label>
              <DatePicker
                value={dataFine}
                onChange={setDataFine}
                placeholder="Seleziona data"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Importo Speso (€) *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
            <p className="text-xs text-muted-foreground">
              Importo totale speso nel periodo selezionato
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Es: Costo Facebook Ads + Instagram Ads"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvataggio...' : (expense ? 'Aggiorna' : 'Registra')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
