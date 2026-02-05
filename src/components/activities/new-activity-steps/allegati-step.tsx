'use client';

import { UseFormReturn } from 'react-hook-form';
import { ActivityFormData } from '@/types/activities';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { FormMessageSubtle } from '@/components/ui/form-message-subtle';
import { Textarea } from '@/components/ui/textarea';
import { ActivityAttachments } from '../activity-attachments';

interface AllegatiStepProps {
  form: UseFormReturn<ActivityFormData>;
  activityId?: string; // Optional activity ID for edit mode
}

export function AllegatiStep({ form, activityId }: AllegatiStepProps) {
  const { control } = form;
  
  return (
    <div className="space-y-6">
      <div className="space-y-1 pb-2">
        <h3 className="text-lg font-semibold">Note & Allegati</h3>
        <p className="text-sm text-muted-foreground">
          Aggiungi note e documenti relativi a questa attività.
        </p>
      </div>
      
      <div className="border-t border-border/50 pt-4 space-y-6">
        {/* Note */}
        <FormField
          control={control}
          name="Note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Inserisci note o dettagli sull'attività..."
                  className="min-h-[60px] resize-none"
                  maxLength={1000}
                />
              </FormControl>
              <FormMessageSubtle />
            </FormItem>
          )}
        />
        
        {/* Allegati */}
        <div>
          <ActivityAttachments form={form} activityId={activityId} />
        </div>
      </div>
    </div>
  );
}
