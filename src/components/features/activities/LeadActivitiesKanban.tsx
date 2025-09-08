'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Calendar, Clock, User, Target, GripVertical, MoreHorizontal, Paperclip, ClipboardList, Zap, CheckCircle2, Edit, Trash2 } from 'lucide-react';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { ActivityProgress } from '@/components/ui/activity-progress';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import { type UniqueIdentifier } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { DataTablePersistentFilter } from '@/components/data-table/data-table-persistent-filter';
import type { Option } from '@/types/data-table';
import { NewActivityModal } from '@/components/activities';

import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from '@/components/features/kanban/kanban';
import {
  ActivityData,
  ActivityStato,
  KANBAN_COLUMNS,
  ACTIVITY_STATO_COLORS,
  ACTIVITY_TIPO_COLORS,
  ACTIVITY_TIPO_ICONS,
  getKanbanColumnFromState,
  KanbanColumnId,
} from '@/types/activities';

interface LeadActivitiesKanbanProps {
  leadId: string;
  className?: string;
}

// Tipo per la struttura dati del Kanban
type KanbanData = Record<KanbanColumnId, ActivityData[]>;

interface ActivityCardProps {
  activity: ActivityData;
  onEdit: (activity: ActivityData) => void;
  onDelete: (activity: ActivityData) => void;
}

