'use client';

import { useMemo } from 'react';
import * as React from 'react';
import { format, differenceInSeconds } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  StickyNote,
  Trash2,
  Edit,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronUp,
  Pin,
} from 'lucide-react';
import { useNotes } from '@/hooks/use-notes';
import { useUsers } from '@/hooks/use-users';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { AvatarUser } from '@/components/ui/avatar-user';
import type { Note } from '@/types/database';

interface LeadTimelineProps {
  leadId: string;
  leadEsigenza?: string;
  leadCreatedAt?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activities?: any[]; // TODO: type properly when Activities integration is done
  onAddNote?: () => void;
  onEditNote?: (note: Note) => void;
}

interface TimelineItem {
  id: string;
  type: 'esigenza' | 'activity' | 'note';
  date: Date;
  content: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const activityIcons: Record<string, any> = {
  Chiamata: Phone,
  Email: Mail,
  WhatsApp: MessageSquare,
  Appuntamento: Calendar,
  Consulenza: Calendar,
  Prova: Calendar,
};

/**
 * Renderizza il contenuto della nota, evidenziando le menzioni @NomeUtente.
 */
function renderNoteContent(
  content: string,
  knownUserNames: string[]
): React.ReactNode {
  if (!content || knownUserNames.length === 0) {
    return content;
  }

  // Costruisci regex che matcha @NomeCompleto per ogni utente noto
  const escapedNames = knownUserNames.map((n) =>
    n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  );
  const pattern = new RegExp(`@(${escapedNames.join('|')})`, 'g');

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    // Testo prima della menzione
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    // Menzione stilizzata
    parts.push(
      <span
        key={match.index}
        className="inline-flex items-center rounded bg-primary/10 px-1 py-0.5 text-xs font-medium text-primary"
      >
        @{match[1]}
      </span>
    );
    lastIndex = pattern.lastIndex;
  }

  // Testo rimanente
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return parts.length > 0 ? parts : content;
}

