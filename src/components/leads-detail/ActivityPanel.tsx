'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

interface Activity {
  id: string;
  type: 'call' | 'email' | 'note' | 'meeting';
  title: string;
  description?: string;
  date?: string;
}

interface ActivityPanelProps {
  activities: Activity[];
  loading?: boolean;
  onAddActivity: (activity: { type: Activity['type']; title: string; description?: string }) => Promise<boolean> | void;
}

export function ActivityPanel({ activities, loading, onAddActivity }: ActivityPanelProps) {
  const [type, setType] = useState<Activity['type']>('note');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return;
    await onAddActivity({ type, title, description });
    setTitle('');
    setDescription('');
    setType('note');
  }

  return (
    <div className="space-y-4">
      {/* Composer */}
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="grid gap-2 md:grid-cols-12">
          <div className="md:col-span-3">
            <Select value={type} onValueChange={(v) => setType(v as Activity['type'])}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">Nota</SelectItem>
                <SelectItem value="call">Chiamata</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-5">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titolo attività" />
          </div>
          <div className="md:col-span-3">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Dettagli (opzionale)" />
          </div>
          <div className="md:col-span-1 flex items-center justify-end">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Aggiungi
            </Button>
          </div>
        </form>
      </Card>

      {/* Timeline */}
      <div className="space-y-2">
        {loading ? (
          <Card className="p-4">Caricamento attività...</Card>
        ) : activities.length === 0 ? (
          <Card className="p-4 text-muted-foreground">Nessuna attività registrata</Card>
        ) : (
          activities.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium">{a.title}</div>
                  {a.description && (
                    <div className="text-sm text-muted-foreground mt-0.5">{a.description}</div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {a.date ? new Date(a.date).toLocaleString('it-IT') : ''}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

