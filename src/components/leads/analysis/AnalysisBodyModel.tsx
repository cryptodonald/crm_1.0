'use client';

import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GLBViewer } from '@/components/body-model/GLBViewer';
import { Loader2, RotateCcw } from 'lucide-react';
import type { LeadAnalysis } from '@/types/database';

export interface AnalysisBodyModelHandle {
  captureImage: () => string | null;
}

interface AnalysisBodyModelProps {
  analysis: LeadAnalysis;
}

export const AnalysisBodyModel = forwardRef<AnalysisBodyModelHandle, AnalysisBodyModelProps>(
  function AnalysisBodyModel({ analysis }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureImage = useCallback((): string | null => {
    const canvas = containerRef.current?.querySelector('canvas');
    return canvas ? canvas.toDataURL('image/png') : null;
  }, []);

  useImperativeHandle(ref, () => ({ captureImage }), [captureImage]);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      // Map body_shape to zone_overrides for 3D model
      const shapeOverrides: Record<string, Record<string, number>> = {
        v_shape: { shoulders: 0.45, chest: 0.3, waist: -0.15, hips: -0.25 },
        a_shape: { shoulders: -0.25, hips: 0.4, thighs: 0.3, waist: 0.15 },
        h_shape: { shoulders: 0.15, waist: 0.1, hips: 0.15 },
        round: { waist: 0.45, hips: 0.35, thighs: 0.25, chest: 0.2 },
      };

      const res = await fetch('/api/body-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender: analysis.sex || 'neutral',
          height_cm: analysis.height_cm,
          weight_kg: analysis.weight_kg,
          body_type: analysis.body_type || 'average',
          age_years: analysis.age_years || 40,
          ...(analysis.body_shape && analysis.body_shape !== 'normal' && {
            zone_overrides: shapeOverrides[analysis.body_shape],
          }),
        }),
      });

      if (!res.ok) throw new Error('Errore generazione modello');

      const blob = await res.blob();
      // Revoke previous URL to prevent memory leaks
      if (glbUrl) URL.revokeObjectURL(glbUrl);
      setGlbUrl(URL.createObjectURL(blob));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate on mount
  useEffect(() => {
    generate();
    return () => {
      // Cleanup blob URL on unmount
      if (glbUrl) URL.revokeObjectURL(glbUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis.id]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Modello 3D</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={generate}
            disabled={loading}
          >
            <RotateCcw className="size-3.5 mr-1" />
            Rigenera
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && !glbUrl && (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            <Loader2 className="size-6 animate-spin mr-2" />
            Generazione modello 3D...
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center h-[400px] text-destructive text-sm">
            {error}
          </div>
        )}
        <div ref={containerRef}>
          {glbUrl && <GLBViewer url={glbUrl} highlightedZones={analysis.health_issues} />}
        </div>
      </CardContent>
    </Card>
  );
});
