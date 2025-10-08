'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ShoppingCart,
  Package,
  DollarSign,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CreditCard,
  Truck,
} from 'lucide-react';
// Tipi per gli ordini - deve corrispondere alla struttura API
interface OrderData {
  id: string;
  createdTime: string;
  ID_Ordine: string;
  Cliente_Nome?: string;
  Data_Ordine?: string;
  Data_Consegna_Richiesta?: string;
  Stato_Ordine?: string;
  Stato_Pagamento?: string;
  Totale_Finale?: number;
  Note_Cliente?: string;
  Note_Interne?: string;
  ID_Lead?: string[];
  ID_Venditore?: string[];
  Indirizzo_Consegna?: string;
  Modalita_Pagamento?: string;
  Totale_Lordo?: number;
  Totale_Sconto?: number;
  Totale_Netto?: number;
  Totale_IVA?: number;
  Allegati?: string[];
}
import { cn } from '@/lib/utils';

interface OrdersStatsData {
  totale: number;
  nuoviUltimi7Giorni: number;
  ricavoTotale: number;
  ricavoMedio: number;
  byStato: Record<string, number>;
  byStatoPagamento: Record<string, number>;
  completatiUltimi7Giorni: number;
  ordiniInCorso: number;
}

interface OrdersStatsProps {
  stats: OrdersStatsData | null;
  loading: boolean;
  error?: string | null;
  className?: string;
}

// Utility function to calculate stats from orders
export function calculateOrdersStats(orders: OrderData[]): OrdersStatsData {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  // Base counts
  const totale = orders.length;
  
  // Nuovi ordini ultimi 7 giorni
  const nuoviUltimi7Giorni = orders.filter(order => {
    if (!order.Data_Ordine) return false;
    const orderDate = new Date(order.Data_Ordine);
    return orderDate >= sevenDaysAgo;
  }).length;

  // Ricavi
  const ricavoTotale = orders.reduce((sum, order) => {
    return sum + (order.Totale_Finale || 0);
  }, 0);
  
  const ricavoMedio = totale > 0 ? ricavoTotale / totale : 0;

  // Completati ultimi 7 giorni
  const completatiUltimi7Giorni = orders.filter(order => {
    if (!order.Data_Ordine || order.Stato_Ordine !== 'Consegnato') return false;
    const orderDate = new Date(order.Data_Ordine);
    return orderDate >= sevenDaysAgo;
  }).length;

  // Ordini in corso (non Consegnato e non Annullato)
  const ordiniInCorso = orders.filter(order => 
    order.Stato_Ordine && 
    !['Consegnato', 'Annullato'].includes(order.Stato_Ordine)
  ).length;

  // Breakdown per stato
  const byStato: Record<string, number> = {};
  orders.forEach(order => {
    const stato = order.Stato_Ordine || 'Non definito';
    byStato[stato] = (byStato[stato] || 0) + 1;
  });

  // Breakdown per stato pagamento
  const byStatoPagamento: Record<string, number> = {};
  orders.forEach(order => {
    const statoPagamento = order.Stato_Pagamento || 'Non definito';
    byStatoPagamento[statoPagamento] = (byStatoPagamento[statoPagamento] || 0) + 1;
  });

  return {
    totale,
    nuoviUltimi7Giorni,
    ricavoTotale,
    ricavoMedio,
    byStato,
    byStatoPagamento,
    completatiUltimi7Giorni,
    ordiniInCorso,
  };
}

export function OrdersStats({
  stats,
  loading,
  error,
  className,
}: OrdersStatsProps) {
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

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
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
      {/* KPI 1: Ordini Totali */}
      <Card className="from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Ordini Totali
          </CardTitle>
          <ShoppingCart className="text-blue-600 dark:text-blue-400 h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {stats.totale.toLocaleString('it-IT')}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {stats.nuoviUltimi7Giorni} negli ultimi 7 giorni
          </p>
        </CardContent>
      </Card>

      {/* KPI 2: Ricavo Totale */}
      <Card className="from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Ricavo Totale
          </CardTitle>
          <DollarSign className="text-green-600 dark:text-green-400 h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300">
            {formatCurrency(stats.ricavoTotale)}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Media: {formatCurrency(stats.ricavoMedio)}
          </p>
        </CardContent>
      </Card>

      {/* KPI 3: Ordini In Corso */}
      <Card className="from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Ordini In Corso
          </CardTitle>
          <Clock className="text-amber-600 dark:text-amber-400 h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
            {stats.ordiniInCorso.toLocaleString('it-IT')}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Da elaborare e spedire
          </p>
        </CardContent>
      </Card>

      {/* KPI 4: Completati Recenti */}
      <Card className="from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Completati (7gg)
          </CardTitle>
          <CheckCircle2 className="text-purple-600 dark:text-purple-400 h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
            {stats.completatiUltimi7Giorni.toLocaleString('it-IT')}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Ordini consegnati
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente aggiuntivo per breakdown dettagliato
export function OrdersStatsBreakdown({
  stats,
  className,
}: {
  stats: OrdersStatsData | null;
  className?: string;
}) {
  if (!stats) return null;

  // Colori per stati ordine
  const getStatoColor = (stato: string) => {
    switch (stato) {
      case 'Bozza': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'Confermato': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'In_Produzione': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Spedito': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'Consegnato': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Annullato': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  // Colori per stati pagamento
  const getStatoPagamentoColor = (stato: string) => {
    switch (stato) {
      case 'Non_Pagato': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'Pagamento_Parziale': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Pagato': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Rimborsato': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className={cn('grid gap-4 md:grid-cols-2', className)}>
      {/* Breakdown per stato ordine */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-sm font-medium">
            <Package className="mr-2 h-4 w-4" />
            Distribuzione per Stato Ordine
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(stats.byStato)
            .sort(([,a], [,b]) => b - a)
            .map(([stato, count]) => (
            <div key={stato} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge className={getStatoColor(stato)}>
                  {stato.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{count}</span>
                <span className="text-xs text-muted-foreground">
                  ({((count / stats.totale) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Breakdown per stato pagamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-sm font-medium">
            <CreditCard className="mr-2 h-4 w-4" />
            Distribuzione per Stato Pagamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(stats.byStatoPagamento)
            .sort(([,a], [,b]) => b - a)
            .map(([stato, count]) => (
            <div key={stato} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge className={getStatoPagamentoColor(stato)}>
                  {stato.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">{count}</span>
                <span className="text-xs text-muted-foreground">
                  ({((count / stats.totale) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}