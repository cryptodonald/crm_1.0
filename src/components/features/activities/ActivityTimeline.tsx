'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  MessageSquare,
  FileText,
  TrendingUp,
  Activity as ActivityIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ActivityData, ActivityStato } from '@/types/activities';

interface ActivityTimelineProps {
  activities: ActivityData[];
  onEdit: (activity: ActivityData) => void;
  onDelete: (activity: ActivityData) => void;
  usersData?: Record<string, { nome: string; ruolo: string; avatar?: string }> | null;
}

// Icone per tipo attività
const getActivityIcon = (tipo: string) => {
  switch (tipo) {
    case 'Telefonata': return Phone;
    case 'Email': return Mail;
    case 'Visita': return MapPin;
    case 'Meeting': return Calendar;
    case 'Nota': return MessageSquare;
    case 'Documento': return FileText;
    default: return ActivityIcon;
  }
};

// Colore per esito
const getEsitoColor = (esito?: string) => {
  if (!esito) return 'text-muted-foreground';
  
  const esitiPositivi = ['Contatto riuscito', 'Molto interessato', 'Interessato', 'Preventivo inviato', 'Appuntamento fissato', 'Ordine confermato', 'Cliente soddisfatto'];
  const esitiNegativi = ['Nessuna risposta', 'Non interessato', 'Opportunità persa', 'Numero errato'];
  
  if (esitiPositivi.includes(esito)) return 'text-green-600 dark:text-green-400';
  if (esitiNegativi.includes(esito)) return 'text-red-600 dark:text-red-400';
  return 'text-yellow-600 dark:text-yellow-400';
};

// Icona per esito
const getEsitoIcon = (esito?: string) => {
  if (!esito) return null;
  
  const esitiPositivi = ['Contatto riuscito', 'Molto interessato', 'Interessato', 'Preventivo inviato', 'Appuntamento fissato', 'Ordine confermato', 'Cliente soddisfatto'];
  const esitiNegativi = ['Nessuna risposta', 'Non interessato', 'Opportunità persa', 'Numero errato'];
  
  if (esitiPositivi.includes(esito)) return CheckCircle2;
  if (esitiNegativi.includes(esito)) return XCircle;
  return AlertCircle;
};

// Raggruppamento temporale
type TimeGroup = 'Oggi' | 'Ieri' | 'Questa settimana' | 'Questo mese' | 'Più vecchie';

const getTimeGroup = (date: Date): TimeGroup => {
  if (isToday(date)) return 'Oggi';
  if (isYesterday(date)) return 'Ieri';
  if (isThisWeek(date)) return 'Questa settimana';
  if (isThisMonth(date)) return 'Questo mese';
  return 'Più vecchie';
};

interface GroupedActivities {
  group: TimeGroup;
  activities: ActivityData[];
}

