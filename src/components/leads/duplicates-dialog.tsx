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
import { Loader2, AlertCircle, CheckCircle2, Filter } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

interface DuplicatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: LeadData[];
  onFilterDuplicates?: (leadIds: string[]) => void;
}

export function DuplicatesDialog({ open, onOpenChange, leads, onFilterDuplicates }: DuplicatesDialogProps) {
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
      console.log('📞 Fetching duplicates...');
      const response = await fetch('/api/leads/duplicates?threshold=0.85');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ API error:', response.status, errorData);
        throw new Error(`Failed to load duplicates: ${response.status} - ${errorData.error || errorData.details || 'Unknown'}`);
      }
      const data = await response.json();
      
      console.log('🔗 Loaded duplicates:', data);
      
      // API ritorna 'duplicates', non 'groups', con struttura {masterLead, duplicateLeads, similarity, matchType}
      const groupsWithDetails = (data.duplicates || []).filter((group: any) => {
        // Filtra solo i gruppi che hanno effettivamente duplicati
        return group.masterLead && group.duplicateLeads && group.duplicateLeads.length > 0;
      });

      console.log(`✅ Found ${groupsWithDetails.length} duplicate groups`);
      setDuplicateGroups(groupsWithDetails);
    } catch (err) {
      console.error('Error loading duplicates:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const totalDuplicates = duplicateGroups.reduce((sum, group) => sum + group.duplicateLeads.length, 0);

  // Skeleton loader per gruppo duplicati
  const DuplicateGroupSkeleton = () => (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Lead Duplicati
          </DialogTitle>
          <DialogDescription>
            {loading ? 'Ricerca in corso...' : duplicateGroups.length === 0 ? 'Nessun duplicato' : `${duplicateGroups.length} ${duplicateGroups.length === 1 ? 'gruppo' : 'gruppi'} trovati`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          {loading && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <DuplicateGroupSkeleton key={i} />
              ))}
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
            <div className="space-y-3">
              {duplicateGroups.map((group) => (
                <div key={group.masterId} className="border rounded-lg">
                  {/* Master Lead */}
                  <div className="bg-muted/30 px-4 py-3 border-b">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{group.masterLead?.Nome || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {group.masterLead?.Telefono || group.masterLead?.Email || group.masterLead?.Città}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">{group.duplicateLeads.length}</Badge>
                    </div>
                  </div>
                  
                  {/* Duplicate Leads */}
                  <div className="divide-y">
                    {group.duplicateLeads.map((dup: any) => (
                      <div key={dup.id} className="px-4 py-2.5 hover:bg-muted/40 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{dup.Nome || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {dup.Telefono || dup.Email || dup.Città}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs flex-shrink-0"
                            onClick={() => {
                              onFilterDuplicates?.([
                                group.masterLead.id,
                                dup.id,
                                ...group.duplicateLeads.filter((d: any) => d.id !== dup.id).map((d: any) => d.id)
                              ]);
                              onOpenChange(false);
                            }}
                          >
                            <Filter className="h-3.5 w-3.5 mr-1" />
                            Filtra
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t pt-3 mt-3 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Chiudi</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
