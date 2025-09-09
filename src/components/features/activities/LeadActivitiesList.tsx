'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Calendar, Clock, User, Target, GripVertical, MoreHorizontal, Paperclip, ClipboardList, Zap, CheckCircle2, Edit, Trash2, Search, Play, Pause, RotateCcw, XCircle, AlertCircle, AlertTriangle } from 'lucide-react';
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
import { useActivitiesData } from '@/hooks/use-activities-data';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

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
    iconColor: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
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
  onStateChange: (activity: ActivityData, newState: ActivityStato) => void;
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

// Helper per ottenere icona per ogni stato (colori più minimali)
const getStateIconAndColor = (stato: ActivityStato) => {
  switch (stato) {
    case 'Da Pianificare':
      return { icon: ClipboardList, color: 'text-muted-foreground' };
    case 'Pianificata':
      return { icon: Calendar, color: 'text-muted-foreground' };
    case 'In corso':
      return { icon: Play, color: 'text-muted-foreground' };
    case 'In attesa':
      return { icon: Pause, color: 'text-muted-foreground' };
    case 'Rimandata':
      return { icon: RotateCcw, color: 'text-muted-foreground' };
    case 'Completata':
      return { icon: CheckCircle2, color: 'text-muted-foreground' };
    case 'Annullata':
      return { icon: XCircle, color: 'text-muted-foreground' };
    default:
      return { icon: AlertCircle, color: 'text-muted-foreground' };
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

const ActivityCard: React.FC<ActivityCardProps> = ({ activity, onEdit, onDelete, onStateChange }) => {
  const router = useRouter();
  
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
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <KanbanItem
          value={activity.id}
          asHandle
          className="group rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer dark:bg-zinc-900 dark:border-zinc-700"
        >
      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-3 sm:p-4">
          {/* Layout a 6 colonne principale */}
          <div className="grid grid-cols-12 gap-3 items-start">
            
            {/* COLONNA 1: Avatar, Titolo, Tipo, Nome Cliente, Priorità (3/12 colonne) */}
            <div className="col-span-3">
              {/* Avatar centrato con titolo e badges */}
              <div className="flex items-center gap-2">
                {/* Avatar centrato verticalmente */}
                <div className="flex items-center justify-center">
                  <AvatarLead
                    nome={assignee || activity['Nome Lead']?.[0] || 'Non assegnata'}
                    size="sm"
                    showTooltip={false}
                    className="w-8 h-8 flex-shrink-0"
                  />
                </div>
                
                {/* Contenitore titolo e badges */}
                <div className="flex-1 min-w-0">
                  {/* Titolo */}
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
                    {activity.Titolo}
                  </h3>
                  
                  {/* Badges: Tipo, Nome Cliente, Priorità */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] w-fit">
                      {activity.Tipo}
                    </Badge>
                    {activity['Nome Lead'] && activity['Nome Lead'][0] && (
                      <Badge 
                        variant="outline" 
                        className="text-[10px] cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-colors w-fit"
                    onClick={(e) => {
                      e.stopPropagation();
                      const leadId = activity['ID Lead']?.[0];
                      if (leadId) {
                        router.push(`/leads/${leadId}`);
                      }
                    }}
                      >
                        {activity['Nome Lead'][0]}
                      </Badge>
                    )}
                    {activity.Priorità && (
                      <Badge 
                        variant={getBadgeVariantForPriority(activity.Priorità)}
                        className="text-[10px] w-fit"
                      >
                        {activity.Priorità}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* COLONNA 2: Stato e Progress Indicator (2/12 colonne) */}
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                {(() => {
                  const statusProps = getStatusBadgeProps(activity.Stato);
                  return (
                    <Badge 
                      variant={statusProps.variant}
                      className={cn('text-[10px] w-fit', statusProps.className)}
                    >
                      {activity.Stato}
                    </Badge>
                  );
                })()}
                <div className="flex items-center gap-1 px-1.5 py-0.5 border border-gray-200 rounded-md bg-gray-50 dark:border-zinc-600 dark:bg-zinc-800 w-fit">
                  <ActivityProgress 
                    stato={activity.Stato}
                    size="xs"
                    showPercentage={false}
                  />
                  <span className="text-[9px] font-medium text-gray-700 dark:text-gray-300">
                    {getPercentageFromState(activity.Stato)}
                  </span>
                </div>
              </div>
            </div>

            {/* COLONNA 3: Data e Durata Stimata (2/12 colonne) */}
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                {activity.Data && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-gray-600 dark:text-gray-400">
                    <Calendar className="w-3 h-3" />
                    <span className="hidden sm:inline">{formatScheduledDate(activity.Data)}</span>
                    <span className="sm:hidden">{new Date(activity.Data).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</span>
                  </span>
                )}
                {activity['Durata stimata'] && (
                  <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300 w-fit">
                    <Clock className="w-3 h-3 mr-1" />
                    {activity['Durata stimata']}
                  </Badge>
                )}
              </div>
            </div>

            {/* COLONNA 4: Obiettivo e Esito (2/12 colonne) */}
            <div className="col-span-2">
              <div className="flex flex-col gap-1">
                {activity.Obiettivo && (
                  <Badge variant="secondary" className="text-[10px] w-fit">
                    {activity.Obiettivo}
                  </Badge>
                )}
                {activity.Esito && (
                  <Badge 
                    variant="secondary" 
                    className={cn('text-[10px] w-fit', getEsitoBadgeProps(activity.Esito).className)}
                  >
                    {activity.Esito}
                  </Badge>
                )}
              </div>
            </div>

            {/* COLONNA 5: Assegnatario con Avatar e Ruolo (2/12 colonne) */}
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                <AvatarLead
                  nome={assignee || 'Non assegnata'}
                  size="sm"
                  showTooltip={false}
                  className="w-6 h-6 flex-shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                    {assignee || 'Non assegnata'}
                  </span>
                  <span className="text-[9px] text-gray-500 dark:text-gray-400">
                    Admin {/* TODO: Aggiungere ruolo reale quando disponibile */}
                  </span>
                </div>
              </div>
            </div>

            {/* COLONNA 6: Prossima Azione e Data (1/12 colonne) */}
            <div className="col-span-1 flex items-center justify-end">
              <div className="flex items-center gap-1">
                {(activity['Prossima azione'] || activity['Data prossima azione']) ? (
                  <div className="flex flex-col gap-1 text-right">
                    {activity['Prossima azione'] && (
                      <Badge variant="outline" className="text-[9px] w-fit">
                        {activity['Prossima azione']}
                      </Badge>
                    )}
                    {activity['Data prossima azione'] && (
                      <span className="inline-flex items-center gap-1 text-[9px] text-gray-500 dark:text-gray-400">
                        <Calendar className="w-2.5 h-2.5" />
                        <span className="hidden sm:inline">{formatScheduledDate(activity['Data prossima azione'])}</span>
                        <span className="sm:hidden">{new Date(activity['Data prossima azione']).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</span>
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-right">
                    <span className="text-[9px] text-gray-300 dark:text-gray-600 italic">
                      Nessun follow-up
                    </span>
                  </div>
                )}
                
                {/* Menu azioni sempre visibile */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-gray-400 hover:bg-gray-100 dark:text-gray-500 dark:hover:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity"
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
            </div>
          </div>

          {/* Linea di separazione e sezione inferiore */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-zinc-700">
            <div className="flex justify-between items-center">
              {/* Sinistra: Note e Allegati */}
              <div className="flex items-center gap-3 flex-1">
                {/* Note */}
                {activity.Note ? (
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1 flex-1 max-w-md">
                    {activity.Note}
                  </p>
                ) : (
                  <span className="text-xs text-gray-300 dark:text-gray-600 italic flex-1">
                    Nessuna nota
                  </span>
                )}
                
                {/* Allegati */}
                <div className="flex items-center gap-2">
                  {activity.Allegati && activity.Allegati.length > 0 ? (
                    <button 
                      className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors dark:bg-zinc-800 dark:hover:bg-zinc-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Apertura allegati:', activity.Allegati);
                      }}
                    >
                      <Paperclip className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                      <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        {activity.Allegati.length}
                      </span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Paperclip className="w-3 h-3 text-gray-300 dark:text-gray-600" />
                      <span className="text-xs text-gray-300 dark:text-gray-600 italic">Nessun allegato</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Destra: Date creazione e ultimo aggiornamento */}
              <div className="flex items-center gap-3 text-right">
                <div className="text-[9px] text-gray-400 dark:text-gray-500">
                  <span>Creato: {formatDate(activity.createdTime)}</span>
                </div>
                {activity['Ultima modifica'] && (
                  <div className="text-[9px] text-gray-400 dark:text-gray-500">
                    <span>Modificato: {formatDate(activity['Ultima modifica'])}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
        </KanbanItem>
      </ContextMenuTrigger>
      
      {/* Context Menu con stati colorati e icone */}
      <ContextMenuContent className="w-56">
        <ContextMenuLabel className="text-xs font-medium text-muted-foreground">
          Cambia stato attività
        </ContextMenuLabel>
        <ContextMenuSeparator />
        
        {/* Stati disponibili */}
        {(['Da Pianificare', 'Pianificata', 'In corso', 'In attesa', 'Rimandata', 'Completata', 'Annullata'] as ActivityStato[]).map((stato) => {
          const { icon: StateIcon, color } = getStateIconAndColor(stato);
          const isCurrentState = activity.Stato === stato;
          
          return (
            <ContextMenuItem
              key={stato}
              onClick={() => onStateChange(activity, stato)}
              disabled={isCurrentState}
              className={cn(
                'flex items-center gap-3',
                isCurrentState && 'bg-muted cursor-not-allowed opacity-75'
              )}
            >
              <StateIcon className={cn('h-4 w-4', color)} />
              <span className="flex-1">{stato}</span>
              {isCurrentState && (
                <div className="w-2 h-2 rounded-full bg-primary" />
              )}
            </ContextMenuItem>
          );
        })}
        
        <ContextMenuSeparator />
        
        {/* Azioni aggiuntive */}
        <ContextMenuItem
          onClick={() => onEdit(activity)}
          className="flex items-center gap-3"
        >
          <Edit className="h-4 w-4 text-muted-foreground" />
          <span>Modifica attività</span>
        </ContextMenuItem>
        
        <ContextMenuItem
          onClick={() => onDelete(activity)}
          className="flex items-center gap-3 text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span>Elimina attività</span>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

export const LeadActivitiesList: React.FC<LeadActivitiesListProps> = ({
  leadId,
  className = '',
}) => {
  const [statoFilter, setStatoFilter] = useState<ActivityStato[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewActivityModal, setShowNewActivityModal] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<ActivityData | null>(null);
  
  // 🚀 FORCE RE-RENDER - Chiave per forzare aggiornamento UI
  const [forceUpdateKey, setForceUpdateKey] = useState(0);
  const forceUpdate = () => {
    console.log('🚀 [FORCE UPDATE] Triggering forced re-render in LeadActivitiesList');
    setForceUpdateKey(prev => prev + 1);
  };
  
  // 🚀 Use real data from API
  const {
    activities,
    allActivities,
    loading,
    error,
    refresh,
    filterActivities,
    retry,
  } = useActivitiesData({
    leadId, // Filter activities for specific lead if provided
    filters: {
      search: searchTerm,
      stato: statoFilter,
    },
    loadAll: true,
  });
  
  // 🔄 Multiple refresh strategy come LeadProfileHeader
  const multipleRefresh = async (context: string) => {
    console.log(`🔄 [${context}] Starting multiple refresh strategy...`);
    console.log(`🔄 [${context}] Current activities count:`, activities.length);
    console.log(`🔄 [${context}] Current allActivities count:`, allActivities.length);
    
    try {
      // Tentativo 1: Refresh immediato
      console.log(`🔄 [${context}] Immediate refresh...`);
      const refreshResult1 = await refresh(true); // Force refresh bypassing cache
      console.log(`✅ [${context}] Immediate refresh completed, result:`, refreshResult1);
      
      // Tentativo 2: Refresh con delay 300ms
      setTimeout(async () => {
        try {
          console.log(`🔄 [${context}] Second refresh (300ms delay)...`);
          const refreshResult2 = await refresh(true);
          console.log(`✅ [${context}] Second refresh (300ms delay) completed, result:`, refreshResult2);
          console.log(`🔄 [${context}] After 300ms refresh - activities:`, activities.length);
        } catch (error) {
          console.warn(`⚠️ [${context}] Second refresh attempt failed:`, error);
        }
      }, 300);
      
      // Tentativo 3: Refresh finale con delay 800ms
      setTimeout(async () => {
        try {
          console.log(`🔄 [${context}] Final refresh (800ms delay)...`);
          const refreshResult3 = await refresh(true);
          console.log(`✅ [${context}] Final refresh (800ms delay) completed, result:`, refreshResult3);
          console.log(`🔄 [${context}] After 800ms refresh - activities:`, activities.length);
        } catch (error) {
          console.warn(`⚠️ [${context}] Final refresh attempt failed:`, error);
        }
      }, 800);
      
    } catch (error) {
      console.error(`❌ [${context}] Error during multiple refresh:`, error);
      toast.error('Errore nel ricaricamento dati');
    }
  };
  
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

  // 🚀 Activities are already filtered by the hook, but we can apply additional client-side filtering
  const filteredActivities = useMemo(() => {
    console.log('🔍 [Activities Debug] Raw activities from hook:', activities.length);
    console.log('🔍 [Activities Debug] Sample activity:', activities[0]);
    // Additional client-side filtering can be added here if needed
    // The hook already handles search and state filtering
    return activities;
  }, [activities]);

  // Aggiorna kanbanData quando cambiano le attività o i filtri (usa la stessa logica del Kanban originale)
  useEffect(() => {
    console.log('🔍 [Kanban Debug] Filtering activities:', filteredActivities.length);
    console.log('🔍 [Kanban Debug] KANBAN_COLUMNS config:', KANBAN_COLUMNS);
    
    // Log degli stati unici presenti nei dati
    const uniqueStates = [...new Set(filteredActivities.map(a => a.Stato))];
    console.log('🔍 [Kanban Debug] Unique states in data:', uniqueStates);
    
    const groupedActivities: KanbanData = {
      'to-do': filteredActivities.filter(activity => {
        const matches = KANBAN_COLUMNS['to-do'].states.includes(activity.Stato);
        if (matches) console.log('🟦 [to-do] Activity:', activity.Titolo, 'State:', activity.Stato);
        return matches;
      }),
      'in-progress': filteredActivities.filter(activity => {
        const matches = KANBAN_COLUMNS['in-progress'].states.includes(activity.Stato);
        if (matches) console.log('🟨 [in-progress] Activity:', activity.Titolo, 'State:', activity.Stato);
        return matches;
      }),
      'done': filteredActivities.filter(activity => {
        const matches = KANBAN_COLUMNS.done.states.includes(activity.Stato);
        if (matches) console.log('🟩 [done] Activity:', activity.Titolo, 'State:', activity.Stato);
        return matches;
      }),
    };
    
    console.log('🔍 [Kanban Debug] Grouped results:', {
      'to-do': groupedActivities['to-do'].length,
      'in-progress': groupedActivities['in-progress'].length, 
      'done': groupedActivities.done.length
    });
    
    setKanbanData(groupedActivities);
  }, [filteredActivities]);

  // Gestisce il drag & drop tra colonne (logica dal componente Kanban originale)
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
        
        // 🚀 OPTIMISTIC UPDATE per drag & drop: aggiorna attività E posizione UI immediatamente
        const optimisticActivity = { ...movedActivity, Stato: defaultState };
        
        // Aggiorna l'array delle attività filtrate con il nuovo stato (per badge)
        const updatedActivities = filteredActivities.map(act => 
          act.id === movedActivity.id ? optimisticActivity : act
        );
        
        // Aggiorna il kanbanData con le attività aggiornate (per posizione)
        const updatedKanbanData: KanbanData = {
          'to-do': updatedActivities.filter(act =>
            KANBAN_COLUMNS['to-do'].states.includes(act.Stato)
          ),
          'in-progress': updatedActivities.filter(act =>
            KANBAN_COLUMNS['in-progress'].states.includes(act.Stato)
          ),
          'done': updatedActivities.filter(act =>
            KANBAN_COLUMNS.done.states.includes(act.Stato)
          ),
        };
        
        setKanbanData(updatedKanbanData);
        console.log(`🚀 [DragDrop] Full optimistic update: ${movedActivity.Titolo} moved to ${defaultState} with badge update`);
        
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
  
  // Funzione per applicare il cambio stato dopo la scelta nel dialog
  const applyStateChange = async (activity: ActivityData, finalState: ActivityStato, kanbanData: KanbanData) => {
    try {
      // 🚀 Call real API to update activity state
      const response = await fetch(`/api/activities/${activity.id}`, {
        method: 'PATCH', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Stato: finalState }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update activity');
      }
      
      console.log(`🎯 Attività ${activity.ID} aggiornata a "${finalState}"`);
      
      // 🚀 FORCE UPDATE per assicurare aggiornamento UI
      console.log(`🚀 [ApplyStateChange] Forcing UI update...`);
      forceUpdate(); // Forza re-render
      
      // 🔄 Multiple refresh strategy (like LeadProfileHeader)
      multipleRefresh('ApplyStateChange'); // Non-blocking background sync
      
      toast.success(`Attività marcata come "${finalState}"`);
    } catch (err) {
      console.error('Errore nell\'aggiornamento stato:', err);
      toast.error('Errore nell\'aggiornamento dello stato');
      
      // Rollback UI state
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
  
  // Gestione dialog scelta stato completate (dal componente Kanban originale)
  const handleStateDialogChoice = async (chosenState: 'Completata' | 'Annullata') => {
    if (!pendingStateChange) return;
    
    const { activity, newKanbanData } = pendingStateChange;
    
    // Chiudi dialog
    setShowStateDialog(false);
    setPendingStateChange(null);
    
    // 🚀 OPTIMISTIC UPDATE per dialog completato: aggiorna attività E posizione UI immediatamente
    const optimisticActivity = { ...activity, Stato: chosenState };
    
    // Aggiorna l'array delle attività filtrate con il nuovo stato (per badge)
    const updatedActivities = filteredActivities.map(act => 
      act.id === activity.id ? optimisticActivity : act
    );
    
    // Aggiorna il kanbanData con le attività aggiornate (per posizione)
    const updatedKanbanData: KanbanData = {
      'to-do': updatedActivities.filter(act =>
        KANBAN_COLUMNS['to-do'].states.includes(act.Stato)
      ),
      'in-progress': updatedActivities.filter(act =>
        KANBAN_COLUMNS['in-progress'].states.includes(act.Stato)
      ),
      'done': updatedActivities.filter(act =>
        KANBAN_COLUMNS.done.states.includes(act.Stato)
      ),
    };
    
    setKanbanData(updatedKanbanData);
    console.log(`🚀 [DialogChoice] Full optimistic update: ${activity.Titolo} moved to ${chosenState} with badge update`);
    
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

  // Gestione modifica attività
  const handleEditActivity = (activity: ActivityData) => {
    // TODO: Implementare modal di modifica
    console.log('Modifica attività:', activity);
    toast.info(`Modifica attività: ${activity.Titolo}`);
  };

  // Gestione eliminazione attività (apre dialog di conferma)
  const handleDeleteActivity = (activity: ActivityData) => {
    setActivityToDelete(activity);
    setDeleteDialogOpen(true);
  };
  
  // Funzione per eliminare realmente l'attività
  const confirmDeleteActivity = async () => {
    if (!activityToDelete) return;
    
    try {
      console.log('Elimina attività:', activityToDelete);
      
      // 🚀 Call real API to delete activity
      const response = await fetch(`/api/activities/${activityToDelete.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete activity');
      }
      
      // Chiudi dialog e reset stato
      setDeleteDialogOpen(false);
      setActivityToDelete(null);
      
      // 🔄 Multiple refresh strategy (like LeadProfileHeader)
      await multipleRefresh('DeleteActivity');
      
      toast.success(`Attività eliminata: ${activityToDelete.Titolo}`);
    } catch (err) {
      console.error('Errore nell\'eliminazione attività:', err);
      toast.error('Errore nell\'eliminazione dell\'attività');
      
      // In caso di errore, chiudi comunque il dialog
      setDeleteDialogOpen(false);
      setActivityToDelete(null);
    }
  };
  
  // Annulla eliminazione
  const cancelDeleteActivity = () => {
    setDeleteDialogOpen(false);
    setActivityToDelete(null);
  };
  
  // 🎯 Gestione cambio stato tramite context menu
  const handleStateChange = async (activity: ActivityData, newState: ActivityStato) => {
    if (activity.Stato === newState) return; // Nessun cambio necessario
    
    const originalState = activity.Stato;
    console.log(`🔄 Context Menu: Cambio stato ${activity.Titolo}: ${originalState} → ${newState}`);
    
    // 🚀 OPTIMISTIC UI UPDATE: Aggiorna immediatamente l'interfaccia
    console.log(`🚀 [StateChange] Applying optimistic UI update...`);
    
    // Aggiorna l'attività con il nuovo stato (per badge)
    const optimisticActivity = { ...activity, Stato: newState };
    
    // Aggiorna l'array delle attività filtrate con il nuovo stato
    const updatedActivities = filteredActivities.map(act => 
      act.id === activity.id ? optimisticActivity : act
    );
    
    // Aggiorna il kanbanData con le attività aggiornate (per posizione)
    const updatedKanbanData: KanbanData = {
      'to-do': updatedActivities.filter(act =>
        KANBAN_COLUMNS['to-do'].states.includes(act.Stato)
      ),
      'in-progress': updatedActivities.filter(act =>
        KANBAN_COLUMNS['in-progress'].states.includes(act.Stato)
      ),
      'done': updatedActivities.filter(act =>
        KANBAN_COLUMNS.done.states.includes(act.Stato)
      ),
    };
    
    // Aggiorna immediatamente la UI
    setKanbanData(updatedKanbanData);
    console.log(`🚀 [ContextMenu] Full optimistic update: ${activity.Titolo} moved to ${newState} with badge update`);
    
    try {
      
      // 🚀 Call real API to update activity state
      console.log(`📤 [StateChange] Sending PATCH request to: /api/activities/${activity.id}`);
      console.log(`📤 [StateChange] Request body:`, { Stato: newState });
      
      const response = await fetch(`/api/activities/${activity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Stato: newState }),
      });
      console.log(`📡 [StateChange] Response status:`, response.status);
      console.log(`📡 [StateChange] Response ok:`, response.ok);
      console.log(`📡 [StateChange] Response headers:`, Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Parse error' }));
        console.error(`❌ [StateChange] API Error:`, errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const responseData = await response.json();
      console.log(`✅ [StateChange] API Success:`, responseData);
      
      // Verifica che la risposta contenga success: true
      if (!responseData.success) {
        console.error(`❌ [StateChange] API returned success: false:`, responseData);
        throw new Error('API response missing success field');
      }
      
      // 🚀 FORCE UPDATE per assicurare aggiornamento UI
      console.log(`🚀 [StateChange] Forcing UI update...`);
      forceUpdate(); // Forza re-render
      
      // 🔄 Multiple refresh strategy (like LeadProfileHeader)
      console.log(`🔄 [StateChange] Starting multipleRefresh...`);
      multipleRefresh('StateChangeContextMenu'); // Non-blocking background sync
      console.log(`✅ [StateChange] multipleRefresh triggered for background sync`);
      
      // 🚪 Fallback: Se dopo 2 secondi i dati non sono aggiornati, forza reload
      setTimeout(() => {
        // Controlla se lo stato è stato aggiornato
        const updatedActivity = activities.find(a => a.id === activity.id);
        if (updatedActivity && updatedActivity.Stato !== newState) {
          console.log(`⚠️ [StateChange] Fallback: State not updated after 2s, forcing page reload`);
          console.log(`⚠️ [StateChange] Expected: ${newState}, Current: ${updatedActivity.Stato}`);
          toast.loading('Aggiornamento in corso...', { id: 'force-reload' });
          setTimeout(() => {
            toast.dismiss('force-reload');
            window.location.reload();
          }, 1000);
        } else {
          console.log(`✅ [StateChange] State updated successfully via refresh`);
        }
      }, 2000);
      
      const { icon: StateIcon } = getStateIconAndColor(newState);
      toast.success(
        <div className="flex items-center gap-2">
          <StateIcon className="h-4 w-4" />
          <span>Stato aggiornato a "{newState}"</span>
        </div>
      );
    } catch (err) {
      console.error('❌ [StateChange] Errore nel cambio stato:', err);
      console.error('❌ [StateChange] Error details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      });
      
      let errorMessage = 'Errore nel cambio stato dell\'attività';
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Errore di connessione. Verifica la rete.';
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Richiesta troppo lenta. Riprova.';
        }
      }
      
      toast.error(errorMessage);
    }
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
      {/* Header con conteggio attività */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Attività
          </h2>
          <Badge 
            variant="secondary" 
            className="text-sm px-2 py-1"
          >
            {allActivities.length}
          </Badge>
        </div>
        {/* Aggiungiamo eventuali azioni aggiuntive qui in futuro */}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
        
        {/* Filtro stato e pulsante nuova attività */}
        <div className="flex items-center gap-3">
          <DataTablePersistentFilter
            title="Stato"
            options={STATI_DISPONIBILI.map(stato => {
              // Use allActivities to get counts for all data, not just filtered
              const count = allActivities.filter(activity => activity.Stato === stato).length;
              return {
                label: stato,
                value: stato,
                count: count
              };
            })}
            selectedValues={statoFilter}
            onSelectionChange={(newValues) => setStatoFilter(newValues as ActivityStato[])}
            showSearch={false}
            maxItems={3}
          />
          
          <Button onClick={() => setShowNewActivityModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuova attività
          </Button>
        </div>
      </div>

      {/* Lista delle attività con Kanban verticale */}
      <Kanban 
        key={forceUpdateKey} // 🚀 Forza re-render quando cambia
        value={kanbanData}
        onValueChange={handleKanbanChange}
        getItemValue={(activity: ActivityData) => activity.id as UniqueIdentifier}
        orientation="vertical"
      >
        <KanbanBoard>
          {KANBAN_COLUMNS_ARRAY.map(column => {
            const columnActivities = kanbanData[column.id] || [];
            
            return (
              // Riquadro grigio completo che ingloba header + attività
              <div key={column.id} className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                {/* Header della sezione con titolo */}
                <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-2">
                    <column.icon className={cn('h-4 w-4', column.iconColor)} />
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      {column.title}
                    </h3>
                    <Badge 
                      variant="outline" 
                      className="text-xs h-5 px-2 text-muted-foreground border-border hover:bg-muted"
                    >
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
                          onStateChange={handleStateChange}
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
        open={showNewActivityModal}
        onOpenChange={setShowNewActivityModal}
        onSuccess={async () => {
          console.log('🎉 Attività creata con successo, aggiornamento lista...');
          
          // 🔄 Multiple refresh strategy (like LeadProfileHeader)
          await multipleRefresh('NewActivityCreated');
        }}
        prefilledLeadId={leadId}
      />
      
      {/* Dialog per scegliere stato completate (stessa UI del Kanban originale) */}
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
      
      {/* Dialog di conferma eliminazione */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Conferma eliminazione
            </AlertDialogTitle>
            <AlertDialogDescription>
              {activityToDelete && (
                <>
                  Sei sicuro di voler eliminare l'attività <strong>"{activityToDelete.Titolo}"</strong>?
                  <br />
                  <span className="font-medium mt-1 block">
                    Questa azione non può essere annullata.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteActivity}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteActivity}
              className="bg-destructive hover:bg-destructive/90"
            >
              Elimina attività
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
