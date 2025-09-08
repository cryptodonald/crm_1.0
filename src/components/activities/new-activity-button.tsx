'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { NewActivityModal } from './new-activity-modal';

interface NewActivityButtonProps {
  prefilledLeadId?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function NewActivityButton({ 
  prefilledLeadId, 
  variant = 'default',
  size = 'default',
  className 
}: NewActivityButtonProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    // You can add any post-creation logic here
    console.log('Activity created successfully!');
    // Refresh the activities list if needed
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant={variant}
        size={size}
        className={className}
      >
        <Plus className="mr-2 h-4 w-4" />
        Nuova Attività
      </Button>
      
      <NewActivityModal
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleSuccess}
        prefilledLeadId={prefilledLeadId}
      />
    </>
  );
}
