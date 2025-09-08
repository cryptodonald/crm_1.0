'use client';

import { Card } from '@/components/ui/card';

const MOCK_ORDERS = [
  { id: 'ORD-2025-001', date: '2025-09-01', status: 'Bozza', total: 199.0 },
  { id: 'ORD-2025-002', date: '2025-08-22', status: 'In lavorazione', total: 129.99 },
  { id: 'ORD-2025-003', date: '2025-08-05', status: 'Completato', total: 349.5 },
];

export function LeadOrdersMockPanel() {
  const formatMoney = (n: number) => n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
  const fmtDate = (s: string) => new Date(s).toLocaleDateString('it-IT');
  return (
    <Card className="p-4 space-y-2">
      <div className="font-semibold">Ordini (mock)</div>
      <ul className="space-y-1 text-sm">
        {MOCK_ORDERS.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center gap-3">
            <span className="font-medium">{o.id}</span>
            <span className="text-muted-foreground">{fmtDate(o.date)}</span>
            <span className="text-muted-foreground">{o.status}</span>
            <span className="ml-auto">{formatMoney(o.total)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
