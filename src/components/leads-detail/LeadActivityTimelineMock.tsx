'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Phone, Mail, FileText, ArrowRightLeft } from 'lucide-react';

interface MockEvent {
  id: string;
  type: 'call' | 'email' | 'note' | 'state';
  title: string;
  description?: string;
  date: string;
}

const MOCK_EVENTS: MockEvent[] = [
  { id: 'e1', type: 'state', title: 'Stato aggiornato', description: 'Attivo → Qualificato', date: new Date().toISOString() },
  { id: 'e2', type: 'email', title: 'Email inviata', description: 'Preventivo iniziale', date: new Date(Date.now() - 3600_000).toISOString() },
  { id: 'e3', type: 'call', title: 'Chiamata effettuata', description: 'Follow-up', date: new Date(Date.now() - 7200_000).toISOString() },
  { id: 'e4', type: 'note', title: 'Nota aggiunta', description: 'Cliente interessato a soluzione premium', date: new Date(Date.now() - 86400_000).toISOString() },
];

function iconFor(t: MockEvent['type']) {
  switch (t) {
    case 'call':
      return <Phone className="h-4 w-4" />;
    case 'email':
      return <Mail className="h-4 w-4" />;
    case 'note':
      return <FileText className="h-4 w-4" />;
    case 'state':
      return <ArrowRightLeft className="h-4 w-4" />;
  }
}

function badgeFor(t: MockEvent['type']) {
  const map: Record<MockEvent['type'], string> = {
    call: 'bg-blue-100 text-blue-800',
    email: 'bg-emerald-100 text-emerald-800',
    note: 'bg-amber-100 text-amber-800',
    state: 'bg-purple-100 text-purple-800',
  };
  return map[t];
}

export function LeadActivityTimelineMock() {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold">Attività (mock)</div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> Ultime 24h
        </div>
      </div>
      <ul className="space-y-3">
        {MOCK_EVENTS.map((e) => (
          <li key={e.id} className="flex gap-3">
            <Badge variant="secondary" className={badgeFor(e.type)}>{iconFor(e.type)}</Badge>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{e.title}</div>
              {e.description && (
                <div className="text-xs text-muted-foreground truncate">{e.description}</div>
              )}
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {new Date(e.date).toLocaleString('it-IT')}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
