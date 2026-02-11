'use client';

import { UseFormReturn } from 'react-hook-form';
import { ActivityFormData } from '@/types/activities';
import { ActivityAttachments } from '../activity-attachments';

interface AllegatiStepProps {
  form: UseFormReturn<ActivityFormData>;
  activityId?: string;
}

export function AllegatiStep({ form, activityId }: AllegatiStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1 pb-2">
        <h3 className="text-lg font-semibold">Allegati</h3>
        <p className="text-sm text-muted-foreground">
          Aggiungi documenti relativi a questa attività.
        </p>
      </div>

      <div className="border-t border-border/50 pt-4">
        <ActivityAttachments form={form} activityId={activityId} />
      </div>
    </div>
  );
}
