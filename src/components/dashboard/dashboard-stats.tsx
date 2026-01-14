'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, ShoppingCart, CheckCircle2, TrendingUp, TrendingDown, Calendar, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface DashboardStatsProps {
  stats: {
    // Leads
    totalLeads: number;
    newLeadsLast7Days: number;
    leadsContactedWithin48h: number;
    leadsQualificationRate: number;
    leadsConversionRate: number;
    
    // Orders
    totalOrders: number;
    ordersLast30Days: number;
    totalRevenue: number;
    averageOrderValue: number;
    
    // Activities
    totalActivities: number;
    completedActivities: number;
    pendingActivities: number;
    activitiesCompletionRate: number;
  } | null;
  loading?: boolean;
}

export function DashboardStats({ stats, loading }: DashboardStatsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-3 w-32 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const cards = [
    {
      title: 'Fatturato Totale',
      value: `€${stats.totalRevenue.toLocaleString('it-IT')}`,
      description: 'Ultimi 30 giorni',
      change: '+12.5%',
      changeType: 'positive' as const,
      icon: DollarSign,
      subtitle: 'Trend in crescita questo mese',
    },
    {
      title: 'Nuovi Lead',
      value: stats.totalLeads.toLocaleString('it-IT'),
      description: 'Ultimi 6 mesi',
      change: `+${stats.newLeadsLast7Days}`,
      changeType: stats.newLeadsLast7Days > 0 ? 'positive' as const : 'neutral' as const,
      icon: Users,
      subtitle: `${stats.leadsConversionRate}% tasso di conversione`,
    },
    {
      title: 'Nuovi Clienti',
      value: stats.ordersLast30Days.toLocaleString('it-IT'),
      description: 'Questo periodo',
      change: stats.ordersLast30Days > 10 ? '+15%' : '-5%',
      changeType: stats.ordersLast30Days > 10 ? 'positive' as const : 'negative' as const,
      icon: ShoppingCart,
      subtitle: stats.ordersLast30Days > 10 ? 'Acquisizione eccellente' : 'Richiede attenzione',
    },
    {
      title: 'Account Attivi',
      value: stats.totalOrders.toLocaleString('it-IT'),
      description: 'Totale ordini',
      change: '+12.5%',
      changeType: 'positive' as const,
      icon: CheckCircle2,
      subtitle: 'Forte retention utenti',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const isPositive = card.changeType === 'positive';
        const isNegative = card.changeType === 'negative';
        
        return (
          <Card key={index} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold tracking-tight">{card.value}</div>
                <div className="flex items-center gap-1 text-xs">
                  {isPositive && (
                    <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400">
                      <ArrowUpRight className="h-3 w-3" />
                      {card.change}
                    </Badge>
                  )}
                  {isNegative && (
                    <Badge variant="secondary" className="gap-1 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-400">
                      <ArrowDownRight className="h-3 w-3" />
                      {card.change}
                    </Badge>
                  )}
                  {!isPositive && !isNegative && (
                    <Badge variant="secondary" className="gap-1">
                      {card.change}
                    </Badge>
                  )}
                  <span className="text-muted-foreground">{card.description}</span>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  {card.subtitle}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
