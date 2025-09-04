'use client';

import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { LeadFormData, LEAD_VALIDATION_RULES } from '@/types/leads';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Form,
} from '@/components/ui/form';
import { FormMessageSubtle } from '@/components/ui/form-message-subtle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { Check, ChevronDown, MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGooglePlaces } from '@/hooks/useGooglePlaces';

interface AnagraficaStepProps {
  form: UseFormReturn<LeadFormData>;
}

export function AnagraficaStep({ form }: AnagraficaStepProps) {
  const [addressQuery, setAddressQuery] = useState('');
  const [addressPopoverOpen, setAddressPopoverOpen] = useState(false);
  const [lastSelectedAddress, setLastSelectedAddress] = useState('');
  const [isSelectingFromGooglePlaces, setIsSelectingFromGooglePlaces] = useState(false);

  const { control, setValue, watch, formState: { errors } } = form;
  
  // Use the custom Google Places hook for client-side API calls
  const { 
    searchPlaces, 
    getPlaceDetails, 
    parseAddressComponents, 
    isSearching, 
    suggestions: addressSuggestions, 
    clearSuggestions 
  } = useGooglePlaces();

  // Reset degli stati locali quando il form viene resettato
  const formValues = watch();
  useEffect(() => {
    // Controlla se il form è stato resettato ai valori di default
    const isFormReset = formValues.Nome === '' && 
                       formValues.Telefono === '' && 
                       formValues.Email === '' && 
                       formValues.Indirizzo === '' &&
                       formValues.Stato === 'Nuovo' &&
                       formValues.Provenienza === 'Sito';
                       
    if (isFormReset && (addressQuery !== '' || lastSelectedAddress !== '')) {
      // Solo se abbiamo stati locali da pulire
      setAddressQuery('');
      setLastSelectedAddress('');
      setIsSelectingFromGooglePlaces(false);
      setAddressPopoverOpen(false);
      clearSuggestions();
    }
  }, [formValues, addressQuery, lastSelectedAddress, clearSuggestions]);
  
  // Effect to search when address query changes
  useEffect(() => {
    if (addressQuery.length >= 3) {
      searchPlaces(addressQuery);
    }
  }, [addressQuery, searchPlaces]);

  // Auto-open popover when suggestions become available
  useEffect(() => {
    if (addressSuggestions.length > 0 && addressQuery.length >= 3) {
      setAddressPopoverOpen(true);
    }
  }, [addressSuggestions.length, addressQuery]);
  
  // Fallback: gestione Tab con event listener se onKeyDown non funziona su CommandInput
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab' && addressPopoverOpen) {
        event.preventDefault();
        setAddressPopoverOpen(false);
        clearSuggestions();
        
        setTimeout(() => {
          const capInput = document.querySelector('input[name="CAP"]') as HTMLInputElement;
          if (capInput) {
            capInput.focus();
          }
        }, 100);
      }
    };
    
    const commandInput = document.querySelector('[cmdk-input]');
    if (commandInput && addressPopoverOpen) {
      commandInput.addEventListener('keydown', handleKeyDown);
      return () => commandInput.removeEventListener('keydown', handleKeyDown);
    }
  }, [addressPopoverOpen, clearSuggestions]);
  
  // Gestione semplice per Tab - chiudi e vai al prossimo campo
  const handleCommandInputKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      setAddressPopoverOpen(false);
      clearSuggestions();
      
      // Sposta il focus al campo CAP
      setTimeout(() => {
        const capInput = document.querySelector('input[name="CAP"]') as HTMLInputElement;
        if (capInput) {
          capInput.focus();
        }
      }, 100);
    }
  };

  const handleAddressSelect = async (suggestion: { placeId: string; description: string }) => {
    setAddressPopoverOpen(false);
    clearSuggestions();
    setIsSelectingFromGooglePlaces(true); // Imposta il flag per prevenire la pulizia
    
    try {
      // Get place details using client-side API
      const details = await getPlaceDetails(suggestion.placeId);

      // Parse address components
      const parsedAddress = parseAddressComponents(details.addressComponents);
      
      // Populate form fields
      setValue('Indirizzo', details.formattedAddress);
      setAddressQuery(details.formattedAddress);
      setLastSelectedAddress(details.formattedAddress); // Traccia l'ultimo indirizzo selezionato
      
      if (parsedAddress.zipCode) {
        setValue('CAP', parseInt(parsedAddress.zipCode));
      }
      
      if (parsedAddress.city) {
        setValue('Città', parsedAddress.city);
      }

    } catch (error) {
      console.error('Error getting place details:', error);
      // Fallback: use only the suggestion description
      setValue('Indirizzo', suggestion.description);
      setAddressQuery(suggestion.description);
      setLastSelectedAddress(suggestion.description);
    } finally {
      // Reset il flag dopo aver completato la selezione
      setTimeout(() => setIsSelectingFromGooglePlaces(false), 100);
    }
  };

  const handleAddressInputChange = (value: string) => {
    setAddressQuery(value);
    setValue('Indirizzo', value);
    
    // Non pulire i campi se stiamo selezionando da Google Places
    if (isSelectingFromGooglePlaces) {
      return;
    }
    
    // Se l'utente cancella completamente l'indirizzo o inizia a digitare qualcosa di completamente nuovo
    if (!value.trim() || (lastSelectedAddress && !lastSelectedAddress.toLowerCase().startsWith(value.toLowerCase()) && value.length > 5)) {
      // Pulisci CAP e Città solo se l'utente sta chiaramente digitando un nuovo indirizzo
      setValue('CAP', undefined);
      setValue('Città', '');
      setLastSelectedAddress('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1 pb-2">
        <h3 className="text-lg font-semibold">Informazioni Anagrafiche</h3>
        <p className="text-sm text-muted-foreground">
          Inserisci i dati di base del nuovo lead. Il nome è obbligatorio.
        </p>
      </div>
      
      <div className="border-t border-border/50 pt-4">
        <div className="grid gap-4 md:grid-cols-2 pb-2">
        {/* Nome - Campo obbligatorio */}
        <div className="md:col-span-2">
          <FormField
            control={control}
            name="Nome"
            rules={{
              required: "Nome obbligatorio",
              minLength: {
                value: LEAD_VALIDATION_RULES.Nome.minLength,
                message: "Nome troppo breve",
              },
              maxLength: {
                value: LEAD_VALIDATION_RULES.Nome.maxLength,
                message: "Nome troppo lungo",
              },
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  Nome
                  <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Mario Rossi"
                    {...field}
                    className={cn(errors.Nome && "border-red-200 dark:border-red-600")}
                  />
                </FormControl>
                <FormMessageSubtle />
              </FormItem>
            )}
          />
        </div>

        {/* Telefono */}
        <FormField
          control={control}
          name="Telefono"
          rules={{
            pattern: {
              value: LEAD_VALIDATION_RULES.Telefono.pattern,
              message: "Telefono non valido",
            },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefono</FormLabel>
              <FormControl>
                <Input
                  placeholder="+39 392 3511538"
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessageSubtle />
            </FormItem>
          )}
        />

        {/* Email */}
        <FormField
          control={control}
          name="Email"
          rules={{
            pattern: {
              value: LEAD_VALIDATION_RULES.Email.pattern,
              message: "Email non valida",
            },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="mario.rossi@example.com"
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessageSubtle />
            </FormItem>
          )}
        />

        {/* Indirizzo con autocomplete Google Places */}
        <div className="md:col-span-2">
          <FormField
            control={control}
            name="Indirizzo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Indirizzo</FormLabel>
                <FormControl>
                  <Popover open={addressPopoverOpen} onOpenChange={setAddressPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={addressPopoverOpen}
                        className="w-full justify-between h-auto p-3"
                      >
                        <div className="flex items-center gap-2 flex-1 text-left">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className={cn(
                            "truncate",
                            !field.value && "text-muted-foreground"
                          )}>
                            {field.value || "Cerca indirizzo..."}
                          </span>
                        </div>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full min-w-[400px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Digita un indirizzo..."
                          value={addressQuery}
                          onValueChange={handleAddressInputChange}
                          onKeyDown={handleCommandInputKeyDown}
                        />
                        <CommandList>
                          {isSearching && (
                            <div className="flex items-center justify-center p-4">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="ml-2 text-sm text-muted-foreground">
                                Ricerca in corso...
                              </span>
                            </div>
                          )}
                          
                          {!isSearching && addressQuery.length >= 3 && addressSuggestions.length === 0 && (
                            <CommandEmpty>Nessun indirizzo trovato.</CommandEmpty>
                          )}
                          
                          {addressSuggestions.length > 0 && (
                            <CommandGroup>
                              {addressSuggestions.map((suggestion) => (
                                <CommandItem
                                  key={suggestion.placeId}
                                  onSelect={() => handleAddressSelect(suggestion)}
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-start gap-2 w-full">
                                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm truncate">
                                        {suggestion.structuredFormatting.mainText}
                                      </div>
                                      <div className="text-xs text-muted-foreground truncate">
                                        {suggestion.structuredFormatting.secondaryText}
                                      </div>
                                    </div>
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
                <FormMessageSubtle />
              </FormItem>
            )}
          />
        </div>

        {/* CAP */}
        <FormField
          control={control}
          name="CAP"
          rules={{
            min: {
              value: LEAD_VALIDATION_RULES.CAP.min,
              message: "CAP non valido",
            },
            max: {
              value: LEAD_VALIDATION_RULES.CAP.max,
              message: "CAP non valido",
            },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>CAP</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="47924"
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value === '' ? undefined : parseInt(value));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Città */}
        <FormField
          control={control}
          name="Città"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Città</FormLabel>
              <FormControl>
                <Input
                  placeholder="Rimini"
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessageSubtle />
            </FormItem>
          )}
        />
        </div>
      </div>
    </div>
  );
}
