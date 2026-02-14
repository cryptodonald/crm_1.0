'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { SeoSubNav } from '@/components/seo-ads/seo-sub-nav';
import { SeoKpiCard } from '@/components/seo-ads/seo-kpi-card';
import { SeoDateFilter, presetToDates } from '@/components/seo-ads/seo-date-filter';
import type { DatePreset } from '@/components/seo-ads/seo-date-filter';
import {
  microsToEuros,
  centsToEuros,
  formatNumber,
} from '@/components/seo-ads/seo-currency-helpers';
import { useSeoAttribution } from '@/hooks/use-seo-dashboard';
import { useSeoDashboard } from '@/hooks/use-seo-dashboard';
import type { AttributionSource, AttributionConfidence } from '@/types/seo-ads';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DollarSign,
  Users,
  Wallet,
} from 'lucide-react';

const ITEMS_PER_PAGE = 20;

const SOURCE_LABELS: Record<AttributionSource, string> = {
  google_ads: 'Google Ads',
  organic: 'Organico',
  direct: 'Diretto',
  referral: 'Referral',
  social: 'Social',
};

const SOURCE_COLORS: Record<AttributionSource, string> = {
  google_ads: 'hsl(var(--chart-1))',
  organic: 'hsl(var(--chart-2))',
  direct: 'hsl(var(--chart-3))',
  referral: 'hsl(var(--chart-4))',
  social: 'hsl(var(--chart-5))',
};

const CONFIDENCE_VARIANT: Record<AttributionConfidence, 'primary' | 'secondary' | 'outline' | 'destructive'> = {
  exact: 'primary',
  high: 'secondary',
  estimated: 'outline',
  none: 'destructive',
};

export default function SeoAttributionPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [sourceFilter, setSourceFilter] = useState('');
  const [confidenceFilter, setConfidenceFilter] = useState('');
  const [page, setPage] = useState(1);

  const { date_from, date_to } = presetToDates(datePreset);

  const { attributions, total, isLoading, isValidating, error, mutate } = useSeoAttribution({
    date_from,
    date_to,
    source: (sourceFilter || undefined) as AttributionSource | undefined,
    confidence: (confidenceFilter || undefined) as AttributionConfidence | undefined,
    page,
    limit: ITEMS_PER_PAGE,
  });

  const { kpis, isLoading: kpisLoading, isValidating: kpisValidating } = useSeoDashboard(date_from, date_to);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/dashboard/seo-ads/attribution');
    }
  }, [status, router]);


  // Source breakdown for pie chart
  const sourceBreakdown = useMemo(() => {
    const map = new Map<AttributionSource, number>();
    attributions.forEach((a) => {
      map.set(a.source, (map.get(a.source) || 0) + 1);
    });
    return Array.from(map.entries()).map(([source, count]) => ({
      name: SOURCE_LABELS[source],
      value: count,
      source,
    }));
  }, [attributions]);

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

  const loading = isLoading || isValidating || kpisLoading || kpisValidating;

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
                  ROI & Attribution
                </h1>
                <p className="text-muted-foreground text-pretty">
                  Attribuzione lead e ritorno sull&apos;investimento pubblicitario
                </p>
              </div>
              <div className="flex items-center gap-2">
                <SeoDateFilter value={datePreset} onChange={(v) => { setDatePreset(v); setPage(1); }} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => mutate()}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`}
                    aria-hidden="true"
                  />
                  {loading ? 'Aggiornando…' : 'Aggiorna'}
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

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <SeoKpiCard
                title="ROAS"
                value={kpis ? `${kpis.roas.toFixed(2)}x` : '—'}
                icon={TrendingUp}
                loading={loading}
              />
              <SeoKpiCard
                title="Costo per Lead"
                value={kpis ? `€${microsToEuros(kpis.cost_per_lead_micros)}` : '—'}
                icon={DollarSign}
                invertTrend
                loading={loading}
              />
              <SeoKpiCard
                title="Lead Attribuiti"
                value={kpis ? formatNumber(kpis.total_leads_attributed) : '—'}
                icon={Users}
                loading={loading}
              />
              <SeoKpiCard
                title="Revenue Attribuita"
                value={kpis ? `€${centsToEuros(kpis.total_deal_value_cents)}` : '—'}
                icon={Wallet}
                loading={loading}
              />
            </div>

            {/* Source Breakdown Chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Breakdown per Fonte
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="h-[250px] animate-pulse rounded bg-muted motion-reduce:animate-none" />
                ) : sourceBreakdown.length === 0 ? (
                  <div className="flex h-[250px] items-center justify-center text-sm text-muted-foreground">
                    Nessun dato di attribuzione
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={sourceBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {sourceBreakdown.map((entry) => (
                            <Cell
                              key={entry.source}
                              fill={SOURCE_COLORS[entry.source]}
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0];
                            return (
                              <div className="rounded-lg border bg-background px-3 py-2 shadow-sm">
                                <p className="text-sm font-semibold">{d.name}</p>
                                <p className="text-xs text-muted-foreground tabular-nums">
                                  {d.value} lead
                                </p>
                              </div>
                            );
                          }}
                        />
                        <Legend />
                      </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Fonte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte le fonti</SelectItem>
                  <SelectItem value="google_ads">Google Ads</SelectItem>
                  <SelectItem value="organic">Organico</SelectItem>
                  <SelectItem value="direct">Diretto</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                </SelectContent>
              </Select>
              <Select value={confidenceFilter} onValueChange={(v) => { setConfidenceFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Confidenza" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutte</SelectItem>
                  <SelectItem value="exact">Exact</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="estimated">Estimated</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
              {(sourceFilter || confidenceFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSourceFilter('');
                    setConfidenceFilter('');
                  }}
                >
                  Reset filtri
                </Button>
              )}
            </div>

            {/* Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Confidenza</TableHead>
                    <TableHead>GCLID</TableHead>
                    <TableHead>Campagna UTM</TableHead>
                    <TableHead className="text-right">Deal Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-4 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : attributions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-24 text-center text-muted-foreground"
                      >
                        Nessuna attribuzione nel periodo selezionato
                      </TableCell>
                    </TableRow>
                  ) : (
                    attributions.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          {a.lead_name || a.lead_id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {SOURCE_LABELS[a.source]}
                          </Badge>
                        </TableCell>
                        <TableCell>{a.keyword || '—'}</TableCell>
                        <TableCell>
                          <Badge variant={CONFIDENCE_VARIANT[a.confidence]}>
                            {a.confidence}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[120px] truncate font-mono text-xs">
                          {a.gclid || '—'}
                        </TableCell>
                        <TableCell>{a.utm_campaign || '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {a.deal_value_cents != null
                            ? `€${centsToEuros(a.deal_value_cents)}`
                            : '—'}
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
                  {formatNumber(total)} attribuzioni
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
