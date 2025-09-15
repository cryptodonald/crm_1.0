'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Calendar, 
  Clock, 
  User, 
  Target, 
  MoreHorizontal, 
  Paperclip, 
  Search,
  Filter,
  SortAsc,
  ChevronDown,
  ClipboardList,
  Zap,
  CheckCircle2,
  Pause,
  AlertCircle,
  XCircle,
  Calendar as CalendarIcon
} from 'lucide-react';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { ActivityProgress } from '@/components/ui/activity-progress';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DataTablePersistentFilter } from '@/components/data-table/data-table-persistent-filter';
import type { Option } from '@/types/data-table';

import {
  ActivityData,
  ActivityStato,
  ACTIVITY_STATO_COLORS,
  ACTIVITY_TIPO_COLORS,
} from '@/types/activities';

interface ActivitiesListKanbanProps {
  className?: string;
}

// Stati per le liste verticali
const ACTIVITY_STATES: ActivityStato[] = [
  'Da Pianificare',
  'Pianificata', 
  'In attesa',
  'In corso',
  'Rimandata',
  'Completata',
  'Annullata'
];

// Configurazione icone e colori per ogni stato
const STATE_CONFIG = {
  'Da Pianificare': { icon: ClipboardList, color: 'text-gray-500', bgColor: 'bg-gray-50' },
  'Pianificata': { icon: CalendarIcon, color: 'text-blue-500', bgColor: 'bg-blue-50' },
  'In attesa': { icon: Pause, color: 'text-pink-500', bgColor: 'bg-pink-50' },
  'In corso': { icon: Zap, color: 'text-yellow-500', bgColor: 'bg-yellow-50' },
  'Rimandata': { icon: AlertCircle, color: 'text-purple-500', bgColor: 'bg-purple-50' },
  'Completata': { icon: CheckCircle2, color: 'text-green-500', bgColor: 'bg-green-50' },
  'Annullata': { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-50' }
};

interface ActivityListItemProps {
  activity: ActivityData;
  onEdit: (activity: ActivityData) => void;
  compact?: boolean;
}

const ActivityListItem: React.FC<ActivityListItemProps> = ({ activity, onEdit, compact = false }) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadgeProps = (stato: string) => {
    switch(stato) {
      case 'Completata': 
        return { variant: 'secondary' as const, className: 'bg-green-100 text-green-700 border-green-200' };
      case 'In corso': 
        return { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
      case 'Annullata': 
        return { variant: 'secondary' as const, className: 'bg-red-100 text-red-700 border-red-200' };
      case 'Da Pianificare': 
        return { variant: 'secondary' as const, className: 'bg-gray-100 text-gray-700 border-gray-200' };
      case 'Pianificata': 
        return { variant: 'secondary' as const, className: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'In attesa': 
        return { variant: 'secondary' as const, className: 'bg-pink-100 text-pink-700 border-pink-200' };
      case 'Rimandata': 
        return { variant: 'secondary' as const, className: 'bg-purple-100 text-purple-700 border-purple-200' };
      default: 
        return { variant: 'outline' as const, className: '' };
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'Urgente': return 'text-red-600 bg-red-50 border-red-200';
      case 'Alta': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Media': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Bassa': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const assignee = activity['Nome Assegnatario']?.[0];
  const leadName = activity['Nome Lead']?.[0];

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group">
        <div className="flex-shrink-0">
          <AvatarLead nome={assignee || 'N/A'} size="sm" showTooltip={false} />
          {/* Nota: Per ottenere l'avatar personalizzato dell'assignee, 
               servirebbero i dati degli utenti passati dal componente genitore */}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm text-gray-900 truncate">{activity.Titolo}</h4>
            {activity.Priorità && (
              <Badge variant="outline" className={cn('text-xs px-1.5 py-0.5', getPriorityColor(activity.Priorità))}>
                {activity.Priorità}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {leadName && <span className="truncate">{leadName}</span>}
            {activity.Data && (
              <>
                <span>•</span>
                <span>{formatDate(activity.Data)}</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex-shrink-0 flex items-center gap-2">
          {(() => {
            const statusProps = getStatusBadgeProps(activity.Stato);
            return (
              <Badge variant={statusProps.variant} className={cn('text-xs', statusProps.className)}>
                {activity.Stato}
              </Badge>
            );
          })()}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(activity);
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="group hover:shadow-md transition-all duration-200 border-gray-100">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {activity.Tipo}
            </Badge>
            {activity.Priorità && (
              <Badge variant="outline" className={cn('text-xs', getPriorityColor(activity.Priorità))}>
                {activity.Priorità}
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(activity);
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {activity.Titolo}
        </h3>

        {activity.Note && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {activity.Note}
          </p>
        )}

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AvatarLead nome={assignee || 'Non assegnata'} size="sm" showTooltip={false} />
            {/* Nota: Per ottenere l'avatar personalizzato dell'assignee, 
                 servirebbero i dati degli utenti passati dal componente genitore */}
            <span className="text-sm text-gray-700 truncate">{assignee || 'Non assegnata'}</span>
          </div>
          {activity.Data && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(activity.Data)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {leadName && (
              <Badge variant="secondary" className="text-xs">
                {leadName}
              </Badge>
            )}
            {activity.Allegati && activity.Allegati.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Paperclip className="w-3 h-3" />
                {activity.Allegati.length}
              </span>
            )}
          </div>
          {(() => {
            const statusProps = getStatusBadgeProps(activity.Stato);
            return (
              <Badge variant={statusProps.variant} className={cn('text-xs', statusProps.className)}>
                {activity.Stato}
              </Badge>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );
};

export function ActivitiesListKanban({ className }: ActivitiesListKanbanProps) {
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStates, setSelectedStates] = useState<ActivityStato[]>([]);
  const [viewMode, setViewMode] = useState<'card' | 'compact'>('card');

  // Mock data per testing - sostituire con chiamata API reale
  useEffect(() => {
    // Simula caricamento dati
    const mockActivities: ActivityData[] = [
      {
        id: '1',
        Titolo: 'Chiamata di follow-up con cliente',
        Tipo: 'Chiamata',
        Stato: 'Pianificata',
        Priorità: 'Alta',
        Data: new Date(Date.now() + 86400000).toISOString(),
        Note: 'Discutere dettagli contratto e prossimi step',
        'Nome Assegnatario': ['Mario Rossi'],
        'Nome Lead': ['Azienda ABC S.r.l.']
      },
      {
        id: '2', 
        Titolo: 'Preparazione proposta commerciale',
        Tipo: 'Documento',
        Stato: 'In corso',
        Priorità: 'Urgente',
        Data: new Date().toISOString(),
        Note: 'Completare entro fine giornata',
        'Nome Assegnatario': ['Laura Bianchi'],
        'Nome Lead': ['Tech Innovate'],
        Allegati: [{ url: '#', filename: 'proposta.pdf' }]
      },
      {
        id: '3',
        Titolo: 'Meeting settimanale team vendite',
        Tipo: 'Meeting',
        Stato: 'Completata',
        Priorità: 'Media',
        Data: new Date(Date.now() - 86400000).toISOString(),
        Note: 'Discussi obiettivi Q4 e strategie',
        'Nome Assegnatario': ['Giuseppe Verdi'],
        'Nome Lead': ['Interno']
      }
    ];
    
    setTimeout(() => {
      setActivities(mockActivities);
      setLoading(false);
    }, 1000);
  }, []);

  // Filtra attività per stato e ricerca
  const groupedActivities = useMemo(() => {
    let filtered = activities;
    
    if (searchTerm) {
      filtered = activities.filter(activity =>
        activity.Titolo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.Note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity['Nome Lead']?.[0]?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    const grouped: Record<ActivityStato, ActivityData[]> = {} as Record<ActivityStato, ActivityData[]>;
    
    ACTIVITY_STATES.forEach(state => {
      grouped[state] = filtered.filter(activity => activity.Stato === state);
    });
    
    return grouped;
  }, [activities, searchTerm]);

  const handleCreateActivity = () => {
    toast.info('Funzionalità di creazione attività in sviluppo');
  };

  const handleEditActivity = (activity: ActivityData) => {
    toast.info(`Modifica attività: ${activity.Titolo}`);
  };

  const totalActivities = activities.length;
  const completedActivities = activities.filter(a => a.Stato === 'Completata').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header con statistiche e controlli */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Attività</h2>
          <p className="text-sm text-gray-500">
            {totalActivities} totali • {completedActivities} completate
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Cerca attività..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          <Button
            variant={viewMode === 'compact' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode(viewMode === 'compact' ? 'card' : 'compact')}
          >
            Vista {viewMode === 'compact' ? 'dettagliata' : 'compatta'}
          </Button>
          
          <Button onClick={handleCreateActivity}>
            <Plus className="w-4 h-4 mr-2" />
            Nuova attività
          </Button>
        </div>
      </div>

      {/* Liste di attività per stato */}
      <div className="space-y-6">
        {ACTIVITY_STATES.map(state => {
          const stateActivities = groupedActivities[state];
          const config = STATE_CONFIG[state];
          const IconComponent = config.icon;
          
          return (
            <div key={state} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.bgColor)}>
                  <IconComponent className={cn('w-4 h-4', config.color)} />
                </div>
                <h3 className="font-semibold text-gray-900">{state}</h3>
                <Badge variant="secondary" className="text-xs">
                  {stateActivities.length}
                </Badge>
              </div>
              
              <div className="space-y-2">
                {stateActivities.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
                    <IconComponent className={cn('w-12 h-12 mx-auto mb-4', config.color)} />
                    <p className="text-sm text-gray-500">Nessuna attività {state.toLowerCase()}</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mt-2"
                      onClick={handleCreateActivity}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Crea attività
                    </Button>
                  </div>
                ) : (
                  stateActivities.map(activity => (
                    <ActivityListItem
                      key={activity.id}
                      activity={activity}
                      onEdit={handleEditActivity}
                      compact={viewMode === 'compact'}
                    />
                  ))
                )}
              </div>
              
              {state !== ACTIVITY_STATES[ACTIVITY_STATES.length - 1] && (
                <Separator className="my-6" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
