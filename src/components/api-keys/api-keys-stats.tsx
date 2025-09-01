'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Key,
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

interface ApiKeyStatsProps {
  stats: {
    total: number;
    active: number;
    inactive: number;
    totalUsage: number;
    expired?: number;
    expiringSoon?: number;
  } | null;
  trends?: {
    currentWeekUsage: number;
    previousWeekUsage: number;
    usageTrend: number;
  };
  className?: string;
}

export function ApiKeysStats({ stats, trends, className }: ApiKeyStatsProps) {
  if (!stats) {
    return (
      <div
        className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className || ''}`}
      >
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-16 rounded bg-gray-200"></div>
              <div className="h-4 w-4 rounded bg-gray-200"></div>
            </CardHeader>
            <CardContent>
              <div className="mb-1 h-8 w-12 rounded bg-gray-200"></div>
              <div className="h-3 w-20 rounded bg-gray-200"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const activePercentage =
    stats.total > 0 ? (stats.active / stats.total) * 100 : 0;
  const usageGrowth = trends ? trends.usageTrend : 0;

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (trend: number) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <div
      className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className || ''}`}
    >
      {/* Total API Keys */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Totale Chiavi API
          </CardTitle>
          <Key className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-muted-foreground mt-1 flex items-center space-x-2 text-xs">
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span>{stats.active} attive</span>
            </div>
            {stats.inactive > 0 && (
              <div className="flex items-center space-x-1">
                <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                <span>{stats.inactive} inattive</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Keys Progress */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Chiavi Attive</CardTitle>
          <Activity className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.active}</div>
          <Progress value={activePercentage} className="mt-2" />
          <p className="text-muted-foreground mt-1 text-xs">
            {Math.round(activePercentage)}% del totale
          </p>
        </CardContent>
      </Card>

      {/* Total Usage */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Uso Totale</CardTitle>
          {trends && getTrendIcon(usageGrowth)}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.totalUsage.toLocaleString()}
          </div>
          {trends && (
            <div className="mt-1 flex items-center space-x-1 text-xs">
              <span className={getTrendColor(usageGrowth)}>
                {usageGrowth > 0 ? '+' : ''}
                {Math.abs(usageGrowth).toFixed(1)}%
              </span>
              <span className="text-muted-foreground">
                dalla scorsa settimana
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avvisi</CardTitle>
          <AlertTriangle className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.expired && stats.expired > 0 && (
              <div className="flex items-center justify-between">
                <Badge variant="destructive" className="text-xs">
                  {stats.expired} Scadute
                </Badge>
              </div>
            )}
            {stats.expiringSoon && stats.expiringSoon > 0 && (
              <div className="flex items-center justify-between">
                <Badge
                  variant="secondary"
                  className="bg-yellow-100 text-xs text-yellow-800"
                >
                  {stats.expiringSoon} In Scadenza
                </Badge>
              </div>
            )}
            {(!stats.expired || stats.expired === 0) &&
              (!stats.expiringSoon || stats.expiringSoon === 0) && (
                <div className="text-muted-foreground text-sm">
                  Tutte le chiavi sono sane
                </div>
              )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
