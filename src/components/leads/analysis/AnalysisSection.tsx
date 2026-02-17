'use client';

import { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Trash2, ChevronRight, Stethoscope, ArrowLeft } from 'lucide-react';
import { useLeadAnalyses } from '@/hooks/use-lead-analyses';
import { AnalysisForm } from './AnalysisForm';
import { ConfigurationCards } from './ConfigurationCards';
import { AnalysisPdfButton } from './AnalysisPdf';
import { AnalysisBodyModel, type AnalysisBodyModelHandle } from './AnalysisBodyModel';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { LeadAnalysis } from '@/types/database';

// ============================================================================
// Types
// ============================================================================

type ViewState =
  | { kind: 'list' }
  | { kind: 'create' }
  | { kind: 'detail'; analysis: LeadAnalysis };

interface AnalysisSectionProps {
  leadId: string;
  leadName?: string;
}

// ============================================================================
// Labels
// ============================================================================

const BODY_SHAPE_LABELS: Record<string, string> = {
  v_shape: 'V-Shape',
  a_shape: 'A-Shape',
  normal: 'Normale',
  h_shape: 'H-Shape',
  round: 'Rotondo',
};

const SLEEP_LABELS: Record<string, string> = {
  side: 'Laterale',
  supine: 'Supino',
  prone: 'Prono',
};

// ============================================================================
// Component
// ============================================================================

export function AnalysisSection({ leadId, leadName }: AnalysisSectionProps) {
  const { analyses, isLoading, createAnalysis, deleteAnalysis } = useLeadAnalyses(leadId);
  const [view, setView] = useState<ViewState>({ kind: 'list' });
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const bodyModelRef = useRef<AnalysisBodyModelHandle>(null);

  const goToList = useCallback(() => setView({ kind: 'list' }), []);
  const goToCreate = useCallback(() => setView({ kind: 'create' }), []);
  const goToDetail = useCallback(
    (analysis: LeadAnalysis) => setView({ kind: 'detail', analysis }),
    [],
  );

  const handleCreate = async (data: Parameters<typeof createAnalysis>[0]) => {
    setIsCreating(true);
    try {
      const analysis = await createAnalysis(data);
      goToDetail(analysis);
      toast.success('Analisi creata con successo');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore nella creazione');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAnalysis(deleteTarget);
      if (view.kind === 'detail' && view.analysis.id === deleteTarget) {
        goToList();
      }
      toast.success('Analisi eliminata');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore nell\'eliminazione');
    } finally {
      setDeleteTarget(null);
    }
  };

  // Loading
  if (isLoading) {
    return (
      <div className="p-6 space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6" aria-live="polite">
        {/* ============================================================ */}
        {/* DETAIL VIEW */}
        {/* ============================================================ */}
        {view.kind === 'detail' && (
          <>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={goToList}>
                  <ArrowLeft className="size-4 mr-1" />
                  Lista
                </Button>
                <h2 className="text-lg font-semibold">
                  {view.analysis.person_label} — {view.analysis.weight_kg}kg,{' '}
                  {view.analysis.height_cm}cm
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <AnalysisPdfButton
                  analysis={view.analysis}
                  leadName={leadName}
                  captureBodyModel={() => bodyModelRef.current?.captureImage() ?? null}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 text-destructive hover:text-destructive"
                  aria-label="Elimina analisi"
                  onClick={() => setDeleteTarget(view.analysis.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
              <ConfigurationCards leadId={leadId} analysis={view.analysis} />
              <div className="hidden xl:block">
                <div className="sticky top-6">
                  <AnalysisBodyModel ref={bodyModelRef} analysis={view.analysis} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============================================================ */}
        {/* CREATE VIEW */}
        {/* ============================================================ */}
        {view.kind === 'create' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Nuova Analisi</h2>
              <Button variant="ghost" size="sm" onClick={goToList}>
                Annulla
              </Button>
            </div>
            <AnalysisForm onSubmit={handleCreate} isSubmitting={isCreating} />
          </>
        )}

        {/* ============================================================ */}
        {/* LIST VIEW */}
        {/* ============================================================ */}
        {view.kind === 'list' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Stethoscope className="size-5" />
                Analisi Materasso
              </h2>
              <Button onClick={goToCreate} size="sm">
                <Plus className="size-4 mr-1" />
                Nuova Analisi
              </Button>
            </div>

            {(!analyses || analyses.length === 0) ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Stethoscope className="size-12 text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground mb-2">
                    Nessuna analisi ancora effettuata
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Crea un&apos;analisi per generare automaticamente le configurazioni dei materassi
                  </p>
                  <Button onClick={goToCreate} size="sm">
                    <Plus className="size-4 mr-1" />
                    Nuova Analisi
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3" role="list" aria-label="Lista analisi">
                {analyses.map((analysis) => (
                  <Card
                    key={analysis.id}
                    role="listitem"
                    className="cursor-pointer hover:border-primary/50 transition-colors focus-within:ring-2 focus-within:ring-ring"
                    onClick={() => goToDetail(analysis)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        goToDetail(analysis);
                      }
                    }}
                  >
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">
                              {analysis.person_label}
                            </span>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {analysis.sex === 'male' ? 'M' : 'F'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span>{analysis.weight_kg} kg</span>
                            <span>{analysis.height_cm} cm</span>
                            {analysis.body_shape && (
                              <span className="hidden sm:inline">
                                {BODY_SHAPE_LABELS[analysis.body_shape]}
                              </span>
                            )}
                            {analysis.sleep_position && analysis.sleep_position.length > 0 && (
                              <span className="hidden sm:inline">
                                {analysis.sleep_position.map(p => SLEEP_LABELS[p] || p).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {format(new Date(analysis.created_at), 'dd MMM yyyy', { locale: it })}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {analysis.configs?.length || 0} config
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          aria-label={`Elimina ${analysis.person_label}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(analysis.id);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                        <ChevronRight className="size-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare l&apos;analisi?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione è irreversibile. L&apos;analisi e tutte le configurazioni associate
              verranno eliminate definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
