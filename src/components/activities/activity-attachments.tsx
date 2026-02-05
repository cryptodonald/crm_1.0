'use client';

import { UseFormReturn } from 'react-hook-form';
import type { ActivityFormData } from '@/types/activities';

interface ActivityAttachmentsProps {
  form: UseFormReturn<ActivityFormData>;
  activityId?: string;
}

// Placeholder per allegati attività
export function ActivityAttachments({ form, activityId }: ActivityAttachmentsProps) {
  return null;
}
