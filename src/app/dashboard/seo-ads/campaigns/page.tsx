'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  RefreshCw,
  Search,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  TrendingDown,
  Download,
  Loader2,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { downloadCsv } from '@/lib/seo-ads/csv-export';
import type { SeoCampaignPerformance } from '@/types/seo-ads';

const ITEMS_PER_PAGE = 20;

// All available columns with labels
type ColumnKey =
  | 'keyword' | 'campaign_name' | 'ad_group_name'
  | 'impressions' | 'clicks' | 'ctr' | 'cpc' | 'cost' | 'conversions' | 'quality_score'
  | 'match_type' | 'keyword_status' | 'serving_status'
  | 'expected_ctr' | 'landing_page_exp' | 'ad_relevance'
  | 'campaign_type' | 'bid_strategy' | 'cost_per_conversion' | 'conversion_rate';

const ALL_COLUMNS: { key: ColumnKey; label: string; defaultVisible: boolean; align?: 'right' }[] = [
  { key: 'keyword', label: 'Keyword', defaultVisible: true },
  { key: 'campaign_name', label: 'Campagna', defaultVisible: true },
  { key: 'ad_group_name', label: 'Ad Group', defaultVisible: false },
  { key: 'match_type', label: 'Tipo Corrispondenza', defaultVisible: true },
  { key: 'keyword_status', label: 'Stato', defaultVisible: true },
  { key: 'impressions', label: 'Impression', defaultVisible: true, align: 'right' },
  { key: 'clicks', label: 'Click', defaultVisible: true, align: 'right' },
  { key: 'ctr', label: 'CTR', defaultVisible: true, align: 'right' },
  { key: 'cpc', label: 'CPC medio', defaultVisible: true, align: 'right' },
  { key: 'cost', label: 'Costo', defaultVisible: true, align: 'right' },
  { key: 'conversions', label: 'Conv.', defaultVisible: true, align: 'right' },
  { key: 'cost_per_conversion', label: 'Costo/Conv.', defaultVisible: true, align: 'right' },
  { key: 'conversion_rate', label: 'Tasso Conv.', defaultVisible: true, align: 'right' },
  { key: 'quality_score', label: 'Punteggio di qualità', defaultVisible: true, align: 'right' },
  { key: 'expected_ctr', label: 'CTR Previsto', defaultVisible: true },
  { key: 'landing_page_exp', label: 'Esper. Pagina Dest.', defaultVisible: true },
  { key: 'ad_relevance', label: 'Pertinenza Annuncio', defaultVisible: true },
  { key: 'serving_status', label: 'Serving', defaultVisible: false },
  { key: 'campaign_type', label: 'Tipo Camp.', defaultVisible: false },
  { key: 'bid_strategy', label: 'Strategia Bid', defaultVisible: false },
];

// Translate Google Ads enum values to Italian
const QUALITY_LABELS: Record<string, string> = {
  ABOVE_AVERAGE: 'Sopra la media',
  AVERAGE: 'Nella media',
  BELOW_AVERAGE: 'Sotto la media',
};
const MATCH_TYPE_LABELS: Record<string, string> = {
  BROAD: 'Generica',
  PHRASE: 'A frase',
  EXACT: 'Esatta',
};
const STATUS_LABELS: Record<string, string> = {
  ENABLED: 'Attiva',
  PAUSED: 'In pausa',
  REMOVED: 'Rimossa',
};
const SERVING_LABELS: Record<string, string> = {
  ELIGIBLE: 'Idoneo',
  RARELY_SERVED: 'Raramente mostrato',
  NOT_ELIGIBLE: 'Non idoneo',
};

