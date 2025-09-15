'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { Phone, Mail, ChevronDown, Check, User as UserIcon, MapPin, Edit3, X } from 'lucide-react';
import { LeadData, LeadFormData, LeadStato, LeadProvenienza } from '@/types/leads';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useGooglePlaces } from '@/hooks/useGooglePlaces';
import { useLeadsData } from '@/hooks/use-leads-data';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface UsersLookup {
  [userId: string]: {
    nome: string;
    ruolo: string;
    avatar?: string;
  };
}

interface HeaderProps {
  lead: LeadData;
  usersData?: UsersLookup | null;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCall: () => void;
  onEmail: () => void;
  onUpdate: (data: Partial<LeadFormData>) => Promise<boolean> | void;
}

const STATI: LeadStato[] = ['Nuovo', 'Attivo', 'Qualificato', 'Cliente', 'Chiuso', 'Sospeso'];
const PROVENIENZE: LeadProvenienza[] = ['Meta', 'Instagram', 'Google', 'Sito', 'Referral', 'Organico'];

// Badge color helpers (coerenti con demo-badges/leads-table-columns)
const getStatoBadgeColor = (stato: LeadStato): string => {
  const colors: Record<LeadStato, string> = {
    Nuovo: 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600',
    Attivo: 'bg-blue-200 text-blue-800 hover:bg-blue-300 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700',
    Qualificato: 'bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-500 dark:text-white dark:hover:bg-orange-400',
    Cliente: 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:text-white dark:hover:bg-green-400',
    Chiuso: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:text-white dark:hover:bg-red-400',
    Sospeso: 'bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-500 dark:text-white dark:hover:bg-purple-400',
  };
  return colors[stato];
};

const getProvenienzaBadgeColor = (prov: LeadProvenienza): string => {
  const colors: Record<LeadProvenienza, string> = {
    Meta: 'bg-blue-200 text-blue-800 hover:bg-blue-300 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700',
    Instagram: 'bg-purple-200 text-purple-800 hover:bg-purple-300 dark:bg-purple-800 dark:text-purple-200 dark:hover:bg-purple-700',
    Google: 'bg-red-200 text-red-800 hover:bg-red-300 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700',
    Sito: 'bg-teal-100 text-teal-800 hover:bg-teal-200 dark:bg-teal-800 dark:text-teal-200 dark:hover:bg-teal-700',
    Referral: 'bg-orange-200 text-orange-800 hover:bg-orange-300 dark:bg-orange-800 dark:text-orange-200 dark:hover:bg-orange-700',
    Organico: 'bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700',
  };
  return colors[prov];
};

