'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { Phone, Mail, ArrowLeft, Trash2, Pencil } from 'lucide-react';
import { LeadData, LeadFormData, LeadStato } from '@/types/leads';
import { cn } from '@/lib/utils';

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
  const assegnatarioId = lead.Assegnatario?.[0];
  const assegnatarioName = assegnatarioId && usersData ? usersData[assegnatarioId]?.nome : undefined;

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
              <Badge variant="outline">{lead.Provenienza}</Badge>
              <span>•</span>
              <span>Stato:</span>
              <Select
                defaultValue={lead.Stato}
                onValueChange={(value) => onUpdate({ Stato: value as LeadStato })}
              >
                <SelectTrigger className="h-7 w-[160px]">
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  {STATI.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>•</span>
              <span>Assegnatario:</span>
              <Select
                value={assegnatarioId || 'none'}
                onValueChange={(value) => onUpdate({ Assegnatario: value === 'none' ? [] : [value] })}
              >
                <SelectTrigger className="h-7 w-[200px]">
                  <SelectValue placeholder={assegnatarioName || 'Non assegnato'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="none" value="none">Non assegnato</SelectItem>
                  {usersData && Object.entries(usersData).map(([id, u]) => (
                    <SelectItem key={id} value={id}>{u.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <Button variant="outline" onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" /> Modifica
          </Button>
          <Button variant="destructive" onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Elimina
          </Button>
        </div>
      </div>
    </Card>
  );
}

