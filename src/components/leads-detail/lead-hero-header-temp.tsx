'use client';

import { Card } from '@/components/ui/card';

interface LeadHeroHeaderProps {
  lead: any;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCall: () => void;
  onEmail: () => void;
}

export function LeadHeroHeader({ lead }: LeadHeroHeaderProps) {
  return (
    <Card className="p-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Dettaglio Lead</h1>
        <p className="text-muted-foreground">
          {lead?.Nome || 'Nome non disponibile'} - Componente in lavorazione
        </p>
      </div>
    </Card>
  );
}
