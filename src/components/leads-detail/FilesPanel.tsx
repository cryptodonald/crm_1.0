'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { LeadData, AirtableAttachment } from '@/types/leads';

interface FilesPanelProps {
  lead: LeadData;
}

export function FilesPanel({ lead }: FilesPanelProps) {
  const [attachments, setAttachments] = useState<AirtableAttachment[]>(
    (lead.Allegati || []) as AirtableAttachment[]
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputId = `file-input-${lead.id}`;

  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ];

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);

    try {
      const uploaded: any[] = [];
      for (const file of Array.from(files)) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          setError(`Tipo non supportato: ${file.name}`);
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          setError(`File troppo grande (max 10MB): ${file.name}`);
          continue;
        }
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Upload failed for ${file.name}`);
        }
        const json = await res.json();
        uploaded.push(json.attachment);
      }

      if (uploaded.length > 0) {
        // Aggiorna il lead con i nuovi allegati
        const newAllegati = [...attachments, ...uploaded];
        const res2 = await fetch(`/api/leads/${lead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ Allegati: newAllegati }),
        });
        if (!res2.ok) {
          const err = await res2.json().catch(() => ({}));
          throw new Error(err.error || 'Aggiornamento lead fallito');
        }
        const updated = await res2.json();
        setAttachments((updated.lead?.Allegati || []) as AirtableAttachment[]);
        toast.success(`${uploaded.length} file caricati`);
      }
    } catch (e) {
      console.error('❌ Upload error:', e);
      setError(e instanceof Error ? e.message : 'Errore upload');
      toast.error('Errore durante l\'upload');
    } finally {
      setUploading(false);
      // Reset input
      const input = document.getElementById(fileInputId) as HTMLInputElement | null;
      if (input) input.value = '';
    }
  };

  const handleRemove = async (attachmentId: string) => {
    try {
      const remaining = attachments.filter(a => a.id !== attachmentId);
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Allegati: remaining }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Aggiornamento lead fallito');
      }
      const updated = await res.json();
      setAttachments((updated.lead?.Allegati || []) as AirtableAttachment[]);
      toast.success('Allegato rimosso');
    } catch (e) {
      console.error('❌ Remove attachment error:', e);
      toast.error('Errore rimozione allegato');
    }
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiato');
    } catch {
      toast.error('Impossibile copiare il link');
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Allegati</div>
        <div className="flex items-center gap-2">
          <input
            id={fileInputId}
            type="file"
            multiple
            accept={ALLOWED_TYPES.join(',')}
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          <label htmlFor={fileInputId}>
            <Button size="sm" disabled={uploading}>
              {uploading ? 'Caricamento...' : 'Carica file'}
            </Button>
          </label>
        </div>
      </div>

      {error && <div className="text-xs text-red-600">{error}</div>}

      {attachments.length === 0 ? (
        <div className="text-muted-foreground">Nessun allegato</div>
      ) : (
        <ul className="space-y-2">
          {attachments.map((f) => (
            <li key={f.id} className="flex items-center gap-2 text-sm">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              <a href={f.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                {f.filename}
              </a>
              {typeof f.size === 'number' && (
                <span className="text-muted-foreground">({Math.round(f.size / 1024)} KB)</span>
              )}
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="xs" onClick={() => handleCopy(f.url)}>Copia link</Button>
                <Button variant="destructive" size="xs" onClick={() => handleRemove(f.id)}>Rimuovi</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

