'use client';

import { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { LeadFormData, LeadStato, LeadProvenienza, LEAD_VALIDATION_RULES, LEAD_STATO_COLORS, LEAD_PROVENIENZA_COLORS } from '@/types/leads';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FormMessageSubtle } from '@/components/ui/form-message-subtle';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AINotesField } from '@/components/activities/ai-notes-field';
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
import { Check, ChevronDown, X, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { useUsers } from '@/hooks/use-users';
import { useLeadsData } from '@/hooks/use-leads-data';

interface QualificazioneStepProps {
  form: UseFormReturn<LeadFormData>;
}

// 🚀 Funnel Ottimizzato V3 - 7 Stati (aggiornato 2025-01-13)
const LEAD_STATI: LeadStato[] = [
  'Nuovo',
  'Contattato',        // Rinominato da 'Attivo'
  'Qualificato',
  'In Negoziazione',   // 🆕 Fase calda: appuntamenti, preventivi, trattative
  'Cliente',
  'Sospeso',
  'Perso'              // Rinominato da 'Chiuso'
];

interface MarketingSource {
  id: string;
  name: string;
  color?: string;
  active: boolean;
}

// Colori per badge Provenienza usando shadcn/ui - same as leads-table-columns.tsx
const LEAD_PROVENIENZA_BADGE_COLORS: Record<LeadProvenienza, string> = {
  Meta: 'bg-blue-200 text-blue-800 hover:bg-blue-300 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700',
  Instagram: 'bg-purple-200 text-purple-800 hover:bg-purple-300 dark:bg-purple-800 dark:text-purple-200 dark:hover:bg-purple-700',
  Google: 'bg-red-200 text-red-800 hover:bg-red-300 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700',
  Sito: 'bg-teal-100 text-teal-800 hover:bg-teal-200 dark:bg-teal-800 dark:text-teal-200 dark:hover:bg-teal-700',
  Referral: 'bg-orange-200 text-orange-800 hover:bg-orange-300 dark:bg-orange-800 dark:text-orange-200 dark:hover:bg-orange-700',
  Organico: 'bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700',
};

// 🔄 Default fonti di fallback se il database non le fornisce
const DEFAULT_FALLBACK_SOURCES: MarketingSource[] = [
  { id: 'fb_meta', name: 'Meta', color: '#3B82F6', active: true },
  { id: 'fb_instagram', name: 'Instagram', color: '#A855F7', active: true },
  { id: 'fb_google', name: 'Google', color: '#EF4444', active: true },
  { id: 'fb_sito', name: 'Sito', color: '#14B8A6', active: true },
  { id: 'fb_referral', name: 'Referral', color: '#F97316', active: true },
  { id: 'fb_organico', name: 'Organico', color: '#22C55E', active: true },
];

export function QualificazioneStep({ form }: QualificazioneStepProps) {
  const [assegnatarioOpen, setAssegnatarioOpen] = useState(false);
  const [referenzeOpen, setReferenzeOpen] = useState(false);
  const [sources, setSources] = useState<MarketingSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(true);

  const { control, setValue, watch } = form;
  const { users, loading: usersLoading } = useUsers();
  const { leads, loading: leadsLoading } = useLeadsData({ loadAll: true });

  // Carica fonti dal database
  useEffect(() => {
    const fetchSources = async () => {
      try {
        const response = await fetch('/api/marketing/sources');
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          // Filtra solo fonti attive dal database
          const activeSources = result.data.filter((s: MarketingSource) => s.active);
          if (activeSources.length > 0) {
            console.log(`✅ Loaded ${activeSources.length} sources from database`);
            setSources(activeSources);
          } else {
            // Se nessuna fonte attiva nel database, usa fallback
            console.warn('⚠️ No active sources in database, using fallback sources');
            setSources(DEFAULT_FALLBACK_SOURCES);
          }
        } else {
          // Se nessuna fonte dal database, usa fallback
          console.warn('⚠️ No sources found in database, using fallback sources');
          setSources(DEFAULT_FALLBACK_SOURCES);
        }
      } catch (error) {
        console.error('❌ Error loading sources from API:', error);
        // In caso di errore, usa fallback
        console.log('🔄 Using fallback sources due to API error');
        setSources(DEFAULT_FALLBACK_SOURCES);
      } finally {
        setSourcesLoading(false);
      }
    };
    fetchSources();
  }, []);

  // Watch per valori selezionati
  const selectedAssegnatario = watch('Assegnatario');
  const selectedReferenze = watch('Referenza') || [];

  // Convert users object to array
  const usersArray = users ? Object.values(users) : [];

  const handleAssegnatarioSelect = (userId: string) => {
    setValue('Assegnatario', [userId]);
    setAssegnatarioOpen(false);
  };

  const removeAssegnatario = () => {
    setValue('Assegnatario', undefined);
  };

  const handleReferenzaToggle = (leadId: string) => {
    const currentReferenze = selectedReferenze || [];
    const isSelected = currentReferenze.includes(leadId);
    
    if (isSelected) {
      setValue('Referenza', currentReferenze.filter(id => id !== leadId));
    } else {
      setValue('Referenza', [...currentReferenze, leadId]);
    }
  };

  const removeReferenza = (leadId: string) => {
    const currentReferenze = selectedReferenze || [];
    setValue('Referenza', currentReferenze.filter(id => id !== leadId));
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
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona stato">
                      {field.value && (
                        <div className="flex items-center gap-2">
                          <Badge className={cn("text-xs px-2 py-0.5", LEAD_STATO_COLORS[field.value as LeadStato])}>
                            {field.value}
                          </Badge>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {LEAD_STATI.map((stato) => (
                    <SelectItem key={stato} value={stato}>
                      <div className="flex items-center gap-2">
                        <Badge className={cn("text-xs px-2 py-0.5", LEAD_STATO_COLORS[stato])}>
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

        {/* Fonte (ex Provenienza) */}
        <FormField
          control={control}
          name="Provenienza"
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
                    <SelectTrigger>
                      <SelectValue placeholder={sourcesLoading ? "Caricamento fonti..." : "Seleziona fonte"}>
                        {field.value && selectedSource && (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-sm" 
                              style={{ backgroundColor: selectedSource.color || '#3B82F6' }}
                            />
                            <span>{field.value}</span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sources.map((source) => (
                      <SelectItem key={source.id} value={source.name}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-sm" 
                            style={{ backgroundColor: source.color || '#3B82F6' }}
                          />
                          <span>{source.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessageSubtle />
              </FormItem>
            );
          }}
        />

        {/* Esigenza - Campo spostato dal step 3 */}
        <div className="md:col-span-2">
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
                <FormLabel>Esigenza</FormLabel>
                <FormControl>
                  <AINotesField
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="Descrivi brevemente l'esigenza del lead..."
                    maxLength={LEAD_VALIDATION_RULES.Esigenza.maxLength}
                  />
                </FormControl>
                <FormMessageSubtle />
              </FormItem>
            )}
          />
        </div>

        {/* Assegnatario - Select singolo */}
        <FormField
          control={control}
          name="Assegnatario"
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

        {/* Referenze - Select multiplo */}
        <FormField
          control={control}
          name="Referenza"
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
                        <span className="text-muted-foreground">
                          {selectedReferenze.length > 0 
                            ? `${selectedReferenze.length} referenze selezionate`
                            : "Seleziona referenze"
                          }
                        </span>
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
                                onSelect={() => handleReferenzaToggle(lead.id)}
                                className="cursor-pointer"
                              >
                                <div className="flex items-center gap-3 w-full">
                                  {/* Avatar usando sistema AvatarLead */}
                                  <div className="flex-shrink-0">
                                    <AvatarLead
                                      nome={lead.Nome}
                                      customAvatar={lead.Avatar}
                                      size="md"
                                      showTooltip={false}
                                    />
                                  </div>
                                  
                                  {/* Lead Info */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm truncate">{lead.Nome}</span>
                                      <Badge className={cn("text-xs px-2 py-0.5", LEAD_STATO_COLORS[lead.Stato])}>
                                        {lead.Stato}
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground truncate">
                                      {lead.Telefono || lead.Email || 'Nessun contatto'}
                                    </div>
                                  </div>
                                  
                                  <Check
                                    className={cn(
                                      "h-4 w-4 flex-shrink-0",
                                      selectedReferenze.includes(lead.id)
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
              {/* Sezione referenze selezionate con altezza minima fissa per evitare disallineamenti */}
              <div className="mt-2 min-h-[40px]">
                {selectedReferenze.length > 0 && (
                  <div className="space-y-2">
                    {selectedReferenze.map((leadId) => {
                      const lead = leads.find(l => l.id === leadId);
                      return lead ? (
                        <div key={leadId} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                          <AvatarLead
                            nome={lead.Nome}
                            customAvatar={lead.Avatar}
                            size="sm"
                            showTooltip={false}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-sm font-medium truncate">{lead.Nome}</span>
                              <Badge className={cn("text-xs px-2 py-0.5", LEAD_STATO_COLORS[lead.Stato])}>
                                {lead.Stato}
                              </Badge>
                            </div>
                          </div>
                          <X
                            className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-destructive"
                            onClick={() => removeReferenza(leadId)}
                          />
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
        </div>
      </div>
    </div>
  );
}
