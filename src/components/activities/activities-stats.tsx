'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ClipboardList,
  CheckCircle2,
  Zap,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { ActivityData, ActivityStato } from '@/types/activities';
import { cn } from '@/lib/utils';

interface ActivitiesStatsProps {
  activities: ActivityData[];
  loading: boolean;
  error: string | null;
  className?: string;
}

export function ActivitiesStats({
  activities,
  loading,
  error,
  className,
}: ActivitiesStatsProps) {
  const stats = useMemo(() => {
    if (!activities.length) {
      return {
        totali: 0,
        completate: 0,
        inCorso: 0,
        scadute: 0,
        tassoCompletamento: 0,
        tempoMedio: '0h',
        richiedonoAttenzione: 0,
        pianificate: 0,
      };
    }

    const now = new Date();
    const totali = activities.length;
    
    // Conteggio per stati
    const completate = activities.filter(a => a.Stato === 'Completata').length;
    const inCorso = activities.filter(a => 
      ['In corso', 'In attesa'].includes(a.Stato)
    ).length;
    const pianificate = activities.filter(a => 
      ['Da Pianificare', 'Pianificata'].includes(a.Stato)
    ).length;
    
    // Scadute (attività con data passata e non completate)
    const scadute = activities.filter(a => {
      if (!a.Data || a.Stato === 'Completata' || a.Stato === 'Annullata') return false;
      const activityDate = new Date(a.Data);
      return activityDate < now;
    }).length;
    
    // Richiedono attenzione (scadute + rimandate + in attesa da più di 2 giorni)
    const richiedonoAttenzione = activities.filter(a => {
      // Rimandate
      if (a.Stato === 'Rimandata') return true;
      
      // Scadute
      if (a.Data && a.Stato !== 'Completata' && a.Stato !== 'Annullata') {
        const activityDate = new Date(a.Data);
        if (activityDate < now) return true;
      }
      
      // In attesa da più di 2 giorni
      if (a.Stato === 'In attesa' && a['Ultima modifica']) {
        const lastModified = new Date(a['Ultima modifica']);
        const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
        if (lastModified < twoDaysAgo) return true;
      }
      
      return false;
    }).length;

    const tassoCompletamento = totali > 0 ? Math.round((completate / totali) * 100) : 0;
    
    // Tempo medio stimato (approssimazione)
    const tempoMedio = '2.5h'; // Placeholder - si potrebbe calcolare dalla durata stimata

    return {
      totali,
      completate,
      inCorso,
      scadute,
      tassoCompletamento,
      tempoMedio,
      richiedonoAttenzione,
      pianificate,
    };
  }, [activities]);

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

  if (loading) {
    return (
      <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
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

  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      {/* Card 1: Attività Totali */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Attività Totali</CardTitle>
          <ClipboardList className="text-muted-foreground h-4 w-4" />
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

      {/* Card 2: Completate */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completate</CardTitle>
          <CheckCircle2 className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.completate.toLocaleString('it-IT')}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Tasso: {stats.tassoCompletamento}%
          </p>
        </CardContent>
      </Card>

      {/* Card 3: In Corso */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">In Corso</CardTitle>
          <Zap className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats.inCorso.toLocaleString('it-IT')}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Tempo medio: {stats.tempoMedio}
          </p>
        </CardContent>
      </Card>

      {/* Card 4: Scadute */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Scadute</CardTitle>
          <Clock className="text-muted-foreground h-4 w-4" />
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
