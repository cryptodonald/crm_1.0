'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LeadData, LeadFormData, LeadStato } from '@/types/leads';
import { Phone, Mail, TrendingUp, Plus } from 'lucide-react';
import { NewActivityModal } from '@/components/activities';

interface LeadActionsCardProps {
  lead: LeadData;
  onCall: () => void;
  onEmail: () => void;
  onUpdate: (data: Partial<LeadFormData>) => Promise<boolean> | void;
}

export function LeadActionsCard({ lead, onCall, onEmail, onUpdate }: LeadActionsCardProps) {
  const [showNewActivityModal, setShowNewActivityModal] = useState(false);
  
  const canCall = !!lead.Telefono;
  const canEmail = !!lead.Email;

  const nextState = (current: LeadStato | undefined): LeadStato => {
    const order: LeadStato[] = ['Nuovo', 'Attivo', 'Qualificato', 'Cliente', 'Chiuso', 'Sospeso'];
    const idx = current ? order.indexOf(current) : -1;
    return order[Math.min(Math.max(idx + 1, 1), order.length - 2)] as LeadStato; // avanza ma evita Chiuso/Sospeso automatici
  };

  const handleActivitySuccess = () => {
    // Attività creata con successo - potremmo aggiornare i dati del lead se necessario
    console.log(`✅ Nuova attività creata per il lead ${lead.Nome || lead.ID}`);
  };

  return (
    <>
      <Card className="p-4 space-y-3">
        <div className="font-semibold">Azioni rapide</div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onCall} disabled={!canCall}>
            <Phone className="mr-2 h-4 w-4" /> Chiama
          </Button>
          <Button size="sm" variant="secondary" onClick={onEmail} disabled={!canEmail}>
            <Mail className="mr-2 h-4 w-4" /> Email
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdate({ Stato: nextState(lead.Stato) })}
          >
            <TrendingUp className="mr-2 h-4 w-4" /> Avanza stato
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNewActivityModal(true)}
            className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" /> Crea attività
          </Button>
        </div>
      </Card>

      {/* Modal per creare nuova attività */}
      <NewActivityModal
        open={showNewActivityModal}
        onOpenChange={setShowNewActivityModal}
        onSuccess={handleActivitySuccess}
        prefilledLeadId={lead.ID}
      />
    </>
  );
}
