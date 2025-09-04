'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { LeadData } from '@/types/leads';
import { Skeleton } from '@/components/ui/skeleton';

interface OrdersPanelProps {
  lead: LeadData;
}

interface OrderItem {
  id: string;
  createdTime: string;
  Data?: string | null;
  Totale?: number | null;
  Stato?: string | null;
  Numero?: string | null;
}

export function OrdersPanel({ lead }: OrdersPanelProps) {
  const ids = useMemo(() => lead.Ordini || [], [lead.Ordini]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!ids.length) {
        setItems([]);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ ids: ids.join(',') });
        const res = await fetch(`/api/orders?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const json = await res.json();
        const records = (json.records || []) as OrderItem[];
        if (!cancelled) setItems(records);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Errore caricamento ordini');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [ids]);

  const formatDate = (s?: string | null, created?: string) => {
    const d = s ? new Date(s) : created ? new Date(created) : null;
    return d ? d.toLocaleDateString('it-IT') : '-';
  };
  const formatMoney = (n?: number | null) => (typeof n === 'number' ? n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }) : '-');

  return (
    <Card className="p-4 space-y-3">
      {ids.length === 0 ? (
        <div className="text-muted-foreground">Nessun ordine collegato</div>
      ) : loading ? (
        <div className="space-y-2">
          {[...Array(Math.min(ids.length, 3))].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-sm text-red-600">Errore: {error}</div>
      ) : items.length === 0 ? (
        <div className="text-muted-foreground">Nessun dettaglio ordine trovato</div>
      ) : (
        <ul className="space-y-1 text-sm">
          {items.map(o => (
            <li key={o.id} className="flex flex-wrap items-center gap-3">
              <span className="font-medium">{o.Numero || o.id}</span>
              <span className="text-muted-foreground">{formatDate(o.Data || undefined, o.createdTime)}</span>
              <span className="text-muted-foreground">{o.Stato || '-'}</span>
              <span className="ml-auto">{formatMoney(o.Totale)}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