export function LeadTimeline({
  leadId,
  leadEsigenza,
  leadCreatedAt,
  activities = [],
  onAddNote,
  onEditNote,
}: LeadTimelineProps) {
  const { notes, isLoading, deleteNote, togglePin } = useNotes(leadId);
  const { users } = useUsers();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [noteToDelete, setNoteToDelete] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Nomi utenti noti per rendering menzioni
  const knownUserNames = useMemo(
    () => (users ? Object.values(users).map((u) => u.name) : []),
    [users]
  );

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

    // Add Activities (solo completate/chiuse — le aperte si gestiscono nella sezione Attività)
    const completedStatuses = ['Completata', 'Annullata'];
    activities
      .filter((activity) => completedStatuses.includes(activity.status))
      .forEach((activity) => {
        if (activity.activity_date) {
          items.push({
            id: activity.id,
            type: 'activity',
            date: new Date(activity.activity_date),
            content: activity.notes || activity.title || '',
            metadata: {
              type: activity.type,
              status: activity.status,
              priority: activity.priority,
            },
          });
        }
      });

    // Add Notes
    notes?.forEach((note) => {
      if (note.created_at) {
        items.push({
          id: note.id,
          type: 'note',
          date: new Date(note.created_at),
          content: note.content || '',
          metadata: {
            pinned: note.pinned,
            authorName: note.author_name,
            userId: note.user_id,
            updatedAt: note.updated_at,
          },
        });
      }
    });

    // Sort by date descending (most recent first)
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [leadEsigenza, leadCreatedAt, activities, notes]);

  // Separa note pinnate e filtra per ricerca
  const { pinnedItems, normalItems } = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const filtered = query
      ? timelineItems.filter((item) => item.content.toLowerCase().includes(query))
      : timelineItems;

    return {
      pinnedItems: filtered.filter((item) => item.type === 'note' && item.metadata?.pinned),
      normalItems: filtered.filter((item) => !(item.type === 'note' && item.metadata?.pinned)),
    };
  }, [timelineItems, searchQuery]);

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
      toast.error('Errore durante il pin della nota');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const renderTimelineList = (items: TimelineItem[]) => (
    <ol className="space-y-8 w-full">
      {items.map((item, index) => (
        <li key={item.id} className="relative">
          {index < items.length - 1 && (
            <div className="absolute left-5 top-12 bottom-0 w-px bg-border -mb-8" />
          )}
          <TimelineItemCard
            item={item}
            knownUserNames={knownUserNames}
            users={users}
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
  );

  return (
    <div className="space-y-4">
      {/* Header con ricerca e bottone aggiungi */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold shrink-0">Note e Timeline</h2>
        <div className="flex items-center gap-2 flex-1 justify-end">
          <div className="relative max-w-[200px] w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Cerca nelle note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>
          {onAddNote && (
            <Button onClick={onAddNote} size="sm">
              <StickyNote className="mr-2 h-4 w-4" />
              Aggiungi Nota
            </Button>
          )}
        </div>
      </div>

      {/* Note in evidenza */}
      {pinnedItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
            <Pin className="h-3.5 w-3.5" />
            In evidenza ({pinnedItems.length})
          </div>
          <div className="rounded-lg border-2 border-border bg-muted/30 p-4">
            {renderTimelineList(pinnedItems)}
          </div>
        </div>
      )}

      {/* Timeline principale */}
      {normalItems.length === 0 && pinnedItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'Nessun risultato per la ricerca' : 'Nessuna attività o nota registrata'}
            </p>
          </CardContent>
        </Card>
      ) : normalItems.length > 0 ? (
        renderTimelineList(normalItems)
      ) : null}

      {/* Alert Dialog per conferma eliminazione */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent size="sm" className="p-4 gap-3">
          <AlertDialogHeader className="!grid-rows-none !place-items-start space-y-1 pb-0 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted mt-0.5">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              </div>
              <div className="flex-1">
                <AlertDialogTitle className="text-base font-semibold">Eliminare la nota?</AlertDialogTitle>
                <AlertDialogDescription className="text-sm mt-1">
                  <span className="text-destructive font-medium">Questa azione è irreversibile.</span> La nota verrà eliminata permanentemente.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="bg-muted/50 -mx-4 -mb-4 px-4 py-3 border-t mt-2 !flex !flex-row !justify-end gap-2">
            <AlertDialogCancel size="sm">Annulla</AlertDialogCancel>
            <AlertDialogAction
              size="sm"
              variant="destructive"
              onClick={handleDeleteNote}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const TRUNCATE_LENGTH = 200;

function TimelineItemCard({
  item,
  knownUserNames,
  users,
  onDelete,
  onTogglePin,
  onEdit,
}: {
  item: TimelineItem;
  knownUserNames: string[];
  users: Record<string, { id: string; name: string; avatarUrl?: string }> | null;
  onDelete?: () => void;
  onTogglePin?: () => void;
  onEdit?: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const isLong = item.content.length > TRUNCATE_LENGTH;

  const getIcon = () => {
    if (item.type === 'esigenza') {
      return <Calendar className="w-5 h-5" />;
    } else if (item.type === 'activity') {
      const ActivityIcon = activityIcons[item.metadata?.type] || Phone;
      return <ActivityIcon className="w-5 h-5" />;
    } else if (item.type === 'note' && item.metadata?.pinned) {
      return <Pin className="w-5 h-5" />;
    } else {
      return <StickyNote className="w-5 h-5" />;
    }
  };

  // Stato visivo per esigenza e attività
  // 4 stati: Da fare, In corso, Completata, Annullata
  const activityStatus = item.type === 'activity' ? item.metadata?.status : null;
  const isCompleted = item.type === 'esigenza' 
    || (item.type === 'activity' && activityStatus === 'Completata');
  const isCancelled = item.type === 'activity' && activityStatus === 'Annullata';
  const isPending = item.type === 'activity' && !isCompleted && !isCancelled;

  // Calcola se la nota è stata modificata (updated_at > created_at + 60s)
  const wasEdited = item.type === 'note' && item.metadata?.updatedAt && (() => {
    const created = new Date(item.date);
    const updated = new Date(item.metadata.updatedAt);
    return differenceInSeconds(updated, created) > 60;
  })();

  return (
    <div className="flex items-start gap-3 rtl:space-x-reverse">
      {/* Icona circolare */}
      <span className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 lg:h-12 lg:w-12 ${
        isCompleted 
          ? 'bg-green-100 text-green-600'
          : isCancelled
          ? 'bg-red-100 text-red-500'
          : isPending
          ? 'bg-blue-100 text-blue-600'
          : item.metadata?.pinned
          ? 'bg-muted text-foreground'
          : 'bg-muted text-muted-foreground'
      }`}>
        {isCompleted ? (
          <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 11.917 9.724 16.5 19 7.5"/>
          </svg>
        ) : isCancelled ? (
          <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18 18 6M6 6l12 12"/>
          </svg>
        ) : (
          getIcon()
        )}
      </span>

      {/* Contenuto */}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div>
            <h3 className="font-medium leading-tight text-base">
              {item.type === 'esigenza'
                ? 'Esigenza Iniziale'
                : item.type === 'activity'
                ? item.metadata?.type || 'Attivit\u00e0'
                : 'Nota'}
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm text-muted-foreground">
                {format(item.date, "d MMMM yyyy 'alle' HH:mm", { locale: it })}
              </p>
              {/* Autore nota */}
              {item.type === 'note' && item.metadata?.authorName && (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <AvatarUser
                    nome={item.metadata.authorName}
                    avatarUrl={item.metadata.userId && users?.[item.metadata.userId]?.avatarUrl || undefined}
                    size="sm"
                  />
                  {item.metadata.authorName}
                </span>
              )}
              {/* Data modifica */}
              {wasEdited && (
                <span className="text-xs text-muted-foreground italic">
                  (modificata il {format(new Date(item.metadata.updatedAt), "d MMM yyyy 'alle' HH:mm", { locale: it })})
                </span>
              )}
            </div>
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
                  className={`h-7 w-7 ${item.metadata?.pinned ? 'text-foreground' : ''}`}
                  onClick={onTogglePin}
                  title={
                    item.metadata?.pinned ? 'Rimuovi pin' : 'Fissa in alto'
                  }
                >
                  <Pin className="h-3 w-3" />
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

        <div className="text-sm whitespace-pre-wrap">
          {item.type === 'note'
            ? renderNoteContent(
                isLong && !expanded ? item.content.slice(0, TRUNCATE_LENGTH) + '...' : item.content,
                knownUserNames
              )
            : isLong && !expanded
            ? item.content.slice(0, TRUNCATE_LENGTH) + '...'
            : item.content}
        </div>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-1 flex items-center gap-1 text-xs font-medium text-primary hover:underline cursor-pointer"
          >
            {expanded ? (
              <><ChevronUp className="h-3 w-3" /> Mostra meno</>
            ) : (
              <><ChevronDown className="h-3 w-3" /> Mostra tutto</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
