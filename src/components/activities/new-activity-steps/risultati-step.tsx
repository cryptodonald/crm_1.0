'use client';

import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ActivityFormData, ActivityEsito, ActivityProssimaAzione, ACTIVITY_ESITO_COLORS } from '@/types/activities';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FormMessageSubtle } from '@/components/ui/form-message-subtle';
import { Input } from '@/components/ui/input';
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
import { ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface RisultatiStepProps {
  form: UseFormReturn<ActivityFormData>;
}

// Esiti disponibili
const ACTIVITY_RESULTS: ActivityEsito[] = [
  'Contatto riuscito',
  'Nessuna risposta',
  'Numero errato',
  'Non disponibile',
  'Non presentato',
  'Molto interessato',
  'Interessato',
  'Poco interessato',
  'Non interessato',
  'Informazioni raccolte',
  'Preventivo richiesto',
  'Preventivo inviato',
  'Appuntamento fissato',
  'Ordine confermato',
  'Opportunità persa',
  'Servizio completato',
  'Problema risolto',
  'Cliente soddisfatto',
  'Recensione ottenuta',
];

// Prossime azioni disponibili
const NEXT_ACTIONS: ActivityProssimaAzione[] = [
  'Chiamata',
  'WhatsApp',
  'Email',
  'SMS',
  'Consulenza',
  'Follow-up',
  'Nessuna',
];

export function RisultatiStep({ form }: RisultatiStepProps) {
  const [nextDatePopoverOpen, setNextDatePopoverOpen] = useState(false);
  const [selectedNextDate, setSelectedNextDate] = useState<Date>();
  const [selectedNextTime, setSelectedNextTime] = useState('');

  const { control, setValue, watch } = form;

  // Initialize next date and time when 'Data prossima azione' field changes
  useEffect(() => {
    const nextDataValue = watch('Data prossima azione');
    if (nextDataValue) {
      const date = new Date(nextDataValue);
      setSelectedNextDate(date);
      setSelectedNextTime(format(date, 'HH:mm'));
    }
  }, [watch]);

  const handleNextDateTimeChange = (date: Date | undefined, time?: string) => {
    if (date) {
      const timeToUse = time || selectedNextTime || '09:00';
      const [hours, minutes] = timeToUse.split(':').map(Number);
      const dateTime = new Date(date);
      dateTime.setHours(hours, minutes);
      
      setSelectedNextDate(date);
      setSelectedNextTime(timeToUse);
      setValue('Data prossima azione', dateTime.toISOString());
    } else {
      setSelectedNextDate(undefined);
      setSelectedNextTime('');
      setValue('Data prossima azione', undefined);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1 pb-2">
        <h3 className="text-lg font-semibold">Risultati</h3>
        <p className="text-sm text-muted-foreground">
          Documenta l'esito dell'attività e pianifica le prossime azioni.
        </p>
      </div>
      
      <div className="border-t border-border/50 pt-4 space-y-6">
        
        {/* Esito e Prossima Azione */}
        <div className="grid gap-4 md:grid-cols-2">
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
                            <Badge className={cn("text-xs px-2 py-0.5", ACTIVITY_ESITO_COLORS[field.value as ActivityEsito])}>
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
                          <Badge className={cn("text-xs px-2 py-0.5", ACTIVITY_ESITO_COLORS[esito])}>
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
          
          {/* Prossima Azione */}
          <FormField
            control={control}
            name="Prossima azione"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prossima Azione</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
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
        </div>

        {/* Data e Ora Prossima Azione */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Data Prossima Azione */}
          <FormField
            control={control}
            name="Data prossima azione"
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
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
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
              <Input
                type="time"
                id="next-time-picker"
                value={selectedNextTime}
                onChange={(e) => handleNextDateTimeChange(selectedNextDate, e.target.value)}
                className="w-full"
                placeholder="09:00"
              />
            </FormControl>
            <FormMessageSubtle />
          </FormItem>
        </div>

      </div>
    </div>
  );
}
