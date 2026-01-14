'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LeadData, LeadFormData } from '@/types/leads';
import { useState } from 'react';
import { toast } from 'sonner';
import { AINotesField } from '@/components/activities/ai-notes-field';

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
    <Card className="p-4 space-y-4">
      <div>
        <div className="text-sm font-medium mb-2">Esigenza</div>
        <AINotesField 
          value={esigenza} 
          onChange={setEsigenza} 
          placeholder="Descrivi l'esigenza del lead"
          maxLength={500}
        />
      </div>
      <div>
        <div className="text-sm font-medium mb-2">Note</div>
        <AINotesField 
          value={note} 
          onChange={setNote} 
          placeholder="Aggiungi note interne"
          maxLength={1000}
        />
      </div>
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</Button>
      </div>
    </Card>
  );
}

