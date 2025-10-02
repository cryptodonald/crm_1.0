'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Package, DollarSign, TrendingUp, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductsStatsProps {
  stats: {
    totale: number;
    attivi: number;
    prezzoTotaleInventario: number;
    prezzoMedio: number;
    margineMediaPonderata: number;
    inEvidenza: number;
    senzaImmagini: number;
    variantiAttive: number;
  };
  loading?: boolean;
  className?: string;
}

/**
 * Componente statistiche prodotti seguendo il pattern LeadsStats
 * Design completamente coerente con il resto dell'app
 */
export function ProductsStats({ stats, loading, className }: ProductsStatsProps) {
  const statsCards = [
    {
      title: 'Prodotti Totali',
      value: stats.totale.toLocaleString('it-IT'),
      subtitle: `${stats.attivi} attivi`,
      icon: Package,
    },
    {
      title: 'Valore Inventario',
      value: `€${Math.round(stats.prezzoTotaleInventario).toLocaleString('it-IT')}`,
      subtitle: `Media: €${Math.round(stats.prezzoMedio)}`,
      icon: DollarSign,
    },
    {
      title: 'Margine Medio',
      value: `${stats.margineMediaPonderata.toFixed(1)}%`,
      subtitle: 'Ponderato per prezzo',
      icon: TrendingUp,
    },
    {
      title: 'Varianti & Featured',
      value: stats.variantiAttive.toString(),
      subtitle: `${stats.inEvidenza} in evidenza`,
      icon: Star,
    },
  ];

  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {statsCards.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold">
                  {loading ? '...' : stat.value}
                </p>
                <p className="text-sm text-muted-foreground">
                  {loading ? '...' : stat.subtitle}
                </p>
              </div>
              <stat.icon className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}