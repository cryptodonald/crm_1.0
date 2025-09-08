'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { LeadData } from '@/types/leads';
import { LeadActivitiesKanban } from '@/components/features/activities/LeadActivitiesKanban';
import { NotesPanel } from '@/components/leads-detail/NotesPanel';
import { FilesPanel } from '@/components/leads-detail/FilesPanel';
import { LeadOrdersMockPanel } from './OrdersMockPanel';

interface LeadProfileContentProps {
  lead: LeadData;
}

export function LeadProfileContent({ lead }: LeadProfileContentProps) {
  return (
    <Tabs defaultValue="activity" className="space-y-4 sm:space-y-6">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
        <TabsTrigger value="activity" className="text-sm sm:text-base">Attività</TabsTrigger>
        <TabsTrigger value="orders" className="text-sm sm:text-base">Ordini</TabsTrigger>
        <TabsTrigger value="notes" className="text-sm sm:text-base">Note</TabsTrigger>
        <TabsTrigger value="files" className="text-sm sm:text-base">Allegati</TabsTrigger>
      </TabsList>

      <TabsContent value="activity" className="space-y-4 sm:space-y-6">
        <LeadActivitiesKanban leadId={lead.ID} />
      </TabsContent>

      <TabsContent value="orders" className="space-y-4 sm:space-y-6">
        <LeadOrdersMockPanel />
      </TabsContent>

      <TabsContent value="notes" className="space-y-4 sm:space-y-6">
        <NotesPanel lead={lead} onUpdate={() => Promise.resolve(true)} />
      </TabsContent>

      <TabsContent value="files" className="space-y-4 sm:space-y-6">
        <FilesPanel lead={lead} />
      </TabsContent>
    </Tabs>
  );
}
