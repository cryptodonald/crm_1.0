'use client';

import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { LeadData, LeadFormData } from '@/types/leads';
import { useState } from 'react';
import { toast } from 'sonner';

interface NotesPanelProps {
  lead: LeadData;
  onUpdate: (data: Partial<LeadFormData>) => Promise<boolean> | void;
}

export function NotesPanel({ lead, onUpdate }: NotesPanelProps) {
  const [note, setNote] = useState(lead.Note || '');
  const [esigenza, setEsigenza] = useState(lead.Esigenza || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    try {
      setSaving(true);
      const ok = await onUpdate({ Note: note, Esigenza: esigenza });
      if (ok) {
        toast.success('Note aggiornate');
      } else {
        toast.error("Errore nell'aggiornamento delle note");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-4 space-y-3">
      <div>
        <div className="text-sm font-medium mb-1">Esigenza</div>
        <Textarea value={esigenza} onChange={(e) => setEsigenza(e.target.value)} placeholder="Descrivi l'esigenza del lead" />
      </div>
      <div>
        <div className="text-sm font-medium mb-1">Note</div>
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Aggiungi note interne" rows={6} />
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</Button>
      </div>
    </Card>
  );
}

