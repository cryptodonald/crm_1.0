'use client';

import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { LeadFormDataInferred, LEAD_VALIDATION_RULES } from '@/types/leads-form';
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AvatarLead } from '@/components/ui/avatar-lead';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Check, ChevronDown, MapPin, Loader2, AlertTriangle, Link2, Phone, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGooglePlaces } from '@/hooks/useGooglePlaces';

interface AnagraficaStepProps {
  form: UseFormReturn<LeadFormDataInferred>;
  currentLeadId?: string; // ID del lead in modifica (per escluderlo dai duplicati)
}

export function AnagraficaStep({ form, currentLeadId }: AnagraficaStepProps) {
  const [addressQuery, setAddressQuery] = useState('');
  const [addressPopoverOpen, setAddressPopoverOpen] = useState(false);
  const [lastSelectedAddress, setLastSelectedAddress] = useState('');
  const [isSelectingFromGooglePlaces, setIsSelectingFromGooglePlaces] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [possibleDuplicates, setPossibleDuplicates] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [searchingDuplicates, setSearchingDuplicates] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [dismissedDuplicateIds, setDismissedDuplicateIds] = useState<string[]>([]);

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

  const nomeValue = watch('Nome');
  const telefonoValue = watch('Telefono');

  // Cerca duplicati quando nome o telefono cambiano
  useEffect(() => {
    const searchDuplicates = async () => {
      // Richiedi almeno 10 caratteri nel nome prima di cercare
      // Questo dà tempo all'utente di scrivere il nome completo (es. "Mario Rossi")
      const hasEnoughName = nomeValue?.trim() && nomeValue.trim().length >= 10;
      const hasPhone = telefonoValue?.trim();
      
      // Se non abbiamo né nome completo né telefono, non cercare
      if (!hasEnoughName && !hasPhone) {
        setPossibleDuplicates([]);
        return;
      }

      setSearchingDuplicates(true);
      try {
        // Use dedicated check-duplicates endpoint (no routing conflict)
        // Higher threshold (0.95) for stricter matching: only show clear duplicates
        const params = new URLSearchParams({ threshold: '0.95' });
        if (hasEnoughName) params.set('name', nomeValue);
        if (hasPhone && telefonoValue) params.set('phone', normalizePhone(telefonoValue)); // Normalizza il telefono prima di inviare
        
        const response = await fetch(`/api/leads/check-duplicates?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          
          // New API returns matches directly when name/phone are provided
          if (data.matches) {
            const duplicates = data.matches
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .filter((match: any) => match.id !== currentLeadId) // Escludi il lead corrente
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((match: any) => ({
                id: match.id,
                nome: match.name,
                telefono: match.phone,
                email: match.email,
                city: match.city,
                matchType: match.matchTypes.join(', ')
              }));
            
            // Filtra i duplicati già dismissati
            const newDuplicates = duplicates.filter(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (dup: any) => !dismissedDuplicateIds.includes(dup.id)
            );
            
            setPossibleDuplicates(newDuplicates);
            // Show dialog solo se ci sono NUOVI duplicati non ancora dismissati
            if (newDuplicates.length > 0) {
              setShowDuplicateDialog(true);
            } else {
              setShowDuplicateDialog(false);
            }
          } else {
            setPossibleDuplicates([]);
            setShowDuplicateDialog(false);
          }
        }
      } catch (error) {
        console.error('Error fetching duplicates:', error);
        setPossibleDuplicates([]);
        setShowDuplicateDialog(false);
      } finally {
        setSearchingDuplicates(false);
      }
    };

    // Debounce di 1500ms per dare tempo di completare il nome (es. "Mario Rossi")
    const timeoutId = setTimeout(searchDuplicates, 1500);
    return () => clearTimeout(timeoutId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomeValue, telefonoValue, dismissedDuplicateIds]);

  // Reset degli stati locali quando il form viene resettato
  const formValues = watch();
  useEffect(() => {
    // Controlla se il form è stato resettato ai valori di default
    const isFormReset = formValues.Nome === '' && 
                       formValues.Telefono === '' && 
                       formValues.Email === '' && 
                       formValues.Indirizzo === '' &&
                       formValues.Stato === 'Nuovo' &&
                       formValues.Fonte === 'Sito';
                       
    if (isFormReset && (addressQuery !== '' || lastSelectedAddress !== '')) {
      // Solo se abbiamo stati locali da pulire
      setAddressQuery('');
      setLastSelectedAddress('');
      setIsSelectingFromGooglePlaces(false);
      setAddressPopoverOpen(false);
      clearSuggestions();
      setPossibleDuplicates([]);
      setDismissedDuplicateIds([]); // Reset anche i duplicati dismissati
    }
  }, [formValues, addressQuery, lastSelectedAddress, clearSuggestions]);
  
  // Effect to search when address query changes
  // Ma NON cercare se stiamo selezionando da Google Places
  useEffect(() => {
    if (addressQuery.length >= 3 && !isSelectingFromGooglePlaces) {
      searchPlaces(addressQuery);
    }
  }, [addressQuery, searchPlaces, isSelectingFromGooglePlaces]);

  // Auto-open popover when suggestions become available
  // Ma NON riaprire se stiamo selezionando da Google Places
  useEffect(() => {
    if (addressSuggestions.length > 0 && addressQuery.length >= 3 && !isSelectingFromGooglePlaces) {
      setAddressPopoverOpen(true);
    }
  }, [addressSuggestions.length, addressQuery, isSelectingFromGooglePlaces]);
  
  // Fallback: gestione Tab con event listener se onKeyDown non funziona su CommandInput
  useEffect(() => {
    const handleKeyDown = (event: Event) => {
      const kbEvent = event as KeyboardEvent;
      if (kbEvent.key === 'Tab' && addressPopoverOpen) {
        kbEvent.preventDefault();
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
    // Chiudi immediatamente il popover e pulisci suggestions
    setAddressPopoverOpen(false);
    clearSuggestions();
    setIsSelectingFromGooglePlaces(true); // Imposta il flag per prevenire la pulizia
    
    try {
      // Get place details using client-side API
      const details = await getPlaceDetails(suggestion.placeId);

      // Parse address components
      const parsedAddress = parseAddressComponents(details.addressComponents);
      
      // Extract only street name and number for the address field
      let streetAddress = '';
      if (parsedAddress.route && parsedAddress.streetNumber) {
        // Combine route (street name) and street number
        streetAddress = `${parsedAddress.route}, ${parsedAddress.streetNumber}`;
      } else if (parsedAddress.route) {
        // Only street name available
        streetAddress = parsedAddress.route;
      } else {
        // Fallback: use only the first part of the formatted address (usually the street)
        streetAddress = details.formattedAddress.split(',')[0]?.trim() || details.formattedAddress;
      }
      
      // Populate form fields with street address only (not full formatted address)
      setValue('Indirizzo', streetAddress);
      setAddressQuery(streetAddress);
      setLastSelectedAddress(streetAddress); // Traccia l'ultimo indirizzo selezionato
      
      if (parsedAddress.zipCode) {
        setValue('CAP', parseInt(parsedAddress.zipCode));
      }
      
      if (parsedAddress.city) {
        setValue('Città', parsedAddress.city);
      }

    } catch (error) {
      console.error('Error getting place details:', error);
      // Fallback: use only the first part of the suggestion (usually the street)
      const fallbackAddress = suggestion.description.split(',')[0]?.trim() || suggestion.description;
      setValue('Indirizzo', fallbackAddress);
      setAddressQuery(fallbackAddress);
      setLastSelectedAddress(fallbackAddress);
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

  function normalizePhone(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-digit characters
    let normalized = phone.replace(/\D/g, '');
    
    // Add Italian prefix if missing
    if (!normalized.startsWith('39') && normalized.length >= 9 && normalized.length <= 10) {
      normalized = '39' + normalized;
    }
    
    // Formatta come nel DB: +39XXXXXXXXXX
    if (normalized.startsWith('39') && normalized.length >= 11) {
      return '+' + normalized;
    }
    
    return normalized;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    if (longer.length === 0) return 1;
    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  function getEditDistance(s1: string, s2: string): number {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

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
                  placeholder="+39 333 1122333"
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

        {/* AlertDialog Duplicati - Compatto */}
        <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
          <AlertDialogContent size="sm" className="p-4 gap-3">
            <AlertDialogHeader className="!grid-rows-none !place-items-start space-y-1 pb-0 text-left">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted mt-0.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1">
                  <AlertDialogTitle className="text-base font-semibold">Possibili duplicati</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm mt-1">
                    {possibleDuplicates.length === 1 ? 'Esiste già un lead simile' : `Esistono già ${possibleDuplicates.length} lead simili`}
                  </AlertDialogDescription>
                </div>
              </div>
            </AlertDialogHeader>
            
            <div className="space-y-3 px-1 py-1">
              {possibleDuplicates.map((dup) => (
                <div key={dup.id} className="flex items-center gap-2.5">
                  <AvatarLead nome={dup.nome} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{dup.nome}</div>
                    {dup.telefono && (
                      <div className="text-muted-foreground text-xs truncate">{dup.telefono}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <AlertDialogFooter className="bg-muted/50 -mx-4 -mb-4 px-4 py-3 border-t mt-2 !flex !flex-row !justify-end gap-2">
              <AlertDialogCancel size="sm">Annulla</AlertDialogCancel>
              <AlertDialogAction 
                size="sm" 
                onClick={() => {
                  // Segna questi duplicati come dismissati per non mostrarli più
                  const currentDuplicateIds = possibleDuplicates.map(d => d.id);
                  setDismissedDuplicateIds(prev => [...prev, ...currentDuplicateIds]);
                  setShowDuplicateDialog(false);
                }}
              >
                Procedi
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
