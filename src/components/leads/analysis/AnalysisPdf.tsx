'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import type { LeadAnalysis } from '@/types/database';

interface AnalysisPdfButtonProps {
  analysis: LeadAnalysis;
  leadName?: string;
  captureBodyModel?: () => string | null;
}

/**
 * Dynamic import di @react-pdf/renderer per evitare SSR issues.
 * Il PDF viene generato client-side e scaricato come blob.
 */
export function AnalysisPdfButton({ analysis, leadName, captureBodyModel }: AnalysisPdfButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const { AnalysisPdfDocument } = await import('./AnalysisPdfDocument');

      const bodyModelImageUrl = captureBodyModel?.() ?? undefined;
      const blob = await pdf(
        AnalysisPdfDocument({ analysis, leadName, bodyModelImageUrl }),
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Analisi_${analysis.person_label.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={isGenerating}
    >
      {isGenerating ? (
        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
      ) : (
        <FileDown className="h-4 w-4 mr-1" />
      )}
      Scarica PDF
    </Button>
  );
}
