'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TimeSelectProps {
  value?: string; // "HH:mm" format
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TimeSelect({
  value,
  onChange,
  placeholder = '10:30',
  disabled = false,
  className,
}: TimeSelectProps) {
  return (
    <Input
      type="time"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        'bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none',
        className
      )}
    />
  );
}
