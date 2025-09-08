'use client';

import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { 
  ActivityFormData,
  ActivityTipo,
  ActivityObiettivo,
  ActivityPriorita,
  ACTIVITY_TIPO_ICONS,
} from '@/types/activities';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronDown, CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { format, addHours } from 'date-fns';
import { it } from 'date-fns/locale';

interface ActivityStepProps {
  form: UseFormReturn<ActivityFormData>;
  prefilledLeadId?: string;
}

// Mock data - in production these would come from API
const MOCK_LEADS = [
  { id: 'rec1', name: 'Mario Rossi' },
  { id: 'rec2', name: 'Giulia Bianchi' },
  { id: 'rec3', name: 'Luca Verdi' },
];

const MOCK_USERS = [
  { id: 'user1', name: 'Admin Utente' },
  { id: 'user2', name: 'Sales Manager' },
  { id: 'user3', name: 'Support Team' },
];

// Tipi di attività disponibili
const ACTIVITY_TYPES: ActivityTipo[] = [
  'Chiamata',
  'WhatsApp', 
  'Email',
  'SMS',
  'Consulenza',
  'Follow-up',
  'Altro',
];

// Obiettivi disponibili
const ACTIVITY_OBJECTIVES: ActivityObiettivo[] = [
  'Primo contatto',
  'Qualificazione lead',
  'Presentazione prodotto',
  'Invio preventivo',
  'Follow-up preventivo',
  'Negoziazione',
  'Chiusura ordine',
  'Fissare appuntamento',
  'Confermare appuntamento',
  'Promemoria appuntamento',
  'Consegna prodotto',
  'Assistenza tecnica',
  'Controllo soddisfazione',
  'Upsell Cross-sell',
  'Richiesta recensione',
];

// Priorità disponibili
const ACTIVITY_PRIORITIES: ActivityPriorita[] = [
  'Bassa',
  'Media',
  'Alta',
  'Urgente',
];

export function ActivityStep({ form, prefilledLeadId }: ActivityStepProps) {
  const [leadsPopoverOpen, setLeadsPopoverOpen] = useState(false);
  const [usersPopoverOpen, setUsersPopoverOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');

  const { control, setValue, watch } = form;

  // Initialize date and time when Data field changes
  useEffect(() => {
    const dataValue = watch('Data');
    if (dataValue) {
      const date = new Date(dataValue);
      setSelectedDate(date);
      setSelectedTime(format(date, 'HH:mm'));
    }
  }, [watch]);

  const handleDateTimeChange = (date: Date | undefined, time?: string) => {
    if (date) {
      const timeToUse = time || selectedTime || '09:00';
      const [hours, minutes] = timeToUse.split(':').map(Number);
      const dateTime = new Date(date);
      dateTime.setHours(hours, minutes);
      
      setSelectedDate(date);
      setSelectedTime(timeToUse);
      setValue('Data', dateTime.toISOString());
    } else {
      setSelectedDate(undefined);
      setSelectedTime('');
      setValue('Data', undefined);
    }
  };

  const getSelectedLeadName = (leadId: string) => {
    return MOCK_LEADS.find(lead => lead.id === leadId)?.name || leadId;
  };

  const getSelectedUserName = (userId: string) => {
    return MOCK_USERS.find(user => user.id === userId)?.name || userId;
  };

  return (
    <div className="space-y-6">
      {/* Riga 1: Tipo e Obiettivo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tipo Attività */}
        <FormField
          control={control}
          name="Tipo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo Attività *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ACTIVITY_TYPES.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      <div className="flex items-center gap-2">
                        <span>{ACTIVITY_TIPO_ICONS[tipo]}</span>
                        <span>{tipo}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Obiettivo */}
        <FormField
          control={control}
          name="Obiettivo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Obiettivo</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona obiettivo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-[200px]">
                  {ACTIVITY_OBJECTIVES.map((obiettivo) => (
                    <SelectItem key={obiettivo} value={obiettivo}>
                      {obiettivo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Riga 2: Data/Ora e Durata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Data e Ora */}
        <FormField
          control={control}
          name="Data"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data e Ora</FormLabel>
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
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
                        format(new Date(field.value), 'dd/MM/yyyy HH:mm', { locale: it })
                      ) : (
                        <span>Seleziona data e ora</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="border-b p-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <Input
                        type="time"
                        value={selectedTime}
                        onChange={(e) => handleDateTimeChange(selectedDate, e.target.value)}
                        className="w-auto"
                      />
                    </div>
                  </div>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => handleDateTimeChange(date, selectedTime)}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                    locale={it}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Durata Stimata */}
        <FormField
          control={control}
          name="Durata stimata"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Durata Stimata</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="es. 1:30 (ore:minuti)"
                  pattern="[0-9]+:[0-5][0-9]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Riga 3: Lead e Priorità */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Lead */}
        <FormField
          control={control}
          name="ID Lead"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lead</FormLabel>
              <Popover open={leadsPopoverOpen} onOpenChange={setLeadsPopoverOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        'w-full justify-between',
                        !field.value?.length && 'text-muted-foreground'
                      )}
                    >
                      {field.value?.length ? (
                        <span>{getSelectedLeadName(field.value[0])}</span>
                      ) : (
                        'Seleziona lead'
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Cerca lead..." />
                    <CommandEmpty>Nessun lead trovato.</CommandEmpty>
                    <CommandGroup>
                      <CommandList>
                        {MOCK_LEADS.map((lead) => (
                          <CommandItem
                            key={lead.id}
                            value={lead.name}
                            onSelect={() => {
                              setValue('ID Lead', [lead.id]);
                              setLeadsPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                field.value?.includes(lead.id) ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {lead.name}
                          </CommandItem>
                        ))}
                      </CommandList>
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Priorità */}
        <FormField
          control={control}
          name="Priorità"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priorità</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona priorità" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {ACTIVITY_PRIORITIES.map((priorita) => (
                    <SelectItem key={priorita} value={priorita}>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'h-2 w-2 rounded-full',
                            priorita === 'Urgente' && 'bg-red-500',
                            priorita === 'Alta' && 'bg-orange-500',
                            priorita === 'Media' && 'bg-yellow-500',
                            priorita === 'Bassa' && 'bg-green-500'
                          )}
                        />
                        {priorita}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Riga 4: Assegnatario */}
      <div className="grid grid-cols-1">
        <FormField
          control={control}
          name="Assegnatario"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assegnatario</FormLabel>
              <Popover open={usersPopoverOpen} onOpenChange={setUsersPopoverOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        'w-full justify-between',
                        !field.value?.length && 'text-muted-foreground'
                      )}
                    >
                      {field.value?.length ? (
                        <span>{getSelectedUserName(field.value[0])}</span>
                      ) : (
                        'Seleziona assegnatario'
                      )}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Cerca utente..." />
                    <CommandEmpty>Nessun utente trovato.</CommandEmpty>
                    <CommandGroup>
                      <CommandList>
                        {MOCK_USERS.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={user.name}
                            onSelect={() => {
                              setValue('Assegnatario', [user.id]);
                              setUsersPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                field.value?.includes(user.id) ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {user.name}
                          </CommandItem>
                        ))}
                      </CommandList>
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Riga 5: Note */}
      <div className="grid grid-cols-1">
        <FormField
          control={control}
          name="Note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Inserisci note o dettagli sull'attività..."
                  className="min-h-[100px]"
                  maxLength={1000}
                />
              </FormControl>
              <div className="flex justify-between">
                <FormMessage />
                <span className="text-xs text-muted-foreground">
                  {field.value?.length || 0}/1000
                </span>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
