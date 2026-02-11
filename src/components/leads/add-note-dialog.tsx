'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, StickyNote, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useNotes } from '@/hooks/use-notes';
import { useUsers } from '@/hooks/use-users';
import { AvatarLead } from '@/components/ui/avatar-lead';
import type { Note } from '@/types/database';

const addNoteSchema = z.object({
  content: z.string().min(1, 'Il contenuto della nota è obbligatorio'),
  pinned: z.boolean(),
});

type AddNoteFormData = z.infer<typeof addNoteSchema>;

interface AddNoteDialogProps {
  leadId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingNote?: Note;
}

export function AddNoteDialog({
  leadId,
  open,
  onOpenChange,
  editingNote,
}: AddNoteDialogProps) {
  const { createNote, updateNote } = useNotes(leadId);
  const { users } = useUsers();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const isEditMode = !!editingNote;

  // Mentions state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<AddNoteFormData>({
    resolver: zodResolver(addNoteSchema),
    defaultValues: editingNote ? {
      content: editingNote.content || '',
      pinned: editingNote.pinned || false,
    } : {
      content: '',
      pinned: false,
    },
  });

  const pinned = watch('pinned');
  const content = watch('content');

  // Keep ref in sync with react-hook-form register
  const { ref: registerRef, ...registerRest } = register('content');

  // Precarica i dati quando editingNote cambia
  useEffect(() => {
    if (editingNote) {
      setValue('content', editingNote.content || '');
      setValue('pinned', editingNote.pinned || false);
    } else {
      reset({ content: '', pinned: false });
    }
  }, [editingNote, setValue, reset]);

  // Lista utenti per menzioni
  const userList = users
    ? Object.values(users).map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl }))
    : [];

  const filteredUsers = userList.filter((u) =>
    u.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Gestisce input nel textarea per detect @
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1) {
      const charBefore = atIndex > 0 ? textBeforeCursor[atIndex - 1] : ' ';
      if (charBefore === ' ' || charBefore === '\n' || atIndex === 0) {
        const query = textBeforeCursor.slice(atIndex + 1);
        if (!query.includes('\n') && query.length <= 20) {
          setMentionQuery(query);
          setMentionIndex(atIndex);
          setShowMentions(true);
          return;
        }
      }
    }
    setShowMentions(false);
  }, []);

  // Inserisce menzione nel testo
  const insertMention = useCallback((userName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const currentContent = textarea.value;
    const before = currentContent.slice(0, mentionIndex);
    const cursorPos = textarea.selectionStart || mentionIndex;
    const after = currentContent.slice(cursorPos);

    const newContent = `${before}@${userName} ${after}`;
    setValue('content', newContent, { shouldValidate: true });
    setShowMentions(false);
    setMentionQuery('');

    requestAnimationFrame(() => {
      const newPos = mentionIndex + userName.length + 2;
      textarea.setSelectionRange(newPos, newPos);
      textarea.focus();
    });
  }, [mentionIndex, setValue]);

  // Keyboard: Enter seleziona prima menzione, Escape chiude
  const handleTextareaKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentions || filteredUsers.length === 0) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      insertMention(filteredUsers[0].name);
    } else if (e.key === 'Escape') {
      setShowMentions(false);
    }
  }, [showMentions, filteredUsers, insertMention]);

  const handleRewriteWithAI = async () => {
    if (!content || content.trim().length === 0) {
      toast.error('Inserisci del testo da riscrivere');
      return;
    }

    setIsRewriting(true);
    try {
      const response = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: content, context: 'note' }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Errore durante la riscrittura');
      }

      const data = await response.json();
      if (!data.success || !data.rewrittenText) {
        throw new Error('Nessun testo generato');
      }

      setValue('content', data.rewrittenText);
      toast.success(data.demo ? 'Testo formattato (modalità demo)' : 'Testo riscritto con AI');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Failed to rewrite with AI:', error);
      toast.error(error.message || 'Errore durante la riscrittura AI');
    } finally {
      setIsRewriting(false);
    }
  };

  // Intercetta chiusura dialog se ci sono modifiche non salvate
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen && content && content.trim().length > 0 && !isSubmitting) {
      // In edit mode, controlla se il contenuto è cambiato
      if (isEditMode && content === (editingNote?.content || '')) {
        onOpenChange(false);
        return;
      }
      // Chiedi conferma
      if (window.confirm('Hai modifiche non salvate. Vuoi chiudere senza salvare?')) {
        reset({ content: '', pinned: false });
        onOpenChange(false);
      }
    } else {
      onOpenChange(newOpen);
    }
  }, [content, isSubmitting, isEditMode, editingNote, onOpenChange, reset]);

  const onSubmit = async (data: AddNoteFormData) => {
    setIsSubmitting(true);
    try {
      if (isEditMode && editingNote) {
        await updateNote(editingNote.id, {
          content: data.content,
          pinned: data.pinned,
        });
        toast.success('Nota aggiornata con successo');
      } else {
        await createNote({
          lead_id: leadId,
          content: data.content,
          pinned: data.pinned,
        });
        toast.success('Nota aggiunta con successo');
      }

      reset();
      onOpenChange(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Failed to save note:', error);
      toast.error(error.message || `Errore durante ${isEditMode ? 'la modifica' : "l'aggiunta"} della nota`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            {isEditMode ? 'Modifica Nota' : 'Aggiungi Nota'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Modifica il contenuto della nota.'
              : 'Aggiungi una nota a questo lead. Usa @nome per menzionare un utente.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content">Contenuto *</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRewriteWithAI}
                disabled={isRewriting || !content || content.trim().length === 0}
                className="h-7 text-xs gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isRewriting ? 'Riscrittura...' : 'Riscrivi con AI'}
              </Button>
            </div>
            <div className="relative">
              <Textarea
                id="content"
                placeholder="Scrivi qui la tua nota... Usa @nome per menzionare"
                rows={6}
                {...registerRest}
                ref={(e) => {
                  registerRef(e);
                  textareaRef.current = e;
                }}
                onChange={(e) => {
                  registerRest.onChange(e);
                  handleTextareaChange(e);
                }}
                onKeyDown={handleTextareaKeyDown}
                className={errors.content ? 'border-red-500' : ''}
              />
              {showMentions && filteredUsers.length > 0 && (
                <div className="absolute z-50 bottom-full mb-1 left-0 w-64 rounded-md border bg-popover p-1 shadow-md">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertMention(user.name);
                      }}
                    >
                      {user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <AvatarLead nome={user.name} size="sm" />
                      )}
                      <span className="font-medium truncate">{user.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.content && (
              <p className="text-xs text-red-500">{errors.content.message}</p>
            )}
            {content && (
              <p className="text-xs text-muted-foreground text-right">
                {content.length} caratteri
              </p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="pinned"
              checked={pinned}
              onCheckedChange={(checked) => setValue('pinned', checked as boolean)}
            />
            <Label htmlFor="pinned" className="text-sm font-normal cursor-pointer">
              Fissa in alto nella timeline
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                isEditMode ? 'Salva Modifiche' : 'Aggiungi Nota'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
