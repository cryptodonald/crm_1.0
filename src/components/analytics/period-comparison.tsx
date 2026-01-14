'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { AnalyticsSummary } from '@/types/analytics';

interface PeriodComparisonProps {
  current: AnalyticsSummary;
  previous?: AnalyticsSummary;
  periodLabel?: string;
}

export function PeriodComparison({ current, previous, periodLabel = 'vs Periodo Precedente' }: PeriodComparisonProps) {
  if (!previous) {
    return null;
  }

  const calculateChange = (currentValue: number, previousValue: number) => {
    if (previousValue === 0) return currentValue > 0 ? 100 : 0;
    return ((currentValue - previousValue) / previousValue) * 100;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const getTrendBadge = (change: number) => {
    if (Math.abs(change) < 1) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Minus className="h-3 w-3" />
          Stabile
        </Badge>
      );
    }

    if (change > 0) {
      return (
        <Badge className="gap-1 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20">
          <TrendingUp className="h-3 w-3" />
          +{formatPercent(change)}
        </Badge>
      );
    }

    return (
      <Badge className="gap-1 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20">
        <TrendingDown className="h-3 w-3" />
        {formatPercent(change)}
      </Badge>
    );
  };

  const metrics = [
    {
      label: 'Lead',
      current: current.totalLeads,
      previous: previous.totalLeads,
      format: (v: number) => v.toString(),
      positive: true,
    },
    {
      label: 'Vendite',
      current: current.totalSales,
      previous: previous.totalSales,
      format: (v: number) => v.toString(),
      positive: true,
    },
    {
      label: 'Fatturato',
      current: current.totalRevenue,
      previous: previous.totalRevenue,
      format: formatCurrency,
      positive: true,
    },
    {
      label: 'Budget',
      current: current.totalBudget,
      previous: previous.totalBudget,
      format: formatCurrency,
      positive: false, // Less is better
    },
    {
      label: 'CPL',
      current: current.averageCPL,
      previous: previous.averageCPL,
      format: formatCurrency,
      positive: false, // Less is better
    },
    {
      label: 'ROI',
      current: current.averageROI,
      previous: previous.averageROI,
      format: formatPercent,
      positive: true,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparazione Periodo</CardTitle>
        <CardDescription>{periodLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {metrics.map((metric) => {
            const change = calculateChange(metric.current, metric.previous);
            const isPositiveChange = metric.positive ? change > 0 : change < 0;
            
            return (
              <div key={metric.label} className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                <div className="space-y-1">
                  <p className="text-2xl font-bold tracking-tight">
                    {metric.format(metric.current)}
                  </p>
                  <div className="flex items-center gap-2">
                    {getTrendBadge(metric.positive ? change : -change)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Prima: {metric.format(metric.previous)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Best/Worst Performers Comparison */}
        <div className="mt-6 pt-6 border-t">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium mb-2">Miglior Fonte Corrente</p>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-700">
                  {current.bestPerformingSource}
                </Badge>
                {previous.bestPerformingSource !== current.bestPerformingSource && (
                  <span className="text-xs text-muted-foreground">
                    (prima: {previous.bestPerformingSource})
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Peggiore Fonte Corrente</p>
              <div className="flex items-center gap-2">
                <Badge className="bg-rose-500/10 text-rose-700">
                  {current.worstPerformingSource}
                </Badge>
                {previous.worstPerformingSource !== current.worstPerformingSource && (
                  <span className="text-xs text-muted-foreground">
                    (prima: {previous.worstPerformingSource})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