export function ActivityTimeline({ activities, onEdit, onDelete, usersData }: ActivityTimelineProps) {
  const [collapsedGroups, setCollapsedGroups] = React.useState<Set<TimeGroup>>(new Set());

  // Statistiche
  const stats = useMemo(() => {
    const total = activities.length;
    const completate = activities.filter(a => a.Stato === 'Completata').length;
    const inCorso = activities.filter(a => a.Stato === 'In corso').length;
    const ultimaAttivita = activities.length > 0 
      ? Math.floor((new Date().getTime() - new Date(activities[0].DataCreazione).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Calcola tempo medio risposta (giorni tra attività)
    let tempoMedioRisposta = 0;
    if (activities.length > 1) {
      const sortedActivities = [...activities].sort((a, b) => 
        new Date(b.DataCreazione).getTime() - new Date(a.DataCreazione).getTime()
      );
      
      let totalDays = 0;
      for (let i = 0; i < sortedActivities.length - 1; i++) {
        const days = Math.floor(
          (new Date(sortedActivities[i].DataCreazione).getTime() - 
           new Date(sortedActivities[i + 1].DataCreazione).getTime()) / 
          (1000 * 60 * 60 * 24)
        );
        totalDays += days;
      }
      tempoMedioRisposta = Math.round(totalDays / (sortedActivities.length - 1));
    }

    return {
      total,
      completate,
      inCorso,
      ultimaAttivita,
      tempoMedioRisposta,
      tassoCompletamento: total > 0 ? Math.round((completate / total) * 100) : 0,
    };
  }, [activities]);

  // Raggruppa attività per periodo temporale
  const groupedActivities = useMemo<GroupedActivities[]>(() => {
    const sorted = [...activities].sort((a, b) => 
      new Date(b.DataCreazione).getTime() - new Date(a.DataCreazione).getTime()
    );

    const groups: Record<TimeGroup, ActivityData[]> = {
      'Oggi': [],
      'Ieri': [],
      'Questa settimana': [],
      'Questo mese': [],
      'Più vecchie': [],
    };

    sorted.forEach(activity => {
      const group = getTimeGroup(new Date(activity.DataCreazione));
      groups[group].push(activity);
    });

    return Object.entries(groups)
      .filter(([_, acts]) => acts.length > 0)
      .map(([group, acts]) => ({
        group: group as TimeGroup,
        activities: acts,
      }));
  }, [activities]);

  const toggleGroup = (group: TimeGroup) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(group)) {
        newSet.delete(group);
      } else {
        newSet.add(group);
      }
      return newSet;
    });
  };

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nessuna attività registrata
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistiche rapide */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attività Totali</CardTitle>
            <ActivityIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completate} completate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ultima Attività</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ultimaAttivita}g</div>
            <p className="text-xs text-muted-foreground">
              giorni fa
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Medio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tempoMedioRisposta}g</div>
            <p className="text-xs text-muted-foreground">
              tra attività
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completamento</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tassoCompletamento}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.completate}/{stats.total} attività
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {groupedActivities.map(({ group, activities: groupActivities }) => {
          const isCollapsed = collapsedGroups.has(group);

          return (
            <div key={group} className="space-y-4">
              {/* Header gruppo */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleGroup(group)}
                  className="px-2"
                >
                  {isCollapsed ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
                <h3 className="text-lg font-semibold">{group}</h3>
                <Badge variant="secondary" className="ml-2">
                  {groupActivities.length}
                </Badge>
              </div>

              {/* Attività del gruppo */}
              {!isCollapsed && (
                <div className="relative pl-8 space-y-4">
                  {/* Linea verticale */}
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

                  {groupActivities.map((activity, index) => {
                    const Icon = getActivityIcon(activity.Tipo);
                    const EsitoIcon = getEsitoIcon(activity.Esito);
                    const esitoColor = getEsitoColor(activity.Esito);
                    const assegnatario = activity.Assegnatario?.[0];
                    const userData = assegnatario && usersData?.[assegnatario];

                    return (
                      <div key={activity.ID} className="relative">
                        {/* Punto sulla timeline */}
                        <div className={cn(
                          "absolute -left-[1.4rem] top-2 h-3 w-3 rounded-full border-2 bg-background",
                          activity.Stato === 'Completata' ? 'border-green-500' :
                          activity.Stato === 'In corso' ? 'border-yellow-500' :
                          activity.Stato === 'Annullata' ? 'border-red-500' :
                          'border-muted-foreground'
                        )} />

                        <Card>
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              {/* Header */}
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3 flex-1">
                                  <div className={cn(
                                    "p-2 rounded-lg",
                                    activity.Stato === 'Completata' ? 'bg-green-100 dark:bg-green-900/20' :
                                    activity.Stato === 'In corso' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                                    'bg-muted'
                                  )}>
                                    <Icon className="h-5 w-5" />
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-semibold">{activity.Oggetto || activity.Tipo}</h4>
                                      <Badge variant="outline" className="text-xs">
                                        {activity.Tipo}
                                      </Badge>
                                    </div>
                                    {activity.Note && (
                                      <p className="text-sm text-muted-foreground line-clamp-2">
                                        {activity.Note}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onEdit(activity)}
                                  >
                                    Modifica
                                  </Button>
                                </div>
                              </div>

                              {/* Metadata */}
                              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(activity.DataCreazione), 'dd/MM/yyyy HH:mm', { locale: it })}
                                </div>
                                
                                {userData && (
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {userData.nome}
                                  </div>
                                )}

                                {activity.Esito && EsitoIcon && (
                                  <div className={cn("flex items-center gap-1 font-medium", esitoColor)}>
                                    <EsitoIcon className="h-3 w-3" />
                                    {activity.Esito}
                                  </div>
                                )}

                                <Badge 
                                  variant={
                                    activity.Stato === 'Completata' ? 'secondary' :
                                    activity.Stato === 'In corso' ? 'default' :
                                    activity.Stato === 'Annullata' ? 'destructive' :
                                    'outline'
                                  }
                                  className="text-xs"
                                >
                                  {activity.Stato}
                                </Badge>
                              </div>

                              {/* Tag note con AI */}
                              {activity.Note && activity.Note.length > 100 && !activity.Note.includes('**') && (
                                <Badge variant="outline" className="text-xs">
                                  ✨ Nota riscritta con AI
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
