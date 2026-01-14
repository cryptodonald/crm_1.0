'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Plus, Calendar, Clock, User, Target, GripVertical, MoreHorizontal, Paperclip, ClipboardList, Zap, CheckCircle2, Edit, Trash2, Search, Play, Pause, RotateCcw, XCircle, AlertCircle, AlertTriangle, ExternalLink, Download, FileText, FileImage, File } from 'lucide-react';
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
import { useActivitiesClean } from '@/hooks/use-activities-clean';
import { useUsers } from '@/hooks/use-users';
// Removed old complex system imports

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
  leadId?: string;
  className?: string;
  onLeadStateChange?: (data: any) => void | Promise<void>;
}

// Tipo per la struttura dati del Kanban
type KanbanData = Record<KanbanColumnId, ActivityData[]>;

interface ActivityCardProps {
  activity: ActivityData;
  onEdit: (activity: ActivityData) => void;
  onDelete: (activity: ActivityData) => void;
  onStateChange: (activity: ActivityData, newState: ActivityStato) => void;
  usersData?: Record<string, { nome: string; ruolo: string; avatar?: string }> | null;
}

// Funzioni per i badge (dalla pagina demo-badges) - Memoizzate globalmente
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

// Definiti come costanti globali per evitare ricreazione
const ESITI_POSITIVI = [
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

const ESITI_NEGATIVI = [
  'Nessuna risposta',
  'Numero errato',
  'Non disponibile',
  'Non presentato',
  'Non interessato',
  'Opportunità persa'
];

const ESITI_NEUTRALI = [
  'Poco interessato'
];

// Helper functions for attachment management
const handleOpenAttachment = (url: string) => {
  console.log('🔗 [handleOpenAttachment] Opening URL:', url);
  try {
    if (!url) {
      console.error('❌ [handleOpenAttachment] URL is empty or undefined');
      toast.error('URL del file non valido');
      return;
    }
    
    console.log('🔗 [handleOpenAttachment] Calling window.open...');
    const result = window.open(url, '_blank', 'noopener,noreferrer');
    console.log('🔗 [handleOpenAttachment] Window.open result:', result);
    
    if (!result) {
      console.warn('⚠️ [handleOpenAttachment] Window.open returned null (popup blocked?)');
      toast.error('Impossibile aprire il file. Verifica le impostazioni popup del browser.');
    } else {
      toast.success('File aperto in una nuova tab!');
    }
  } catch (error) {
    console.error('❌ [handleOpenAttachment] Error:', error);
    toast.error('Errore nell\'apertura del file');
  }
};

const handleDownloadAttachment = async (url: string, filename: string) => {
  console.log('💾 [handleDownloadAttachment] Starting download:', { url, filename });
  try {
    if (!url) {
      console.error('❌ [handleDownloadAttachment] URL is empty or undefined');
      toast.error('URL del file non valido');
      return;
    }
    
    if (!filename) {
      filename = 'file-senza-nome';
      console.warn('⚠️ [handleDownloadAttachment] Filename is empty, using fallback:', filename);
    }
    
    console.log('💾 [handleDownloadAttachment] Fetching file...');
    const response = await fetch(url);
    console.log('💾 [handleDownloadAttachment] Fetch response:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const blob = await response.blob();
    console.log('💾 [handleDownloadAttachment] Blob created:', blob.size, 'bytes');
    
    const downloadUrl = window.URL.createObjectURL(blob);
    console.log('💾 [handleDownloadAttachment] Object URL created:', downloadUrl);
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    console.log('💾 [handleDownloadAttachment] Link added to DOM, triggering click...');
    
    link.click();
    
    // Clean up after a short delay to ensure download starts
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      console.log('💾 [handleDownloadAttachment] Cleanup completed');
    }, 100);
    
    toast.success(`Download avviato: ${filename}`);
  } catch (e) {
    console.error('❌ [handleDownloadAttachment] Download error:', e);
    toast.error(`Errore durante il download: ${e instanceof Error ? e.message : 'Errore sconosciuto'}`);
  }
};

