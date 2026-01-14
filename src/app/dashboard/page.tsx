'use client';

import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { DashboardStats } from '@/components/dashboard/dashboard-stats';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';
import { DashboardQuickActions } from '@/components/dashboard/dashboard-quick-actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const { data, stats, loading, error, refresh } = useDashboardData();

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="Dashboard" />

        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Header Section */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                  Panoramica generale delle attività del CRM
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  disabled={loading}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Aggiorna
                </Button>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Errore nel caricamento dei dati: {error}
                </AlertDescription>
              </Alert>
            )}

            {/* KPI Stats Cards */}
            <DashboardStats stats={stats} loading={loading} />

            {/* Content Grid: Charts + Sidebar */}
            {!loading && data.leads.length > 0 && (
              <div className="grid gap-4 md:grid-cols-7">
                {/* Main Content Area */}
                <div className="col-span-7 md:col-span-5 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Trend Visitatori</CardTitle>
                      <CardDescription>
                        Ultimi 3 mesi di attività
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DashboardCharts 
                        leads={data.leads} 
                        orders={data.orders} 
                        activities={data.activities}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar Metrics */}
                <div className="col-span-7 md:col-span-2 space-y-4">
                  {/* Performance Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Performance Passate</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Tasso Conversione</p>
                        <p className="text-2xl font-bold">{stats?.leadsConversionRate}%</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Lead Qualificati</p>
                        <p className="text-2xl font-bold">{stats?.leadsQualificationRate}%</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Tempo Risposta 48h</p>
                        <p className="text-2xl font-bold">{stats?.leadsContactedWithin48h}%</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Team Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Team Performance</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Attività Completate</p>
                        <p className="text-2xl font-bold">{stats?.completedActivities}</p>
                        <p className="text-xs text-muted-foreground">di {stats?.totalActivities} totali</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Tasso Completamento</p>
                        <p className="text-2xl font-bold">{stats?.activitiesCompletionRate}%</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions Card */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Azioni Rapide</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <DashboardQuickActions />
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && data.leads.length === 0 && data.orders.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
                <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
                  <h3 className="mt-4 text-lg font-semibold">Nessun dato disponibile</h3>
                  <p className="mb-4 mt-2 text-sm text-muted-foreground">
                    Inizia aggiungendo lead, ordini o attività per visualizzare le statistiche della dashboard.
                  </p>
                  <DashboardQuickActions />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  );
}
