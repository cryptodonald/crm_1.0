'use client';

import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { format } from "date-fns";
import { it } from "date-fns/locale";
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
import { Calendar } from '@/components/ui/calendar';
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
import { CalendarIcon, ChevronDown, Search, User, UserPlus, MapPin, Loader2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrderFormData } from '../new-order-modal';
import { NewLeadModal } from '@/components/leads/new-lead-modal';
import { useLeadsData } from '@/hooks/use-leads-data';
import { useGooglePlaces } from '@/hooks/useGooglePlaces';
import { LeadData, LEAD_STATO_COLORS } from '@/types/leads';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { Badge } from '@/components/ui/badge';

interface CustomerStepProps {
  form: UseFormReturn<OrderFormData>;
}

export function CustomerStep({ form }: CustomerStepProps) {
  // ===== STATO CLIENTI (MULTIPLI) =====
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  
  // ===== STATO DATA =====
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  
  // ===== STATO INDIRIZZO (Google Places) =====
  const [addressQuery, setAddressQuery] = useState('');
  const [addressPopoverOpen, setAddressPopoverOpen] = useState(false);
  const [lastSelectedAddress, setLastSelectedAddress] = useState('');
  const [isSelectingFromGooglePlaces, setIsSelectingFromGooglePlaces] = useState(false);

  // ===== HOOKS SERVIZI =====
  
  // Hook per caricare i leads reali (sempre tutti, filtro client-side)
  const { leads, loading: leadsLoading } = useLeadsData({
    filters: {}, // Nessun filtro server-side, carichiamo sempre tutti
    loadAll: true
  });
  
  // Hook per Google Places API
  const { 
    searchPlaces, 
    getPlaceDetails, 
    parseAddressComponents, 
    isSearching, 
    suggestions: addressSuggestions, 
    clearSuggestions 
  } = useGooglePlaces();

  // ===== LOGICA CLIENTI =====
  
  // Filtra solo i lead con stato 'Cliente' e poi applica filtro di ricerca
  const clientsOnly = leads.filter(lead => lead.Stato === 'Cliente');
  
  const filteredCustomers = customerSearchQuery.length > 0 
    ? clientsOnly.filter(lead =>
        lead.Nome?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        lead.Email?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        lead.Telefono?.toLowerCase().includes(customerSearchQuery.toLowerCase())
      ).slice(0, 15) // Limita a 15 risultati quando si cerca
    : clientsOnly.slice(0, 20); // Mostra primi 20 clienti quando lista è vuota

  const selectedCustomerIds = form.watch('customer_ids') || [];
  const selectedCustomers = selectedCustomerIds
    .map(id => leads.find(c => c.id === id))
    .filter(Boolean) as LeadData[];

  const handleCustomerToggle = (customer: LeadData) => {
    const currentCustomers = selectedCustomerIds || [];
    const isSelected = currentCustomers.includes(customer.id);
    
    if (isSelected) {
      form.setValue('customer_ids', currentCustomers.filter(id => id !== customer.id));
    } else {
      form.setValue('customer_ids', [...currentCustomers, customer.id]);
    }
  };

  const removeCustomer = (customerId: string) => {
    const currentCustomers = selectedCustomerIds || [];
    form.setValue('customer_ids', currentCustomers.filter(id => id !== customerId));
  };

  const handleNewCustomer = () => {
    setShowNewLeadModal(true);
    setShowCustomerSelector(false);
  };
  
  const handleNewLeadCreated = (lead: any) => {
    // Quando viene creato un nuovo lead, aggiungilo ai clienti selezionati
    if (lead) {
      const currentCustomers = selectedCustomerIds || [];
      if (!currentCustomers.includes(lead.id)) {
        form.setValue('customer_ids', [...currentCustomers, lead.id]);
      }
    }
  };
  
  // ===== LOGICA GOOGLE PLACES =====
  
  useEffect(() => {
    if (addressQuery.length > 0) {
      searchPlaces(addressQuery);
    }
  }, [addressQuery, searchPlaces]);

  useEffect(() => {
    if (addressSuggestions.length > 0 && addressQuery.length > 0) {
      setAddressPopoverOpen(true);
    }
  }, [addressSuggestions.length, addressQuery]);
  
  const handleAddressSelect = async (suggestion: { placeId: string; description: string }) => {
    setAddressPopoverOpen(false);
    clearSuggestions();
    setIsSelectingFromGooglePlaces(true);
    
    try {
      const details = await getPlaceDetails(suggestion.placeId);
      const parsedAddress = parseAddressComponents(details.addressComponents);
      
      // Usa l'indirizzo completo formattato da Google invece di solo la strada
      const fullAddress = details.formattedAddress || suggestion.description;
      
      form.setValue('delivery_address', fullAddress);
      setAddressQuery(fullAddress);
      setLastSelectedAddress(fullAddress);
      
    } catch (error) {
      console.error('Error getting place details:', error);
      // Fallback: usa la descrizione completa del suggestion
      const fallbackAddress = suggestion.description;
      form.setValue('delivery_address', fallbackAddress);
      setAddressQuery(fallbackAddress);
      setLastSelectedAddress(fallbackAddress);
    } finally {
      setTimeout(() => setIsSelectingFromGooglePlaces(false), 100);
    }
  };

  const handleAddressInputChange = (value: string) => {
    setAddressQuery(value);
    form.setValue('delivery_address', value);
    
    if (isSelectingFromGooglePlaces) {
      return;
    }
    
    if (!value.trim() || (lastSelectedAddress && !lastSelectedAddress.toLowerCase().startsWith(value.toLowerCase()) && value.length > 5)) {
      setLastSelectedAddress('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1 pb-2">
        <h3 className="text-lg font-semibold">Selezione Cliente</h3>
        <p className="text-sm text-muted-foreground">
          Seleziona uno o più clienti esistenti (solo lead con stato "Cliente") o crea un nuovo cliente.
        </p>
      </div>
      
      <div className="border-t border-border/50 pt-4">
        <div className="space-y-4">
          {/* Selettore Clienti (Multiplo) */}
          <FormField
            control={form.control}
            name="customer_ids"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  Clienti per l'ordine
                  <span className="text-red-500">*</span>
                  {!leadsLoading && (
                    <span className="text-xs text-muted-foreground font-normal ml-2">
                      ({clientsOnly.length} clienti disponibili)
                    </span>
                  )}
                </FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Popover open={showCustomerSelector} onOpenChange={setShowCustomerSelector}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="flex-1 justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">
                              {selectedCustomerIds.length > 0 
                                ? `${selectedCustomerIds.length} client${selectedCustomerIds.length > 1 ? 'i' : 'e'} selezionat${selectedCustomerIds.length > 1 ? 'i' : 'o'}`
                                : "Seleziona clienti"
                              }
                            </span>
                          </div>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full min-w-[400px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Cerca tra i clienti esistenti..."
                            value={customerSearchQuery}
                            onValueChange={setCustomerSearchQuery}
                          />
                          <CommandList>
                            {leadsLoading && (
                              <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="ml-2 text-sm text-muted-foreground">
                                  Caricamento clienti...
                                </span>
                              </div>
                            )}
                            
                            {!leadsLoading && filteredCustomers.length === 0 && (
                              <CommandEmpty>
                                {customerSearchQuery.length > 0 
                                  ? 'Nessun cliente trovato con questi criteri.' 
                                  : clientsOnly.length === 0 
                                    ? 'Nessun lead ha ancora lo stato "Cliente". Crea un nuovo cliente o converti un lead esistente.' 
                                    : 'Nessun cliente disponibile.'
                                }
                              </CommandEmpty>
                            )}
                            
                            {!leadsLoading && filteredCustomers.length > 0 && (
                              <CommandGroup>
                                {filteredCustomers.map((customer) => (
                                  <CommandItem
                                    key={customer.id}
                                    onSelect={() => handleCustomerToggle(customer)}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex items-center gap-3 w-full">
                                      {/* Avatar usando sistema AvatarLead */}
                                      <div className="flex-shrink-0">
                                        <AvatarLead
                                          nome={customer.Nome}
                                          customAvatar={customer.Avatar}
                                          size="md"
                                          showTooltip={false}
                                        />
                                      </div>
                                      
                                      {/* Customer Info */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-sm truncate">{customer.Nome}</span>
                                          <Badge className={cn("text-xs px-2 py-0.5", LEAD_STATO_COLORS[customer.Stato as keyof typeof LEAD_STATO_COLORS] || "bg-gray-100 text-gray-800")}>
                                            {customer.Stato || 'Cliente'}
                                          </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                          {customer.Telefono || customer.Email || 'Nessun contatto'}
                                        </div>
                                      </div>
                                      
                                      <Check
                                        className={cn(
                                          "h-4 w-4 flex-shrink-0",
                                          selectedCustomerIds.includes(customer.id)
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
                    
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleNewCustomer}
                      className="px-3"
                    >
                      <span>Nuovo</span>
                    </Button>
                  </div>
                </FormControl>
                
                {/* Sezione clienti selezionati */}
                <div className="mt-2 min-h-[40px]">
                  {selectedCustomers.length > 0 && (
                    <div className="space-y-2">
                      {selectedCustomers.map((customer) => (
                        <div key={customer.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                          <AvatarLead
                            nome={customer.Nome}
                            customAvatar={customer.Avatar}
                            size="sm"
                            showTooltip={false}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium truncate">{customer.Nome}</span>
                              <Badge className={cn("text-xs px-2 py-0.5", LEAD_STATO_COLORS[customer.Stato as keyof typeof LEAD_STATO_COLORS] || "bg-gray-100 text-gray-800")}>
                                {customer.Stato || 'Cliente'}
                              </Badge>
                            </div>
                          </div>
                          <X
                            className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-destructive"
                            onClick={() => removeCustomer(customer.id)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <FormMessageSubtle />
              </FormItem>
            )}
          />

          {/* Form per nuovo cliente - rimosso per ora */}
          {false && (
            <div className="space-y-4 p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center gap-2 mb-2">
                <UserPlus className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800 dark:text-green-200">
                  Nuovo Cliente
                </span>
              </div>
              
              <div className="grid gap-4 md:grid-cols-1">
                {/* Nome - Campo obbligatorio */}
                <FormField
                  control={form.control}
                  name="customer_name"
                  rules={{
                    required: "Nome cliente obbligatorio",
                    minLength: {
                      value: 2,
                      message: "Nome troppo breve",
                    },
                    maxLength: {
                      value: 100,
                      message: "Nome troppo lungo",
                    },
                  }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        Nome Cliente
                        <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Mario Rossi"
                          {...field}
                          className={cn(form.formState.errors.customer_name && "border-red-200 dark:border-red-600")}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="customer_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="mario.rossi@example.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessageSubtle />
                    </FormItem>
                  )}
                />

                {/* Telefono */}
                <FormField
                  control={form.control}
                  name="customer_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefono</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+39 333 123 4567"
                          {...field}
                        />
                      </FormControl>
                      <FormMessageSubtle />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          )}
          
          {/* Data consegna e indirizzo */}
          <div className="grid gap-4 md:grid-cols-1">
            <FormField
              control={form.control}
              name="delivery_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Consegna Richiesta</FormLabel>
                  <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(new Date(field.value), "PPP", { locale: it })
                          ) : (
                            <span>Seleziona una data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => {
                          field.onChange(date ? format(date, "yyyy-MM-dd") : '');
                          setDatePopoverOpen(false);
                        }}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                        locale={it}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessageSubtle />
                </FormItem>
              )}
            />
            
            {/* Indirizzo con Google Places API */}
            <FormField
              control={form.control}
              name="delivery_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Indirizzo Consegna</FormLabel>
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
                            <span className={cn(
                              "truncate",
                              !field.value && "text-muted-foreground"
                            )}>
                              {field.value || "Cerca indirizzo di consegna..."}
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
                          />
                          <CommandList>
                            {isSearching && (
                              <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="ml-2 text-sm text-muted-foreground">
                                  Ricerca indirizzi...
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
          
          {/* Modal per nuovo lead */}
          <NewLeadModal
            open={showNewLeadModal}
            onOpenChange={setShowNewLeadModal}
            onSuccess={handleNewLeadCreated}
          />
        </div>
      </div>
    </div>
  );
}