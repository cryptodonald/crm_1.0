'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPercent } from './seo-currency-helpers';

interface SeoKpiCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Variazione vs periodo precedente (-1..+∞). null = non disponibile */
  change?: number | null;
  /** Se true, una diminuzione è positiva (es. CPC, posizione SERP) */
  invertTrend?: boolean;
  className?: string;
  loading?: boolean;
}

export function SeoKpiCard({
  title,
  value,
  icon: Icon,
  change,
  invertTrend = false,
  className,
  loading = false,
}: SeoKpiCardProps) {
  const hasChange = change !== null && change !== undefined;
  const isPositive = hasChange ? (invertTrend ? change < 0 : change > 0) : false;
  const isNegative = hasChange ? (invertTrend ? change > 0 : change < 0) : false;

  return (
    <Card className={cn('relative', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <div className="h-7 w-24 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            <div className="h-4 w-16 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold tabular-nums">{value}</div>
            {hasChange ? (
              <div className="flex items-center gap-1 text-xs">
                {isPositive && (
                  <TrendingUp className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                )}
                {isNegative && (
                  <TrendingDown className="h-3 w-3 text-red-600" aria-hidden="true" />
                )}
                {!isPositive && !isNegative && (
                  <Minus className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                )}
                <span
                  className={cn(
                    'font-medium',
                    isPositive && 'text-emerald-600',
                    isNegative && 'text-red-600',
                    !isPositive && !isNegative && 'text-muted-foreground'
                  )}
                >
                  {change > 0 ? '+' : ''}
                  {formatPercent(change, 1)}
                </span>
                <span className="text-muted-foreground">vs periodo prec.</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">—</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
