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
import { Textarea } from '@/components/ui/textarea';
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
import { Check, ChevronDown, X, User, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { useUsers } from '@/hooks/use-users';
import { useMarketingSources } from '@/hooks/use-marketing-sources';
import { useLeads } from '@/hooks/use-leads';
import { LeadStatusBadge, LeadSourceBadge } from '@/components/ui/smart-badge';
import { getSelectOptions } from '@/lib/airtable-schema-helper';
import { toast } from 'sonner';

interface QualificazioneStepProps {
  form: UseFormReturn<LeadFormDataInferred>;
}

export function QualificazioneStep({ form }: QualificazioneStepProps) {
  const [assegnatarioOpen, setAssegnatarioOpen] = useState(false);
  const [referenzeOpen, setReferenzeOpen] = useState(false);
  const [isRewritingEsigenza, setIsRewritingEsigenza] = useState(false);

  const { control, setValue, watch } = form;
  const { users, loading: usersLoading } = useUsers();
  const { sources, isLoading: sourcesLoading } = useMarketingSources();
  const { leads, isLoading: leadsLoading } = useLeads();

  // Carica stati dinamicamente dallo schema
  const leadStati = getSelectOptions('Lead', 'Stato')?.map(opt => opt.name) || [];

  // Watch per valori selezionati
  const selectedAssegnatario = watch('AssignedTo');
  const selectedReferenze = watch('Referenze') || [];

  // Convert users object to array
  const usersArray = users ? Object.values(users) : [];
  
  console.log('[QualificazioneStep] Users:', { users, usersArray, usersLoading });

  const handleAssegnatarioSelect = (userId: string) => {
    setValue('AssignedTo', [userId]);
    setAssegnatarioOpen(false);
  };

  const removeAssegnatario = () => {
    setValue('AssignedTo', undefined);
  };

  const handleReferenzaToggle = (leadNome: string) => {
    const currentReferenze = selectedReferenze || [];
    const isSelected = currentReferenze.includes(leadNome);
    
    if (isSelected) {
      setValue('Referenze', currentReferenze.filter(nome => nome !== leadNome));
    } else {
      setValue('Referenze', [...currentReferenze, leadNome]);
    }
  };

  const removeReferenza = (leadNome: string) => {
    const currentReferenze = selectedReferenze || [];
    setValue('Referenze', currentReferenze.filter(nome => nome !== leadNome));
  };

  const handleRewriteEsigenza = async () => {
    const currentEsigenza = watch('Esigenza');
    if (!currentEsigenza || currentEsigenza.trim().length === 0) {
      toast.error('Inserisci prima un testo da riscrivere');
      return;
    }

    setIsRewritingEsigenza(true);
    toast.loading('Riscrivendo con AI...', { id: 'ai-rewrite' });
    
    try {
      const response = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: currentEsigenza,
          context: 'esigenza_lead'
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to rewrite');
      }
      
      if (data.rewrittenText) {
        setValue('Esigenza', data.rewrittenText);
        toast.success('Testo riscritto con successo!', { id: 'ai-rewrite' });
      } else {
        throw new Error('Nessun testo riscritto ricevuto');
      }
    } catch (error) {
      console.error('Error rewriting esigenza:', error);
      const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
      toast.error(`Errore durante la riscrittura: ${errorMessage}`, { id: 'ai-rewrite' });
    } finally {
      setIsRewritingEsigenza(false);
    }
  };

  const selectedAssegnatarioUser = selectedAssegnatario?.[0] 
    ? usersArray.find(user => user.id === selectedAssegnatario[0]) 
    : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1 pb-2">
        <h3 className="text-lg font-semibold">Qualificazione Lead</h3>
        <p className="text-sm text-muted-foreground">
          Definisci lo stato, la fonte e le informazioni di qualificazione del lead.
        </p>
      </div>
      
      <div className="border-t border-border/50 pt-4">

      <div className="grid gap-4">
        {/* Stato e Fonte - Grid 2 colonne */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Stato */}
          <FormField
            control={control}
            name="Stato"
            rules={{ required: "Lo stato è obbligatorio" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  Stato
                  <span className="text-red-500">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleziona stato">
                        {field.value && (
                          <LeadStatusBadge status={field.value} />
                        )}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {leadStati.map((stato) => (
                      <SelectItem key={stato} value={stato}>
                        <LeadStatusBadge status={stato} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessageSubtle />
              </FormItem>
            )}
          />

          {/* Fonte */}
          <FormField
            control={control}
            name="Fonte"
            rules={{ required: "La fonte è obbligatoria" }}
            render={({ field }) => {
              const selectedSource = sources.find(s => s.name === field.value);
              return (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    Fonte
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={sourcesLoading}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={sourcesLoading ? "Caricamento fonti..." : "Seleziona fonte"}>
                          {field.value && selectedSource && (
                            <LeadSourceBadge 
                              source={field.value} 
                              sourceColorFromDB={selectedSource.color || undefined}
                            />
                          )}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sources.map((source) => (
                        <SelectItem key={source.id} value={source.name}>
                          <LeadSourceBadge 
                            source={source.name} 
                            sourceColorFromDB={source.color || undefined}
                          />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessageSubtle />
                </FormItem>
              );
            }}
          />
        </div>

        {/* Esigenza */}
        <FormField
            control={control}
            name="Esigenza"
            rules={{
              maxLength: {
                value: LEAD_VALIDATION_RULES.Esigenza.maxLength,
                message: "Esigenza troppo lunga",
              },
            }}
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Esigenza</FormLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRewriteEsigenza}
                    disabled={!field.value || isRewritingEsigenza}
                    className="h-7 text-xs"
                  >
                    <Sparkles className="mr-1 h-3 w-3" />
                    {isRewritingEsigenza ? 'Riscrivendo...' : 'Riscrivi con AI'}
                  </Button>
                </div>
                <FormControl>
                  <Textarea
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="Descrivi brevemente l'esigenza del lead..."
                    rows={3}
                    maxLength={LEAD_VALIDATION_RULES.Esigenza.maxLength}
                  />
                </FormControl>
                <FormMessageSubtle />
              </FormItem>
            )}
          />

        {/* Assegnatario e Referenze - Grid 2 colonne */}
        <div className="grid gap-4 md:grid-cols-2">
            {/* Assegnatario */}
            <FormField
              control={control}
              name="AssignedTo"
              render={({ field }) => (
              <FormItem>
                <FormLabel>Assegnatario</FormLabel>
                <FormControl>
                  <Popover open={assegnatarioOpen} onOpenChange={setAssegnatarioOpen}>
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
                                    <div className="flex-shrink-0">
                                      <AvatarLead
                                        nome={user.nome}
                                        isAdmin={user.ruolo === 'Admin'}
                                        size="md"
                                      />
                                    </div>
                                    
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
                {/* Sezione utente selezionato */}
                <div className="mt-2 min-h-[40px]">
                  {selectedAssegnatarioUser && (
                    <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                      {selectedAssegnatarioUser.avatarUrl ? (
                        <img 
                          src={selectedAssegnatarioUser.avatarUrl} 
                          alt={selectedAssegnatarioUser.nome}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <AvatarLead
                          nome={selectedAssegnatarioUser.nome}
                          isAdmin={selectedAssegnatarioUser.ruolo === 'Admin'}
                          size="sm"
                        />
                      )}
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

            {/* Referenze */}
            <FormField
              control={control}
              name="Referenze"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referenze</FormLabel>
                  <FormControl>
                    <Popover open={referenzeOpen} onOpenChange={setReferenzeOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {selectedReferenze.length > 0 ? (
                              <span>{selectedReferenze.length} selezionate</span>
                            ) : (
                              <span className="text-muted-foreground">Seleziona referenze</span>
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
                            {!leadsLoading && (
                              <CommandGroup>
                                {leads.map((lead) => (
                                  <CommandItem
                                    key={lead.id}
                                    onSelect={() => handleReferenzaToggle(lead.fields.Nome || lead.id)}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex items-center gap-3 w-full">
                                      <AvatarLead
                                        nome={lead.fields.Nome || 'Lead'}
                                        gender={lead.fields.Gender}
                                        size="sm"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <span className="text-sm truncate">{lead.fields.Nome || 'Lead senza nome'}</span>
                                      </div>
                                      <Check
                                        className={cn(
                                          "h-4 w-4 flex-shrink-0",
                                          selectedReferenze.includes(lead.fields.Nome || lead.id)
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
                  {/* Sezione referenze selezionate */}
                  <div className="mt-2 min-h-[40px]">
                    {selectedReferenze.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedReferenze.map((refNome) => {
                          const refLead = leads.find(l => l.fields.Nome === refNome);
                          return (
                            <div key={refNome} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                              <AvatarLead
                                nome={refNome}
                                gender={refLead?.fields?.Gender}
size="sm"
                              />
                              <span className="text-sm font-medium">{refNome}</span>
                              <X
                                className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-destructive ml-1"
                                onClick={() => removeReferenza(refNome)}
                              />
                            </div>
                          );
                        })}
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
    </div>
  );
}
