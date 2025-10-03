'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, TrendingUp, Settings, FileText } from 'lucide-react';
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
 * Componente statistiche prodotti con 2 card più grandi
 * Focalizzato sui dati davvero utili per il business
 */
export function ProductsStats({ stats, loading, className }: ProductsStatsProps) {
  // Calcoli aggiuntivi per rendere i dati più interessanti
  const prodottiInattivi = stats.totale - stats.attivi;
  const percentualeAttivi = stats.totale > 0 ? ((stats.attivi / stats.totale) * 100) : 0;
  const prezzoMedio = stats.prezzoMedio;
  const margineFormatted = stats.margineMediaPonderata;
  
  // Determina il colore del margine basato sulla performance
  const getMargineColor = (margine: number) => {
    if (margine >= 40) return 'text-green-600 dark:text-green-400';
    if (margine >= 25) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };
  
  const getMargineLabel = (margine: number) => {
    if (margine >= 40) return 'Eccellente';
    if (margine >= 25) return 'Buono';
    return 'Da migliorare';
  };

  return (
    <div className={cn("grid gap-6 md:grid-cols-2", className)}>
      {/* Card 1: Panoramica Catalogo */}
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Panoramica Catalogo</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-2xl font-bold">
                {loading ? '...' : stats.totale.toLocaleString('it-IT')}
              </p>
              <p className="text-sm text-muted-foreground">Prodotti totali</p>
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {loading ? '...' : stats.attivi.toLocaleString('it-IT')}
              </p>
              <p className="text-sm text-muted-foreground">Prodotti attivi</p>
            </div>
          </div>
          
          <div className="pt-3 border-t">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Tasso di attivazione</span>
              <span className="text-sm font-bold">
                {loading ? '...' : `${percentualeAttivi.toFixed(1)}%`}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: loading ? '0%' : `${Math.min(percentualeAttivi, 100)}%` }}
              />
            </div>
            {prodottiInattivi > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {prodottiInattivi} prodotti disattivati
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Performance Economica */}
      <Card className="relative overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Performance Economica</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-2xl font-bold">
                {loading ? '...' : `€${Math.round(prezzoMedio).toLocaleString('it-IT')}`}
              </p>
              <p className="text-sm text-muted-foreground">Prezzo medio</p>
            </div>
            <div className="space-y-1">
              <p className={cn("text-2xl font-bold", getMargineColor(margineFormatted))}>
                {loading ? '...' : `${margineFormatted.toFixed(1)}%`}
              </p>
              <p className="text-sm text-muted-foreground">Margine medio</p>
            </div>
          </div>
          
          <div className="pt-3 border-t">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Valutazione margine</span>
              <span className={cn("text-sm font-bold", getMargineColor(margineFormatted))}>
                {loading ? '...' : getMargineLabel(margineFormatted)}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={cn(
                  "h-2 rounded-full transition-all duration-500",
                  margineFormatted >= 40 ? 'bg-green-500' : 
                  margineFormatted >= 25 ? 'bg-yellow-500' : 'bg-red-500'
                )}
                style={{ width: loading ? '0%' : `${Math.min(margineFormatted * 2, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Margine ponderato per valore prodotti
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
