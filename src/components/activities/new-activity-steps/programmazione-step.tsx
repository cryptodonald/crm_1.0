'use client';

import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ActivityFormData, ActivityStato, ACTIVITY_STATO_COLORS } from '@/types/activities';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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
import { Check, ChevronDown, ChevronDownIcon, User, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { useUsers } from '@/hooks/use-users';

interface ProgrammazioneStepProps {
  form: UseFormReturn<ActivityFormData>;
}

// Stati disponibili
const ACTIVITY_STATES: ActivityStato[] = [
  'Da Pianificare',
  'Pianificata',
  'In corso',
  'In attesa',
  'Completata',
  'Annullata',
  'Rimandata',
];

export function ProgrammazioneStep({ form }: ProgrammazioneStepProps) {
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [usersPopoverOpen, setUsersPopoverOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  const { control, setValue, watch } = form;
  const { users, loading: usersLoading } = useUsers();

  // Watch per valori selezionati
  const selectedAssegnatario = watch('Assegnatario');

  // Convert users object to array
  const usersArray = users ? Object.values(users) : [];

  // Initialize date and time when Data field changes
  useEffect(() => {
    const dataValue = watch('Data');
    if (dataValue) {
      const date = new Date(dataValue);
      setSelectedDate(date);
      // Assicuriamo che format restituisca sempre una stringa valida
      const timeString = format(date, 'HH:mm');
      setSelectedTime(timeString || '09:00');
    }
  }, [watch]);
  
  // Auto-popolamento data e ora corrente quando il form viene aperto per la prima volta
  useEffect(() => {
    const dataValue = watch('Data');
    // Se non c'è già una data impostata e non abbiamo ancora inizializzato
    if (!dataValue && !isInitialized) {
      const now = new Date();
      const currentTime = format(now, 'HH:mm');
      
      setSelectedDate(now);
      setSelectedTime(currentTime);
      setValue('Data', now.toISOString());
      setIsInitialized(true);
    }
  }, [watch, setValue, isInitialized]);

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
      setSelectedTime(''); // Assicuriamo sempre stringa vuota, mai undefined
      setValue('Data', undefined);
    }
  };


  const handleAssegnatarioSelect = (userId: string) => {
    setValue('Assegnatario', [userId]);
    setUsersPopoverOpen(false);
  };

  const removeAssegnatario = () => {
    setValue('Assegnatario', undefined);
  };

  const selectedAssegnatarioUser = selectedAssegnatario?.[0] 
    ? usersArray.find(user => user.id === selectedAssegnatario[0]) 
    : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1 pb-2">
        <h3 className="text-lg font-semibold">Programmazione</h3>
        <p className="text-sm text-muted-foreground">
          Programma quando eseguire l'attività e chi deve occuparsene.
        </p>
      </div>
      
      <div className="border-t border-border/50 pt-4 space-y-6">

        {/* Data e Ora - Separati con nuovo design */}
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Data */}
            <FormField
              control={control}
              name="Data"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          id="date-picker"
                          className="w-full justify-between font-normal"
                        >
                          {selectedDate ? (
                            format(selectedDate, 'dd/MM/yyyy', { locale: it })
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
                        selected={selectedDate}
                        captionLayout="dropdown"
                        onSelect={(date) => {
                          handleDateTimeChange(date, selectedTime);
                          setDatePopoverOpen(false);
                        }}
                        locale={it}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessageSubtle />
                </FormItem>
              )}
            />

            {/* Ora */}
            <FormItem>
              <FormLabel>Ora</FormLabel>
              <FormControl>
                <Input
                  type="time"
                  id="time-picker"
                  value={selectedTime || ''}
                  onChange={(e) => handleDateTimeChange(selectedDate, e.target.value)}
                  className="w-full"
                  placeholder="10:30"
                />
              </FormControl>
              <FormMessageSubtle />
            </FormItem>
          </div>
        </div>

        {/* Durata e Stato */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Durata Stimata */}
          <FormField
            control={control}
            name="Durata stimata"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Durata Stimata</FormLabel>
                <FormControl>
                  <Input
                    type="time"
                    {...field}
                    className="w-full"
                    placeholder="01:30"
                  />
                </FormControl>
                <FormMessageSubtle />
              </FormItem>
            )}
          />

          {/* Stato */}
          <FormField
            control={control}
            name="Stato"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stato</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleziona stato">
                        {field.value && (
                          <div className="flex items-center gap-2">
                            <Badge className={cn("text-xs px-2 py-0.5", ACTIVITY_STATO_COLORS[field.value as ActivityStato])}>
                              {field.value}
                            </Badge>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ACTIVITY_STATES.map((stato) => (
                      <SelectItem key={stato} value={stato}>
                        <div className="flex items-center gap-2">
                          <Badge className={cn("text-xs px-2 py-0.5", ACTIVITY_STATO_COLORS[stato])}>
                            {stato}
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

        {/* Assegnatario - Sezione separata */}
        <div className="w-full">
          {/* Assegnatario - Select singolo come in NewLead */}
          <FormField
            control={control}
            name="Assegnatario"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Assegnatario</FormLabel>
                <FormControl>
                  <Popover open={usersPopoverOpen} onOpenChange={setUsersPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {selectedAssegnatarioUser ? (
                            <span>{selectedAssegnatarioUser.nome}</span>
                          ) : (
                            <span className="text-muted-foreground">Seleziona assegnatario</span>
                          )}
                        </div>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Cerca utente..." />
                        <CommandList>
                          <CommandEmpty>
                            {usersLoading ? "Caricamento utenti..." : "Nessun utente trovato."}
                          </CommandEmpty>
                          {!usersLoading && (
                            <CommandGroup>
                              {usersArray.map((user) => (
                                <CommandItem
                                  key={user.id}
                                  onSelect={() => handleAssegnatarioSelect(user.id)}
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-center gap-3 w-full">
                                    {/* Avatar usando sistema AvatarLead */}
                                    <div className="flex-shrink-0">
                                      <AvatarLead
                                        nome={user.nome}
                                        customAvatar={user.avatar}
                                        isAdmin={user.ruolo === 'Admin'}
                                        size="md"
                                        showTooltip={false}
                                      />
                                    </div>
                                    
                                    {/* User Info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm truncate">{user.nome}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {user.ruolo}
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-muted-foreground truncate">
                                        {user.telefono || user.email || 'Nessun contatto'}
                                      </div>
                                    </div>
                                    
                                    <Check
                                      className={cn(
                                        "h-4 w-4 flex-shrink-0",
                                        selectedAssegnatario?.[0] === user.id 
                                          ? "opacity-100" 
                                          : "opacity-0"
                                      )}
                                    />
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </FormControl>
                {/* Sezione utente selezionato con altezza fissa per evitare disallineamenti */}
                <div className="mt-2 min-h-[40px]">
                  {selectedAssegnatarioUser && (
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                      <AvatarLead
                        nome={selectedAssegnatarioUser.nome}
                        customAvatar={selectedAssegnatarioUser.avatar}
                        isAdmin={selectedAssegnatarioUser.ruolo === 'Admin'}
                        size="sm"
                        showTooltip={false}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium truncate">{selectedAssegnatarioUser.nome}</span>
                          <Badge variant="outline" className="text-xs">{selectedAssegnatarioUser.ruolo}</Badge>
                        </div>
                      </div>
                      <X
                        className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-destructive"
                        onClick={removeAssegnatario}
                      />
                    </div>
                  )}
                </div>
                <FormMessageSubtle />
              </FormItem>
            )}
          />
        </div>

      </div>
    </div>
  );
}