export default function SeoCampaignsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [campaignSearch, setCampaignSearch] = useState('');
  const [page, setPage] = useState(1);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(
    () => new Set(ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key))
  );
  // Drill-down state: track expanded rows + their daily data
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [dailyData, setDailyData] = useState<Record<string, SeoCampaignPerformance[]>>({});
  const [dailyLoading, setDailyLoading] = useState<Set<string>>(new Set());

  const { date_from, date_to } = presetToDates(datePreset);

  const { campaigns, dailyTrend, total, isLoading, isValidating, error, mutate } = useSeoCampaigns({
    date_from,
    date_to,
    campaign_name: campaignSearch || undefined,
    page,
    limit: ITEMS_PER_PAGE,
  });
  const refreshing = isLoading || isValidating || syncing;

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  const toggleColumn = useCallback((key: ColumnKey) => {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const isCol = useCallback((key: ColumnKey) => visibleColumns.has(key), [visibleColumns]);

  // Toggle drill-down: fetch daily data on first expand
  const toggleDrillDown = useCallback(async (c: SeoCampaignPerformance) => {
    const rowKey = `${c.keyword_id}|${c.campaign_name}|${c.ad_group_name}`;
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowKey)) { next.delete(rowKey); } else { next.add(rowKey); }
      return next;
    });
    // Fetch only if not already loaded
    if (!dailyData[rowKey]) {
      setDailyLoading(prev => new Set(prev).add(rowKey));
      try {
        const params = new URLSearchParams({
          keyword_id: c.keyword_id,
          campaign_name: c.campaign_name,
          ad_group_name: c.ad_group_name,
        });
        if (date_from) params.set('date_from', date_from);
        if (date_to) params.set('date_to', date_to);
        const res = await fetch(`/api/seo-ads/campaigns/daily?${params}`);
        if (res.ok) {
          const json = await res.json();
          setDailyData(prev => ({ ...prev, [rowKey]: json.rows }));
        }
      } catch { /* silently fail */ }
      setDailyLoading(prev => { const n = new Set(prev); n.delete(rowKey); return n; });
    }
  }, [dailyData, date_from, date_to]);

  // On-demand sync: calls Google Ads API then refreshes SWR
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
      // Refresh SWR cache after sync
      await mutate();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sincronizzazione fallita');
    } finally {
      setSyncing(false);
    }
  }, [date_from, date_to, mutate]);

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
          <div className="mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary motion-reduce:animate-none" />
          <p className="text-sm text-muted-foreground">Caricamento…</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  // Trend chart data from API (daily aggregated)
  const spendTrend = dailyTrend.map(d => ({ date: d.date, value: d.spend_micros / 1_000_000 }));
  const clicksTrend = dailyTrend.map(d => ({ date: d.date, value: d.clicks }));

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
                <h1 className="text-2xl font-bold tracking-tight text-pretty">
                  Campaign Performance
                </h1>
                <p className="text-muted-foreground text-pretty">
                  Analisi dettagliata delle campagne Google Ads
                </p>
              </div>
              <div className="flex items-center gap-2">
                <SeoDateFilter value={datePreset} onChange={(v) => { setDatePreset(v); setPage(1); }} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadCsv(campaigns)}
                  disabled={campaigns.length === 0}
                >
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  Esporta CSV
                </Button>
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

            {/* Filter + Column Visibility */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  placeholder="Cerca campagna…"
                  aria-label="Cerca campagna"
                  spellCheck={false}
                  value={campaignSearch}
                  onChange={(e) => { setCampaignSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                    <SlidersHorizontal className="mr-2 h-4 w-4" aria-hidden="true" />
                    Colonne
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 max-h-80 overflow-y-auto">
                  {ALL_COLUMNS.map(col => (
                    <DropdownMenuCheckboxItem
                      key={col.key}
                      checked={visibleColumns.has(col.key)}
                      onCheckedChange={() => toggleColumn(col.key)}
                    >
                      {col.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Table */}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />{/* expand toggle */}
                    {ALL_COLUMNS.filter(c => visibleColumns.has(c.key)).map(col => (
                      <TableHead key={col.key} className={col.align === 'right' ? 'text-right' : undefined}>
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell />
                        {Array.from({ length: visibleColumns.size }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : campaigns.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={visibleColumns.size + 1}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nessun dato campagne nel periodo selezionato
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {campaigns.map((c) => {
                        const ctr = c.impressions > 0 ? c.clicks / c.impressions : 0;
                        const cpc = c.clicks > 0 ? c.cost_micros / c.clicks : 0;
                        // Wasted spend: 0 conversions with cost > €50 (google-ads audit checklist)
                        const isWastedSpend = (c.conversions === 0 || c.conversions === null) && c.cost_micros > 50_000_000;
                        const rowKey = `${c.keyword_id}|${c.campaign_name}|${c.ad_group_name}`;
                        const isExpanded = expandedRows.has(rowKey);
                        const rowDaily = dailyData[rowKey];
                        const isRowLoading = dailyLoading.has(rowKey);

                        return (
                          <Fragment key={c.id}>
                          <TableRow
                            className={`cursor-pointer ${isWastedSpend ? 'bg-destructive/5' : ''} ${isExpanded ? 'bg-accent/40' : ''}`}
                            onClick={() => toggleDrillDown(c)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDrillDown(c); } }}
                            tabIndex={0}
                            role="row"
                          >
                            <TableCell className="w-8 px-2">
                              {isRowLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" />
                              ) : isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                              )}
                            </TableCell>
                            {isCol('keyword') && (
                              <TableCell className="font-medium max-w-[200px] truncate">
                                <span className="flex items-center gap-1.5">
                                  {c.keyword ?? '—'}
                                  {isWastedSpend && (
                                    <TooltipProvider delayDuration={200}>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <TrendingDown className="h-3.5 w-3.5 shrink-0 text-destructive" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Spesa senza conversioni: €{microsToEuros(c.cost_micros)}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </span>
                              </TableCell>
                            )}
                            {isCol('campaign_name') && (
                              <TableCell className="max-w-[160px] truncate">
                                {c.campaign_name}
                              </TableCell>
                            )}
                            {isCol('ad_group_name') && (
                              <TableCell className="max-w-[140px] truncate">
                                {c.ad_group_name}
                              </TableCell>
                            )}
                            {isCol('match_type') && (
                              <TableCell>{c.match_type ? (MATCH_TYPE_LABELS[c.match_type] ?? c.match_type) : '—'}</TableCell>
                            )}
                            {isCol('keyword_status') && (
                              <TableCell>
                                {c.keyword_status ? (
                                  <Badge variant={c.keyword_status === 'ENABLED' ? 'primary' : 'secondary'}>
                                    {STATUS_LABELS[c.keyword_status] ?? c.keyword_status}
                                  </Badge>
                                ) : '—'}
                              </TableCell>
                            )}
                            {isCol('impressions') && (
                              <TableCell className="text-right tabular-nums">
                                {formatNumber(c.impressions)}
                              </TableCell>
                            )}
                            {isCol('clicks') && (
                              <TableCell className="text-right tabular-nums">
                                {formatNumber(c.clicks)}
                              </TableCell>
                            )}
                            {isCol('ctr') && (
                              <TableCell className="text-right tabular-nums">
                                {formatPercent(ctr, 2)}
                              </TableCell>
                            )}
                            {isCol('cpc') && (
                              <TableCell className="text-right tabular-nums">
                                €{microsToEuros(cpc)}
                              </TableCell>
                            )}
                            {isCol('cost') && (
                              <TableCell className="text-right tabular-nums">
                                €{microsToEuros(c.cost_micros)}
                              </TableCell>
                            )}
                            {isCol('conversions') && (
                              <TableCell className="text-right tabular-nums">
                                {c.conversions ?? '—'}
                              </TableCell>
                            )}
                            {isCol('cost_per_conversion') && (
                              <TableCell className="text-right tabular-nums">
                                {c.cost_per_conversion_micros ? `€${microsToEuros(c.cost_per_conversion_micros)}` : '—'}
                              </TableCell>
                            )}
                            {isCol('conversion_rate') && (
                              <TableCell className="text-right tabular-nums">
                                {c.conversion_rate ? formatPercent(c.conversion_rate, 2) : '—'}
                              </TableCell>
                            )}
                            {isCol('quality_score') && (
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
                            )}
                            {isCol('expected_ctr') && (
                              <TableCell>
                                {c.expected_ctr ? (
                                  <Badge variant={c.expected_ctr === 'ABOVE_AVERAGE' ? 'primary' : c.expected_ctr === 'AVERAGE' ? 'secondary' : 'destructive'}>
                                    {QUALITY_LABELS[c.expected_ctr] ?? c.expected_ctr}
                                  </Badge>
                                ) : '—'}
                              </TableCell>
                            )}
                            {isCol('landing_page_exp') && (
                              <TableCell>
                                {c.landing_page_exp ? (
                                  <Badge variant={c.landing_page_exp === 'ABOVE_AVERAGE' ? 'primary' : c.landing_page_exp === 'AVERAGE' ? 'secondary' : 'destructive'}>
                                    {QUALITY_LABELS[c.landing_page_exp] ?? c.landing_page_exp}
                                  </Badge>
                                ) : '—'}
                              </TableCell>
                            )}
                            {isCol('ad_relevance') && (
                              <TableCell>
                                {c.ad_relevance ? (
                                  <Badge variant={c.ad_relevance === 'ABOVE_AVERAGE' ? 'primary' : c.ad_relevance === 'AVERAGE' ? 'secondary' : 'destructive'}>
                                    {QUALITY_LABELS[c.ad_relevance] ?? c.ad_relevance}
                                  </Badge>
                                ) : '—'}
                              </TableCell>
                            )}
                            {isCol('serving_status') && (
                              <TableCell>
                                {c.serving_status ? (
                                  <Badge variant={c.serving_status === 'ELIGIBLE' ? 'primary' : 'destructive'}>
                                    {SERVING_LABELS[c.serving_status] ?? c.serving_status}
                                  </Badge>
                                ) : '—'}
                              </TableCell>
                            )}
                            {isCol('campaign_type') && (
                              <TableCell>{c.campaign_type ?? '—'}</TableCell>
                            )}
                            {isCol('bid_strategy') && (
                              <TableCell>{c.bid_strategy ?? '—'}</TableCell>
                            )}
                          </TableRow>
                          {/* Drill-down daily rows */}
                          {isExpanded && rowDaily && rowDaily.length > 0 && (
                            rowDaily.map((d) => {
                              const dCtr = d.impressions > 0 ? d.clicks / d.impressions : 0;
                              const dCpc = d.clicks > 0 ? d.cost_micros / d.clicks : 0;
                              return (
                                <TableRow key={d.id} className="bg-muted/30 text-xs">
                                  <TableCell />{/* expand col spacer */}
                                  {isCol('keyword') && (
                                    <TableCell className="pl-6 text-muted-foreground">
                                      {new Date(d.report_date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </TableCell>
                                  )}
                                  {isCol('campaign_name') && <TableCell />}
                                  {isCol('ad_group_name') && <TableCell />}
                                  {isCol('match_type') && <TableCell />}
                                  {isCol('keyword_status') && <TableCell />}
                          {isCol('impressions') && <TableCell className="text-right tabular-nums">{formatNumber(d.impressions)}</TableCell>}
                                  {isCol('clicks') && <TableCell className="text-right tabular-nums">{formatNumber(d.clicks)}</TableCell>}
                                  {isCol('ctr') && <TableCell className="text-right tabular-nums">{formatPercent(dCtr, 2)}</TableCell>}
                                  {isCol('cpc') && <TableCell className="text-right tabular-nums">€{microsToEuros(dCpc)}</TableCell>}
                                  {isCol('cost') && <TableCell className="text-right tabular-nums">€{microsToEuros(d.cost_micros)}</TableCell>}
                                  {isCol('conversions') && <TableCell className="text-right tabular-nums">{d.conversions ?? '—'}</TableCell>}
                                  {isCol('cost_per_conversion') && <TableCell className="text-right tabular-nums">{d.cost_per_conversion_micros ? `€${microsToEuros(d.cost_per_conversion_micros)}` : '—'}</TableCell>}
                                  {isCol('conversion_rate') && <TableCell className="text-right tabular-nums">{d.conversion_rate ? formatPercent(d.conversion_rate, 2) : '—'}</TableCell>}
                                  {isCol('quality_score') && <TableCell className="text-right tabular-nums">{d.quality_score != null ? `${d.quality_score}/10` : '—'}</TableCell>}
                                  {isCol('expected_ctr') && <TableCell />}
                                  {isCol('landing_page_exp') && <TableCell />}
                                  {isCol('ad_relevance') && <TableCell />}
                                  {isCol('serving_status') && <TableCell />}
                                  {isCol('campaign_type') && <TableCell />}
                                  {isCol('bid_strategy') && <TableCell />}
                                </TableRow>
                              );
                            })
                          )}
                          {isExpanded && rowDaily && rowDaily.length === 0 && (
                            <TableRow className="bg-muted/30">
                              <TableCell />
                              <TableCell colSpan={visibleColumns.size} className="text-center text-xs text-muted-foreground py-2">
                                Nessun dato giornaliero disponibile
                              </TableCell>
                            </TableRow>
                          )}
                          </Fragment>
                        );
                      })}

                      {/* Totals row */}
                      {campaigns.length > 1 && (
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell />{/* expand col spacer */}
                          {isCol('keyword') && <TableCell>Totale</TableCell>}
                          {isCol('campaign_name') && <TableCell />}
                          {isCol('ad_group_name') && <TableCell />}
                          {isCol('match_type') && <TableCell />}
                          {isCol('keyword_status') && <TableCell />}
                          {isCol('impressions') && (
                            <TableCell className="text-right">
                              {formatNumber(totals.impressions)}
                            </TableCell>
                          )}
                          {isCol('clicks') && (
                            <TableCell className="text-right">
                              {formatNumber(totals.clicks)}
                            </TableCell>
                          )}
                          {isCol('ctr') && (
                            <TableCell className="text-right">
                              {totals.impressions > 0
                                ? formatPercent(totals.clicks / totals.impressions, 2)
                                : '—'}
                            </TableCell>
                          )}
                          {isCol('cpc') && (
                            <TableCell className="text-right">
                              {totals.clicks > 0
                                ? `€${microsToEuros(totals.cost_micros / totals.clicks)}`
                                : '—'}
                            </TableCell>
                          )}
                          {isCol('cost') && (
                            <TableCell className="text-right">
                              €{microsToEuros(totals.cost_micros)}
                            </TableCell>
                          )}
                          {isCol('conversions') && (
                            <TableCell className="text-right">
                              {formatNumber(totals.conversions)}
                            </TableCell>
                          )}
                          {isCol('cost_per_conversion') && (
                            <TableCell className="text-right">
                              {totals.conversions > 0
                                ? `€${microsToEuros(totals.cost_micros / totals.conversions)}`
                                : '—'}
                            </TableCell>
                          )}
                          {isCol('conversion_rate') && (
                            <TableCell className="text-right">
                              {totals.clicks > 0
                                ? formatPercent(totals.conversions / totals.clicks, 2)
                                : '—'}
                            </TableCell>
                          )}
                          {isCol('quality_score') && <TableCell />}
                          {isCol('expected_ctr') && <TableCell />}
                          {isCol('landing_page_exp') && <TableCell />}
                          {isCol('ad_relevance') && <TableCell />}
                          {isCol('serving_status') && <TableCell />}
                          {isCol('campaign_type') && <TableCell />}
                          {isCol('bid_strategy') && <TableCell />}
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
