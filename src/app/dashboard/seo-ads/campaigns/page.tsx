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
  microsToEuros,
  formatNumber,
  formatPercent,
} from '@/components/seo-ads/seo-currency-helpers';
import { useSeoCampaigns } from '@/hooks/use-seo-dashboard';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Search,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const ITEMS_PER_PAGE = 20;

export default function SeoCampaignsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [campaignSearch, setCampaignSearch] = useState('');
  const [page, setPage] = useState(1);

  const { date_from, date_to } = presetToDates(datePreset);

  const { campaigns, total, isLoading, isValidating, error, mutate } = useSeoCampaigns({
    date_from,
    date_to,
    campaign_name: campaignSearch || undefined,
    page,
    limit: ITEMS_PER_PAGE,
  });
  const refreshing = isLoading || isValidating;

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  // Auth
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/dashboard/seo-ads/campaigns');
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

  // Aggregate for trend chart — group by report_date
  const dailyMap = new Map<string, { spend: number; clicks: number }>();
  campaigns.forEach((c) => {
    const existing = dailyMap.get(c.report_date) || { spend: 0, clicks: 0 };
    existing.spend += c.cost_micros;
    existing.clicks += c.clicks;
    dailyMap.set(c.report_date, existing);
  });
  const spendTrend = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({ date, value: d.spend / 1_000_000 }));
  const clicksTrend = Array.from(dailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({ date, value: d.clicks }));

  // Totals row
  const totals = campaigns.reduce(
    (acc, c) => ({
      impressions: acc.impressions + c.impressions,
      clicks: acc.clicks + c.clicks,
      cost_micros: acc.cost_micros + c.cost_micros,
      conversions: acc.conversions + (c.conversions ?? 0),
    }),
    { impressions: 0, clicks: 0, cost_micros: 0, conversions: 0 }
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
                  Campaign Performance
                </h1>
                <p className="text-muted-foreground">
                  Analisi dettagliata delle campagne Google Ads
                </p>
              </div>
              <div className="flex items-center gap-2">
                <SeoDateFilter value={datePreset} onChange={(v) => { setDatePreset(v); setPage(1); }} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => mutate()}
                  disabled={refreshing}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                  />
                  {refreshing ? 'Aggiornando...' : 'Aggiorna'}
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

            {/* Trend Charts */}
            <div className="grid gap-4 md:grid-cols-2">
              <SeoTrendChart
                title="Spesa Giornaliera (€)"
                data={spendTrend}
                valueFormatter={(v) =>
                  `€${v.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
                }
                height={200}
                loading={isLoading}
              />
              <SeoTrendChart
                title="Click Giornalieri"
                data={clicksTrend}
                color="hsl(var(--chart-2))"
                valueFormatter={(v) => formatNumber(v)}
                height={200}
                loading={isLoading}
              />
            </div>

            {/* Filter */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cerca campagna..."
                  value={campaignSearch}
                  onChange={(e) => { setCampaignSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campagna</TableHead>
                    <TableHead>Ad Group</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Impression</TableHead>
                    <TableHead className="text-right">Click</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">CPC</TableHead>
                    <TableHead className="text-right">Costo</TableHead>
                    <TableHead className="text-right">Conv.</TableHead>
                    <TableHead className="text-right">QS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 10 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 w-full animate-pulse rounded bg-muted" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : campaigns.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={10}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nessun dato campagne nel periodo selezionato
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {campaigns.map((c) => {
                        const ctr =
                          c.impressions > 0
                            ? c.clicks / c.impressions
                            : 0;
                        const cpc =
                          c.clicks > 0 ? c.cost_micros / c.clicks : 0;

                        return (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium max-w-[180px] truncate">
                              {c.campaign_name}
                            </TableCell>
                            <TableCell className="max-w-[140px] truncate">
                              {c.ad_group_name}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {new Date(c.report_date).toLocaleDateString('it-IT')}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatNumber(c.impressions)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatNumber(c.clicks)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatPercent(ctr, 2)}
                            </TableCell>
                            <TableCell className="text-right">
                              €{microsToEuros(cpc)}
                            </TableCell>
                            <TableCell className="text-right">
                              €{microsToEuros(c.cost_micros)}
                            </TableCell>
                            <TableCell className="text-right">
                              {c.conversions ?? '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              {c.quality_score != null ? (
                                <Badge
                                  variant={
                                    c.quality_score >= 7
                                      ? 'primary'
                                      : c.quality_score >= 4
                                        ? 'secondary'
                                        : 'destructive'
                                  }
                                >
                                  {c.quality_score}/10
                                </Badge>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}

                      {/* Totals row */}
                      {campaigns.length > 1 && (
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell colSpan={3}>Totale</TableCell>
                          <TableCell className="text-right">
                            {formatNumber(totals.impressions)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(totals.clicks)}
                          </TableCell>
                          <TableCell className="text-right">
                            {totals.impressions > 0
                              ? formatPercent(totals.clicks / totals.impressions, 2)
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {totals.clicks > 0
                              ? `€${microsToEuros(totals.cost_micros / totals.clicks)}`
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            €{microsToEuros(totals.cost_micros)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(totals.conversions)}
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
                  {formatNumber(total)} righe totali
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
