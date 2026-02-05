'use client';

import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { 
  ActivityFormData, 
  ActivityTipo, 
  ActivityObiettivo, 
  ActivityPriorita, 
  getActivityTipoColor,
  getActivityObiettivoColor,
  getActivityPrioritaColor,
} from '@/types/activities';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { useLeadsData } from '@/hooks/use-leads-data';

interface InformazioniBaseStepProps {
  form: UseFormReturn<ActivityFormData>;
  prefilledLeadId?: string; // ID del lead preselezionato
}

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

export function InformazioniBaseStep({ form, prefilledLeadId }: InformazioniBaseStepProps) {
  const [leadsPopoverOpen, setLeadsPopoverOpen] = useState(false);

  const { control, setValue, watch } = form;
  const { leads, loading: leadsLoading } = useLeadsData({ loadAll: true });

  // Watch per valori selezionati
  const selectedLeads = watch('ID Lead') || [];

  // Effetto per preselezionare il lead quando viene fornito prefilledLeadId
  useEffect(() => {
    if (prefilledLeadId && selectedLeads.length === 0 && leads.length > 0) {
      // Verifica che il lead esista nella lista
      const leadExists = leads.some(lead => lead.id === prefilledLeadId);
      if (leadExists) {
        setValue('ID Lead', [prefilledLeadId]);
        console.log(`🎯 Lead preselezionato automaticamente: ${prefilledLeadId}`);
      }
    }
  }, [prefilledLeadId, selectedLeads.length, leads, setValue]);

  const handleLeadToggle = (leadId: string) => {
    const currentLeads = selectedLeads || [];
    const isSelected = currentLeads.includes(leadId);
    
    if (isSelected) {
      setValue('ID Lead', currentLeads.filter(id => id !== leadId));
    } else {
      // Per semplicità, permettiamo solo un lead per attività
      setValue('ID Lead', [leadId]);
    }
  };

  const removeSelectedLead = (leadId: string) => {
    const currentLeads = selectedLeads || [];
    setValue('ID Lead', currentLeads.filter(id => id !== leadId));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1 pb-2">
        <h3 className="text-lg font-semibold">Informazioni Base</h3>
        <p className="text-sm text-muted-foreground">
          Definisci il tipo di attività, seleziona il lead associato e specifica l'obiettivo.
        </p>
      </div>
      
      <div className="border-t border-border/50 pt-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Riga 1 - Colonna A: Tipo Attività */}
          <FormField
            control={control}
            name="Tipo"
            rules={{ required: "Il tipo di attività è obbligatorio" }}
            render={({ field }) => (
              <FormItem className="flex flex-col h-full">
                <FormLabel className="flex items-center gap-1 mb-2 min-h-[20px]">
                  Tipo Attività
                  <span className="text-red-500">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="Seleziona tipo">
                        {field.value && (
                          <Badge variant="outline" className={getActivityTipoColor(field.value)}>
                            {field.value}
                          </Badge>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((tipo) => (
                      <SelectItem key={tipo} value={tipo}>
                        <Badge variant="outline" className={getActivityTipoColor(tipo)}>
                          {tipo}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessageSubtle />
              </FormItem>
            )}
          />

          {/* Riga 1 - Colonna B: Lead Associato */}
          <FormField
            control={control}
            name="ID Lead"
            render={() => (
              <FormItem className="flex flex-col h-full">
                <FormLabel className="mb-2 min-h-[20px]">Lead Associato</FormLabel>
                <FormControl>
                  <Popover open={leadsPopoverOpen} onOpenChange={setLeadsPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full h-10 justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {selectedLeads.length > 0 ? (
                            (() => {
                              const lead = leads.find(l => l.id === selectedLeads[0]);
                              return (
                                <>
                                  <AvatarLead
                                    nome={lead?.fields?.Nome || 'Lead'}
                                    size="sm"
                                    
                                    className="w-5 h-5"
                                  />
                                  <span className="text-foreground font-medium">
                                    {lead?.fields?.Nome || 'Lead selezionato'}
                                  </span>
                                </>
                              );
                            })()
                          ) : (
                            <>
                              <AvatarLead
                                nome=""
                                size="sm"
                                
                                className="w-5 h-5"
                              />
                              <span className="text-muted-foreground">
                                Seleziona lead
                              </span>
                            </>
                          )}
                        </div>
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Cerca lead..." />
                        <CommandList>
                          <CommandEmpty>
                            {leadsLoading ? "Caricamento leads..." : "Nessun lead trovato."}
                          </CommandEmpty>
                          {!leadsLoading && leads.length > 0 && (
                            <CommandGroup>
                              {leads.map((lead) => (
                                <CommandItem
                                  key={lead.id}
                                  onSelect={() => handleLeadToggle(lead.id)}
                                  className="cursor-pointer"
                                >
                                  <div className="flex items-center gap-3 w-full">
                                    <div className="flex-shrink-0">
                                      <AvatarLead
                                        nome={lead.fields.Nome || 'Lead'}
                                        size="md"
                                        
                                      />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm truncate">{lead.fields.Nome || 'Lead senza nome'}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {lead.fields.Stato}
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-muted-foreground truncate">
                                        {lead.fields.Telefono || lead.fields.Email || 'Nessun contatto'}
                                      </div>
                                    </div>
                                    
                                    <Check
                                      className={cn(
                                        "h-4 w-4 flex-shrink-0",
                                        selectedLeads.includes(lead.id)
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
                {/* Sezione lead selezionato con altezza minima fissa */}
                <div className="mt-2 min-h-[40px]">
                  {selectedLeads.length > 0 && (
                    <div className="space-y-2">
                      {selectedLeads.map((leadId) => {
                        const lead = leads.find(l => l.id === leadId);
                        return lead ? (
                          <div key={leadId} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                            <AvatarLead
                              nome={lead.fields.Nome || 'Lead'}
                              size="sm"
                              
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-medium truncate">{lead.fields.Nome || 'Lead senza nome'}</span>
                                <Badge variant="outline" className="text-xs">{lead.fields.Stato}</Badge>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-destructive"
                              onClick={() => removeSelectedLead(leadId)}
                            >
                              ×
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                <FormMessageSubtle />
              </FormItem>
            )}
          />

          {/* Riga 2 - Colonna A: Obiettivo */}
          <FormField
            control={control}
            name="Obiettivo"
            render={({ field }) => (
              <FormItem className="flex flex-col h-full">
                <FormLabel className="mb-2 min-h-[20px]">Obiettivo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="Seleziona obiettivo">
                        {field.value && (
                          <Badge variant="outline" className={getActivityObiettivoColor(field.value)}>
                            {field.value}
                          </Badge>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[200px]">
                    {ACTIVITY_OBJECTIVES.map((obiettivo) => (
                      <SelectItem key={obiettivo} value={obiettivo}>
                        <Badge variant="outline" className={getActivityObiettivoColor(obiettivo)}>
                          {obiettivo}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessageSubtle />
              </FormItem>
            )}
          />

          {/* Riga 2 - Colonna B: Priorità */}
          <FormField
            control={control}
            name="Priorità"
            render={({ field }) => (
              <FormItem className="flex flex-col h-full">
                <FormLabel className="mb-2 min-h-[20px]">Priorità</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="Seleziona priorità">
                        {field.value && (
                          <Badge variant="outline" className={getActivityPrioritaColor(field.value)}>
                            {field.value}
                          </Badge>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ACTIVITY_PRIORITIES.map((priorita) => (
                      <SelectItem key={priorita} value={priorita}>
                        <Badge variant="outline" className={getActivityPrioritaColor(priorita)}>
                          {priorita}
                        </Badge>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessageSubtle />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
