'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useNotes } from '@/hooks/use-notes';
import type { AirtableNotes } from '@/types/airtable.generated';

const addNoteSchema = z.object({
  content: z.string().min(1, 'Il contenuto della nota è obbligatorio'),
  type: z.enum(['Riflessione', 'Promemoria', 'Follow-up', 'Info Cliente']),
  pinned: z.boolean(),
});

type AddNoteFormData = z.infer<typeof addNoteSchema>;

const noteTypeColors: Record<string, string> = {
  Riflessione: 'bg-purple-100 text-purple-700 border-purple-200',
  Promemoria: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Follow-up': 'bg-blue-100 text-blue-700 border-blue-200',
  'Info Cliente': 'bg-green-100 text-green-700 border-green-200',
};

interface AddNoteDialogProps {
  leadId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingNote?: AirtableNotes;
}

export function AddNoteDialog({
  leadId,
  open,
  onOpenChange,
  editingNote,
}: AddNoteDialogProps) {
  const { createNote, updateNote } = useNotes(leadId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const isEditMode = !!editingNote;

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
      content: editingNote.fields.Content || '',
      type: editingNote.fields.Type || 'Riflessione',
      pinned: editingNote.fields.Pinned || false,
    } : {
      content: '',
      type: 'Riflessione',
      pinned: false,
    },
  });

  const noteType = watch('type');
  const pinned = watch('pinned');
  const content = watch('content');

  // Precarica i dati quando editingNote cambia
  useEffect(() => {
    if (editingNote) {
      setValue('content', editingNote.fields.Content || '');
      setValue('type', editingNote.fields.Type || 'Riflessione');
      setValue('pinned', editingNote.fields.Pinned || false);
    } else {
      reset({
        content: '',
        type: 'Riflessione',
        pinned: false,
      });
    }
  }, [editingNote, setValue, reset]);

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
        body: JSON.stringify({ 
          text: content,
          context: 'note',
          noteType: noteType 
        }),
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
    } catch (error: any) {
      console.error('Failed to rewrite with AI:', error);
      toast.error(error.message || 'Errore durante la riscrittura AI');
    } finally {
      setIsRewriting(false);
    }
  };

  const onSubmit = async (data: AddNoteFormData) => {
    setIsSubmitting(true);
    try {
      if (isEditMode && editingNote) {
        await updateNote(editingNote.id, {
          content: data.content,
          type: data.type,
          pinned: data.pinned,
        });
        toast.success('Nota aggiornata con successo');
      } else {
        await createNote({
          leadId,
          content: data.content,
          type: data.type,
          pinned: data.pinned,
        });
        toast.success('Nota aggiunta con successo');
      }

      reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to save note:', error);
      toast.error(error.message || `Errore durante ${isEditMode ? 'la modifica' : 'l\'aggiunta'} della nota`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            {isEditMode ? 'Modifica Nota' : 'Aggiungi Nota'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Modifica il contenuto, il tipo o lo stato di pin della nota.'
              : 'Aggiungi una nota rapida a questo lead. Puoi specificare il tipo e fissarla in alto.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            <Textarea
              id="content"
              placeholder="Scrivi qui la tua nota..."
              rows={5}
              {...register('content')}
              className={errors.content ? 'border-red-500' : ''}
            />
            {errors.content && (
              <p className="text-xs text-red-500">{errors.content.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo Nota</Label>
            <Select
              value={noteType}
              onValueChange={(value) =>
                setValue(
                  'type',
                  value as 'Riflessione' | 'Promemoria' | 'Follow-up' | 'Info Cliente'
                )
              }
            >
              <SelectTrigger id="type" className="w-full">
                <SelectValue>
                  <Badge
                    variant="outline"
                    className={noteTypeColors[noteType] || ''}
                  >
                    {noteType}
                  </Badge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Riflessione">
                  <Badge
                    variant="outline"
                    className="bg-purple-100 text-purple-700 border-purple-200"
                  >
                    Riflessione
                  </Badge>
                </SelectItem>
                <SelectItem value="Promemoria">
                  <Badge
                    variant="outline"
                    className="bg-yellow-100 text-yellow-700 border-yellow-200"
                  >
                    Promemoria
                  </Badge>
                </SelectItem>
                <SelectItem value="Follow-up">
                  <Badge
                    variant="outline"
                    className="bg-blue-100 text-blue-700 border-blue-200"
                  >
                    Follow-up
                  </Badge>
                </SelectItem>
                <SelectItem value="Info Cliente">
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-700 border-green-200"
                  >
                    Info Cliente
                  </Badge>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="pinned"
              checked={pinned}
              onCheckedChange={(checked) =>
                setValue('pinned', checked as boolean)
              }
            />
            <Label
              htmlFor="pinned"
              className="text-sm font-normal cursor-pointer"
            >
              Evidenzia questa nota nella timeline
            </Label>
          </div>

          <DialogFooter className="mt-6">
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
