'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { Phone, Mail, ArrowLeft, Trash2, Pencil, ChevronDown, Check, User as UserIcon } from 'lucide-react';
import { LeadData, LeadFormData, LeadStato, LeadProvenienza } from '@/types/leads';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

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
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const assegnatarioId = lead.Assegnatario?.[0];
  const assegnatarioName = assegnatarioId && usersData ? usersData[assegnatarioId]?.nome : undefined;

  const usersArray = useMemo(() => {
    if (!usersData) return [] as Array<{ id: string; nome: string; ruolo: string }>;
    return Object.entries(usersData).map(([id, u]) => ({ id, nome: u.nome, ruolo: u.ruolo }));
  }, [usersData]);

  return (
    <Card className="p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Left: identity */}
        <div className="flex items-center gap-4">
          <AvatarLead nome={lead.Nome || lead.ID} size="xl" showTooltip={false} />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-semibold tracking-tight">
                {lead.Nome || lead.ID}
              </h1>
              <Badge variant="secondary" className="text-xs">{lead.ID}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {/* Provenienza editable con badge colore */}
              <Select
                defaultValue={lead.Provenienza}
                onValueChange={(value) => onUpdate({ Provenienza: value as LeadProvenienza })}
              >
                <SelectTrigger className="h-7 w-auto min-w-[160px]">
                  <SelectValue placeholder="Provenienza">
                    {lead.Provenienza && (
                      <Badge className={cn('text-xs px-2 py-0.5', getProvenienzaBadgeColor(lead.Provenienza))}>
                        {lead.Provenienza}
                      </Badge>
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

              {/* Stato editable con badge colore */}
              <Select
                defaultValue={lead.Stato}
                onValueChange={(value) => onUpdate({ Stato: value as LeadStato })}
              >
                <SelectTrigger className="h-7 w-auto min-w-[150px]">
                  <SelectValue placeholder="Stato">
                    {lead.Stato && (
                      <Badge className={cn('text-xs px-2 py-0.5', getStatoBadgeColor(lead.Stato))}>
                        {lead.Stato}
                      </Badge>
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

              {/* Assegnatario (stile dialog nuovo lead - Step 2) */}
              <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="h-7 w-auto min-w-[220px] justify-between">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                      {assegnatarioName ? (
                        <span className="truncate">{assegnatarioName}</span>
                      ) : (
                        <span className="text-muted-foreground">Non assegnato</span>
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
                        <CommandItem
                          key="none"
                          onSelect={() => {
                            onUpdate({ Assegnatario: [] });
                            setAssigneeOpen(false);
                          }}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-3 w-full">
                            <AvatarLead nome="Non assegnato" size="md" showTooltip={false} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">Non assegnato</span>
                              </div>
                            </div>
                            <Check className={cn(
                              'h-4 w-4 flex-shrink-0',
                              !assegnatarioId ? 'opacity-100' : 'opacity-0'
                            )} />
                          </div>
                        </CommandItem>
                        {usersArray.map((user) => (
                          <CommandItem
                            key={user.id}
                            onSelect={() => {
                              onUpdate({ Assegnatario: [user.id] });
                              setAssigneeOpen(false);
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-3 w-full">
                              <div className="flex-shrink-0">
                                <AvatarLead nome={user.nome} size="md" showTooltip={false} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm truncate">{user.nome}</span>
                                  <Badge variant="outline" className="text-[10px]">{user.ruolo}</Badge>
                                </div>
                              </div>
                              <Check className={cn(
                                'h-4 w-4 flex-shrink-0',
                                assegnatarioId === user.id ? 'opacity-100' : 'opacity-0'
                              )} />
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

        {/* Right: actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Indietro
          </Button>
          {lead.Telefono && (
            <Button variant="outline" onClick={onCall}>
              <Phone className="mr-2 h-4 w-4" /> Chiama
            </Button>
          )}
          {lead.Email && (
            <Button variant="outline" onClick={onEmail}>
              <Mail className="mr-2 h-4 w-4" /> Email
            </Button>
          )}
          {/* Modifica affianco a Elimina per maggiore chiarezza */}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" /> Modifica
            </Button>
            <Button variant="destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" /> Elimina
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