const getFileIcon = (type?: string) => {
  if (!type) return <File className="h-4 w-4 text-gray-500" />;
  
  if (type.startsWith('image/')) {
    return <FileImage className="h-4 w-4 text-blue-500" />;
  } else if (type === 'application/pdf') {
    return <FileText className="h-4 w-4 text-red-600" />;
  } else if (type.includes('word') || type.includes('document')) {
    return <FileText className="h-4 w-4 text-blue-700" />;
  } else if (type.includes('excel') || type.includes('sheet')) {
    return <FileText className="h-4 w-4 text-green-600" />;
  }
  return <File className="h-4 w-4 text-gray-500" />;
};

const getEsitoBadgeProps = (esito: string) => {
  if (ESITI_POSITIVI.includes(esito)) {
    return { className: 'bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700' };
  }
  
  if (ESITI_NEGATIVI.includes(esito)) {
    return { className: 'bg-red-200 text-red-800 hover:bg-red-300 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700' };
  }
  
  if (ESITI_NEUTRALI.includes(esito)) {
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

const EmptyColumnState = React.memo(function EmptyColumnState({ columnId, onCreateActivity }: EmptyColumnStateProps) {
  const getEmptyStateConfig = useMemo(() => {
    return (columnId: KanbanColumnId) => {
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
  }, []);  // Memoizza la funzione

  const config = useMemo(() => getEmptyStateConfig(columnId), [columnId, getEmptyStateConfig]);
  const IconComponent = useMemo(() => config.icon, [config]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCreateActivity();
  }, [onCreateActivity]);

  return (
    <div className="mx-2 my-4 p-6 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 transition-all duration-200 hover:border-solid group cursor-pointer hover:shadow-sm bg-gray-50/50 dark:bg-gray-800/20"
      onClick={handleClick}
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
          onClick={handleClick}
        >
          <Plus className="w-3 h-3 mr-1" />
          {config.buttonText}
        </Button>
      </div>
    </div>
  );
});

const ActivityCard = React.memo(function ActivityCard({ activity, onEdit, onDelete, onStateChange, usersData }: ActivityCardProps) {
  const router = useRouter();
  
  // Stati disponibili per il menu contestuale
  const STATI_DISPONIBILI = useMemo<ActivityStato[]>(() => [
    'Da Pianificare',
    'Pianificata', 
    'In corso',
    'In attesa',
    'Rimandata',
    'Completata',
    'Annullata',
  ], []);
  
  const formatDate = useCallback((dateStr?: string) => {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { addSuffix: true, locale: it });
    } catch {
      return dateStr;
    }
  }, []);  // formatDistanceToNow e it sono costanti

  const formatScheduledDate = useCallback((dateStr?: string) => {
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
  }, []); // toLocaleDateString options sono costanti

  const getPriorityPill = useMemo(() => (priority?: string) => {
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
  }, []); // Le classi CSS sono costanti



  const assignee = useMemo(() => activity['Nome Assegnatario']?.[0], [activity]);
  
  // Handler per navigazione al dettaglio lead
  const handleLeadClick = useCallback((leadId: string, leadName?: string) => {
    if (!leadId) {
      console.error('❌ [ActivityCard] Lead ID is missing or empty!');
      return;
    }
    
    try {
      router.push(`/leads/${leadId}`);
    } catch (error) {
      console.error('❌ [ActivityCard] Navigation failed:', error);
    }
  }, [router]);

  return (
    <ContextMenu>
        <ContextMenuTrigger asChild>
          <KanbanItem
            value={activity.id}
            asHandle={true}
            className="group rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 cursor-move dark:bg-zinc-900 dark:border-zinc-700"
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
                <Badge variant="outline" className="text-[10px] sm:text-xs bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                  {activity['Durata stimata']}
                </Badge>
              )}            </div>
            
            {/* Pulsante azioni in alto a destra */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800"
                  onClick={(e) => e.stopPropagation()}
                  data-menu-trigger="true"
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-36 z-50"
                sideOffset={5}
              >
                <div 
                  className="flex items-center gap-2 cursor-pointer px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={useCallback((e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit(activity);
                  }, [activity, onEdit])}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <Edit className="h-3 w-3" />
                  Modifica
                </div>
                <div className="h-px bg-border my-1" />
                <div 
                  className="flex items-center gap-2 cursor-pointer px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground text-red-600 hover:text-red-700"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(activity);
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                  Elimina
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Riga Tipo, Nome Lead e Stato */}
          <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
            <Badge variant="secondary" className="text-[10px] sm:text-xs">
              {activity.Tipo}
            </Badge>
            {activity['Nome Lead'] && activity['Nome Lead'][0] && (
              (() => {
                const leadName = activity['Nome Lead']![0];
                const leadId = activity['ID Lead']?.[0];
                
                // Debug: log dei dati disponibili solo se mancante
                if (!leadId) {
                  console.log('⚠️ [ActivityCard] Missing lead ID:', {
                    leadName,
                    fullIDLeadArray: activity['ID Lead'],
                    activityId: activity.id
                  });
                }
                
                if (!leadId) {
                  // Se non c'è ID, mostra solo il badge senza click
                  return (
                    <Badge 
                      variant="outline" 
                      className="text-[10px] sm:text-xs opacity-60"
                      title="Lead ID non disponibile"
                    >
                      {leadName}
                    </Badge>
                  );
                }
                
                return (
                  <button
                    type="button"
                    onClick={(e) => {
                      // Ferma la propagazione degli eventi
                      e.preventDefault();
                      e.stopPropagation();
                      
                      // Naviga al dettaglio lead
                      handleLeadClick(leadId, leadName);
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border border-gray-200 bg-white text-gray-900 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-900 transition-colors cursor-pointer dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-blue-900 dark:hover:border-blue-700 dark:hover:text-blue-100 relative z-10"
                    aria-label={`Vai al lead ${leadName}`}
                    title={`Clicca per aprire il lead ${leadName}`}
                  >
                    {leadName}
                  </button>
                );
              })()
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
                customAvatar={(() => {
                  if (!assignee || !activity.Assegnatario?.[0] || !usersData) return undefined;
                  const userId = activity.Assegnatario[0];
                  return usersData[userId]?.avatar;
                })()}
                isAdmin={(() => {
                  if (!assignee || !activity.Assegnatario?.[0] || !usersData) return false;
                  const userId = activity.Assegnatario[0];
                  return usersData[userId]?.ruolo === 'Admin';
                })()}
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
            {/* Badge allegati - solo visivo, non cliccabile */}
            {activity.Allegati && activity.Allegati.length > 0 ? (
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 rounded transition-colors dark:bg-zinc-800 sm:px-2 sm:py-1" title="Allegati disponibili nella tab Allegati">
                <Paperclip className="w-3 h-3 text-gray-600 dark:text-gray-400 sm:w-4 sm:h-4" />
                <span className="text-xs text-gray-700 dark:text-gray-300 sm:text-sm">{activity.Allegati.length}</span>
              </div>
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
    </ContextMenuTrigger>
    
    {/* Menu contestuale per cambio stato rapido */}
    <ContextMenuContent className="w-48">
      <ContextMenuLabel className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        Cambia stato
      </ContextMenuLabel>
      <ContextMenuSeparator />
      
      {/* Opzioni di stato disponibili */}
      {STATI_DISPONIBILI.filter(stato => stato !== activity.Stato).map((stato) => {
        const { icon: StateIcon, color } = getStateIconAndColor(stato);
        return (
          <ContextMenuItem
            key={stato}
            onClick={(e) => {
              e.stopPropagation();
              onStateChange(activity, stato);
            }}
            className="flex items-center gap-2 cursor-pointer"
          >
            <StateIcon className={cn('h-3 w-3', color)} />
            <span className="text-sm">{stato}</span>
          </ContextMenuItem>
        );
      })}
      
      <ContextMenuSeparator />
      
      {/* Azioni generali */}
      <ContextMenuItem
        onClick={(e) => {
          e.stopPropagation();
          onEdit(activity);
        }}
        className="flex items-center gap-2 cursor-pointer"
      >
        <Edit className="h-3 w-3 text-muted-foreground" />
        <span className="text-sm">Modifica</span>
      </ContextMenuItem>
      
      <ContextMenuItem
        onClick={(e) => {
          e.stopPropagation();
          onDelete(activity);
        }}
        className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/20"
      >
        <Trash2 className="h-3 w-3" />
        <span className="text-sm">Elimina</span>
      </ContextMenuItem>
    </ContextMenuContent>
    </ContextMenu>
  );
});

// Definizione delle colonne con icone per il componente Kanban
const KANBAN_COLUMNS_ARRAY = [
  {
    id: 'to-do' as KanbanColumnId,
    title: 'Da fare',
    icon: ClipboardList,
    iconColor: 'text-gray-600',
  },
  {
    id: 'in-progress' as KanbanColumnId,
    title: 'In corso',
    icon: Zap,
    iconColor: 'text-yellow-600',
  },
  {
    id: 'done' as KanbanColumnId,
    title: 'Completate',
    icon: CheckCircle2,
    iconColor: 'text-green-600',
  },
] as const;

export const LeadActivitiesKanban: React.FC<LeadActivitiesKanbanProps> = ({
  leadId,
  className = '',
  onLeadStateChange,
}) => {
  const [statoFilter, setStatoFilter] = useState<ActivityStato[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showNewActivityModal, setShowNewActivityModal] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activityToEdit, setActivityToEdit] = useState<ActivityData | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activityToDelete, setActivityToDelete] = useState<ActivityData | null>(null);
  
  // 🚀 Users data for avatars
  const { users } = useUsers();
  
  // 🚀 NEW CLEAN SYSTEM - Simple React state with optimistic updates
  const {
    activities,
    loading,
    error,
    createActivity,
    updateActivity,
    deleteActivity,
    moveActivity,
    refresh,
    getActivityById,
    addActivity, // 🚀 Per aggiungere attività create dal modal esterno
  } = useActivitiesClean(leadId, { // Non aggiungere una stringa vuota se leadId è undefined
    enableBackgroundSync: false, // Disabilitato per evitare loop
    syncIntervalMs: 120000, // 2 minuti se abilitato
    showToasts: true,
  });
  
  console.log(`🔍 [LeadActivitiesKanban] leadId: ${leadId}, activities count: ${activities.length}, loading: ${loading}, error: ${error}`);
  
  // 🚀 All activities = activities (nessuna distinzione nel nuovo sistema)
  const allActivities = activities;
  
  // 🚀 Simple refresh function - no complex retry logic needed
  const simpleRefresh = async (context: string) => {
    console.log(`🔄 [${context}] Refreshing activities...`);
    try {
      await refresh();
      console.log(`✅ [${context}] Refresh completed successfully`);
    } catch (error) {
      console.error(`❌ [${context}] Refresh failed:`, error);
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

  // Calcola conteggi dinamici per ogni stato (per il filtro) - usa allActivities per i conteggi totali
  const getStatoCounts = useMemo(() => {
    return STATI_DISPONIBILI.reduce(
      (counts, stato) => {
        const count = allActivities.filter(activity => activity.Stato === stato).length;
        counts[stato] = count;
        return counts;
      },
      {} as Record<ActivityStato, number>
    );
  }, [allActivities]);

  // 🚀 Client-side filtering (simple and effective)
  const filteredActivities = useMemo(() => {
    let filtered = activities;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(activity => 
        activity.Titolo?.toLowerCase().includes(searchLower) ||
        activity.Note?.toLowerCase().includes(searchLower) ||
        activity['Nome Lead']?.[0]?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply state filter
    if (statoFilter.length > 0) {
      filtered = filtered.filter(activity => 
        statoFilter.includes(activity.Stato)
      );
    }
    
    return filtered;
  }, [activities, searchTerm, statoFilter]);

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
    console.log('🔧 [EDIT CLICK] Opening edit modal for activity:', activity.Titolo);
    console.log('🔧 [EDIT CLICK] Activity ID:', activity.id);
    setActivityToEdit(activity);
    setEditDialogOpen(true);
    console.log('🔧 [EDIT CLICK] Edit dialog should be open now');
  };

  const handleDeleteActivity = (activity: ActivityData) => {
    console.log('🗑️ [DELETE CLICK] Opening delete dialog for activity:', activity.Titolo);
    console.log('🗑️ [DELETE CLICK] Activity ID:', activity.id);
    setActivityToDelete(activity);
    setDeleteDialogOpen(true);
    console.log('🗑️ [DELETE CLICK] Delete dialog should be open now');
  };
  
  const confirmDeleteActivity = async () => {
    if (!activityToDelete) return;
    
    console.log(`🚀 [DELETE CLEAN] Starting deletion for: ${activityToDelete.Titolo}`);
    
    // Chiudi dialog e reset stato PRIMA dell'operazione
    setDeleteDialogOpen(false);
    const activityToDeleteRef = activityToDelete;
    setActivityToDelete(null);
    
    // 🚀 USA NUOVO SISTEMA PULITO
    try {
      await deleteActivity(activityToDeleteRef.id);
      console.log(`✅ [DELETE CLEAN] Successfully deleted: ${activityToDeleteRef.Titolo}`);
    } catch (error) {
      console.error(`❌ [DELETE CLEAN] Failed:`, error);
      toast.error('Errore durante l\'eliminazione dell\'attività');
    }
  };
  
  // Annulla eliminazione
  const cancelDeleteActivity = () => {
    setDeleteDialogOpen(false);
    setActivityToDelete(null);
  };
  
  // 🚀 Gestione successo modifica attività con sistema pulito
  const handleEditSuccess = async (updatedActivity?: ActivityData) => {
    console.log('🚀 [EDIT CLEAN] Activity edited successfully');
    
    setEditDialogOpen(false);
    setActivityToEdit(null);
    
    if (updatedActivity && activityToEdit) {
      // 🚀 Filtra solo i campi validi per l'update (escludi metadati Airtable)
      const {
        id,
        createdTime,
        'Ultima modifica': _lastModified,
        ...updateFields
      } = updatedActivity;
      
      console.log('🚀 [EDIT CLEAN] Original activity:', activityToEdit.Titolo);
      console.log('🚀 [EDIT CLEAN] Update fields:', updateFields);
      
      // 🚀 USA NUOVO SISTEMA PULITO con solo i campi modificabili
      try {
        await updateActivity(activityToEdit.id, updateFields);
        console.log(`✅ [EDIT CLEAN] Successfully updated: ${updatedActivity.Titolo}`);
      } catch (error) {
        console.error(`❌ [EDIT CLEAN] Failed:`, error);
        toast.error('Errore durante la modifica dell\'attività');
      }
    } else {
      // Fallback su refresh se non abbiamo i dati
      await simpleRefresh('EditSuccess');
      toast.success('Attività modificata con successo');
    }
  };

  const handleNewActivity = () => {
    setShowNewActivityModal(true);
  };

  const handleActivitySuccess = async (updatedActivity?: ActivityData) => {
    console.log('🚀 [CREATE CLEAN] Activity created successfully');
    
    if (updatedActivity) {
      console.log('🚀 [CREATE CLEAN] New activity data:', updatedActivity);
      console.log('🚀 [CREATE CLEAN] Activity ID:', updatedActivity.id);
      console.log('🚀 [CREATE CLEAN] Activity Stato:', updatedActivity.Stato);
      console.log('🚀 [CREATE CLEAN] Flags:', {
        _isOptimistic: updatedActivity._isOptimistic,
        _isNextActivity: updatedActivity._isNextActivity,
        _isMainActivity: updatedActivity._isMainActivity,
        _shouldRemove: updatedActivity._shouldRemove,
        _tempId: updatedActivity._tempId,
      });
      
      // 🔄 PROPAGAZIONE EVENTI LEAD STATE CHANGE
      // Se l'evento è un cambio di stato lead, propagalo al parent
      if (updatedActivity.type && updatedActivity.type.includes('lead-state')) {
        console.log('🔄 [Kanban] Propagating lead state event to parent:', updatedActivity.type);
        if (onLeadStateChange) {
          await onLeadStateChange(updatedActivity);
        }
        return; // Non processare come attività normale
      }
      
      // 🚀 Verifica che l'attività appartenga al lead corretto (se abbiamo leadId)
      if (leadId && updatedActivity['ID Lead']) {
        const belongsToLead = updatedActivity['ID Lead'].includes(leadId);
        if (!belongsToLead) {
          console.log('⚠️ [CREATE CLEAN] Activity does not belong to current lead, skipping add');
          return;
        }
      }
      
      // 🚀 AGGIUNGE L'ATTIVITÀ USANDO IL NOSTRO HOOK (gestisce automaticamente replace ottimistici)
      console.log('✅ [CREATE CLEAN] Adding activity via hook:', updatedActivity.Titolo || updatedActivity.Tipo);
      addActivity(updatedActivity);
      
      // 🔴 Chiudi il modal SOLO per l'attività principale (non per quelle ottimistiche next-activity)
      if (updatedActivity._isMainActivity && !updatedActivity._isOptimistic) {
        console.log('🚪 [CREATE CLEAN] Closing modal after main activity creation');
        setShowNewActivityModal(false);
      }
      
      // 🔴 Toast SOLO per attività principali (non ottimistiche intermedie)
      // Le ottimistiche hanno già i loro toast nel NewActivityModal
      if (!updatedActivity._isOptimistic || updatedActivity._isMainActivity) {
        const activityName = updatedActivity.Titolo || updatedActivity.Tipo;
        const isNext = updatedActivity._isNextActivity;
        const message = isNext 
          ? `Follow-up "${activityName}" aggiunto` 
          : `Attività "${activityName}" creata`;
        
        // Non mostrare toast se è la conferma di un'attività ottimistica (già gestita nel modal)
        if (updatedActivity._tempId) {
          console.log('🔕 [CREATE CLEAN] Skipping toast for optimistic confirmation (already shown)');
        } else {
          toast.success(message);
        }
      }
    } else {
      // Se non abbiamo i dati dell'attività, usa refresh
      console.log('🔄 [CREATE CLEAN] No activity data provided, refreshing...');
      setShowNewActivityModal(false);
      await simpleRefresh('CreateSuccess');
      toast.success('Attività creata con successo!');
    }
  };

  // 🚀 Funzione per applicare il cambio stato con sistema pulito
  const applyStateChange = async (activity: ActivityData, finalState: ActivityStato) => {
    console.log(`🚀 [STATE CLEAN] Changing ${activity.Titolo} to "${finalState}"`);
    
    try {
      // 🚀 USA MOVE ACTIVITY del nuovo sistema
      await moveActivity(activity.id, finalState);
      console.log(`✅ [STATE CLEAN] Successfully changed state: ${activity.Titolo} → ${finalState}`);
    } catch (error) {
      console.error(`❌ [STATE CLEAN] Failed:`, error);
      toast.error('Errore nel cambio stato dell\'attività');
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
        
        // 🚀 Il nuovo sistema gestisce già l'aggiornamento ottimistico
        // Applichiamo il cambio stato e il kanban si aggiorna automaticamente
        await applyStateChange(movedActivity, defaultState);
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
    
    // 🚀 Il nuovo sistema gestisce l'aggiornamento ottimistico automaticamente
    console.log(`🚀 [DialogChoice] Moving ${activity.Titolo} to ${chosenState}`);
    
    // Applica il cambio stato scelto
    await applyStateChange(activity, chosenState);
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
  
  // 🎯 Gestione cambio stato tramite context menu
  const handleStateChange = async (activity: ActivityData, newState: ActivityStato) => {
    if (activity.Stato === newState) return; // Nessun cambio necessario
    
    // 🚀 OPTIMISTIC UPDATE: Aggiorna immediatamente la UI 
    const optimisticActivity = { ...activity, Stato: newState };
    
    // Aggiorna immediatamente filteredActivities con il nuovo stato
    const updatedActivities = filteredActivities.map(act => 
      act.id === activity.id ? optimisticActivity : act
    );
    
    // Riorganizza immediatamente le colonne del Kanban
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
    
    try {
      // 🚀 USA MOVE ACTIVITY del nuovo sistema (gestisce ottimizzazione automaticamente)
      await moveActivity(activity.id, newState);
      
      const { icon: StateIcon } = getStateIconAndColor(newState);
      toast.success(
        <div className="flex items-center gap-2">
          <StateIcon className="h-4 w-4" />
          <span>Stato aggiornato a "{newState}"</span>
        </div>
      );
    } catch (err) {
      console.error('❌ [StateChange] Errore nel cambio stato:', err);
      toast.error('Errore nel cambio stato dell\'attività');
    }
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
      {/* Header con titolo e contatore */}
      <div className="mb-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 sm:text-xl">Attività</h2>
          <span className="text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
            {(statoFilter.length > 0 || searchTerm.trim()) 
              ? `${filteredActivities.length} di ${activities.length} attività` 
              : `${activities.length} attività totali`
            }
          </span>
        </div>
      </div>
      
      {/* Toolbar con search bar a sinistra e filtri a destra */}
      <div className="mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        {/* Campo di ricerca completamente a sinistra */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Cerca attività..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-8 text-sm sm:h-9"
          />
        </div>
        
        {/* Filtro Stato e pulsante nuova attività a destra */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
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
          {KANBAN_COLUMNS_ARRAY.map(column => (
            <KanbanColumn 
              key={column.id} 
              value={column.id}
              className="min-w-72 bg-gray-50 dark:bg-zinc-800 rounded-xl border sm:min-w-80 p-0 pt-0 pb-0"
            >
              {/* Header colonna senza padding orizzontale per la linea */}
              <div className="px-3 pt-3 pb-2 sm:px-4 sm:pt-4 sm:pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <column.icon className={cn('h-3 w-3 sm:h-4 sm:w-4', column.iconColor)} />
                    <h3 className="text-xs font-semibold text-gray-900 dark:text-gray-100 sm:text-sm">{column.title}</h3>
                    <Badge 
                      variant="secondary" 
                      className="text-[10px] h-4 px-1.5 bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 sm:text-xs sm:h-5 sm:px-2"
                    >
                      {kanbanData[column.id]?.length || 0}
                    </Badge>
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
              </div>
              
              {/* Linea di separazione che arriva ai bordi esterni */}
              <div className="border-b border-gray-200 dark:border-gray-600"></div>
              
              {/* Lista delle attività */}
              <div className="flex-1 px-3 pb-3 pt-2 space-y-2 overflow-y-auto min-h-64 sm:px-4 sm:pb-4 sm:pt-3 sm:space-y-3 sm:min-h-80">
                {kanbanData[column.id]?.length === 0 ? (
                  <EmptyColumnState 
                    columnId={column.id}
                    onCreateActivity={() => handleNewActivity()}
                  />
                ) : (
                  kanbanData[column.id]?.map((activity) => (
                    <ActivityCard
                      key={activity.id}
                      activity={activity}
                      onEdit={handleEditActivity}
                      onDelete={handleDeleteActivity}
                      onStateChange={handleStateChange}
                      usersData={users}
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
                onStateChange={handleStateChange}
                usersData={users}
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
      
      {/* Modal per modifica attività */}
      <NewActivityModal
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleEditSuccess}
        activity={activityToEdit}
      />
      
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
