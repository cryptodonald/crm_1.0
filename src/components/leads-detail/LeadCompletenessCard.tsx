'use client';

import { Card } from '@/components/ui/card';
import { LeadData } from '@/types/leads';
import { Progress } from '@/components/ui/progress';

interface LeadCompletenessCardProps {
  lead: LeadData;
}

export function LeadCompletenessCard({ lead }: LeadCompletenessCardProps) {
  const checks: Array<{ label: string; ok: boolean }> = [
    { label: 'Nome', ok: !!lead.Nome },
    { label: 'Telefono', ok: !!lead.Telefono },
    { label: 'Email', ok: !!lead.Email },
    { label: 'Indirizzo', ok: !!lead.Indirizzo },
    { label: 'CAP', ok: !!(lead as any).CAP },
    { label: 'Città', ok: !!(lead as any)['Città'] },
    { label: 'Provenienza', ok: !!lead.Provenienza },
    { label: 'Assegnatario', ok: Array.isArray(lead.Assegnatario) && lead.Assegnatario.length > 0 },
    { label: 'Referenza', ok: Array.isArray((lead as any).Referenza) && (lead as any).Referenza.length > 0 },
  ];
  const total = checks.length;
  const done = checks.filter(c => c.ok).length;
  const pct = Math.round((done / total) * 100);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Completezza dati</div>
        <div className="text-sm text-muted-foreground">{pct}%</div>
      </div>
      <Progress value={pct} />
      <ul className="grid grid-cols-1 gap-1 text-sm">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-2">
            <span className={c.ok ? 'text-green-600' : 'text-muted-foreground'}>•</span>
            <span className={!c.ok ? 'opacity-60' : ''}>{c.label}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