export function LeadDetailHeader({
  lead,
  usersData,
  onBack,
  onEdit,
  onDelete,
  onCall,
  onEmail,
  onUpdate,
}: HeaderProps) {
  // Assignee state
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const assegnatarioId = lead.Assegnatario?.[0];
  const assegnatarioName = assegnatarioId && usersData ? usersData[assegnatarioId]?.nome : undefined;

  const usersArray = useMemo(() => {
    if (!usersData) return [] as Array<{ id: string; nome: string; ruolo: string }>;
    return Object.entries(usersData).map(([id, u]) => ({ id, nome: u.nome, ruolo: u.ruolo }));
  }, [usersData]);

  const selectedUser = useMemo(() => {
    return usersArray.find((u) => u.id === assegnatarioId) || null;
  }, [usersArray, assegnatarioId]);

  // Inline edit states for Nome, Telefono, Email
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(lead.Nome || '');

  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState(lead.Telefono || '');

  const [editingEmail, setEditingEmail] = useState(false);
  const [emailValue, setEmailValue] = useState(lead.Email || '');

  useEffect(() => {
    setNameValue(lead.Nome || '');
    setPhoneValue(lead.Telefono || '');
    setEmailValue(lead.Email || '');
  }, [lead.Nome, lead.Telefono, lead.Email]);

  const saveName = useCallback(() => {
    if (nameValue && nameValue !== lead.Nome) onUpdate({ Nome: nameValue });
    setEditingName(false);
  }, [nameValue, lead.Nome, onUpdate]);

  const savePhone = useCallback(() => {
    if (phoneValue !== (lead.Telefono || '')) onUpdate({ Telefono: phoneValue });
    setEditingPhone(false);
  }, [phoneValue, lead.Telefono, onUpdate]);

  const saveEmail = useCallback(() => {
    if (emailValue !== (lead.Email || '')) onUpdate({ Email: emailValue });
    setEditingEmail(false);
  }, [emailValue, lead.Email, onUpdate]);

  // Address (Google Places) state
  const [addressOpen, setAddressOpen] = useState(false);
  const [addressQuery, setAddressQuery] = useState('');
  const { searchPlaces, getPlaceDetails, parseAddressComponents, isSearching, suggestions, clearSuggestions } = useGooglePlaces();

  useEffect(() => {
    if (addressOpen) setAddressQuery(lead.Indirizzo || '');
  }, [addressOpen, lead.Indirizzo]);

  // fallback manuale indirizzo
  const [manualCAP, setManualCAP] = useState('');
  const [manualCity, setManualCity] = useState('');

  useEffect(() => {
    if (addressQuery.length >= 3) searchPlaces(addressQuery);
  }, [addressQuery, searchPlaces]);

  const handleAddressSelect = async (suggestion: { placeId: string; description: string }) => {
    try {
      const details = await getPlaceDetails(suggestion.placeId);
      const parsed = parseAddressComponents(details.addressComponents);
      let street = '';
      if (parsed.route && parsed.streetNumber) street = `${parsed.route}, ${parsed.streetNumber}`;
      else if (parsed.route) street = parsed.route;
      else street = (details.formattedAddress || '').split(',')[0]?.trim() || details.formattedAddress;

      const payload: Partial<LeadFormData> = { Indirizzo: street } as any;
      if (parsed.zipCode) (payload as any).CAP = parseInt(parsed.zipCode);
      if (parsed.city) (payload as any).Città = parsed.city;
      await onUpdate(payload);
      setAddressOpen(false);
    } catch (e) {
      console.error('Error selecting address:', e);
    } finally {
      clearSuggestions();
    }
  };

  // Referenza selector
  const [refOpen, setRefOpen] = useState(false);
  const { leads: allLeads = [], loading: leadsLoading } = useLeadsData({ loadAll: true } as any);

  // Dialog conferma modifiche (nome/telefono/email/indirizzo, stato, provenienza, assegnatario, referenza)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState<{
    data: Partial<LeadFormData>;
    description?: string;
  } | null>(null);

  const requestConfirm = useCallback((data: Partial<LeadFormData>, description?: string) => {
    setPendingChange({ data, description });
    setConfirmOpen(true);
  }, []);

  const cancelChange = useCallback(() => {
    setConfirmOpen(false);
    setPendingChange(null);
  }, []);

  const confirmChange = useCallback(async () => {
    if (!pendingChange) return;
    try {
      await onUpdate(pendingChange.data);
      toast.success('Modifica salvata');
    } finally {
      setConfirmOpen(false);
      setPendingChange(null);
    }
  }, [onUpdate, pendingChange]);

  return (
    <Card className="p-4 md:p-6">
      {/* Top row: identity + quick selectors + actions */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Left: identity */}
        <div className="flex items-center gap-4 min-w-0">
          <AvatarLead nome={lead.Nome || lead.ID} customAvatar={lead.Avatar} size="xl" showTooltip={false} />
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-3 min-w-0 flex-wrap">
              {editingName ? (
                <div className="flex items-center gap-2 min-w-0">
                  <Input value={nameValue} onChange={(e) => setNameValue(e.target.value)} onBlur={saveName} onKeyDown={(e) => e.key === 'Enter' && saveName()} className="h-9 w-[240px]" />
                  <Button variant="ghost" size="icon" onClick={() => setEditingName(false)} aria-label="Annulla"><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <h1 className="text-xl md:text-2xl font-semibold tracking-tight truncate flex items-center gap-2 min-w-0">
                  {lead.Nome || lead.ID}
                  <Button variant="ghost" size="icon" onClick={() => setEditingName(true)} aria-label="Modifica nome"><Edit3 className="h-4 w-4" /></Button>
                </h1>
              )}
              <Badge variant="secondary" className="text-xs">{lead.ID}</Badge>

              {/* Stato accanto al nome, con label inside trigger */}
              <Select defaultValue={lead.Stato} onValueChange={(value) => requestConfirm({ Stato: value as LeadStato }, `Confermi lo stato "${value}"?`)}>
                <SelectTrigger className="h-7 w-auto min-w-[170px]">
                  <SelectValue>
                    <span className="text-xs text-muted-foreground mr-2">Stato</span>
                    {lead.Stato && (
                      <Badge className={cn('text-xs px-2 py-0.5', getStatoBadgeColor(lead.Stato))}>{lead.Stato}</Badge>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATI.map((s) => (
                    <SelectItem key={s} value={s}>
                      <div className="flex items-center gap-2">
                        <Badge className={cn('text-xs px-2 py-0.5', getStatoBadgeColor(s))}>{s}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick selectors sotto il nome: Provenienza, Assegnatario, Referenza */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="text-xs">Provenienza</span>
                <Select defaultValue={lead.Provenienza} onValueChange={(value) => onUpdate({ Provenienza: value as LeadProvenienza })}>
                  <SelectTrigger className="h-7 w-auto min-w-[160px]">
                    <SelectValue placeholder="Provenienza">
                      {lead.Provenienza && (
                        <Badge className={cn('text-xs px-2 py-0.5', getProvenienzaBadgeColor(lead.Provenienza))}>{lead.Provenienza}</Badge>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {PROVENIENZE.map((p) => (
                      <SelectItem key={p} value={p}>
                        <div className="flex items-center gap-2">
                          <Badge className={cn('text-xs px-2 py-0.5', getProvenienzaBadgeColor(p))}>{p}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Stato rimosso da questa riga: ora è accanto al nome */}

              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs">Assegnatario</span>
                <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="h-9 w-auto min-w-[240px] justify-between px-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {selectedUser ? (
                          <>
                            <AvatarLead nome={selectedUser.nome} customAvatar={(usersData && selectedUser && usersData[selectedUser.id]?.avatar) || undefined} isAdmin={selectedUser.ruolo === 'Admin'} size="sm" showTooltip={false} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="truncate text-sm font-medium">{selectedUser.nome}</span>
                                <Badge variant="outline" className="text-[10px] whitespace-nowrap">{selectedUser.ruolo}</Badge>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Non assegnato</span>
                          </>
                        )}
                      </div>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Cerca utente..." />
                      <CommandList>
                        <CommandEmpty>Nessun utente trovato.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem key="none" onSelect={() => { onUpdate({ Assegnatario: [] }); setAssigneeOpen(false); }} className="cursor-pointer">
                            <div className="flex items-center gap-3 w-full">
                              <AvatarLead nome="Non assegnato" size="md" showTooltip={false} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm truncate">Non assegnato</span>
                                </div>
                              </div>
                              <Check className={cn('h-4 w-4 flex-shrink-0', !assegnatarioId ? 'opacity-100' : 'opacity-0')} />
                            </div>
                          </CommandItem>
                          {usersArray.map((user) => (
                            <CommandItem key={user.id} onSelect={() => { onUpdate({ Assegnatario: [user.id] }); setAssigneeOpen(false); }} className="cursor-pointer">
                              <div className="flex items-center gap-3 w-full">
                                <div className="flex-shrink-0"><AvatarLead nome={user.nome} customAvatar={(usersData && usersData[user.id]?.avatar) || undefined} isAdmin={user.ruolo === 'Admin'} size="md" showTooltip={false} /></div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm truncate">{user.nome}</span>
                                    <Badge variant="outline" className="text-[10px]">{user.ruolo}</Badge>
                                  </div>
                                </div>
                                <Check className={cn('h-4 w-4 flex-shrink-0', assegnatarioId === user.id ? 'opacity-100' : 'opacity-0')} />
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        {/* Right: actions - rimosse dall'header (spostate in pagina) */}
        <div className="hidden" />
      </div>

      {/* Second row: campi dettagli con etichette e inline-edit */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Telefono */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">Telefono</div>
          {editingPhone ? (
            <div className="flex items-center gap-2">
              <Input type="tel" value={phoneValue} onChange={(e) => setPhoneValue(e.target.value)} onBlur={savePhone} onKeyDown={(e) => e.key === 'Enter' && savePhone()} className="h-9" />
              <Button variant="ghost" size="icon" onClick={() => setEditingPhone(false)} aria-label="Annulla"><X className="h-4 w-4" /></Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{lead.Telefono || '-'}</span>
              {lead.Telefono && (<Button variant="outline" size="sm" onClick={onCall}><Phone className="mr-2 h-3 w-3" /> Chiama</Button>)}
              <Button variant="ghost" size="icon" onClick={() => setEditingPhone(true)} aria-label="Modifica telefono"><Edit3 className="h-4 w-4" /></Button>
            </div>
          )}
        </div>

        {/* Email */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">Email</div>
          {editingEmail ? (
            <div className="flex items-center gap-2">
              <Input type="email" value={emailValue} onChange={(e) => setEmailValue(e.target.value)} onBlur={saveEmail} onKeyDown={(e) => e.key === 'Enter' && saveEmail()} className="h-9" />
              <Button variant="ghost" size="icon" onClick={() => setEditingEmail(false)} aria-label="Annulla"><X className="h-4 w-4" /></Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{lead.Email || '-'}</span>
              {lead.Email && (<Button variant="outline" size="sm" onClick={onEmail}><Mail className="mr-2 h-3 w-3" /> Email</Button>)}
              <Button variant="ghost" size="icon" onClick={() => setEditingEmail(true)} aria-label="Modifica email"><Edit3 className="h-4 w-4" /></Button>
            </div>
          )}
        </div>

        {/* Referenza (riassunto + selector) */}
        <div>
          <div className="text-xs text-muted-foreground mb-1">Referenza</div>
          <Popover open={refOpen} onOpenChange={setRefOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between h-10">
                <div className="flex items-center gap-2 truncate">
                  <AvatarLead nome={lead['Nome referenza']?.[0] || 'Referenza'} size="sm" showTooltip={false} />
                  <span className={cn('truncate', !lead['Nome referenza']?.[0] && 'text-muted-foreground')}>{lead['Nome referenza']?.[0] || 'Seleziona referenza'}</span>
                </div>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full min-w-[420px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Cerca lead..." />
                <CommandList>
                  <CommandEmpty>{leadsLoading ? 'Caricamento leads...' : 'Nessun lead trovato.'}</CommandEmpty>
                  {!leadsLoading && allLeads.length > 0 && (
                    <CommandGroup>
                      {allLeads.map((l: any) => (
                        <CommandItem key={l.id} onSelect={() => { onUpdate({ Referenza: [l.id] } as any); setRefOpen(false); }} className="cursor-pointer">
                          <div className="flex items-center gap-3 w-full">
                            <AvatarLead nome={l.Nome} size="md" showTooltip={false} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">{l.Nome}</span>
                                <Badge className="text-[10px]" variant="outline">{l.Stato}</Badge>
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
        </div>

        {/* Indirizzo (Google Places) */}
        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground mb-1">Indirizzo</div>
          <Popover open={addressOpen} onOpenChange={(o) => { setAddressOpen(o); if (!o) clearSuggestions(); }}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between h-10">
                <div className="flex items-center gap-2 truncate">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className={cn('truncate', !lead.Indirizzo && 'text-muted-foreground')}>{lead.Indirizzo || 'Cerca indirizzo...'}</span>
                </div>
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full min-w-[420px] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput placeholder="Digita un indirizzo..." value={addressQuery} onValueChange={setAddressQuery} />
                <CommandList>
                  {isSearching && (<div className="flex items-center justify-center p-4 text-sm text-muted-foreground">Ricerca in corso...</div>)}
                  {!isSearching && addressQuery.length >= 3 && suggestions.length === 0 && (
                    <div className="p-4 space-y-2">
                      <div className="text-sm text-muted-foreground">Nessun indirizzo trovato. Inserisci manualmente:</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Input placeholder="Indirizzo" value={addressQuery} onChange={(e) => setAddressQuery(e.target.value)} />
                        <Input placeholder="CAP" value={manualCAP} onChange={(e) => setManualCAP(e.target.value)} />
                        <Input placeholder="Città" value={manualCity} onChange={(e) => setManualCity(e.target.value)} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setAddressOpen(false)}>Annulla</Button>
                        <Button size="sm" onClick={() => { requestConfirm({ Indirizzo: addressQuery, CAP: manualCAP ? parseInt(manualCAP) : undefined, Città: manualCity || undefined } as any, `Confermi l'indirizzo manuale?`); setAddressOpen(false); }}>Salva</Button>
                      </div>
                    </div>
                  )}
                  {!isSearching && suggestions.length > 0 && (
                    <CommandGroup>
                      {suggestions.map((s) => (
                        <CommandItem key={s.placeId} onSelect={() => handleAddressSelect({ placeId: s.placeId, description: s.description })} className="cursor-pointer">
                          <div className="flex items-start gap-2 w-full">
                            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{s.structuredFormatting.mainText}</div>
                              <div className="text-xs text-muted-foreground truncate">{s.structuredFormatting.secondaryText}</div>
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
        </div>
      </div>

      {/* Dialog conferma modifiche */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma modifica</DialogTitle>
            <DialogDescription>
              {pendingChange?.description || 'Confermi la modifica?'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={cancelChange}>Annulla</Button>
            <Button onClick={confirmChange}>Conferma</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

