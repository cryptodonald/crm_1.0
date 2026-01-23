'use client';

import { useState, useMemo } from 'react';
import { LeadData } from '@/types/leads';
import { useMergeLeads } from '@/hooks/use-merge-leads';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Link2, Loader2 } from 'lucide-react';

interface MergeLeadsDialogProps {
  open: boolean;
  leads: LeadData[];
  onOpenChange: (open: boolean) => void;
  onMergeComplete?: () => void;
}

export function MergeLeadsDialog({
  open,
  leads,
  onOpenChange,
  onMergeComplete,
}: MergeLeadsDialogProps) {
  const [step, setStep] = useState<'select-master' | 'preview' | 'confirm'>('select-master');
  const [selectedMasterId, setSelectedMasterId] = useState<string>(leads[0]?.id || '');
  const { mergeLead, merging } = useMergeLeads();

  const { master, duplicates } = useMemo(() => {
    const master = leads.find(l => l.id === selectedMasterId) || leads[0];
    const duplicates = leads.filter(l => l.id !== master?.id);
    return { master, duplicates };
  }, [leads, selectedMasterId]);

  const preview = useMemo(() => {
    if (!master) return null;

    const fields = ['Email', 'Telefono', 'Indirizzo', 'CAP', 'Città', 'Esigenza', 'Note'] as const;

    return fields.map(field => {
      const masterValue = (master as any)[field];
      const sources = duplicates
        .map(dup => ({ nome: dup.Nome, valore: (dup as any)[field] }))
        .filter(s => s.valore && !masterValue);

      return { field, masterValue, sources };
    });
  }, [master, duplicates]);

  const handleMerge = async () => {
    if (!master) return;
    const success = await mergeLead(master.id, duplicates.map(d => d.id));
    if (success) {
      onOpenChange(false);
      onMergeComplete?.();
      setStep('select-master');
      setSelectedMasterId(leads[0]?.id || '');
    }
  };

  if (!master) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Unisci Lead Duplicati
          </DialogTitle>
          <DialogDescription>
            Stai per unire {duplicates.length} lead in "{master.Nome}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex gap-2">
            <Button
              variant={step === 'select-master' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStep('select-master')}
              disabled={merging}
            >
              1. Seleziona Master
            </Button>
            <Button
              variant={step === 'preview' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStep('preview')}
              disabled={merging || !selectedMasterId}
            >
              2. Anteprima
            </Button>
            <Button
              variant={step === 'confirm' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStep('confirm')}
              disabled={merging || !selectedMasterId}
            >
              3. Conferma
            </Button>
          </div>

          {step === 'select-master' && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Seleziona quale lead mantenere come "principale". Gli altri verranno consolidati in questo.
                </AlertDescription>
              </Alert>

              <RadioGroup value={selectedMasterId} onValueChange={setSelectedMasterId}>
                <div className="space-y-3">
                  {leads.map(lead => (
                    <div key={lead.id} className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50">
                      <RadioGroupItem value={lead.id} id={`master-${lead.id}`} />
                      <Label htmlFor={`master-${lead.id}`} className="flex-1 cursor-pointer">
                        <div className="font-medium">{lead.Nome}</div>
                        <div className="text-sm text-muted-foreground">
                          {lead.Telefono && `Tel: ${lead.Telefono}`}
                          {lead.Email && ` | Email: ${lead.Email}`}
                        </div>
                      </Label>
                      {lead.id === selectedMasterId && <Badge variant="default">Master</Badge>}
                    </div>
                  ))}
                </div>
              </RadioGroup>

              <Button className="w-full" onClick={() => setStep('preview')}>
                Avanti
              </Button>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Ecco come verranno consolidati i dati. I campi vuoti del master saranno riempiti con dati dai duplicati.
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Lead Master: {master.Nome}</CardTitle>
                  <CardDescription>I dati verranno consolidati qui</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {preview?.map(item => (
                    <div key={item.field} className="space-y-2">
                      <div className="font-medium text-sm">{item.field}</div>
                      <div className="ml-4 space-y-2">
                        {item.masterValue ? (
                          <div className="rounded bg-green-50 p-2 text-sm">
                            <span className="font-medium">Master:</span> {String(item.masterValue)}
                          </div>
                        ) : (
                          <div className="rounded bg-gray-50 p-2 text-sm text-muted-foreground">
                            (vuoto)
                          </div>
                        )}

                        {item.sources.length > 0 && (
                          <div className="space-y-1">
                            {item.sources.map((source, idx) => (
                              <div key={idx} className="rounded bg-blue-50 p-2 text-sm">
                                <span className="font-medium text-blue-700">{source.nome}:</span> {String(source.valore)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep('select-master')}>
                  Indietro
                </Button>
                <Button className="flex-1" onClick={() => setStep('confirm')}>
                  Procedi a Conferma
                </Button>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Questa azione è irreversibile. Saranno eliminati {duplicates.length} lead e consolidati in "{master.Nome}".
                </AlertDescription>
              </Alert>

              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="text-base">Riepilogo Merge</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Lead Master:</span> {master.Nome}
                  </div>
                  <div>
                    <span className="font-medium">Lead da unire:</span> {duplicates.length}
                    <div className="ml-4 space-y-1 mt-1">
                      {duplicates.map(d => (
                        <div key={d.id} className="text-muted-foreground">
                          • {d.Nome}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <span className="font-medium">Relazioni preserve:</span>
                    <div className="ml-4 text-muted-foreground">
                      • Tutti gli ordini e le attività verranno associati al master
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep('preview')} disabled={merging}>
                  Indietro
                </Button>
                <Button className="flex-1 bg-destructive hover:bg-destructive/90" onClick={handleMerge} disabled={merging}>
                  {merging ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Unendo...
                    </>
                  ) : (
                    'Conferma Merge'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
