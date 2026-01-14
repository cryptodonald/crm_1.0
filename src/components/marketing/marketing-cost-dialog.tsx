'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { toast } from 'sonner';
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
}

interface MarketingCostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cost?: MarketingCost | null;
  onSuccess: () => void;
}

export function MarketingCostDialog({
  open,
  onOpenChange,
  cost,
  onSuccess,
}: MarketingCostDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [fonte, setFonte] = useState<LeadSource>('Meta');
  const [budget, setBudget] = useState('');
  const [costoMensile, setCostoMensile] = useState('');
  const [dataInizio, setDataInizio] = useState<Date | undefined>();
  const [dataFine, setDataFine] = useState<Date | undefined>();
  const [note, setNote] = useState('');
  const [nessunaScadenza, setNessunaScadenza] = useState(false);

  const sources: LeadSource[] = ['Meta', 'Instagram', 'Google', 'Sito', 'Referral', 'Organico'];

  useEffect(() => {
    if (cost) {
      setName(cost.name);
      setFonte(cost.fonte);
      setBudget(cost.budget.toString());
      setCostoMensile(cost.costoMensile ? cost.costoMensile.toString() : '');
      setDataInizio(cost.dataInizio ? new Date(cost.dataInizio) : undefined);
      setDataFine(cost.dataFine ? new Date(cost.dataFine) : undefined);
      setNessunaScadenza(!cost.dataFine);
      setNote(cost.note || '');
    } else {
      // Reset form
      setName('');
      setFonte('Meta');
      setBudget('');
      setCostoMensile('');
      setDataInizio(undefined);
      setDataFine(undefined);
      setNessunaScadenza(false);
      setNote('');
    }
  }, [cost, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !fonte) {
      toast.error('Nome e Fonte sono obbligatori');
      return;
    }

    setLoading(true);

    try {
      const body = {
        name,
        fonte,
        budget: parseFloat(budget) || 0,
        costoMensile: parseFloat(costoMensile) || undefined,
        dataInizio: dataInizio?.toISOString().split('T')[0],
        dataFine: nessunaScadenza ? undefined : dataFine?.toISOString().split('T')[0],
        note,
      };

      const url = cost ? `/api/marketing/costs/${cost.id}` : '/api/marketing/costs';
      const method = cost ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Errore durante il salvataggio');
      }

      toast.success(cost ? 'Campagna aggiornata' : 'Campagna creata');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving marketing cost:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante il salvataggio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{cost ? 'Modifica Campagna' : 'Nuova Campagna Marketing'}</DialogTitle>
          <DialogDescription>
            Inserisci i dati della campagna marketing e il budget allocato.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Campagna *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Es: Meta Ads - Dicembre 2024"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fonte">Fonte *</Label>
            <Select value={fonte} onValueChange={(value) => setFonte(value as LeadSource)}>
              <SelectTrigger id="fonte">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="costoMensile">Costo Mensile (€)</Label>
              <Input
                id="costoMensile"
                type="number"
                step="0.01"
                min="0"
                value={costoMensile}
                onChange={(e) => setCostoMensile(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Costo ricorrente mensile
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budget Totale (€)</Label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                min="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Budget complessivo campagna
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Inizio</Label>
              <DatePicker
                value={dataInizio}
                onChange={setDataInizio}
                placeholder="Seleziona data"
              />
            </div>

            <div className="space-y-2">
              <Label>Data Fine</Label>
              <DatePicker
                value={dataFine}
                onChange={setDataFine}
                placeholder="Seleziona data"
                disabled={nessunaScadenza}
              />
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="nessuna-scadenza"
                  checked={nessunaScadenza}
                  onChange={(e) => {
                    setNessunaScadenza(e.target.checked);
                    if (e.target.checked) {
                      setDataFine(undefined);
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="nessuna-scadenza" className="text-sm text-muted-foreground cursor-pointer">
                  Campagna continua (senza scadenza)
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Dettagli sulla campagna..."
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
              {loading ? 'Salvataggio...' : (cost ? 'Aggiorna' : 'Crea')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
