'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { SeoSubNav } from '@/components/seo-ads/seo-sub-nav';
import { SeoDateFilter, presetToDates } from '@/components/seo-ads/seo-date-filter';
import type { DatePreset } from '@/components/seo-ads/seo-date-filter';
import { SeoTrendChart } from '@/components/seo-ads/seo-trend-chart';
import { formatNumber, formatPercent } from '@/components/seo-ads/seo-currency-helpers';
import { useSeoAnalytics } from '@/hooks/use-seo-dashboard';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';

const ITEMS_PER_PAGE = 25;

// Source badge color mapping
function sourceBadgeVariant(source: string): 'primary' | 'secondary' | 'destructive' | 'outline' {
  const s = source.toLowerCase();
  if (s === 'google') return 'primary';
  if (['facebook', 'instagram', 'meta'].includes(s)) return 'secondary';
  if (s === '(direct)' || s === 'direct') return 'outline';
  return 'secondary';
}

function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds === 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function SeoAnalyticsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [page, setPage] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const { date_from, date_to } = presetToDates(datePreset);

  const { analytics, total, isLoading, isValidating, error, mutate } = useSeoAnalytics({
    date_from,
    date_to,
    page,
    limit: ITEMS_PER_PAGE,
  });
  const refreshing = isLoading || isValidating || syncing;

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  // On-demand sync
  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch('/api/seo-ads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date_from, date_to }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Sync failed (${res.status})`);
      }
      await mutate();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sincronizzazione fallita');
    } finally {
      setSyncing(false);
    }
  }, [date_from, date_to, mutate]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/dashboard/seo-ads/analytics');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary motion-reduce:animate-none" />
          <p className="text-sm text-muted-foreground">Caricamento…</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  // Aggregate totals
  const totals = analytics.reduce(
    (acc, a) => ({
      sessions: acc.sessions + a.sessions,
      page_views: acc.page_views + a.page_views,
      form_submissions: acc.form_submissions + (a.form_submissions ?? 0),
    }),
    { sessions: 0, page_views: 0, form_submissions: 0 }
  );

  // Weighted bounce rate
  const totalSessionsForBounce = analytics.reduce((s, a) => s + a.sessions, 0);
  const weightedBounceRate = totalSessionsForBounce > 0
    ? analytics.reduce((s, a) => s + (a.bounce_rate ?? 0) * a.sessions, 0) / totalSessionsForBounce
    : 0;

  // Trend chart: sessions by date (aggregate across sources)
  const sessionsByDate = new Map<string, number>();
  analytics.forEach((a) => {
    const existing = sessionsByDate.get(a.report_date) || 0;
    sessionsByDate.set(a.report_date, existing + a.sessions);
  });
  const sessionsTrend = Array.from(sessionsByDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="SEO & Ads" href="/dashboard/seo-ads" />

        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-pretty">
                  Site Analytics
                </h1>
                <p className="text-muted-foreground text-pretty">
                  Traffico sito da Google Analytics 4
                </p>
              </div>
              <div className="flex items-center gap-2">
                <SeoDateFilter value={datePreset} onChange={(v) => { setDatePreset(v); setPage(1); }} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={refreshing}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin motion-reduce:animate-none' : ''}`}
                    aria-hidden="true"
                  />
                  {syncing ? 'Sincronizzando…' : refreshing ? 'Aggiornando…' : 'Aggiorna'}
                </Button>
              </div>
            </div>

            <SeoSubNav />

            {(error || syncError) && (
              <Alert variant="destructive" role="alert">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>
                  {syncError || error?.message || 'Errore nel caricamento'}
                </AlertDescription>
              </Alert>
            )}

            {/* Summary cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">Sessioni</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {isLoading ? '—' : formatNumber(totals.sessions)}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">Pagine Viste</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {isLoading ? '—' : formatNumber(totals.page_views)}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">Bounce Rate</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {isLoading ? '—' : formatPercent(weightedBounceRate)}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">Form Compilati</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {isLoading ? '—' : formatNumber(totals.form_submissions)}
                </p>
              </div>
            </div>

            {/* Sessions trend chart */}
            <SeoTrendChart
              title="Sessioni Giornaliere"
              data={sessionsTrend}
              valueFormatter={(v) => formatNumber(v)}
              height={220}
              color="hsl(var(--chart-4))"
              loading={isLoading}
            />

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sorgente</TableHead>
                    <TableHead>Mezzo</TableHead>
                    <TableHead className="text-right">Sessioni</TableHead>
                    <TableHead className="text-right">Pagine Viste</TableHead>
                    <TableHead className="text-right">Bounce Rate</TableHead>
                    <TableHead className="text-right">Durata Media</TableHead>
                    <TableHead className="text-right">Form</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : analytics.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nessun dato analytics nel periodo selezionato.
                        Premi &quot;Aggiorna&quot; per sincronizzare da GA4.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {analytics.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>
                            <Badge variant={sourceBadgeVariant(a.source)}>
                              {a.source}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {a.medium ?? '—'}
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatNumber(a.sessions)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatNumber(a.page_views)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {a.bounce_rate != null ? formatPercent(a.bounce_rate) : '—'}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatDuration(a.avg_session_duration_seconds)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {a.form_submissions ?? 0}
                          </TableCell>
                          <TableCell className="whitespace-nowrap tabular-nums">
                            {new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(a.report_date))}
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Totals row */}
                      {analytics.length > 1 && (
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell>Totale</TableCell>
                          <TableCell />
                          <TableCell className="text-right tabular-nums">
                            {formatNumber(totals.sessions)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatNumber(totals.page_views)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatPercent(weightedBounceRate)}
                          </TableCell>
                          <TableCell />
                          <TableCell className="text-right tabular-nums">
                            {formatNumber(totals.form_submissions)}
                          </TableCell>
                          <TableCell />
                        </TableRow>
                      )}
                    </>
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
                    aria-label="Pagina precedente"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <span className="text-sm tabular-nums">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    aria-label="Pagina successiva"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
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
