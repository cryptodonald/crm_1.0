'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import type { SourcePerformance, AnalyticsSummary } from '@/types/analytics';

interface SourcePerformanceTableProps {
  data: SourcePerformance[];
  summary: AnalyticsSummary | null;
  loading?: boolean;
  onRefresh?: () => void;
}

export function SourcePerformanceTable({
  data,
  summary,
  loading,
  onRefresh,
}: SourcePerformanceTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance per Fonte Lead</CardTitle>
          <CardDescription>Caricamento dati...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getScoreBadge = (score: number) => {
    if (score >= 70) {
      return <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20">Eccellente</Badge>;
    }
    if (score >= 50) {
      return <Badge className="bg-blue-500/10 text-blue-700 hover:bg-blue-500/20">Buono</Badge>;
    }
    if (score >= 30) {
      return <Badge className="bg-amber-500/10 text-amber-700 hover:bg-amber-500/20">Medio</Badge>;
    }
    return <Badge className="bg-rose-500/10 text-rose-700 hover:bg-rose-500/20">Scarso</Badge>;
  };

  const getROIColor = (roi: number) => {
    if (roi > 100) return 'text-emerald-600 font-semibold';
    if (roi > 0) return 'text-green-600';
    if (roi > -50) return 'text-amber-600';
    return 'text-rose-600';
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Budget Totale</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(summary.totalBudget)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Lead Totali</CardDescription>
              <CardTitle className="text-2xl">{summary.totalLeads}</CardTitle>
              <p className="text-xs text-muted-foreground">CPL medio: {formatCurrency(summary.averageCPL)}</p>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Vendite Totali</CardDescription>
              <CardTitle className="text-2xl">{summary.totalSales}</CardTitle>
              <p className="text-xs text-muted-foreground">Fatturato: {formatCurrency(summary.totalRevenue)}</p>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>ROI Medio</CardDescription>
              <CardTitle className={`text-2xl ${getROIColor(summary.averageROI)}`}>
                {formatPercent(summary.averageROI)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Analisi Dettagliata per Fonte</CardTitle>
              <CardDescription>Metriche di performance e ROI per canale marketing</CardDescription>
            </div>
            {onRefresh && (
              <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Aggiorna
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nessun dato disponibile</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Non ci sono ancora dati sufficienti per l'analisi. Aggiungi lead e campagne marketing per vedere le statistiche.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Fonte</th>
                    <th className="text-right p-3 font-medium">Lead</th>
                    <th className="text-right p-3 font-medium">CPL</th>
                    <th className="text-right p-3 font-medium">Vendite</th>
                    <th className="text-right p-3 font-medium">CPS</th>
                    <th className="text-right p-3 font-medium">Conv. %</th>
                    <th className="text-right p-3 font-medium">Fatturato</th>
                    <th className="text-right p-3 font-medium">ROI</th>
                    <th className="text-center p-3 font-medium">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((source, index) => (
                    <tr key={source.fonte} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{source.fonte}</div>
                          {index === 0 && (
                            <Badge variant="secondary" className="text-xs">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Top
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="text-right p-3">{source.totalLeads}</td>
                      <td className="text-right p-3 text-sm">
                        {source.cpl > 0 ? formatCurrency(source.cpl) : '-'}
                      </td>
                      <td className="text-right p-3">{source.sales}</td>
                      <td className="text-right p-3 text-sm">
                        {source.cps > 0 ? formatCurrency(source.cps) : '-'}
                      </td>
                      <td className="text-right p-3">
                        <span className={source.conversionRate > 10 ? 'text-emerald-600 font-medium' : ''}>
                          {formatPercent(source.conversionRate)}
                        </span>
                      </td>
                      <td className="text-right p-3 font-medium">
                        {formatCurrency(source.totalRevenue)}
                      </td>
                      <td className={`text-right p-3 font-semibold ${getROIColor(source.roi)}`}>
                        <div className="flex items-center justify-end gap-1">
                          {source.roi > 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          {formatPercent(source.roi)}
                        </div>
                      </td>
                      <td className="text-center p-3">
                        <div className="flex flex-col items-center gap-1">
                          {getScoreBadge(source.performanceScore)}
                          <span className="text-xs text-muted-foreground">
                            {source.performanceScore}/100
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      {summary && summary.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">💡 Raccomandazioni</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {summary.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
