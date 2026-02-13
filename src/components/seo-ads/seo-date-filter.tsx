'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type DatePreset = '7d' | '30d' | '90d';

interface SeoDateFilterProps {
  value: DatePreset;
  onChange: (preset: DatePreset) => void;
  className?: string;
}

const presets: { value: DatePreset; label: string }[] = [
  { value: '7d', label: 'Ultimi 7 giorni' },
  { value: '30d', label: 'Ultimi 30 giorni' },
  { value: '90d', label: 'Ultimi 90 giorni' },
];

/**
 * Converte un preset in date_from / date_to ISO strings.
 */
export function presetToDates(preset: DatePreset): {
  date_from: string;
  date_to: string;
} {
  const now = new Date();
  const to = now.toISOString().split('T')[0]; // YYYY-MM-DD

  const daysMap: Record<DatePreset, number> = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
  };

  const from = new Date(now);
  from.setDate(from.getDate() - daysMap[preset]);

  return {
    date_from: from.toISOString().split('T')[0],
    date_to: to,
  };
}

export function SeoDateFilter({ value, onChange, className }: SeoDateFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as DatePreset)}>
      <SelectTrigger className={className ?? 'w-[180px]'}>
        <SelectValue placeholder="Periodo" />
      </SelectTrigger>
      <SelectContent>
        {presets.map((p) => (
          <SelectItem key={p.value} value={p.value}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
