'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, TrendingUp, Users } from 'lucide-react';
import { LeadData } from '@/types/leads';

interface SummaryCardsProps {
  lead: LeadData;
  activities?: Array<{ date?: string }>;
}

function daysSince(date: string | undefined) {
  if (!date) return '-';
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  return isNaN(diff) ? '-' : diff;
}

function fmtDateIT(date: string | undefined) {
  if (!date) return 'N/A';
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function SummaryCards({ lead, activities }: SummaryCardsProps) {
  const eta = daysSince(lead?.Data);
  const last = activities && activities.length > 0 ? activities[0]?.date : undefined;
  const lastAge = daysSince(last);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Età Lead */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Età Lead</CardTitle>
          <Calendar className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{typeof eta === 'number' ? `${eta}g` : '-'}</div>
          <p className="text-muted-foreground mt-1 text-xs">Dal {fmtDateIT(lead?.Data)}</p>
        </CardContent>
      </Card>

      {/* Ultima Attività */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ultima Attività</CardTitle>
          <Clock className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{last ? `${lastAge}g` : '-'}</div>
          <p className="text-muted-foreground mt-1 text-xs">{fmtDateIT(last)}</p>
        </CardContent>
      </Card>

      {/* Stato/Provenienza */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Stato & Provenienza</CardTitle>
          <TrendingUp className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">{lead.Stato}</Badge>
            <Badge variant="secondary" className="text-xs">{lead.Provenienza}</Badge>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">ID: {lead.ID}</p>
        </CardContent>
      </Card>

      {/* Attività conteggio */}
      <Card className="from-muted/30 to-muted/60 border-border bg-gradient-to-br">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Attività</CardTitle>
          <Users className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activities?.length ?? 0}</div>
          <p className="text-muted-foreground mt-1 text-xs">Cronologia interazioni</p>
        </CardContent>
      </Card>
    </div>
  );
}

