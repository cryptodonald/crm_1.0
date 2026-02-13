'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ActivityFormData, ActivityStato, getActivityStatoColor, SYNC_TO_GOOGLE_DEFAULT_TYPES } from '@/types/activities';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { FormMessageSubtle } from '@/components/ui/form-message-subtle';
import { TimeSelect } from '@/components/ui/time-select';
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
import { Switch } from '@/components/ui/switch';
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
  'Da fare',
  'In corso',
  'Completata',
  'Annullata',
];

export function ProgrammazioneStep({ form }: ProgrammazioneStepProps) {
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [usersPopoverOpen, setUsersPopoverOpen] = useState(false);
  const isInitializedRef = useRef(false);

  const { control, setValue, watch } = form;
  const { users, loading: usersLoading } = useUsers();
  const userToggledSyncRef = useRef(false);

  // Watch per valori selezionati
  const selectedAssegnatario = watch('Assegnatario');
  const selectedTipo = watch('Tipo');

  // Smart default: auto-set sync toggle based on activity type (unless user manually toggled)
  useEffect(() => {
    if (!userToggledSyncRef.current && selectedTipo) {
      setValue('Sincronizza Google', SYNC_TO_GOOGLE_DEFAULT_TYPES.has(selectedTipo));
    }
  }, [selectedTipo, setValue]);

  // Convert users object to array
  const usersArray = users ? Object.values(users) : [];

  // Derive date/time from form value (no useState needed)
  const dataValue = watch('Data');

  const selectedDate = useMemo(() => {
    if (dataValue) return new Date(dataValue);
    return undefined;
  }, [dataValue]);

  const selectedTime = useMemo(() => {
    if (dataValue) return format(new Date(dataValue), 'HH:mm') || '09:00';
    return '';
  }, [dataValue]);

  // Auto-popolamento data e ora corrente alla prima apertura
  useEffect(() => {
    if (!dataValue && !isInitializedRef.current) {
      isInitializedRef.current = true;
      setValue('Data', new Date().toISOString());
    }
  }, [dataValue, setValue]);

  const handleDateTimeChange = (date: Date | undefined, time?: string) => {
    if (date) {
      const timeToUse = time || selectedTime || '09:00';
      const [hours, minutes] = timeToUse.split(':').map(Number);
      const dateTime = new Date(date);
      dateTime.setHours(hours, minutes);
      setValue('Data', dateTime.toISOString());
    } else {
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
          Programma quando eseguire l&apos;attività e chi deve occuparsene.
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
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
                <TimeSelect
                  value={selectedTime || undefined}
                  onChange={(time) => handleDateTimeChange(selectedDate, time)}
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
                  <TimeSelect
                    value={field.value || undefined}
                    onChange={field.onChange}
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
                            <Badge className={cn("text-xs px-2 py-0.5", getActivityStatoColor(field.value))}>
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
                          <Badge className={cn("text-xs px-2 py-0.5", getActivityStatoColor(stato))}>
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

        {/* Sincronizzazione Google Calendar */}
        <FormField
          control={control}
          name="Sincronizza Google"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel className="text-sm font-medium">Sincronizza con Google Calendar</FormLabel>
                <p className="text-xs text-muted-foreground">
                  Crea un evento nel calendario Google collegato.
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value ?? false}
                  onCheckedChange={(checked) => {
                    userToggledSyncRef.current = true;
                    field.onChange(checked);
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Assegnatario - Sezione separata */}
        <div className="w-full">
          {/* Assegnatario - Select singolo come in NewLead */}
          <FormField
            control={control}
            name="Assegnatario"
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
                            <span>{selectedAssegnatarioUser.name}</span>
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
                                        nome={user.name}
                                        customAvatar={user.avatarUrl}
                                        size="md"
                                      />
                                    </div>
                                    
                                    {/* User Info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm truncate">{user.name}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {user.role}
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-muted-foreground truncate">
                                        {user.phone || user.email || 'Nessun contatto'}
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
                        nome={selectedAssegnatarioUser.name}
                        customAvatar={selectedAssegnatarioUser.avatarUrl}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium truncate">{selectedAssegnatarioUser.name}</span>
                          <Badge variant="outline" className="text-xs">{selectedAssegnatarioUser.role}</Badge>
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
