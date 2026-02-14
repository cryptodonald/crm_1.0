'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ChevronRight, Stethoscope } from 'lucide-react';
import { useLeadAnalyses } from '@/hooks/use-lead-analyses';
import { AnalysisForm } from './AnalysisForm';
import { ConfigurationCards } from './ConfigurationCards';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { LeadAnalysis } from '@/types/database';

interface AnalysisSectionProps {
  leadId: string;
}

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
  mixed: 'Misto',
};

export function AnalysisSection({ leadId }: AnalysisSectionProps) {
  const { analyses, isLoading, createAnalysis, deleteAnalysis } = useLeadAnalyses(leadId);
  const [showForm, setShowForm] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<LeadAnalysis | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (data: Parameters<typeof createAnalysis>[0]) => {
    setIsCreating(true);
    try {
      const analysis = await createAnalysis(data);
      setShowForm(false);
      setSelectedAnalysis(analysis);
      toast.success('Analisi creata con successo');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore nella creazione');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (analysisId: string) => {
    try {
      await deleteAnalysis(analysisId);
      if (selectedAnalysis?.id === analysisId) {
        setSelectedAnalysis(null);
      }
      toast.success('Analisi eliminata');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Errore nell\'eliminazione');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Selected analysis → show configs
  if (selectedAnalysis) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedAnalysis(null)}
            >
              ← Torna alla lista
            </Button>
            <h2 className="text-lg font-semibold">
              {selectedAnalysis.person_label} — {selectedAnalysis.weight_kg}kg, {selectedAnalysis.height_cm}cm
            </h2>
          </div>
        </div>
        <ConfigurationCards
          leadId={leadId}
          analysis={selectedAnalysis}
        />
      </div>
    );
  }

  // Form creation
  if (showForm) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Nuova Analisi</h2>
          <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
            Annulla
          </Button>
        </div>
        <AnalysisForm
          onSubmit={handleCreate}
          isSubmitting={isCreating}
        />
      </div>
    );
  }

  // List view
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Stethoscope className="h-5 w-5" />
          Analisi Materasso
        </h2>
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Nuova Analisi
        </Button>
      </div>

      {(!analyses || analyses.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Stethoscope className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground mb-2">
              Nessuna analisi ancora effettuata
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Crea un&apos;analisi per generare automaticamente le configurazioni dei materassi
            </p>
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nuova Analisi
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {analyses.map((analysis) => (
            <Card
              key={analysis.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedAnalysis(analysis)}
            >
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{analysis.person_label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {analysis.sex === 'male' ? 'M' : 'F'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span>{analysis.weight_kg} kg</span>
                      <span>{analysis.height_cm} cm</span>
                      {analysis.body_shape && (
                        <span>{BODY_SHAPE_LABELS[analysis.body_shape]}</span>
                      )}
                      {analysis.sleep_position && (
                        <span>{SLEEP_LABELS[analysis.sleep_position]}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(analysis.created_at), 'dd MMM yyyy', { locale: it })}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {analysis.configs?.length || 0} config
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(analysis.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
