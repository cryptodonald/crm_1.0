'use client';

import { useMemo, useState as React_useState } from 'react';
import * as React from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  StickyNote,
  Star,
  Trash2,
  Edit,
} from 'lucide-react';
import { useNotes } from '@/hooks/use-notes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import type { AirtableNotes } from '@/types/airtable.generated';

interface LeadTimelineProps {
  leadId: string;
  leadEsigenza?: string;
  leadCreatedAt?: string;
  activities?: any[]; // TODO: type properly when Activities integration is done
  onAddNote?: () => void;
  onEditNote?: (note: AirtableNotes) => void;
}

interface TimelineItem {
  id: string;
  type: 'esigenza' | 'activity' | 'note';
  date: Date;
  content: string;
  metadata?: any;
}

const noteTypeColors: Record<string, string> = {
  Riflessione: 'bg-purple-100 text-purple-700 border-purple-200',
  Promemoria: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Follow-up': 'bg-blue-100 text-blue-700 border-blue-200',
  'Info Cliente': 'bg-green-100 text-green-700 border-green-200',
};

const activityIcons: Record<string, any> = {
  Chiamata: Phone,
  Email: Mail,
  WhatsApp: MessageSquare,
  Appuntamento: Calendar,
  Consulenza: Calendar,
  Prova: Calendar,
};

