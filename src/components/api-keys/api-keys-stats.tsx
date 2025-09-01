'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Key, Activity, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

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
      <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className || ''}`}>
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-16 bg-gray-200 rounded"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-12 bg-gray-200 rounded mb-1"></div>
              <div className="h-3 w-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const activePercentage = stats.total > 0 ? (stats.active / stats.total) * 100 : 0;
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
    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 ${className || ''}`}>
      {/* Total API Keys */}
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Totale Chiavi API</CardTitle>
          <Key className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>{stats.active} attive</span>
            </div>
            {stats.inactive > 0 && (
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span>{stats.inactive} inattive</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Keys Progress */}
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Chiavi Attive</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.active}</div>
          <Progress value={activePercentage} className="mt-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {Math.round(activePercentage)}% del totale
          </p>
        </CardContent>
      </Card>

      {/* Total Usage */}
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Uso Totale</CardTitle>
          {trends && getTrendIcon(usageGrowth)}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalUsage.toLocaleString()}</div>
          {trends && (
            <div className="flex items-center space-x-1 text-xs mt-1">
              <span className={getTrendColor(usageGrowth)}>
                {usageGrowth > 0 ? '+' : ''}{Math.abs(usageGrowth).toFixed(1)}%
              </span>
              <span className="text-muted-foreground">dalla scorsa settimana</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts */}
      <Card className="bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avvisi</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
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
                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                  {stats.expiringSoon} In Scadenza
                </Badge>
              </div>
            )}
            {(!stats.expired || stats.expired === 0) && 
             (!stats.expiringSoon || stats.expiringSoon === 0) && (
              <div className="text-sm text-muted-foreground">
                Tutte le chiavi sono sane
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
