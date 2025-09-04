'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Phone, Mail, MapPin, Building, FileText, Lightbulb } from 'lucide-react';
import { LeadData } from '@/types/leads';

interface UsersLookup {
  [userId: string]: {
    nome: string;
    ruolo: string;
    avatar?: string;
  };
}

interface OverviewPanelProps {
  lead: LeadData;
  usersData?: UsersLookup | null;
  onAssigneeClick?: (userId: string) => void;
}

export function OverviewPanel({ lead, usersData, onAssigneeClick }: OverviewPanelProps) {
  const assegnatarioId = lead.Assegnatario?.[0];
  const user = assegnatarioId && usersData ? usersData[assegnatarioId] : undefined;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="space-y-2">
          <div className="font-semibold">Contatti</div>
          <div className="space-y-1 text-sm">
            {lead.Telefono ? (
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-mono">{lead.Telefono}</span>
              </div>
            ) : (
              <div className="text-muted-foreground">Telefono non disponibile</div>
            )}
            {lead.Email ? (
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{lead.Email}</span>
              </div>
            ) : (
              <div className="text-muted-foreground">Email non disponibile</div>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="space-y-2">
          <div className="font-semibold">Indirizzo</div>
          <div className="space-y-1 text-sm">
            {lead.Indirizzo && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{lead.Indirizzo}</span>
              </div>
            )}
            {(lead.Città || lead.CAP) && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">{lead.Città || '—'}</Badge>
                {lead.CAP && <Badge variant="outline" className="text-xs">{lead.CAP}</Badge>}
              </div>
            )}
            {!lead.Indirizzo && !lead.Città && !lead.CAP && (
              <div className="text-muted-foreground">Nessun indirizzo disponibile</div>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="space-y-2">
          <div className="font-semibold">Business</div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline">{lead.Stato}</Badge>
            <Badge variant="secondary">{lead.Provenienza}</Badge>
            <div className="flex items-center gap-1">
              <Building className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground text-xs">Ordini: {lead.Ordini?.length || 0}</span>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="space-y-2">
          <div className="font-semibold">Esigenza e Note</div>
          <div className="space-y-2 text-sm">
            {lead.Esigenza ? (
              <div className="flex items-start gap-2">
                <Lightbulb className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                <span className="leading-5">{lead.Esigenza}</span>
              </div>
            ) : (
              <div className="text-muted-foreground">Nessuna esigenza</div>
            )}
            {lead.Note ? (
              <div className="flex items-start gap-2">
                <FileText className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                <span className="leading-5">{lead.Note}</span>
              </div>
            ) : (
              <div className="text-muted-foreground">Nessuna nota</div>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="space-y-2">
          <div className="font-semibold">Assegnazione</div>
          <div className="text-sm">
            {user ? (
              <Button variant="ghost" className="h-auto px-2 py-1" onClick={() => onAssigneeClick?.(assegnatarioId!)}>
                <span className="font-medium mr-2">{user.nome}</span>
                <Badge variant="outline" className="text-[10px]">{user.ruolo}</Badge>
              </Button>
            ) : (
              <div className="text-muted-foreground">Non assegnato</div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

