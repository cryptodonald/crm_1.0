'use client';

import { useState, useEffect } from 'react';
import { LeadData } from '@/types/leads';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Link2, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DuplicatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: LeadData[];
}

export function DuplicatesDialog({ open, onOpenChange, leads }: DuplicatesDialogProps) {
  const [duplicateGroups, setDuplicateGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadDuplicates();
    }
  }, [open]);

  const loadDuplicates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/leads/duplicates?threshold=0.85');
      if (!response.ok) {
        throw new Error('Failed to load duplicates');
      }
      const data = await response.json();
      
      // Map groups to include lead details
      const groupsWithDetails = (data.groups || []).map((group: any) => {
        const master = data.leadsMap?.[group.masterId];
        const dupes = group.duplicateIds
          .map((id: string) => data.leadsMap?.[id])
          .filter((l: any) => l);
        
        return {
          masterId: group.masterId,
          masterLead: master,
          duplicateLeads: dupes,
          similarity: group.similarity,
        };
      });

      setDuplicateGroups(groupsWithDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.duplicateLeads.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Lead Duplicati Rilevati
          </DialogTitle>
          <DialogDescription>
            {loading ? 'Caricamento...' : `Trovati ${duplicateGroups.length} gruppi di duplicati (${totalDuplicates} lead totali)`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-3">Caricamento duplicati...</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && !error && duplicateGroups.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nessun duplicato trovato!</h3>
              <p className="text-sm text-muted-foreground">
                Il sistema è pulito, non ci sono lead duplicati rilevati.
              </p>
            </div>
          )}

          {!loading && !error && duplicateGroups.length > 0 && (
            <div className="space-y-4">
              {duplicateGroups.map((group, idx) => (
                <Card key={group.masterId} className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="default">Gruppo #{idx + 1}</Badge>
                          <Badge variant="outline">
                            Similarità: {Math.round(group.similarity * 100)}%
                          </Badge>
                          <Badge variant="secondary">
                            {group.duplicateLeads.length} duplicati
                          </Badge>
                        </div>
                      </div>

                      {/* Master Lead */}
                      <div className="border-l-4 border-green-500 pl-4 py-2 bg-white dark:bg-black/20 rounded-r">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-green-600">MASTER</Badge>
                          <span className="font-semibold">{group.masterLead?.Nome || 'N/A'}</span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-0.5">
                          {group.masterLead?.Telefono && <div>📞 {group.masterLead.Telefono}</div>}
                          {group.masterLead?.Email && <div>📧 {group.masterLead.Email}</div>}
                          {group.masterLead?.Città && <div>📍 {group.masterLead.Città}</div>}
                          {group.masterLead?.Data && <div>📅 {new Date(group.masterLead.Data).toLocaleDateString('it-IT')}</div>}
                        </div>
                      </div>

                      {/* Duplicate Leads */}
                      <div className="space-y-2">
                        {group.duplicateLeads.map((dup: any) => (
                          <div key={dup.id} className="border-l-4 border-amber-500 pl-4 py-2 bg-white dark:bg-black/20 rounded-r">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-300">DUPLICATO</Badge>
                              <span className="font-medium">{dup.Nome || 'N/A'}</span>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-0.5">
                              {dup.Telefono && <div>📞 {dup.Telefono}</div>}
                              {dup.Email && <div>📧 {dup.Email}</div>}
                              {dup.Città && <div>📍 {dup.Città}</div>}
                              {dup.Data && <div>📅 {new Date(dup.Data).toLocaleDateString('it-IT')}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center border-t pt-4 mt-4">
          <p className="text-sm text-muted-foreground">
            💡 Usa la selezione multipla nella tabella per unire i duplicati
          </p>
          <Button onClick={() => onOpenChange(false)}>Chiudi</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
