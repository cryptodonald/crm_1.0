'use client';

import { useState, useMemo } from 'react';
import { LeadData } from '@/types/leads';
import { useMergeLeads } from '@/hooks/use-merge-leads';
import {
  detectStateConflict,
  detectAssigneeConflict,
  getUniqueStates,
  getUniqueAssignees,
  getAttachmentsPreview,
} from '@/lib/merge-utils';
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
import { ChevronRight, Loader2 } from 'lucide-react';

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
  const [step, setStep] = useState<'select-master' | 'preview' | 'review' | 'confirm'>('select-master');
  const [selectedMasterId, setSelectedMasterId] = useState<string>(leads[0]?.id || '');
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
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
    console.log('[Dialog] Starting merge...');
    const success = await mergeLead(master.id, duplicates.map(d => d.id), {
      selectedState: selectedState || undefined,
      selectedAssignee: selectedAssignee || undefined,
    });
    console.log(`[Dialog] Merge result: success=${success}`);
    if (success) {
      console.log('[Dialog] Merge successful, closing modal...');
      onOpenChange(false);
      onMergeComplete?.();
      setStep('select-master');
      setSelectedMasterId(leads[0]?.id || '');
      setSelectedState('');
      setSelectedAssignee('');
    } else {
      console.error('[Dialog] Merge failed but no error shown?');
    }
  };

  if (!master) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Unisci Lead Duplicati
          </DialogTitle>
          <DialogDescription>
            {duplicates.length} {duplicates.length === 1 ? 'lead' : 'lead'} verranno consolidati in "{master.Nome}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={step === 'select-master' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStep('select-master')}
              disabled={merging}
            >
              1. Master
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
              variant={step === 'review' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStep('review')}
              disabled={merging || !selectedMasterId}
            >
              3. Scelte
            </Button>
            <Button
              variant={step === 'confirm' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStep('confirm')}
              disabled={merging || !selectedMasterId}
            >
              4. Conferma
            </Button>
          </div>

          {step === 'select-master' && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-foreground">
                <p>Seleziona quale lead mantenere come principale. Gli altri verranno consolidati in questo.</p>
              </div>

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
              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-foreground">
                <p>Anteprima dei dati che verranno consolidati. I campi vuoti del master saranno riempiti dai duplicati.</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lead Master: {master.Nome}</CardTitle>
                  <CardDescription>Dati di consolidamento</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {preview?.map(item => (
                    <div key={item.field} className="space-y-2">
                      <div className="font-semibold text-sm text-foreground">{item.field}</div>
                      <div className="ml-4 space-y-2">
                        {item.masterValue ? (
                          <div className="rounded border bg-muted/50 p-2 text-sm">
                            <span className="font-medium">Master:</span> {String(item.masterValue)}
                          </div>
                        ) : (
                          <div className="rounded border border-dashed bg-muted/30 p-2 text-sm text-muted-foreground">
                            (vuoto)
                          </div>
                        )}

                        {item.sources.length > 0 && (
                          <div className="space-y-1">
                            {item.sources.map((source, idx) => (
                              <div key={idx} className="rounded border bg-muted/30 p-2 text-sm">
                                <span className="font-medium text-foreground">{source.nome}:</span> {String(source.valore)}
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
                <Button className="flex-1" onClick={() => setStep('review')}>
                  Procedi a Scelte
                </Button>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 text-sm text-foreground">
                <p>Seleziona le opzioni per i campi conflittuali.</p>
              </div>

              {/* Debug logging */}
              {(() => {
                console.log('[Dialog Review] Master data:', master);
                console.log('[Dialog Review] Duplicates data:', duplicates);
                console.log('[Dialog Review] Master Stato:', (master as any).Stato);
                console.log('[Dialog Review] Master Assegnatario:', (master as any).Assegnatario);
                
                const hasStateConflict = detectStateConflict(master as any, duplicates as any);
                const hasAssigneeConflict = detectAssigneeConflict(master as any, duplicates as any);
                const attachmentsPreview = getAttachmentsPreview(master as any, duplicates as any);
                
                console.log('[Dialog Review] State conflict:', hasStateConflict);
                console.log('[Dialog Review] Assignee conflict:', hasAssigneeConflict);
                console.log('[Dialog Review] Attachments preview:', attachmentsPreview);
                console.log('[Dialog Review] Show state radio?', hasStateConflict);
                console.log('[Dialog Review] Show assignee radio?', hasAssigneeConflict);
                console.log('[Dialog Review] Show attachments?', attachmentsPreview.totalCount > 0);
                
                return null;
              })()}

              {/* Stato Section */}
              {detectStateConflict(master as any, duplicates as any) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quale Stato mantenere?</CardTitle>
                    <CardDescription>
                      Gli stati sono diversi tra il master e i duplicati.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup value={selectedState} onValueChange={setSelectedState}>
                      <div className="space-y-3">
                        {getUniqueStates(master as any, duplicates as any).map((state) => (
                          <div key={state} className="flex items-center space-x-2">
                            <RadioGroupItem value={state} id={`state-${state}`} />
                            <Label htmlFor={`state-${state}`} className="cursor-pointer">
                              {state}
                              {state === (master as any).Stato && (
                                <Badge variant="outline" className="ml-2 text-xs">Master</Badge>
                              )}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>
              )}

              {/* Assegnatario Section */}
              {detectAssigneeConflict(master as any, duplicates as any) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Chi deve gestire il lead?</CardTitle>
                    <CardDescription>
                      Gli assegnatari sono diversi tra il master e i duplicati.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup value={selectedAssignee} onValueChange={setSelectedAssignee}>
                      <div className="space-y-3">
                        {getUniqueAssignees(master as any, duplicates as any).map((assignee) => (
                          <div key={assignee} className="flex items-center space-x-2">
                            <RadioGroupItem value={assignee} id={`assignee-${assignee}`} />
                            <Label htmlFor={`assignee-${assignee}`} className="cursor-pointer">
                              {assignee}
                              {assignee === (master as any).Assegnatario && (
                                <Badge variant="outline" className="ml-2 text-xs">Master</Badge>
                              )}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>
              )}

              {/* Allegati Section */}
              {getAttachmentsPreview(master as any, duplicates as any).totalCount > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Allegati da copiare</CardTitle>
                    <CardDescription>
                      Verranno copiati tutti gli allegati dal master e dai duplicati.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Dal master:</span> {getAttachmentsPreview(master as any, duplicates as any).masterCount} allegati
                      </div>
                      <div>
                        <span className="font-medium">Dai duplicati:</span> {getAttachmentsPreview(master as any, duplicates as any).duplicateCount} allegati
                      </div>
                      <div className="pt-2 border-t">
                        <span className="font-medium">Totale:</span> {getAttachmentsPreview(master as any, duplicates as any).totalCount} allegati
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep('preview')} disabled={merging}>
                  Indietro
                </Button>
                <Button className="flex-1" onClick={() => setStep('confirm')} disabled={merging}>
                  Procedi a Conferma
                </Button>
              </div>
            </div>
          )}

          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground">
                <p className="font-medium">Avvertenza:</p>
                <p className="mt-1">Questa azione è irreversibile. Saranno eliminati {duplicates.length} {duplicates.length === 1 ? 'lead' : 'lead'} e consolidati in "{master.Nome}".</p>
              </div>

              <Card>
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
                <Button className="flex-1" variant="default" onClick={handleMerge} disabled={merging}>
                  {merging ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Consolidamento in corso
                    </>
                  ) : (
                    <>Unisci Lead</>
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
