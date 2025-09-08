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
import { Plus, Calendar, Clock, User, Target, GripVertical, MoreHorizontal, Paperclip, ClipboardList, Zap, CheckCircle2, Edit, Trash2, Search } from 'lucide-react';
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

// Definizione delle colonne con icone per il componente verticale
const KANBAN_COLUMNS_ARRAY = [
  {
    id: 'to-do' as KanbanColumnId,
    title: 'Da fare',
    icon: ClipboardList,
    iconColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    id: 'in-progress' as KanbanColumnId,
    title: 'In corso',
    icon: Zap,
    iconColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  {
    id: 'done' as KanbanColumnId,
    title: 'Completate',
    icon: CheckCircle2,
    iconColor: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
] as const;

interface LeadActivitiesListProps {
  leadId?: string;
  className?: string;
}

// Tipo per la struttura dati del Kanban verticale
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

// Componente per stato vuoto delle sezioni
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
    <div className="p-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 transition-all duration-200 hover:border-solid group cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/20"
      onClick={onCreateActivity}
    >
      <div className="text-center space-y-2">
        {/* Icon con background neutro */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-transform group-hover:scale-110 bg-gray-200 dark:bg-gray-600">
          <IconComponent className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </div>
        
        {/* Title */}
        <div>
          <h4 className="font-medium text-xs mb-1 text-gray-600 dark:text-gray-400">
            {config.title}
          </h4>
          <p className="text-[10px] text-gray-500 dark:text-gray-500 mb-2">
            {config.subtitle}
          </p>
        </div>
        
        {/* Call to action button */}
        <Button 
          size="sm" 
          variant="ghost"
          className="h-6 text-[10px] border-dashed group-hover:border-solid transition-all text-gray-600 dark:text-gray-400"
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

  const assignee = activity['Nome Assegnatario']?.[0];

  return (
    <KanbanItem
      value={activity.id}
      asHandle
      className="group rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer dark:bg-zinc-900 dark:border-zinc-700"
    >
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-3">
          {/* Header compatto: Titolo e pulsante azioni */}
          <div className="flex items-start justify-between mb-2">
            {/* Titolo principale */}
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 flex-1 pr-2">
              {activity.Titolo}
            </h3>
            
            {/* Pulsante azioni in alto a destra */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 w-5 p-0 text-gray-400 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(activity);
                  }}
                  className="flex items-center gap-2 cursor-pointer text-xs"
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
                  className="flex items-center gap-2 cursor-pointer text-xs text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/20"
                >
                  <Trash2 className="h-3 w-3" />
                  Elimina
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Prima riga: Badge compatti */}
          <div className="flex items-center gap-1 mb-2 flex-wrap">
            <Badge variant="secondary" className="text-[10px] h-5">
              {activity.Tipo}
            </Badge>
            {activity['Nome Lead'] && activity['Nome Lead'][0] && (
              <Badge variant="outline" className="text-[10px] h-5">
                {activity['Nome Lead'][0]}
              </Badge>
            )}
            {(() => {
              const statusProps = getStatusBadgeProps(activity.Stato);
              return (
                <Badge 
                  variant={statusProps.variant}
                  className={cn('text-[10px] h-5', statusProps.className)}
                >
                  {activity.Stato}
                </Badge>
              );
            })()}
            {activity.Data && (
              <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 ml-auto">
                <Calendar className="w-3 h-3" />
                {new Date(activity.Data).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
              </span>
            )}
          </div>

          {/* Seconda riga: Assegnatario e Progress compatti */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AvatarLead
                nome={assignee || 'Non assegnata'}
                size="sm"
                showTooltip={false}
                className="w-5 h-5"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{assignee || 'Non assegnata'}</span>
            </div>
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 rounded dark:bg-zinc-700">
              <ActivityProgress 
                stato={activity.Stato}
                size="xs"
                showPercentage={false}
              />
              <span className="text-[9px] font-medium text-gray-600 dark:text-gray-400">
                {getPercentageFromState(activity.Stato)}
              </span>
            </div>
          </div>

          {/* Footer compatto: Priorità, Esito e Allegati */}
          <div className="flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1">
              {activity.Priorità && (
                <Badge 
                  variant={getBadgeVariantForPriority(activity.Priorità)}
                  className="text-[9px] h-4 px-1"
                >
                  {activity.Priorità}
                </Badge>
              )}
              {activity.Esito && (
                <Badge 
                  variant="secondary" 
                  className={cn('text-[9px] h-4 px-1', getEsitoBadgeProps(activity.Esito).className)}
                >
                  {activity.Esito}
                </Badge>
              )}
              {activity['Durata stimata'] && (
                <span className="text-gray-500 dark:text-gray-400 ml-1">
                  {activity['Durata stimata']}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {activity.Allegati && activity.Allegati.length > 0 && (
                <button 
                  className="flex items-center gap-1 px-1 py-0.5 bg-gray-200 hover:bg-gray-300 rounded text-gray-600 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-gray-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Apertura allegati:', activity.Allegati);
                  }}
                >
                  <Paperclip className="w-3 h-3" />
                  <span className="text-[9px] font-medium">{activity.Allegati.length}</span>
                </button>
              )}
              {activity['Prossima azione'] && (
                <Badge variant="outline" className="text-[9px] h-4 px-1">
                  {activity['Prossima azione']}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </KanbanItem>
  );
};

export const LeadActivitiesList: React.FC<LeadActivitiesListProps> = ({
  leadId,
  className = '',
}) => {
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statoFilter, setStatoFilter] = useState<ActivityStato[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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
        // const response = await fetch(`/api/activities?leadId=${leadId}`)
        // if (!response.ok) throw new Error('Errore nel caricamento attività')
        // const data = await response.json()
        // setActivities(data.activities || [])

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
            'ID Lead': [leadId || 'rec123'],
            'Nome Lead': ['Mario Rossi'],
            Assegnatario: ['user1'],
            'Nome Assegnatario': ['Giuseppe Verdi'],
            Note: 'Prima chiamata per presentare i nostri servizi e valutare interesse.',
            Esito: 'Nessuna risposta',
            'Ultima modifica': new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'act2', 
            ID: 'ACT002',
            createdTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            Titolo: 'WhatsApp - Giulia Bianchi',
            Tipo: 'WhatsApp',
            Stato: 'In corso',
            Obiettivo: 'Follow-up preventivo',
            Priorità: 'Media',
            Data: new Date().toISOString(),
            'Durata stimata': '0:15',
            'ID Lead': ['rec456'],
            'Nome Lead': ['Giulia Bianchi'],
            Note: 'Invio preventivo via WhatsApp e attesa conferma.',
            Esito: 'Molto interessato',
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
            Titolo: 'Email - Luca Verdi',
            Tipo: 'Email',
            Stato: 'Completata',
            Obiettivo: 'Invio preventivo',
            Priorità: 'Bassa',
            Data: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            'Durata stimata': '0:10',
            'ID Lead': ['rec789'],
            'Nome Lead': ['Luca Verdi'],
            Note: 'Email di benvenuto inviata con catalogo prodotti.',
            Esito: 'Preventivo inviato',
            'Prossima azione': 'Follow-up',
            'Data prossima azione': new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            Allegati: [
              { id: '3', filename: 'benvenuto.pdf', size: 153600, type: 'application/pdf', url: '#' },
            ],
            'Ultima modifica': new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: 'act4',
            ID: 'ACT004',
            createdTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            Titolo: 'Consulenza - Anna Neri',
            Tipo: 'Consulenza',
            Stato: 'Pianificata',
            Obiettivo: 'Presentazione prodotto',
            Priorità: 'Urgente',
            Data: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
            'Durata stimata': '1:00',
            'ID Lead': ['rec999'],
            'Nome Lead': ['Anna Neri'],
            Assegnatario: ['user2'],
            'Nome Assegnatario': ['Marco Gialli'],
            Note: 'Presentazione demo prodotto personalizzata.',
            'Ultima modifica': new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ];
        
        // Se abbiamo un leadId specifico, filtra solo per quel lead
        const filteredActivities = leadId 
          ? mockActivities.filter(activity => activity['ID Lead']?.includes(leadId))
          : mockActivities; // Altrimenti mostra tutte

        await new Promise(resolve => setTimeout(resolve, 1000));
        setActivities(filteredActivities);
      } catch (err) {
        console.error('Errore caricamento attività:', err);
        setError('Errore nel caricamento delle attività');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [leadId]);

  // Filtro attività per ricerca e stato
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Filtro per ricerca
    if (searchTerm) {
      filtered = filtered.filter(activity => 
        activity.Titolo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.Note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity['Nome Lead']?.[0]?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro per stato
    if (statoFilter.length > 0) {
      filtered = filtered.filter(activity => statoFilter.includes(activity.Stato));
    }

    return filtered;
  }, [activities, searchTerm, statoFilter]);

  // Aggiorna kanbanData quando cambiano le attività o i filtri
  useEffect(() => {
    const newKanbanData: KanbanData = {
      'to-do': [],
      'in-progress': [],
      'done': [],
    };

    filteredActivities.forEach(activity => {
      const columnId = getKanbanColumnFromState(activity.Stato);
      newKanbanData[columnId].push(activity);
    });

    setKanbanData(newKanbanData);
  }, [filteredActivities]);

  // Gestione drag and drop
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Se stiamo trascinando su una colonna
    if (overId.startsWith('column-')) {
      const columnId = overId.replace('column-', '') as KanbanColumnId;
      const activity = activities.find(a => a.id === activeId);
      
      if (!activity) return;
      
      const currentColumnId = getKanbanColumnFromState(activity.Stato);
      if (currentColumnId === columnId) return; // Stessa colonna
      
      // Prepara il nuovo stato del Kanban
      const newKanbanData = { ...kanbanData };
      
      // Rimuovi dalla colonna corrente
      newKanbanData[currentColumnId] = newKanbanData[currentColumnId].filter(a => a.id !== activeId);
      
      // Aggiungi alla nuova colonna
      newKanbanData[columnId] = [...newKanbanData[columnId], activity];
      
      // Se stiamo trascinando verso "done", mostra dialog per scegliere lo stato specifico
      if (columnId === 'done') {
        setPendingStateChange({ activity, columnId, newKanbanData });
        setShowStateDialog(true);
        return;
      }
      
      // Altrimenti aggiorna direttamente
      const newState = getStateFromKanbanColumn(columnId);
      updateActivityState(activity, newState, newKanbanData);
    }
  };
  
  // Funzione helper per ottenere lo stato da una colonna Kanban
  const getStateFromKanbanColumn = (columnId: KanbanColumnId): ActivityStato => {
    switch (columnId) {
      case 'to-do': return 'Da Pianificare';
      case 'in-progress': return 'In corso';
      case 'done': return 'Completata';
      default: return 'Da Pianificare';
    }
  };
  
  // Funzione per aggiornare lo stato dell'attività
  const updateActivityState = (activity: ActivityData, newState: ActivityStato, newKanbanData: KanbanData) => {
    // Aggiorna lo stato locale
    setKanbanData(newKanbanData);
    
    // Aggiorna l'attività nell'array principale
    setActivities(prev => prev.map(a => 
      a.id === activity.id ? { ...a, Stato: newState } : a
    ));
    
    // TODO: Chiamata API per aggiornare sul server
    toast.success(`Attività spostata in: ${newState}`);
  };
  
  // Gestione del dialog per stati completati
  const handleCompleteStateSelect = (selectedState: ActivityStato) => {
    if (!pendingStateChange) return;
    
    updateActivityState(pendingStateChange.activity, selectedState, pendingStateChange.newKanbanData);
    
    // Reset stati
    setPendingStateChange(null);
    setShowStateDialog(false);
  };

  // Gestione modifica attività
  const handleEditActivity = (activity: ActivityData) => {
    // TODO: Implementare modal di modifica
    console.log('Modifica attività:', activity);
    toast.info(`Modifica attività: ${activity.Titolo}`);
  };

  // Gestione eliminazione attività
  const handleDeleteActivity = (activity: ActivityData) => {
    // TODO: Implementare conferma ed eliminazione
    console.log('Elimina attività:', activity);
    toast.success(`Attività eliminata: ${activity.Titolo}`);
    setActivities(prev => prev.filter(a => a.id !== activity.id));
  };

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-8', className)}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('p-6 text-center', className)}>
        <p className="text-red-500">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Ricarica
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-4">
          {/* Filtro per stato */}
          <DataTablePersistentFilter
            title="Stato"
            options={STATI_DISPONIBILI.map(stato => ({ 
              label: stato, 
              value: stato,
              icon: 'circle'
            }))}
            selectedValues={statoFilter}
            onSelectionChange={(newValues) => setStatoFilter(newValues as ActivityStato[])}
            showSearch={false}
            maxItems={3}
          />
          
          {/* Campo di ricerca */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Cerca attività..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        {/* Pulsante nuova attività */}
        <Button onClick={() => setShowNewActivityModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuova attività
        </Button>
      </div>

      {/* Lista delle attività con Kanban verticale */}
      <Kanban 
        value={kanbanData}
        onValueChange={setKanbanData}
        getItemValue={(activity) => activity.id}
        onDragEnd={handleDragEnd}
        orientation="vertical"
      >
        <KanbanBoard>
          {KANBAN_COLUMNS_ARRAY.map(column => {
            const columnActivities = kanbanData[column.id] || [];
            
            return (
              // Riquadro grigio completo che ingloba header + attività
              <div key={column.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                {/* Header della sezione */}
                <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2">
                    <column.icon className={cn('h-4 w-4', column.iconColor)} />
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      {column.title}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {columnActivities.length}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowNewActivityModal(true)}
                    className="h-6 w-6 p-0"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                
                {/* Contenuto della sezione */}
                <KanbanColumn value={column.id} className="min-h-[80px] border-none bg-transparent p-3">
                  <div className="space-y-2">
                    {columnActivities.length === 0 ? (
                      <EmptyColumnState 
                        columnId={column.id} 
                        onCreateActivity={() => setShowNewActivityModal(true)} 
                      />
                    ) : (
                      columnActivities.map(activity => (
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
              </div>
            );
          })}
        </KanbanBoard>
        
        <KanbanOverlay>
          {/* Overlay per il drag */}
        </KanbanOverlay>
      </Kanban>

      {/* Modal per nuova attività */}
      <NewActivityModal
        leadId={leadId}
        isOpen={showNewActivityModal}
        onClose={() => setShowNewActivityModal(false)}
      />
      
      {/* Dialog per scelta stato completato */}
      <Dialog open={showStateDialog} onOpenChange={setShowStateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Scegli lo stato finale</DialogTitle>
            <DialogDescription>
              L'attività è stata spostata nella sezione "Completata". Scegli lo stato specifico:
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-2">
            <Button
              variant="outline"
              onClick={() => handleCompleteStateSelect('Completata')}
              className="justify-start"
            >
              ✅ Completata
            </Button>
            <Button
              variant="outline"
              onClick={() => handleCompleteStateSelect('Annullata')}
              className="justify-start"
            >
              ❌ Annullata
            </Button>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowStateDialog(false)}>
              Annulla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
