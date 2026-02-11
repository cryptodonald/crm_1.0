'use client';

import { useState, useMemo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { 
  ActivityFormData, 
  ActivityEsito, 
  ActivityProssimaAzione, 
  getActivityEsitoColor,
} from '@/types/activities';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  FormMessage,
} from '@/components/ui/form';
import { FormMessageSubtle } from '@/components/ui/form-message-subtle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDownIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { TimeSelect } from '@/components/ui/time-select';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { AINotesField } from '../ai-notes-field';

interface RisultatiStepProps {
  form: UseFormReturn<ActivityFormData>;
  isEditMode?: boolean;
}

// Esiti disponibili (12)
const ACTIVITY_RESULTS: ActivityEsito[] = [
  'Non risponde',
  'Da ricontattare',
  'Qualificato',
  'Appuntamento fissato',
  'Preventivo inviato',
  'Ordine confermato',
  'Non interessato',
  'Opportunità persa',
  'Problema risolto',
  'Feedback raccolto',
  'Recensione ottenuta',
  'Altro',
];

// Prossime azioni disponibili
const NEXT_ACTIONS: ActivityProssimaAzione[] = [
  'Chiamata',
  'Messaggistica',
  'Email',
  'Consulenza',
  'Follow-up',
  'Altro',
];


export function RisultatiStep({ form, isEditMode = false }: RisultatiStepProps) {
  const [nextDatePopoverOpen, setNextDatePopoverOpen] = useState(false);

  const { control, setValue, watch } = form;

  // Derive next date/time from form value
  const nextDataValue = watch('Data prossima azione');

  const selectedNextDate = useMemo(() => {
    if (nextDataValue) return new Date(nextDataValue);
    return undefined;
  }, [nextDataValue]);

  const selectedNextTime = useMemo(() => {
    if (nextDataValue) return format(new Date(nextDataValue), 'HH:mm');
    return '';
  }, [nextDataValue]);

  const handleNextDateTimeChange = (date: Date | undefined, time?: string) => {
    if (date) {
      // Se non c'è un orario, usa l'ora corrente come default
      const timeToUse = time || selectedNextTime || format(new Date(), 'HH:mm');
      const [hours, minutes] = timeToUse.split(':').map(Number);
      const dateTime = new Date(date);
      dateTime.setHours(hours, minutes);
      setValue('Data prossima azione', dateTime.toISOString());
    } else {
      setValue('Data prossima azione', undefined);
    }
  };

  const resetNextAction = () => {
    setValue('Prossima azione', undefined);
    setValue('Data prossima azione', undefined);
    setValue('Note prossima azione', undefined);
  };

  const prossimaAzione = watch('Prossima azione');

  return (
    <div className="space-y-6">
      <div className="space-y-1 pb-2">
        <h3 className="text-lg font-semibold">Risultati</h3>
        <p className="text-sm text-muted-foreground">
          Documenta l&apos;esito dell&apos;attività e pianifica le prossime azioni.
        </p>
      </div>
      
      <div className="border-t border-border/50 pt-4 space-y-6">
        
        {/* Esito e Prossima Azione */}
        <div className={cn("grid gap-4", !isEditMode && "md:grid-cols-2")}>
          {/* Esito Attività */}
          <FormField
            control={control}
            name="Esito"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Esito Attività</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleziona esito">
                        {field.value && (
                          <div className="flex items-center gap-2">
                            <Badge className={cn("text-xs px-2 py-0.5", getActivityEsitoColor(field.value))}>
                              {field.value}
                            </Badge>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[200px]">
                    {ACTIVITY_RESULTS.map((esito) => (
                      <SelectItem key={esito} value={esito}>
                        <div className="flex items-center gap-2">
                          <Badge className={cn("text-xs px-2 py-0.5", getActivityEsitoColor(esito))}>
                            {esito}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessageSubtle />
              </FormItem>
            )}
          />
          
          {/* Prossima Azione - solo in creazione */}
          {!isEditMode && (
            <FormField
              control={control}
              name="Prossima azione"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center justify-between">
                    Prossima Azione
                    {prossimaAzione && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={resetNextAction}
                        className="h-5 px-1.5 text-xs text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3 w-3 mr-0.5" />
                        Rimuovi
                      </Button>
                    )}
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleziona prossima azione">
                          {field.value && (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {field.value}
                              </Badge>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {NEXT_ACTIONS.map((azione) => (
                        <SelectItem key={azione} value={azione}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {azione}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessageSubtle />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Note con AI */}
        <FormField
          control={control}
          name="Note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note</FormLabel>
              <FormControl>
                <AINotesField
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="Inserisci note o dettagli sull&apos;attività..."
                  maxLength={1000}
                />
              </FormControl>
              <FormMessageSubtle />
            </FormItem>
          )}
        />

        {/* Data e Ora Prossima Azione - solo in creazione */}
        {!isEditMode && <div className="grid gap-4 md:grid-cols-2">
          {/* Data Prossima Azione */}
          <FormField
            control={control}
            name="Data prossima azione"
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Prossima Azione</FormLabel>
                <Popover open={nextDatePopoverOpen} onOpenChange={setNextDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        id="next-date-picker"
                        className="w-full justify-between font-normal"
                      >
                        {selectedNextDate ? (
                          format(selectedNextDate, 'dd/MM/yyyy', { locale: it })
                        ) : (
                          <span className="text-muted-foreground">Seleziona data</span>
                        )}
                        <ChevronDownIcon className="h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedNextDate}
                      captionLayout="dropdown"
                      onSelect={(date) => {
                        handleNextDateTimeChange(date, selectedNextTime);
                        setNextDatePopoverOpen(false);
                      }}
                      locale={it}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessageSubtle />
              </FormItem>
            )}
          />

          {/* Ora Prossima Azione */}
          <FormItem>
            <FormLabel>Ora Prossima Azione</FormLabel>
            <FormControl>
              <TimeSelect
                value={selectedNextTime || undefined}
                onChange={(time) => handleNextDateTimeChange(selectedNextDate, time)}
              />
            </FormControl>
            <FormMessageSubtle />
          </FormItem>
        </div>}

        {/* Note Prossima Azione - solo in creazione */}
        {!isEditMode && prossimaAzione && (
          <FormField
            control={control}
            name="Note prossima azione"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note Prossima Azione</FormLabel>
                <FormControl>
                  <AINotesField
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="Inserisci note o dettagli sulla prossima attività..."
                    maxLength={1000}
                  />
                </FormControl>
                <FormMessageSubtle />
              </FormItem>
            )}
          />
        )}

      </div>
    </div>
  );
}
