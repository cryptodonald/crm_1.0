'use client';

import { useState } from 'react';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { SourcePerformanceTable } from '@/components/analytics/source-performance-table';
import { AnalyticsFilters } from '@/components/analytics/analytics-filters';
import { AnalyticsCharts } from '@/components/analytics/analytics-charts';
import { useSourceAnalytics } from '@/hooks/use-source-analytics';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, BarChart3, Download, FileText, Clipboard } from 'lucide-react';
import { exportToCSV, exportToPDF, copyToClipboard } from '@/lib/analytics-export';
import { toast } from 'sonner';

export default function AnalyticsPage() {
  const [filters, setFilters] = useState<{ dateStart?: string; dateEnd?: string }>({});
  const { data, summary, loading, error, refresh } = useSourceAnalytics(filters);

  const handleExportCSV = () => {
    exportToCSV(data, summary);
    toast.success('Export CSV completato');
  };

  const handleExportPDF = () => {
    exportToPDF();
  };

  const handleCopyToClipboard = () => {
    copyToClipboard(data, summary);
    toast.success('Dati copiati negli appunti');
  };

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="Analytics" />

        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-6 w-6" />
                  <h1 className="text-2xl font-bold tracking-tight">Marketing Analytics</h1>
                </div>
                <p className="text-muted-foreground">
                  Analisi ROI e performance per fonte lead
                </p>
              </div>
              
              {/* Export Buttons */}
              <div className="flex items-center gap-2" data-print-hidden>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyToClipboard}
                  disabled={loading || data.length === 0}
                >
                  <Clipboard className="mr-2 h-4 w-4" />
                  Copia
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={loading || data.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  disabled={loading || data.length === 0}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  PDF
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div data-print-hidden>
              <AnalyticsFilters onFilterChange={setFilters} />
            </div>

            {/* Error State */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Errore nel caricamento dei dati: {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Charts */}
            {!loading && data.length > 0 && (
              <AnalyticsCharts data={data} />
            )}

            {/* Analytics Table */}
            <SourcePerformanceTable
              data={data}
              summary={summary}
              loading={loading}
              onRefresh={refresh}
            />
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  );
}
