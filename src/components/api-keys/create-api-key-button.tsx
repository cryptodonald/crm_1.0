'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CreateApiKeyButtonProps {
  onClick: () => void;
  loading?: boolean;
  className?: string;
}

export function CreateApiKeyButton({ onClick, loading, className }: CreateApiKeyButtonProps) {
  return (
    <Button 
      onClick={onClick} 
      disabled={loading}
      className={className}
    >
      <Plus className="mr-2 h-4 w-4" />
      Create API Key
    </Button>
  );
}