export function LeadTimeline({
  leadId,
  leadEsigenza,
  leadCreatedAt,
  activities = [],
  onAddNote,
  onEditNote,
}: LeadTimelineProps) {
  const { notes, isLoading, deleteNote, togglePin } = useNotes(leadId);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [noteToDelete, setNoteToDelete] = React.useState<string | null>(null);

  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];

    // Add Esigenza as first item
    if (leadEsigenza && leadCreatedAt) {
      items.push({
        id: 'esigenza',
        type: 'esigenza',
        date: new Date(leadCreatedAt),
        content: leadEsigenza,
      });
    }

    // Add Activities
    activities.forEach((activity) => {
      if (activity.fields?.Data) {
        items.push({
          id: activity.id,
          type: 'activity',
          date: new Date(activity.fields.Data),
          content: activity.fields.Note || activity.fields.Titolo || '',
          metadata: {
            type: activity.fields.Tipo,
            status: activity.fields.Stato,
            priority: activity.fields.Priorità,
          },
        });
      }
    });

    // Add Notes
    notes?.forEach((note) => {
      if (note.fields.CreatedAt) {
        items.push({
          id: note.id,
          type: 'note',
          date: new Date(note.fields.CreatedAt),
          content: note.fields.Content || '',
          metadata: {
            type: note.fields.Type,
            pinned: note.fields.Pinned,
            userIds: note.fields.User,
          },
        });
      }
    });

    // Sort by date descending (most recent first)
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [leadEsigenza, leadCreatedAt, activities, notes]);

  const handleDeleteNote = async () => {
    if (!noteToDelete) return;
    
    try {
      await deleteNote(noteToDelete);
      toast.success('Nota eliminata con successo');
    } catch (error) {
      console.error('Failed to delete note:', error);
      toast.error('Errore durante l\'eliminazione della nota');
    } finally {
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
    }
  };

  const handleTogglePin = async (noteId: string, currentPinned: boolean) => {
    try {
      await togglePin(noteId, currentPinned);
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      alert('Errore durante il pin della nota');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Caricamento...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con bottone aggiungi */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Note e Timeline</h2>
        {onAddNote && (
          <Button onClick={onAddNote} size="sm">
            <StickyNote className="mr-2 h-4 w-4" />
            Aggiungi Nota
          </Button>
        )}
      </div>

      {/* Vertical Stepper Timeline */}
      {timelineItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Nessuna attività o nota registrata
            </p>
          </CardContent>
        </Card>
      ) : (
        <ol className="space-y-8 w-full">
          {timelineItems.map((item, index) => (
            <li key={item.id} className="relative">
              {/* Linea verticale */}
              {index < timelineItems.length - 1 && (
                <div className="absolute left-5 top-12 bottom-0 w-px bg-border -mb-8" />
              )}
              <TimelineItemCard
                item={item}
                isFirst={index === 0}
                onDelete={item.type === 'note' ? () => {
                  setNoteToDelete(item.id);
                  setDeleteDialogOpen(true);
                } : undefined}
                onTogglePin={item.type === 'note' ? () => handleTogglePin(item.id, item.metadata?.pinned || false) : undefined}
                onEdit={item.type === 'note' && onEditNote ? () => {
                  const note = notes?.find(n => n.id === item.id);
                  if (note) onEditNote(note);
                } : undefined}
              />
            </li>
          ))}
        </ol>
      )}

      {/* Alert Dialog per conferma eliminazione */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="p-0 gap-0">
          <div className="p-6 pb-4">
            <AlertDialogHeader>
              <AlertDialogTitle>Sei assolutamente sicuro?</AlertDialogTitle>
              <AlertDialogDescription>
                Questa azione non può essere annullata. La nota verrà eliminata permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
          </div>
          <div className="border-t bg-muted/30">
            <AlertDialogFooter className="p-4">
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteNote}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TimelineItemCard({
  item,
  isFirst,
  onDelete,
  onTogglePin,
  onEdit,
}: {
  item: TimelineItem;
  isFirst: boolean;
  onDelete?: () => void;
  onTogglePin?: () => void;
  onEdit?: () => void;
}) {
  // Determina icona e se completato in base al tipo
  const getIcon = () => {
    if (item.type === 'esigenza') {
      return <Calendar className="w-5 h-5" />;
    } else if (item.type === 'activity') {
      const ActivityIcon = activityIcons[item.metadata?.type] || Phone;
      return <ActivityIcon className="w-5 h-5" />;
    } else if (item.type === 'note' && item.metadata?.pinned) {
      // Nota evidenziata: mostra icona stella
      return <Star className="w-5 h-5 fill-current" />;
    } else {
      return <StickyNote className="w-5 h-5" />;
    }
  };

  const isCompleted = item.type === 'esigenza' || item.type === 'activity';

  return (
    <div className="flex items-start gap-3 rtl:space-x-reverse">
      {/* Icona circolare */}
      <span className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 lg:h-12 lg:w-12 ${
        isCompleted 
          ? 'bg-green-100 text-green-600' 
          : item.metadata?.pinned
          ? 'bg-amber-100 text-amber-600'
          : 'bg-muted text-muted-foreground'
      }`}>
        {isCompleted ? (
          <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11.917 9.724 16.5 19 7.5"/>
          </svg>
        ) : (
          getIcon()
        )}
      </span>

      {/* Contenuto */}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-medium leading-tight text-base">
                {item.type === 'esigenza'
                  ? 'Esigenza Iniziale'
                  : item.type === 'activity'
                  ? item.metadata?.type || 'Attività'
                  : 'Nota'}
              </h3>
              {item.type === 'note' && item.metadata?.type && (
                <Badge
                  variant="outline"
                  className={noteTypeColors[item.metadata.type] || ''}
                >
                  {item.metadata.type}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {format(item.date, "d MMMM yyyy 'alle' HH:mm", { locale: it })}
            </p>
          </div>

          {item.type === 'note' && (onDelete || onTogglePin || onEdit) && (
            <div className="flex gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onEdit}
                  title="Modifica nota"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
              {onTogglePin && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={onTogglePin}
                  title={
                    item.metadata?.pinned ? 'Rimuovi evidenziazione' : 'Evidenzia nota'
                  }
                >
                  <Star
                    className={`h-3 w-3 ${
                      item.metadata?.pinned
                        ? 'fill-amber-500 text-amber-500'
                        : ''
                    }`}
                  />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={onDelete}
                  title="Elimina nota"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>

        <p className="text-sm whitespace-pre-wrap">{item.content}</p>
      </div>
    </div>
  );
}
