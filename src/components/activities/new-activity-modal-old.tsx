'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AirtableActivity } from '@/types/airtable.generated';
import { Badge } from '@/components/ui/badge';
import {
  getActivityTipoColor,
  getActivityStatoColor,
  getActivityPrioritaColor,
  getActivityObiettivoColor,
} from '@/types/activities';

// Schema validazione Zod
const activitySchema = z.object({
  Tipo: z.enum(['Chiamata', 'WhatsApp', 'Email', 'SMS', 'Consulenza', 'Follow-up', 'Altro']),
  Stato: z.enum(['Da Pianificare', 'Pianificata', 'In corso', 'In attesa', 'Completata', 'Annullata', 'Rimandata']),
  Priorità: z.enum(['Bassa', 'Media', 'Alta', 'Urgente']).optional(),
  Obiettivo: z.string().optional(),
  Data: z.date().optional(),
  Note: z.string().optional(),
  Esito: z.string().optional(),
});

type ActivityFormData = z.infer<typeof activitySchema>;

interface NewActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  activity?: AirtableActivity;
  onSuccess?: () => void;
}

export function NewActivityModal({
  open,
  onOpenChange,
  leadId,
  activity,
  onSuccess,
}: NewActivityModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!activity;

  const form = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      Tipo: 'Chiamata',
      Stato: 'Da Pianificare',
      Priorità: 'Media',
      Obiettivo: '',
      Note: '',
    },
  });

  // Precarica dati in modalità edit
  useEffect(() => {
    if (activity && open) {
      form.reset({
        Tipo: activity.fields.Tipo || 'Chiamata',
        Stato: activity.fields.Stato || 'Da Pianificare',
        Priorità: activity.fields.Priorità || 'Media',
        Obiettivo: activity.fields.Obiettivo || '',
        Data: activity.fields.Data ? new Date(activity.fields.Data) : undefined,
        Note: activity.fields.Note || '',
        Esito: activity.fields.Esito || '',
      });
    } else if (!activity && open) {
      form.reset({
        Tipo: 'Chiamata',
        Stato: 'Da Pianificare',
        Priorità: 'Media',
        Obiettivo: '',
        Note: '',
      });
    }
  }, [activity, open, form]);

  const onSubmit = async (data: ActivityFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        'ID Lead': [leadId],
        Data: data.Data ? data.Data.toISOString() : undefined,
      };

      const url = isEditMode ? `/api/activities/${activity!.id}` : '/api/activities';
      const method = isEditMode ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Errore durante il salvataggio');
      }

      toast.success(isEditMode ? 'Attività aggiornata' : 'Attività creata', {
        description: `L'attività "${data.Tipo}" è stata ${isEditMode ? 'aggiornata' : 'creata'} con successo.`,
      });

      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Failed to save activity:', error);
      toast.error(error.message || 'Errore durante il salvataggio dell\'attività');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Modifica Attività' : 'Nuova Attività'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Modifica i dettagli dell\'attività esistente.'
              : 'Crea una nuova attività per questo lead.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo */}
            <FormField
              control={form.control}
              name="Tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        {field.value ? (
                          <Badge variant="outline" className={getActivityTipoColor(field.value)}>
                            {field.value}
                          </Badge>
                        ) : (
                          <SelectValue placeholder="Seleziona tipo" />
                        )}
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Chiamata">
                        <Badge variant="outline" className={getActivityTipoColor('Chiamata')}>Chiamata</Badge>
                      </SelectItem>
                      <SelectItem value="WhatsApp">
                        <Badge variant="outline" className={getActivityTipoColor('WhatsApp')}>WhatsApp</Badge>
                      </SelectItem>
                      <SelectItem value="Email">
                        <Badge variant="outline" className={getActivityTipoColor('Email')}>Email</Badge>
                      </SelectItem>
                      <SelectItem value="SMS">
                        <Badge variant="outline" className={getActivityTipoColor('SMS')}>SMS</Badge>
                      </SelectItem>
                      <SelectItem value="Consulenza">
                        <Badge variant="outline" className={getActivityTipoColor('Consulenza')}>Consulenza</Badge>
                      </SelectItem>
                      <SelectItem value="Follow-up">
                        <Badge variant="outline" className={getActivityTipoColor('Follow-up')}>Follow-up</Badge>
                      </SelectItem>
                      <SelectItem value="Altro">
                        <Badge variant="outline" className={getActivityTipoColor('Altro')}>Altro</Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Stato e Priorità su stessa riga */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="Stato"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stato *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          {field.value && (
                            <Badge variant="outline" className={getActivityStatoColor(field.value)}>
                              {field.value}
                            </Badge>
                          )}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Da Pianificare">
                          <Badge variant="outline" className={getActivityStatoColor('Da Pianificare')}>Da Pianificare</Badge>
                        </SelectItem>
                        <SelectItem value="Pianificata">
                          <Badge variant="outline" className={getActivityStatoColor('Pianificata')}>Pianificata</Badge>
                        </SelectItem>
                        <SelectItem value="In corso">
                          <Badge variant="outline" className={getActivityStatoColor('In corso')}>In corso</Badge>
                        </SelectItem>
                        <SelectItem value="In attesa">
                          <Badge variant="outline" className={getActivityStatoColor('In attesa')}>In attesa</Badge>
                        </SelectItem>
                        <SelectItem value="Completata">
                          <Badge variant="outline" className={getActivityStatoColor('Completata')}>Completata</Badge>
                        </SelectItem>
                        <SelectItem value="Annullata">
                          <Badge variant="outline" className={getActivityStatoColor('Annullata')}>Annullata</Badge>
                        </SelectItem>
                        <SelectItem value="Rimandata">
                          <Badge variant="outline" className={getActivityStatoColor('Rimandata')}>Rimandata</Badge>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="Priorità"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priorità</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          {field.value && (
                            <Badge variant="outline" className={getActivityPrioritaColor(field.value)}>
                              {field.value}
                            </Badge>
                          )}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Bassa">
                          <Badge variant="outline" className={getActivityPrioritaColor('Bassa')}>Bassa</Badge>
                        </SelectItem>
                        <SelectItem value="Media">
                          <Badge variant="outline" className={getActivityPrioritaColor('Media')}>Media</Badge>
                        </SelectItem>
                        <SelectItem value="Alta">
                          <Badge variant="outline" className={getActivityPrioritaColor('Alta')}>Alta</Badge>
                        </SelectItem>
                        <SelectItem value="Urgente">
                          <Badge variant="outline" className={getActivityPrioritaColor('Urgente')}>Urgente</Badge>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Obiettivo */}
            <FormField
              control={form.control}
              name="Obiettivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Obiettivo</FormLabel>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="w-full">
                        {field.value ? (
                          <Badge variant="outline" className={getActivityObiettivoColor(field.value)}>
                            {field.value}
                          </Badge>
                        ) : (
                          <SelectValue placeholder="Seleziona obiettivo (opzionale)" />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Primo contatto">
                          <Badge variant="outline" className={getActivityObiettivoColor('Primo contatto')}>Primo contatto</Badge>
                        </SelectItem>
                        <SelectItem value="Qualificazione lead">
                          <Badge variant="outline" className={getActivityObiettivoColor('Qualificazione lead')}>Qualificazione lead</Badge>
                        </SelectItem>
                        <SelectItem value="Presentazione prodotto">
                          <Badge variant="outline" className={getActivityObiettivoColor('Presentazione prodotto')}>Presentazione prodotto</Badge>
                        </SelectItem>
                        <SelectItem value="Invio preventivo">
                          <Badge variant="outline" className={getActivityObiettivoColor('Invio preventivo')}>Invio preventivo</Badge>
                        </SelectItem>
                        <SelectItem value="Follow-up preventivo">
                          <Badge variant="outline" className={getActivityObiettivoColor('Follow-up preventivo')}>Follow-up preventivo</Badge>
                        </SelectItem>
                        <SelectItem value="Negoziazione">
                          <Badge variant="outline" className={getActivityObiettivoColor('Negoziazione')}>Negoziazione</Badge>
                        </SelectItem>
                        <SelectItem value="Chiusura ordine">
                          <Badge variant="outline" className={getActivityObiettivoColor('Chiusura ordine')}>Chiusura ordine</Badge>
                        </SelectItem>
                        <SelectItem value="Fissare appuntamento">
                          <Badge variant="outline" className={getActivityObiettivoColor('Fissare appuntamento')}>Fissare appuntamento</Badge>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Data */}
            <FormField
              control={form.control}
              name="Data"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data e Ora</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, "d MMMM yyyy 'alle' HH:mm", { locale: it })
                          ) : (
                            <span>Seleziona data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Data prevista per l'attività
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Note */}
            <FormField
              control={form.control}
              name="Note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Aggiungi note o dettagli sull'attività..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Esito (solo se Completata) */}
            {form.watch('Stato') === 'Completata' && (
              <FormField
                control={form.control}
                name="Esito"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Esito</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona esito" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Contatto riuscito">Contatto riuscito</SelectItem>
                        <SelectItem value="Nessuna risposta">Nessuna risposta</SelectItem>
                        <SelectItem value="Molto interessato">Molto interessato</SelectItem>
                        <SelectItem value="Interessato">Interessato</SelectItem>
                        <SelectItem value="Poco interessato">Poco interessato</SelectItem>
                        <SelectItem value="Non interessato">Non interessato</SelectItem>
                        <SelectItem value="Preventivo richiesto">Preventivo richiesto</SelectItem>
                        <SelectItem value="Preventivo inviato">Preventivo inviato</SelectItem>
                        <SelectItem value="Appuntamento fissato">Appuntamento fissato</SelectItem>
                        <SelectItem value="Ordine confermato">Ordine confermato</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="gap-2">
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
                ) : isEditMode ? (
                  'Aggiorna'
                ) : (
                  'Crea Attività'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
