'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { SeoSubNav } from '@/components/seo-ads/seo-sub-nav';
import { SeoDateFilter, presetToDates } from '@/components/seo-ads/seo-date-filter';
import type { DatePreset } from '@/components/seo-ads/seo-date-filter';
import {
  formatNumber,
  formatPercent,
  formatPosition,
} from '@/components/seo-ads/seo-currency-helpers';
import { useSeoCompetitors } from '@/hooks/use-seo-dashboard';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';

const ITEMS_PER_PAGE = 20;

export default function SeoCompetitorsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [page, setPage] = useState(1);

  const { date_from, date_to } = presetToDates(datePreset);

  const { competitors, total, isLoading, isValidating, error, mutate } = useSeoCompetitors({
    date_from,
    date_to,
    page,
    limit: ITEMS_PER_PAGE,
  });

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/dashboard/seo-ads/competitors');
    }
  }, [status, router]);


  // Aggregate by domain for bar chart
  const domainAggregates = useMemo(() => {
    const map = new Map<
      string,
      { impressionShare: number; overlap: number; position: number; count: number }
    >();
    competitors.forEach((c) => {
      const existing = map.get(c.competitor_domain) || {
        impressionShare: 0,
        overlap: 0,
        position: 0,
        count: 0,
      };
      existing.impressionShare += c.impression_share ?? 0;
      existing.overlap += c.overlap_rate ?? 0;
      existing.position += c.avg_position ?? 0;
      existing.count += 1;
      map.set(c.competitor_domain, existing);
    });

    return Array.from(map.entries())
      .map(([domain, d]) => ({
        domain: domain.length > 20 ? domain.slice(0, 18) + '…' : domain,
        fullDomain: domain,
        impressionShare: d.count > 0 ? (d.impressionShare / d.count) * 100 : 0,
        overlapRate: d.count > 0 ? (d.overlap / d.count) * 100 : 0,
        avgPosition: d.count > 0 ? d.position / d.count : 0,
        keywords: d.count,
      }))
      .sort((a, b) => b.impressionShare - a.impressionShare)
      .slice(0, 10);
  }, [competitors]);

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
                  Competitor Analysis
                </h1>
                <p className="text-muted-foreground text-pretty">
                  Auction Insights e confronto con i competitor su Google Ads
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
                    className={`mr-2 h-4 w-4 ${isLoading || isValidating ? 'animate-spin motion-reduce:animate-none' : ''}`}
                    aria-hidden="true"
                  />
                  {isLoading || isValidating ? 'Aggiornando…' : 'Aggiorna'}
                </Button>
              </div>
            </div>

            <SeoSubNav />

            {error && (
              <Alert variant="destructive" role="alert">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>
                  {error.message || 'Errore nel caricamento'}
                </AlertDescription>
              </Alert>
            )}

            {/* Bar Chart — Impression Share */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Impression Share per Competitor (Top 10)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[300px] animate-pulse rounded bg-muted motion-reduce:animate-none" />
                ) : domainAggregates.length === 0 ? (
                  <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    Nessun dato competitor nel periodo selezionato
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={domainAggregates}
                        layout="vertical"
                        margin={{ top: 4, right: 20, left: 0, bottom: 4 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          className="stroke-border"
                          horizontal={false}
                        />
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${v}%`}
                        />
                        <YAxis
                          type="category"
                          dataKey="domain"
                          width={150}
                          tick={{ fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const d = payload[0].payload as any;
                            return (
                              <div className="rounded-lg border bg-background px-3 py-2 shadow-sm">
                                <p className="text-sm font-semibold">
                                  {d.fullDomain}
                                </p>
                                <p className="text-xs text-muted-foreground tabular-nums">
                                  Impression Share:{' '}
                                  {d.impressionShare.toFixed(1)}%
                                </p>
                                <p className="text-xs text-muted-foreground tabular-nums">
                                  Overlap: {d.overlapRate.toFixed(1)}%
                                </p>
                              </div>
                            );
                          }}
                        />
                        <Bar
                          dataKey="impressionShare"
                          fill="hsl(var(--primary))"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dominio</TableHead>
                    <TableHead>Keyword</TableHead>
                    <TableHead className="text-right">
                      Impression Share
                    </TableHead>
                    <TableHead className="text-right">Overlap Rate</TableHead>
                    <TableHead className="text-right">Posizione Media</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : competitors.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nessun dato competitor
                      </TableCell>
                    </TableRow>
                  ) : (
                    competitors.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">
                          {c.competitor_domain}
                        </TableCell>
                        <TableCell>{c.keyword || '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.impression_share != null ? (
                            <span
                              className={cn(
                                'font-medium',
                                c.impression_share >= 0.5
                                  ? 'text-red-600'
                                  : c.impression_share >= 0.2
                                    ? 'text-amber-600'
                                    : 'text-emerald-600'
                              )}
                            >
                              {formatPercent(c.impression_share)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.overlap_rate != null
                            ? formatPercent(c.overlap_rate)
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.avg_position != null
                            ? formatPosition(c.avg_position)
                            : '—'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(c.report_date))}
                        </TableCell>
                      </TableRow>
                    ))
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
