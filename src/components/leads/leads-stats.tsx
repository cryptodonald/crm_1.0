'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  Clock,
  TrendingUp,
  Lightbulb,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { LeadsStats } from '@/types/leads';
import { cn } from '@/lib/utils';

interface LeadsStatsProps {
  stats: LeadsStats | null;
  loading: boolean;
  error: string | null;
  className?: string;
}

export function LeadsStats({
  stats,
  loading,
  error,
  className,
}: LeadsStatsProps) {
  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Errore nel caricamento delle statistiche: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (loading || !stats) {
    return (
      <div
        className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-2 h-8 w-16" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatPercentage = (value: number): string => {
    return `${value}%`;
  };

  const getTrendIcon = (variation: number) => {
    if (variation > 0)
      return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    if (variation < 0)
      return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getTrendColor = (variation: number) => {
    if (variation > 0) return 'text-green-600';
    if (variation < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      {/* KPI 1: Lead ultimi 7 giorni */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Lead Ultimi 7 Giorni
          </CardTitle>
          <Calendar className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.nuoviUltimi7Giorni.toLocaleString('it-IT')}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Su {stats.totale} lead totali
          </p>
        </CardContent>
      </Card>

      {/* KPI 2: Contattati entro 48h */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Contattati Entro 48h
          </CardTitle>
          <Clock className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatPercentage(stats.contattatiEntro48h)}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Lead contattati entro 48h dalla creazione
          </p>
        </CardContent>
      </Card>

      {/* KPI 3: Tasso di qualificazione */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Tasso di Qualificazione
          </CardTitle>
          <TrendingUp className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatPercentage(stats.tassoQualificazione)}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Nuovo → Qualificato ({stats.byStato['Qualificato'] || 0}{' '}
            qualificati)
          </p>
        </CardContent>
      </Card>

      {/* KPI 4: Tasso di conversione */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Tasso di Conversione
          </CardTitle>
          <Lightbulb className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatPercentage(stats.tassoConversione)}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Nuovo → Cliente ({stats.byStato['Cliente'] || 0} clienti)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente aggiuntivo per mostrare breakdown dettagliato
export function LeadsStatsBreakdown({
  stats,
  className,
}: {
  stats: LeadsStats | null;
  className?: string;
}) {
  if (!stats) return null;

  return (
    <div className={cn('grid gap-4 md:grid-cols-2', className)}>
      {/* Breakdown per stato */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-sm font-medium">
            <Users className="mr-2 h-4 w-4" />
            Distribuzione per Stato
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(stats.byStato).map(([stato, count]) => (
            <div key={stato} className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">{stato}</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{count}</span>
                <Badge variant="outline" className="text-xs">
                  {((count / stats.totale) * 100).toFixed(1)}%
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Breakdown per provenienza */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-sm font-medium">
            <TrendingUp className="mr-2 h-4 w-4" />
            Distribuzione per Provenienza
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(stats.byProvenienza).map(([provenienza, count]) => (
            <div
              key={provenienza}
              className="flex items-center justify-between"
            >
              <span className="text-muted-foreground text-sm">
                {provenienza}
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{count}</span>
                <Badge variant="outline" className="text-xs">
                  {((count / stats.totale) * 100).toFixed(1)}%
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
