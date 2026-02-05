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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, ChevronDown, MapPin, Loader2, AlertTriangle, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGooglePlaces } from '@/hooks/useGooglePlaces';

interface AnagraficaStepProps {
  form: UseFormReturn<LeadFormDataInferred>;
}

export function AnagraficaStep({ form }: AnagraficaStepProps) {
  const [addressQuery, setAddressQuery] = useState('');
  const [addressPopoverOpen, setAddressPopoverOpen] = useState(false);
  const [lastSelectedAddress, setLastSelectedAddress] = useState('');
  const [isSelectingFromGooglePlaces, setIsSelectingFromGooglePlaces] = useState(false);
  const [possibleDuplicates, setPossibleDuplicates] = useState<any[]>([]);
  const [searchingDuplicates, setSearchingDuplicates] = useState(false);

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
      // Se non abbiamo né nome né telefono, non cercare
      if (!nomeValue?.trim() && !telefonoValue?.trim()) {
        setPossibleDuplicates([]);
        return;
      }

      setSearchingDuplicates(true);
      try {
        const response = await fetch('/api/leads/duplicates?threshold=0.85');
        if (response.ok) {
          const data = await response.json();
          const allDuplicates = data.groups || [];
          
          // Filtra per trovare duplicati del lead che stai creando
          const myDuplicates: any[] = [];
          for (const group of allDuplicates) {
            const masterLead = data.leadsMap?.[group.masterId];
            const dupLeads = group.duplicateIds
              .map((id: string) => data.leadsMap?.[id])
              .filter((l: any) => l);

            // Controlla se uno dei lead nel gruppo corrisponde ai dati che stai inserendo
            for (const lead of [masterLead, ...dupLeads]) {
              if (!lead) continue;
              
              let matches = 0;
              let matchType = '';

              // Controllo nome
              if (nomeValue && lead.Nome) {
                const similarity = calculateSimilarity(nomeValue.toLowerCase(), lead.Nome.toLowerCase());
                if (similarity > 0.85) {
                  matches++;
                  matchType += 'Nome ';
                }
              }

              // Controllo telefono
              if (telefonoValue && lead.Telefono) {
                const normalizedNew = normalizePhone(telefonoValue);
                const normalizedExisting = normalizePhone(lead.Telefono);
                if (normalizedNew && normalizedExisting && normalizedNew === normalizedExisting) {
                  matches++;
                  matchType += 'Tel ';
                }
              }

              // Se almeno un campo corrisponde, è un potenziale duplicato
              if (matches > 0 && myDuplicates.find(d => d.id === lead.id) === undefined) {
                myDuplicates.push({
                  id: lead.id,
                  nome: lead.Nome,
                  telefono: lead.Telefono,
                  email: lead.Email,
                  city: lead.Città,
                  matchType: matchType.trim()
                });
              }
            }
          }

          setPossibleDuplicates(myDuplicates);
        }
      } catch (error) {
        console.error('Error fetching duplicates:', error);
        setPossibleDuplicates([]);
      } finally {
        setSearchingDuplicates(false);
      }
    };

    // Debounce di 500ms per non fare troppi request
    const timeoutId = setTimeout(searchDuplicates, 500);
    return () => clearTimeout(timeoutId);
  }, [nomeValue, telefonoValue]);

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
    return phone.replace(/\D/g, '').slice(-10);
  }

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

        {/* Alert Duplicati Potenziali */}
        {possibleDuplicates.length > 0 && (
          <div className="md:col-span-2">
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
              <Link2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-900 dark:text-amber-100">
                <div className="font-semibold mb-2">⚠️ Possibili duplicati trovati:</div>
                <div className="space-y-2">
                  {possibleDuplicates.map((dup, idx) => (
                    <div key={dup.id} className="text-sm p-2 bg-white dark:bg-black/20 rounded border border-amber-200 dark:border-amber-800">
                      <div className="font-medium">{dup.nome}</div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {dup.telefono && <div>📞 {dup.telefono}</div>}
                        {dup.email && <div>📧 {dup.email}</div>}
                        {dup.city && <div>📍 {dup.city}</div>}
                        <div className="mt-1">
                          <span className="inline-block px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded text-xs">
                            Match: {dup.matchType}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs mt-2 text-amber-700 dark:text-amber-200">
                  💡 Verifica se è lo stesso cliente prima di crearne un nuovo!
                </div>
              </AlertDescription>
            </Alert>
          </div>
        )}

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
