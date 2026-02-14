'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { SeoSubNav } from '@/components/seo-ads/seo-sub-nav';
import { SeoKpiCard } from '@/components/seo-ads/seo-kpi-card';
import { SeoDateFilter, presetToDates } from '@/components/seo-ads/seo-date-filter';
import type { DatePreset } from '@/components/seo-ads/seo-date-filter';
import { SeoTrendChart } from '@/components/seo-ads/seo-trend-chart';
import {
  microsToEuros,
  centsToEuros,
  formatPercent,
  formatNumber,
  formatPosition,
} from '@/components/seo-ads/seo-currency-helpers';
import { useSeoDashboard } from '@/hooks/use-seo-dashboard';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DollarSign,
  Star,
  Users,
  MousePointerClick,
  Globe,
  Percent,
  TrendingUp,
  Wallet,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

export default function SeoAdsDashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const { date_from, date_to } = presetToDates(datePreset);
  const { kpis, dailyTrend, isLoading, isValidating, error, mutate } = useSeoDashboard(date_from, date_to);
  const refreshing = isLoading || isValidating || syncing;

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
      await mutate();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sincronizzazione fallita');
    } finally {
      setSyncing(false);
    }
  }, [date_from, date_to, mutate]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/dashboard/seo-ads');
    }
  }, [status, router]);

  // Show loading while checking auth
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

  // Real daily trend data from API
  const spendTrend = dailyTrend.map(d => ({ date: d.date, value: d.spend_micros / 1_000_000 }));
  const clicksTrend = dailyTrend.map(d => ({ date: d.date, value: d.clicks }));

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="SEO & Ads" />

        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-pretty">
                  SEO & Ads Intelligence
                </h1>
                <p className="text-muted-foreground text-pretty">
                  Performance campagne, posizionamento organico e attribuzione lead
                </p>
              </div>
              <div className="flex items-center gap-2">
                <SeoDateFilter value={datePreset} onChange={setDatePreset} />
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

            {/* Sub Navigation */}
            <SeoSubNav />

            {/* Error */}
            {(error || syncError) && (
              <Alert variant="destructive" role="alert">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <AlertDescription>
                  {syncError || error?.message || 'Errore nel caricamento dei dati SEO'}
                </AlertDescription>
              </Alert>
            )}

            {/* KPI Cards — Row 1: Ads */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <SeoKpiCard
                title="Costo per Lead"
                value={kpis ? `€${microsToEuros(kpis.cost_per_lead_micros)}` : '—'}
                icon={DollarSign}
                change={kpis?.changes?.cost_per_lead_micros}
                invertTrend
                loading={isLoading}
              />
              <SeoKpiCard
                title="Quality Score Medio"
                value={kpis?.ads_avg_quality_score != null ? `${kpis.ads_avg_quality_score}/10` : '—'}
                icon={Star}
                loading={isLoading}
              />
              <SeoKpiCard
                title="Lead Attribuiti"
                value={kpis ? formatNumber(kpis.total_leads_attributed) : '—'}
                icon={Users}
                change={kpis?.changes?.total_leads_attributed}
                loading={isLoading}
              />
              <SeoKpiCard
                title="CPC Medio"
                value={kpis ? `€${microsToEuros(kpis.ads_avg_cpc_micros)}` : '—'}
                icon={MousePointerClick}
                change={kpis?.changes?.ads_avg_cpc_micros}
                invertTrend
                loading={isLoading}
              />
            </div>

            {/* KPI Cards — Row 2: Organic + ROI */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <SeoKpiCard
                title="Posizione Organica Media"
                value={kpis ? formatPosition(kpis.organic_avg_position) : '—'}
                icon={Globe}
                change={kpis?.changes?.organic_avg_position}
                invertTrend
                loading={isLoading}
              />
              <SeoKpiCard
                title="CTR Ads"
                value={
                  kpis && kpis.ads_total_impressions > 0
                    ? formatPercent(kpis.ads_total_clicks / kpis.ads_total_impressions)
                    : '—'
                }
                icon={Percent}
                change={kpis?.changes?.ads_total_clicks}
                loading={isLoading}
              />
              <SeoKpiCard
                title="ROAS"
                value={kpis ? `${kpis.roas.toFixed(2)}x` : '—'}
                icon={TrendingUp}
                change={kpis?.changes?.roas}
                loading={isLoading}
              />
              <SeoKpiCard
                title="Budget Speso"
                value={kpis ? `€${microsToEuros(kpis.ads_total_spend_micros)}` : '—'}
                icon={Wallet}
                change={kpis?.changes?.ads_total_spend_micros}
                loading={isLoading}
              />
            </div>

            {/* Trend Charts */}
            <div className="grid gap-4 md:grid-cols-2">
              <SeoTrendChart
                title="Spesa Giornaliera (€)"
                data={spendTrend}
                valueFormatter={(v) => `€${v.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
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

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border bg-card p-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Sessioni Totali
                </h3>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {kpis ? formatNumber(kpis.total_sessions) : '—'}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Form Submissions
                </h3>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {kpis ? formatNumber(kpis.total_form_submissions) : '—'}
                </p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Revenue Attribuita
                </h3>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {kpis ? `€${centsToEuros(kpis.total_deal_value_cents)}` : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  );
}
