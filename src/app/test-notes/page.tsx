'use client';

import { useState } from 'react';
import { LeadTimeline } from '@/components/leads/lead-timeline';
import { AddNoteDialog } from '@/components/leads/add-note-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function TestNotesPage() {
  const [leadId, setLeadId] = useState('');
  const [testLeadId, setTestLeadId] = useState('');
  const [showAddNote, setShowAddNote] = useState(false);

  const handleSetLeadId = () => {
    setTestLeadId(leadId);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Test Sistema Note</h1>
        <p className="text-muted-foreground">
          Pagina di test per verificare la Timeline e il sistema di Note
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurazione Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="leadId">Lead ID da Airtable</Label>
            <div className="flex gap-2">
              <Input
                id="leadId"
                placeholder="rec..."
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSetLeadId} disabled={!leadId}>
                Carica Timeline
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Inserisci un Lead ID valido da Airtable (inizia con "rec")
            </p>
          </div>

          {testLeadId && (
            <div className="pt-4 border-t">
              <p className="text-sm">
                <span className="font-medium">Lead ID attivo:</span>{' '}
                <code className="bg-muted px-2 py-1 rounded text-xs">
                  {testLeadId}
                </code>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {testLeadId && (
        <>
          <LeadTimeline
            leadId={testLeadId}
            leadEsigenza="Questa è un'esigenza di test per verificare il funzionamento della timeline"
            leadCreatedAt={new Date().toISOString()}
            activities={[]}
            onAddNote={() => setShowAddNote(true)}
          />

          <AddNoteDialog
            leadId={testLeadId}
            open={showAddNote}
            onOpenChange={setShowAddNote}
          />
        </>
      )}

      {!testLeadId && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Inserisci un Lead ID per visualizzare la Timeline
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