// Funzioni per i badge (dalla pagina demo-badges)
const getStatusBadgeProps = (stato: string) => {
  switch(stato) {
    case 'Completata': 
      return { variant: 'secondary' as const, className: 'bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700' };
    case 'In corso': 
      return { variant: 'secondary' as const, className: 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300 dark:bg-yellow-800 dark:text-yellow-200 dark:hover:bg-yellow-700' };
    case 'Annullata': 
      return { variant: 'secondary' as const, className: 'bg-red-200 text-red-800 hover:bg-red-300 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700' };
    case 'Da Pianificare': 
      return { variant: 'secondary' as const, className: 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600' };
    case 'Pianificata': 
      return { variant: 'secondary' as const, className: 'bg-blue-200 text-blue-800 hover:bg-blue-300 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700' };
    case 'In attesa': 
      return { variant: 'secondary' as const, className: 'bg-pink-200 text-pink-800 hover:bg-pink-300 dark:bg-pink-800 dark:text-pink-200 dark:hover:bg-pink-700' };
    case 'Rimandata': 
      return { variant: 'secondary' as const, className: 'bg-purple-200 text-purple-800 hover:bg-purple-300 dark:bg-purple-800 dark:text-purple-200 dark:hover:bg-purple-700' };
    default: 
      return { variant: 'outline' as const, className: '' };
  }
};

const getBadgeVariantForPriority = (priorita: string): "default" | "secondary" | "destructive" | "outline" => {
  switch(priorita) {
    case 'Urgente': return 'destructive';
    case 'Alta': return 'default';
    case 'Media': return 'secondary';
    case 'Bassa': return 'outline';
    default: return 'outline';
  }
};

// Helper per ottenere la percentuale da uno stato
const getPercentageFromState = (stato: ActivityStato): string => {
  switch (stato) {
    case 'Da Pianificare': return '0%';
    case 'Pianificata': return '25%';
    case 'In attesa': return '40%';
    case 'In corso': return '55%';
    case 'Rimandata': return '10%';
    case 'Completata': return '100%';
    case 'Annullata': return '0%';
    default: return '0%';
  }
};

const getEsitoBadgeProps = (esito: string) => {
  // Esiti positivi (verde)
  const esitiPositivi = [
    'Contatto riuscito',
    'Molto interessato',
    'Interessato',
    'Informazioni raccolte',
    'Preventivo richiesto',
    'Preventivo inviato',
    'Appuntamento fissato',
    'Ordine confermato',
    'Servizio completato',
    'Problema risolto',
    'Cliente soddisfatto',
    'Recensione ottenuta'
  ];
  
  // Esiti negativi (rosso)
  const esitiNegativi = [
    'Nessuna risposta',
    'Numero errato',
    'Non disponibile',
    'Non presentato',
    'Non interessato',
    'Opportunità persa'
  ];
  
  // Esiti neutri/in attesa (arancione)
  const esitiNeutrali = [
    'Poco interessato'
  ];
  
  if (esitiPositivi.includes(esito)) {
    return { className: 'bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700' };
  }
  
  if (esitiNegativi.includes(esito)) {
    return { className: 'bg-red-200 text-red-800 hover:bg-red-300 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700' };
  }
  
  if (esitiNeutrali.includes(esito)) {
    return { className: 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300 dark:bg-yellow-800 dark:text-yellow-200 dark:hover:bg-yellow-700' };
  }
  
  // Default per esiti non categorizzati
  return { className: 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600' };
};

// Componente per stato vuoto delle colonne
interface EmptyColumnStateProps {
  columnId: KanbanColumnId;
  onCreateActivity: () => void;
}

const EmptyColumnState: React.FC<EmptyColumnStateProps> = ({ columnId, onCreateActivity }) => {
  const getEmptyStateConfig = (columnId: KanbanColumnId) => {
    switch (columnId) {
      case 'to-do':
        return {
          icon: ClipboardList,
          title: 'Niente da pianificare',
          subtitle: 'Inizia creando una nuova attività',
          buttonText: 'Crea attività',
        };
      case 'in-progress':
        return {
          icon: Zap,
          title: 'Tutto tranquillo',
          subtitle: 'Nessuna attività in corso al momento',
          buttonText: 'Inizia subito',
        };
      case 'done':
        return {
          icon: CheckCircle2,
          title: 'Obiettivo completato!',
          subtitle: 'Ottimo lavoro, niente da mostrare qui',
          buttonText: 'Nuova sfida',
        };
      default:
        return {
          icon: ClipboardList,
          title: 'Area vuota',
          subtitle: 'Nessun elemento presente',
          buttonText: 'Aggiungi',
        };
    }
  };

  const config = getEmptyStateConfig(columnId);
  const IconComponent = config.icon;

  return (
    <div className="mx-2 my-4 p-6 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 transition-all duration-200 hover:border-solid group cursor-pointer hover:shadow-sm bg-gray-50/50 dark:bg-gray-800/20"
      onClick={onCreateActivity}
    >
      <div className="text-center space-y-3">
        {/* Icon con background neutro */}
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto transition-transform group-hover:scale-110 bg-gray-100 dark:bg-gray-700">
          <IconComponent className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        </div>
        
        {/* Title */}
        <div>
          <h4 className="font-semibold text-sm mb-1 text-gray-700 dark:text-gray-300">
            {config.title}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            {config.subtitle}
          </p>
        </div>
        
        {/* Call to action button */}
        <Button 
          size="sm" 
          variant="outline"
          className="h-8 text-xs border-dashed group-hover:border-solid transition-all hover:shadow-sm"
          onClick={(e) => {
            e.stopPropagation();
            onCreateActivity();
          }}
        >
          <Plus className="w-3 h-3 mr-1" />
          {config.buttonText}
        </Button>
      </div>
    </div>
  );
};

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, onEdit, onDelete }) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { addSuffix: true, locale: it });
    } catch {
      return dateStr;
    }
  };

  const formatScheduledDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('it-IT', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getPriorityPill = (priority?: string) => {
    switch (priority) {
      case 'Urgente':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'Alta':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Media':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'Bassa':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };



  const assignee = activity['Nome Assegnatario']?.[0];

  return (
    <KanbanItem
      value={activity.id}
      asHandle
      className="group rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer dark:bg-zinc-900 dark:border-zinc-700"
    >
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-3 sm:p-4">
          {/* Header: Data, Durata e pulsante azioni */}
          <div className="flex items-start justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              {/* Data programmata e Durata nell'header */}
              {activity.Data && (
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                  <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">{formatScheduledDate(activity.Data)}</span>
                  <span className="sm:hidden">{new Date(activity.Data).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</span>
                </span>
              )}
              {activity['Durata stimata'] && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-800 text-white rounded dark:bg-gray-200 dark:text-gray-800">
                  <Clock className="w-2.5 h-2.5" />
                  {activity['Durata stimata']}
                </span>
              )}
            </div>
            
            {/* Pulsante azioni in alto a destra */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(activity);
                  }}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Edit className="h-3 w-3" />
                  Modifica
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(activity);
                  }}
                  className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/20"
                >
                  <Trash2 className="h-3 w-3" />
                  Elimina
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Riga Tipo, Nome Lead e Stato */}
          <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
            <Badge variant="secondary" className="text-[10px] sm:text-xs">
              {activity.Tipo}
            </Badge>
            {activity['Nome Lead'] && activity['Nome Lead'][0] && (
              <Badge variant="outline" className="text-[10px] sm:text-xs">
                {activity['Nome Lead'][0]}
              </Badge>
            )}
            {(() => {
              const statusProps = getStatusBadgeProps(activity.Stato);
              return (
                <Badge 
                  variant={statusProps.variant}
                  className={cn('text-[10px] sm:text-xs', statusProps.className)}
                >
                  {activity.Stato}
                </Badge>
              );
            })()}
          </div>

          {/* Titolo principale */}
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 sm:text-base md:text-lg line-clamp-2">
            {activity.Titolo}
          </h3>

          {/* Descrizione/Note */}
          {activity.Note && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 sm:text-sm sm:mb-4">
              {activity.Note}
            </p>
          )}

          {/* Sezione Assegnatario e Progress */}
          <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between sm:mb-4">
            <div className="flex items-center gap-2">
              <AvatarLead
                nome={assignee || 'Non assegnata'}
                size="sm"
                showTooltip={false}
                className="w-6 h-6 sm:w-8 sm:h-8"
              />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 sm:text-sm truncate">{assignee || 'Non assegnata'}</span>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 border border-gray-200 rounded-md bg-gray-50 dark:border-zinc-600 dark:bg-zinc-800 sm:gap-2 sm:px-2 sm:py-1">
              <ActivityProgress 
                stato={activity.Stato}
                size="xs"
                showPercentage={false}
              />
              <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300 sm:text-xs">
                {getPercentageFromState(activity.Stato)}
              </span>
            </div>
          </div>

          {/* Footer: Priorità, Obiettivo, Esito e icone */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1 flex-wrap sm:gap-2">
              {activity.Priorità && (
                <Badge 
                  variant={getBadgeVariantForPriority(activity.Priorità)}
                  className="text-[10px] sm:text-xs"
                >
                  {activity.Priorità}
                </Badge>
              )}
              {activity.Obiettivo && (
                <Badge variant="secondary" className="text-[10px] sm:text-xs hidden sm:inline-flex">
                  {activity.Obiettivo}
                </Badge>
              )}
              {activity.Esito && (
                <Badge 
                  variant="secondary" 
                  className={cn('text-[10px] sm:text-xs', getEsitoBadgeProps(activity.Esito).className)}
                >
                  {activity.Esito}
                </Badge>
              )}
            </div>
            {activity.Allegati && activity.Allegati.length > 0 ? (
              <button 
                className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded transition-colors dark:bg-zinc-800 dark:hover:bg-zinc-700 sm:px-2 sm:py-1"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Apertura allegati:', activity.Allegati);
                }}
              >
                <Paperclip className="w-3 h-3 text-gray-600 dark:text-gray-400 sm:w-4 sm:h-4" />
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium sm:text-sm">{activity.Allegati.length}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 opacity-30">
                <Paperclip className="w-3 h-3 text-gray-300 dark:text-gray-600 sm:w-4 sm:h-4" />
                <span className="text-xs text-gray-300 dark:text-gray-600 sm:text-sm">0</span>
              </div>
            )}
          </div>

          {/* Prossima Azione (solo se presente) */}
          {(activity['Prossima azione'] || activity['Data prossima azione']) && (
            <div className="mt-2 sm:mt-3">
              <div className="flex items-center gap-2 flex-wrap sm:gap-3">
                {activity['Prossima azione'] && (
                  <Badge variant="outline" className="text-[10px] sm:text-xs">
                    {activity['Prossima azione']}
                  </Badge>
                )}
                {activity['Data prossima azione'] && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 sm:text-xs">
                    <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span className="hidden sm:inline">{formatScheduledDate(activity['Data prossima azione'])}</span>
                    <span className="sm:hidden">{new Date(activity['Data prossima azione']).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Timestamp audit - data di creazione in basso */}
          <div className="mt-3 pt-2 border-t border-gray-100 dark:border-zinc-700 text-[9px] text-gray-400 dark:text-gray-500 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 sm:mt-4 sm:pt-3 sm:text-[10px]">
            <span>Creato: {formatDate(activity.createdTime)}</span>
            {activity['Ultima modifica'] && (
              <>
                <span className="hidden sm:inline">•</span>
                <span>Modificato: {formatDate(activity['Ultima modifica'])}</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </KanbanItem>
  );
};





export const LeadActivitiesKanban: React.FC<LeadActivitiesKanbanProps> = ({
  leadId,
  className = '',
}) => {
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statoFilter, setStatoFilter] = useState<ActivityStato[]>([]);
  const [showNewActivityModal, setShowNewActivityModal] = useState(false);
  
  // Stati per il dialog di scelta stato completate
  const [showStateDialog, setShowStateDialog] = useState(false);
  const [pendingStateChange, setPendingStateChange] = useState<{
    activity: ActivityData;
    columnId: string;
    newKanbanData: KanbanData;
  } | null>(null);

  // Stati disponibili per il filtro (tutti gli stati possibili dalle attività)
  const STATI_DISPONIBILI: ActivityStato[] = [
    'Da Pianificare',
    'Pianificata', 
    'In corso',
    'In attesa',
    'Rimandata',
    'Completata',
    'Annullata',
  ];

  // Stato del Kanban - inizializzato come oggetto vuoto
  const [kanbanData, setKanbanData] = useState<KanbanData>({
    'to-do': [],
    'in-progress': [],
    'done': [],
  });

  // Fetch delle attività per questo lead
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        setError(null);

        // TODO: Sostituire con chiamata API reale
        // const response = await fetch(`/api/activities?leadId=${leadId}`);
        // if (!response.ok) throw new Error('Errore nel caricamento attività');
        // const data = await response.json();
        // setActivities(data.activities || []);

        // Mock data per ora (da rimuovere)
        const mockActivities: ActivityData[] = [
          {
            id: 'act1',
            ID: 'ACT001',
            createdTime: new Date().toISOString(),
            Titolo: 'Chiamata - Mario Rossi',
            Tipo: 'Chiamata',
            Stato: 'Da Pianificare',
            Obiettivo: 'Primo contatto',
            Priorità: 'Alta',
            Data: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            'Durata stimata': '0:30',
            'ID Lead': [leadId],
            'Nome Lead': ['Mario Rossi'],
            Assegnatario: ['user1'],
            'Nome Assegnatario': ['Giuseppe Verdi'],
            Note: 'Prima chiamata per presentare i nostri servizi e valutare interesse.',
            Esito: 'Nessuna risposta',
            // Questa card NON ha prossima azione per test
            'Ultima modifica': new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'act2', 
            ID: 'ACT002',
            createdTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            Titolo: 'WhatsApp - Mario Rossi',
            Tipo: 'WhatsApp',
            Stato: 'In corso',
            Obiettivo: 'Follow-up preventivo',
            Priorità: 'Media',
            Data: new Date().toISOString(),
            'Durata stimata': '0:15',
            'ID Lead': [leadId],
            'Nome Lead': ['Mario Rossi'],
            Note: 'Invio preventivo via WhatsApp e attesa conferma.',
            Esito: 'Molto interessato',
            // Questa card HA sia prossima azione che data per test completo
            'Prossima azione': 'Chiamata',
            'Data prossima azione': new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            Allegati: [
              { id: '1', filename: 'preventivo.pdf', size: 204800, type: 'application/pdf', url: '#' },
              { id: '2', filename: 'catalogo.jpg', size: 102400, type: 'image/jpeg', url: '#' },
            ],
            'Ultima modifica': new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          },
          {
            id: 'act3',
            ID: 'ACT003',
            createdTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            Titolo: 'Email - Mario Rossi',
            Tipo: 'Email',
            Stato: 'Completata',
            Obiettivo: 'Invio preventivo',
            Priorità: 'Bassa',
            Data: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            'Durata stimata': '0:10',
            'ID Lead': [leadId],
            'Nome Lead': ['Mario Rossi'],
            Note: 'Email di benvenuto inviata con catalogo prodotti.',
            Esito: 'Preventivo inviato',
            // Questa card HA prossima azione per test
            'Prossima azione': 'Follow-up',
            'Data prossima azione': new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            Allegati: [
              { id: '3', filename: 'benvenuto.pdf', size: 153600, type: 'application/pdf', url: '#' },
            ],
            'Ultima modifica': new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ];

        setActivities(mockActivities);
      } catch (err) {
        console.error('Errore nel caricamento attività:', err);
        setError('Errore nel caricamento delle attività');
        toast.error('Errore nel caricamento delle attività');
      } finally {
        setLoading(false);
      }
    };

    if (leadId) {
      fetchActivities();
    }
  }, [leadId]);

  // Calcola conteggi dinamici per ogni stato (per il filtro)
  const getStatoCounts = useMemo(() => {
    return STATI_DISPONIBILI.reduce(
      (counts, stato) => {
        const count = activities.filter(activity => activity.Stato === stato).length;
        counts[stato] = count;
        return counts;
      },
      {} as Record<ActivityStato, number>
    );
  }, [activities]);

  // Filtra le attività prima di raggrupparle nel Kanban
  const filteredActivities = useMemo(() => {
    if (statoFilter.length === 0) {
      return activities; // Nessun filtro attivo, mostra tutte
    }
    return activities.filter(activity => statoFilter.includes(activity.Stato));
  }, [activities, statoFilter]);

  // Aggiorna il kanban quando cambiano le attività filtrate
  useEffect(() => {
    const groupedActivities: KanbanData = {
      'to-do': filteredActivities.filter(activity =>
        KANBAN_COLUMNS['to-do'].states.includes(activity.Stato)
      ),
      'in-progress': filteredActivities.filter(activity =>
        KANBAN_COLUMNS['in-progress'].states.includes(activity.Stato)
      ),
      'done': filteredActivities.filter(activity =>
        KANBAN_COLUMNS.done.states.includes(activity.Stato)
      ),
    };
    setKanbanData(groupedActivities);
  }, [filteredActivities]);

  const handleEditActivity = (activity: ActivityData) => {
    // TODO: Aprire dialog di modifica
    toast.info(`Modifica attività: ${activity.Titolo}`);
  };

  const handleDeleteActivity = (activity: ActivityData) => {
    // TODO: Implementare eliminazione con conferma
    if (window.confirm(`Sei sicuro di voler eliminare l'attività "${activity.Titolo}"?`)) {
      // TODO: Chiamata API per eliminare
      // await fetch(`/api/activities/${activity.id}`, { method: 'DELETE' });
      
      console.log(`🗑️ Eliminazione attività: ${activity.ID}`);
      
      // Rimuovi l'attività dallo stato locale (temporaneo per demo)
      setActivities(prev => prev.filter(a => a.id !== activity.id));
      
      toast.success(`Attività "${activity.Titolo}" eliminata`);
    }
  };

  const handleNewActivity = () => {
    setShowNewActivityModal(true);
  };

  const handleActivitySuccess = () => {
    // Ricarica le attività dopo aver creato una nuova
    toast.success('Attività creata con successo!');
    
    // TODO: Ricarica le attività dalla API
    // Per ora non facciamo nulla, i dati mock verranno sostituiti con dati reali
  };

  // Funzione per applicare il cambio stato dopo la scelta nel dialog
  const applyStateChange = async (activity: ActivityData, finalState: ActivityStato, kanbanData: KanbanData) => {
    try {
      // TODO: Chiamata API per aggiornare stato
      // await fetch(`/api/activities/${activity.id}`, {
      //   method: 'PATCH', 
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ Stato: finalState }),
      // });
      
      console.log(`🎯 Attività ${activity.ID} aggiornata a "${finalState}"`);
      
      // Aggiorna le attività con il nuovo stato
      const updatedActivities = activities.map(a => 
        a.id === activity.id ? { ...a, Stato: finalState } : a
      );
      
      setActivities(updatedActivities);
      setKanbanData(kanbanData);
      
      toast.success(`Attività marcata come "${finalState}"`);
    } catch (err) {
      console.error('Errore nell\'aggiornamento stato:', err);
      toast.error('Errore nell\'aggiornamento dello stato');
    }
  };

  // Gestisce il drag & drop tra colonne
  const handleKanbanChange = async (newKanbanData: KanbanData) => {
    try {
      // Cerca l'attività che è stata spostata confrontando con lo stato precedente
      let movedActivity: ActivityData | null = null;
      let targetColumnId: string | null = null;
      
      for (const [columnId, columnActivities] of Object.entries(newKanbanData)) {
        const column = KANBAN_COLUMNS[columnId as KanbanColumnId];
        
        for (const activity of columnActivities) {
          // Se l'attività non apparteneva a questa colonna prima, è stata spostata qui
          if (!column.states.includes(activity.Stato)) {
            movedActivity = activity;
            targetColumnId = columnId;
            break;
          }
        }
        if (movedActivity) break;
      }
      
      if (!movedActivity || !targetColumnId) {
        // Nessun cambio significativo, aggiorna semplicemente
        setKanbanData(newKanbanData);
        return;
      }
      
      const column = KANBAN_COLUMNS[targetColumnId as KanbanColumnId];
      const defaultState = column.defaultState;
      
      // Gestione spostamenti tra colonne diverse
      if (!column.states.includes(movedActivity.Stato)) {
        console.log(`🔄 Spostamento: ${movedActivity.Stato} → ${targetColumnId} (${defaultState})`);
        
        // Caso speciale: drop su "Completate" richiede scelta tra Completata/Annullata
        if (targetColumnId === 'done') {
          console.log(`💬 Dialog: Scegliere stato finale per attività ${movedActivity.ID}`);
          
          setPendingStateChange({
            activity: movedActivity,
            columnId: targetColumnId,
            newKanbanData,
          });
          setShowStateDialog(true);
          return; // Il dialog gestirà il resto
        }
        
        // Per tutti gli altri casi (da fare → in corso, ecc.), applica il defaultState
        console.log(`✅ Cambio automatico: "${movedActivity.Stato}" → "${defaultState}"`);
        await applyStateChange(movedActivity, defaultState, newKanbanData);
        return;
      }
      
      // Se l'attività è già nella colonna corretta, aggiorna solo la UI
      console.log(`ℹ️ Riordinamento interno nella colonna ${targetColumnId}`);
      setKanbanData(newKanbanData);
      
    } catch (err) {
      console.error('Errore nello spostamento attività:', err);
      toast.error('Errore nello spostamento dell\'attività');
      
      // Ripristina lo stato precedente in caso di errore
      const groupedActivities: KanbanData = {
        'to-do': filteredActivities.filter(activity =>
          KANBAN_COLUMNS['to-do'].states.includes(activity.Stato)
        ),
        'in-progress': filteredActivities.filter(activity =>
          KANBAN_COLUMNS['in-progress'].states.includes(activity.Stato)
        ),
        'done': filteredActivities.filter(activity =>
          KANBAN_COLUMNS.done.states.includes(activity.Stato)
        ),
      };
      setKanbanData(groupedActivities);
    }
  };

  // Gestione dialog scelta stato completate
  const handleStateDialogChoice = async (chosenState: 'Completata' | 'Annullata') => {
    if (!pendingStateChange) return;
    
    const { activity, newKanbanData } = pendingStateChange;
    
    // Chiudi dialog
    setShowStateDialog(false);
    setPendingStateChange(null);
    
    // Applica il cambio stato scelto
    await applyStateChange(activity, chosenState, newKanbanData);
  };
  
  const handleStateDialogCancel = () => {
    // Ripristina lo stato precedente del Kanban
    if (pendingStateChange) {
      const groupedActivities: KanbanData = {
        'to-do': filteredActivities.filter(activity =>
          KANBAN_COLUMNS['to-do'].states.includes(activity.Stato)
        ),
        'in-progress': filteredActivities.filter(activity =>
          KANBAN_COLUMNS['in-progress'].states.includes(activity.Stato)
        ),
        'done': filteredActivities.filter(activity =>
          KANBAN_COLUMNS.done.states.includes(activity.Stato)
        ),
      };
      setKanbanData(groupedActivities);
    }
    
    setShowStateDialog(false);
    setPendingStateChange(null);
    toast.info('Spostamento annullato');
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm">Caricamento attività...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center text-red-500">
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Toolbar stile UI kit */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 sm:text-xl">Attività</h2>
          <span className="text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
            {statoFilter.length > 0 
              ? `${filteredActivities.length} di ${activities.length} attività` 
              : `${activities.length} attività totali`
            }
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          <Input
            type="text"
            placeholder="Cerca attività..."
            className="h-8 text-sm sm:h-9 sm:w-44"
          />
          
          {/* Filtro Stato */}
          <DataTablePersistentFilter
            title="Stato"
            options={STATI_DISPONIBILI.map(stato => ({
              label: stato,
              value: stato,
              count: getStatoCounts[stato] || 0,
            }))}
            selectedValues={statoFilter}
            onSelectionChange={(values) => {
              setStatoFilter(values as ActivityStato[]);
            }}
            onReset={() => {
              setStatoFilter([]);
            }}
          />
          
          <Button size="sm" onClick={handleNewActivity} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            <span className="sm:hidden">Nuova</span>
            <span className="hidden sm:inline">Nuova Attività</span>
          </Button>
        </div>
      </div>

      {/* Kanban Board con Drag & Drop */}
      <Kanban
        value={kanbanData}
        onValueChange={handleKanbanChange}
        getItemValue={(activity: ActivityData) => activity.id as UniqueIdentifier}
        className="h-full"
      >
        <KanbanBoard className="gap-2 sm:gap-4">
          {Object.entries(KANBAN_COLUMNS).map(([columnId, column]) => (
            <KanbanColumn 
              key={columnId} 
              value={columnId}
              className="min-w-72 bg-gray-50 dark:bg-zinc-800 rounded-xl border sm:min-w-80"
            >
              {/* Header colonna in stile UI kit */}
              <div className="flex items-center justify-between px-2 py-2 sm:px-3">
                <div className="flex items-center gap-1 sm:gap-2">
                  <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100 sm:text-sm">{column.title}</h3>
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md sm:px-2 sm:py-1 sm:text-xs">
                    {kanbanData[columnId as KanbanColumnId]?.length || 0}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 sm:h-6 sm:w-6"
                  onClick={() => handleNewActivity()}
                >
                  <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </Button>
              </div>
              
              {/* Lista delle attività */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-80 sm:p-3 sm:space-y-3 sm:min-h-96">
                {kanbanData[columnId as KanbanColumnId]?.length === 0 ? (
                  <EmptyColumnState 
                    columnId={columnId as KanbanColumnId}
                    onCreateActivity={() => handleNewActivity()}
                  />
                ) : (
                  kanbanData[columnId as KanbanColumnId]?.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      onEdit={handleEditActivity}
                      onDelete={handleDeleteActivity}
                    />
                  ))
                )}
              </div>
            </KanbanColumn>
          ))}
        </KanbanBoard>
        
        {/* Overlay per il drag & drop */}
        <KanbanOverlay>
          {({ value, variant }) => {
            const activity = filteredActivities.find(a => a.id === value);
            if (!activity || variant !== 'item') return null;
            
            return (
              <ActivityCard 
                activity={activity} 
                onEdit={handleEditActivity}
                onDelete={handleDeleteActivity}
              />
            );
          }}
        </KanbanOverlay>
      </Kanban>

      {/* Dialog per scegliere stato completate */}
      <Dialog open={showStateDialog} onOpenChange={(open) => {
        if (!open) handleStateDialogCancel();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Come vuoi completare l'attività?</DialogTitle>
            <DialogDescription>
              {pendingStateChange && (
                <>
                  Stai spostando l'attività <strong>"{pendingStateChange.activity.Titolo}"</strong> nella sezione Completate.
                  <br />Scegli lo stato finale:
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-3 py-4">
            <Button
              onClick={() => handleStateDialogChoice('Completata')}
              className="flex items-center justify-start gap-3 h-auto p-4 bg-green-50 border border-green-200 text-green-800 hover:bg-green-100"
              variant="outline"
            >
              <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">
                ✓
              </div>
              <div className="text-left">
                <div className="font-semibold">Completata</div>
                <div className="text-sm text-green-600">L'attività è stata portata a termine con successo</div>
              </div>
            </Button>
            
            <Button
              onClick={() => handleStateDialogChoice('Annullata')}
              className="flex items-center justify-start gap-3 h-auto p-4 bg-red-50 border border-red-200 text-red-800 hover:bg-red-100"
              variant="outline"
            >
              <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-sm font-bold">
                ✕
              </div>
              <div className="text-left">
                <div className="font-semibold">Annullata</div>
                <div className="text-sm text-red-600">L'attività non è più necessaria o è stata cancellata</div>
              </div>
            </Button>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={handleStateDialogCancel}>
              Annulla spostamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal per creare nuova attività */}
      <NewActivityModal
        open={showNewActivityModal}
        onOpenChange={setShowNewActivityModal}
        onSuccess={handleActivitySuccess}
        prefilledLeadId={leadId}
      />

    </div>
  );
};
