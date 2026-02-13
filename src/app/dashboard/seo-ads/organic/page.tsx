'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { SeoSubNav } from '@/components/seo-ads/seo-sub-nav';
import { SeoDateFilter, presetToDates } from '@/components/seo-ads/seo-date-filter';
import type { DatePreset } from '@/components/seo-ads/seo-date-filter';
import { SeoTrendChart } from '@/components/seo-ads/seo-trend-chart';
import {
  formatNumber,
  formatPercent,
  formatPosition,
} from '@/components/seo-ads/seo-currency-helpers';
import { useSeoOrganic } from '@/hooks/use-seo-dashboard';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 20;

export default function SeoOrganicPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [page, setPage] = useState(1);

  const { date_from, date_to } = presetToDates(datePreset);

  const { rankings, total, isLoading, isValidating, error, mutate } = useSeoOrganic({
    date_from,
    date_to,
    page,
    limit: ITEMS_PER_PAGE,
  });

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/dashboard/seo-ads/organic');
    }
  }, [status, router]);


  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
          <p className="text-sm text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  // Trend chart: average position over time
  const positionByDate = new Map<string, { sum: number; count: number }>();
  rankings.forEach((r) => {
    const existing = positionByDate.get(r.report_date) || { sum: 0, count: 0 };
    existing.sum += r.avg_position;
    existing.count += 1;
    positionByDate.set(r.report_date, existing);
  });
  const positionTrend = Array.from(positionByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({ date, value: d.sum / d.count }));

  // Totals
  const totals = rankings.reduce(
    (acc, r) => ({
      clicks: acc.clicks + r.clicks,
      impressions: acc.impressions + r.impressions,
    }),
    { clicks: 0, impressions: 0 }
  );

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="SEO & Ads" href="/dashboard/seo-ads" />

        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">
                  Organic Rankings
                </h1>
                <p className="text-muted-foreground">
                  Posizionamento organico da Google Search Console
                </p>
              </div>
              <div className="flex items-center gap-2">
                <SeoDateFilter value={datePreset} onChange={(v) => { setDatePreset(v); setPage(1); }} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => mutate()}
                  disabled={isLoading || isValidating}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${isLoading || isValidating ? 'animate-spin' : ''}`}
                  />
                  {isLoading || isValidating ? 'Aggiornando...' : 'Aggiorna'}
                </Button>
              </div>
            </div>

            <SeoSubNav />

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {error.message || 'Errore nel caricamento'}
                </AlertDescription>
              </Alert>
            )}

            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">Click Organici</p>
                <p className="mt-1 text-2xl font-bold">
                  {isLoading ? '—' : formatNumber(totals.clicks)}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">Impressioni</p>
                <p className="mt-1 text-2xl font-bold">
                  {isLoading ? '—' : formatNumber(totals.impressions)}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">CTR Medio</p>
                <p className="mt-1 text-2xl font-bold">
                  {isLoading || totals.impressions === 0
                    ? '—'
                    : formatPercent(totals.clicks / totals.impressions)}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">Keywords Tracciate</p>
                <p className="mt-1 text-2xl font-bold">
                  {isLoading ? '—' : formatNumber(total)}
                </p>
              </div>
            </div>

            {/* Position trend chart */}
            <SeoTrendChart
              title="Posizione Organica Media (più basso = meglio)"
              data={positionTrend}
              valueFormatter={(v) => formatPosition(v)}
              height={220}
              color="hsl(var(--chart-3))"
              loading={isLoading}
            />

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead className="text-right">Posizione</TableHead>
                    <TableHead className="text-center">Trend</TableHead>
                    <TableHead className="text-right">Click</TableHead>
                    <TableHead className="text-right">Impressioni</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 w-full animate-pulse rounded bg-muted" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : rankings.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nessun dato organico nel periodo selezionato
                      </TableCell>
                    </TableRow>
                  ) : (
                    rankings.map((r) => {
                      // Position quality indicator
                      const posColor =
                        r.avg_position <= 3
                          ? 'text-emerald-600'
                          : r.avg_position <= 10
                            ? 'text-amber-600'
                            : 'text-red-600';

                      // Simple trend based on position (lower = better)
                      const trendIcon =
                        r.avg_position <= 5 ? (
                          <TrendingUp className="h-4 w-4 text-emerald-600" />
                        ) : r.avg_position <= 15 ? (
                          <Minus className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        );

                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            {r.keyword || '—'}
                          </TableCell>
                          <TableCell
                            className={cn('text-right font-semibold', posColor)}
                          >
                            {formatPosition(r.avg_position)}
                          </TableCell>
                          <TableCell className="text-center">
                            {trendIcon}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(r.clicks)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(r.impressions)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPercent(r.ctr)}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {r.page_url ? (
                              <a
                                href={r.page_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                              >
                                {r.page_url.replace(/^https?:\/\//, '').slice(0, 35)}
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {r.report_date}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {formatNumber(total)} risultati
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  );
}
