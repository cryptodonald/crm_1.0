'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users,
  Calendar,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Crown,
} from 'lucide-react';
import { LeadsStats } from '@/types/leads';
import { ClientData } from '@/hooks/use-clients-list';
import { cn } from '@/lib/utils';

interface ClientsStatsProps {
  clients: ClientData[];
  loading: boolean;
  error: string | null;
  className?: string;
}

interface ClientsStatistics {
  totale: number;
  nuoviUltimi7Giorni: number;
  attivita: {
    conAttivita: number;
    senzaAttivita: number;
  };
  provenienza: Record<string, number>;
  distribuzioneCitta: Record<string, number>;
  recentActivity: number;
}

export function ClientsStats({
  clients,
  loading,
  error,
  className,
}: ClientsStatsProps) {
  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Errore nel caricamento delle statistiche clienti: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (loading || !clients) {
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

  // Calcola statistiche specifiche per i clienti
  const stats: ClientsStatistics = calculateClientsStats(clients);

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

  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      {/* KPI 1: Totale Clienti */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Totale Clienti
          </CardTitle>
          <Crown className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.totale.toLocaleString('it-IT')}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Clienti attivi nel sistema
          </p>
        </CardContent>
      </Card>

      {/* KPI 2: Nuovi Clienti Ultimi 7 Giorni */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Nuovi Clienti 7gg
          </CardTitle>
          <Calendar className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.nuoviUltimi7Giorni.toLocaleString('it-IT')}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Conversioni recenti da lead
          </p>
        </CardContent>
      </Card>

      {/* KPI 3: Clienti con Attività */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Clienti Attivi
          </CardTitle>
          <CheckCircle2 className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.attivita.conAttivita.toLocaleString('it-IT')}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Con attività o conversazioni
          </p>
        </CardContent>
      </Card>

      {/* KPI 4: Valore Cliente (Placeholder per futuro) */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Engagement Rate
          </CardTitle>
          <TrendingUp className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.totale > 0 ? formatPercentage(Math.round((stats.attivita.conAttivita / stats.totale) * 100)) : '0%'}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Clienti con attività recente
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente aggiuntivo per breakdown dettagliato specifico per clienti
export function ClientsStatsBreakdown({
  clients,
  className,
}: {
  clients: ClientData[];
  className?: string;
}) {
  if (!clients || clients.length === 0) return null;

  const stats = calculateClientsStats(clients);

  return (
    <div className={cn('grid gap-4 md:grid-cols-2', className)}>
      {/* Breakdown per provenienza */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-sm font-medium">
            <TrendingUp className="mr-2 h-4 w-4" />
            Distribuzione per Provenienza
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(stats.provenienza)
            .sort(([,a], [,b]) => b - a) // Ordina per count decrescente
            .slice(0, 5) // Top 5
            .map(([provenienza, count]) => (
            <div key={provenienza} className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">{provenienza}</span>
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

      {/* Breakdown per città */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-sm font-medium">
            <Users className="mr-2 h-4 w-4" />
            Distribuzione per Città
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(stats.distribuzioneCitta)
            .sort(([,a], [,b]) => b - a) // Ordina per count decrescente
            .slice(0, 5) // Top 5 città
            .map(([citta, count]) => (
            <div key={citta} className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">
                {citta || 'Non specificata'}
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

// Utility function per calcolare statistiche specifiche per clienti
function calculateClientsStats(clients: ClientData[]): ClientsStatistics {
  if (!clients || clients.length === 0) {
    return {
      totale: 0,
      nuoviUltimi7Giorni: 0,
      attivita: { conAttivita: 0, senzaAttivita: 0 },
      provenienza: {},
      distribuzioneCitta: {},
      recentActivity: 0,
    };
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Clienti diventati tali negli ultimi 7 giorni
  const nuoviUltimi7Giorni = clients.filter(client => {
    if (!client.Data) return false;
    const clientDate = new Date(client.Data);
    return clientDate >= sevenDaysAgo;
  }).length;

  // Conteggio per provenienza
  const byProvenienza: Record<string, number> = {};
  clients.forEach(client => {
    const prov = client.Provenienza || 'Non specificata';
    byProvenienza[prov] = (byProvenienza[prov] || 0) + 1;
  });

  // Conteggio per città
  const byCitta: Record<string, number> = {};
  clients.forEach(client => {
    const citta = client.Città || 'Non specificata';
    byCitta[citta] = (byCitta[citta] || 0) + 1;
  });

  // Attività dei clienti (basato su presenza di campo Attività o Conversations)
  let conAttivita = 0;
  clients.forEach(client => {
    if (client.Attività && client.Attività.length > 0) {
      conAttivita++;
    } else if (client.Conversations && client.Conversations.trim().length > 0) {
      conAttivita++;
    }
  });

  return {
    totale: clients.length,
    nuoviUltimi7Giorni,
    attivita: {
      conAttivita,
      senzaAttivita: clients.length - conAttivita,
    },
    provenienza: byProvenienza,
    distribuzioneCitta: byCitta,
    recentActivity: conAttivita, // Placeholder per future metriche
  };
}