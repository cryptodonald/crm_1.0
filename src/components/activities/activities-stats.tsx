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
import { ActivityStats } from '@/types/activity';
import { cn } from '@/lib/utils';

interface ActivitiesStatsProps {
  stats: ActivityStats | null;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

export function ActivitiesStats({
  stats,
  loading,
  error,
  className,
}: ActivitiesStatsProps) {
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
    return `${value.toFixed(1)}%`;
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
      {/* KPI 1: Totali */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Attività Totali
          </CardTitle>
          <Calendar className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.totali.toLocaleString('it-IT')}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Pianificate: {stats.pianificate}
          </p>
        </CardContent>
      </Card>

      {/* KPI 2: Completate */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Completate
          </CardTitle>
          <CheckCircle2 className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.completate.toLocaleString('it-IT')}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Tasso: {formatPercentage(stats.tassoCompletamento)}
          </p>
        </CardContent>
      </Card>

      {/* KPI 3: In Corso */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            In Corso
          </CardTitle>
          <TrendingUp className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.inCorso.toLocaleString('it-IT')}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Tempo medio: {stats.tempoMedioCompletamento}h
          </p>
        </CardContent>
      </Card>

      {/* KPI 4: Scadute */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Scadute
          </CardTitle>
          <AlertTriangle className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.scadute.toLocaleString('it-IT')}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Richiedono attenzione
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente aggiuntivo per mostrare breakdown dettagliato
export function ActivitiesStatsBreakdown({
  stats,
  className,
}: {
  stats: ActivityStats | null;
  className?: string;
}) {
  if (!stats) return null;

  return (
    <div className={cn('grid gap-4 md:grid-cols-2', className)}>
      {/* Breakdown per tipo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-sm font-medium">
            <Users className="mr-2 h-4 w-4" />
            Distribuzione per Tipo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(stats.distribuzionePerTipo).map(([tipo, count]) => (
            <div key={tipo} className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">{tipo}</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{count}</span>
                <Badge variant="outline" className="text-xs">
                  {((count / stats.totali) * 100).toFixed(1)}%
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Breakdown per priorità */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-sm font-medium">
            <TrendingUp className="mr-2 h-4 w-4" />
            Distribuzione per Priorità
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(stats.distribuzionePerPriorita).map(([priorita, count]) => (
            <div
              key={priorita}
              className="flex items-center justify-between"
            >
              <span className="text-muted-foreground text-sm">
                {priorita}
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{count}</span>
                <Badge variant="outline" className="text-xs">
                  {((count / stats.totali) * 100).toFixed(1)}%
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
