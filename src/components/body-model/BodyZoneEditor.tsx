'use client';

import { useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEFAULT_ZONE_OVERRIDES, type ZoneOverrides } from '@/types/body-model';

// ─── Zone configuration ─────────────────────────────────────────────────────

const ZONE_SLIDERS: {
  key: keyof ZoneOverrides;
  label: string;
  description: string;
}[] = [
  { key: 'shoulders', label: 'Spalle', description: 'Larghezza e volume spalle' },
  { key: 'chest', label: 'Torace', description: 'Ampiezza toracica' },
  { key: 'waist', label: 'Vita', description: 'Circonferenza vita' },
  { key: 'hips', label: 'Anche', description: 'Larghezza anche/bacino' },
  { key: 'thighs', label: 'Cosce', description: 'Volume cosce' },
  { key: 'calves', label: 'Polpacci', description: 'Volume polpacci' },
];

// ─── Component ──────────────────────────────────────────────────────────────

interface BodyZoneEditorProps {
  zoneOverrides: ZoneOverrides;
  onChange: (overrides: ZoneOverrides) => void;
  className?: string;
}

export function BodyZoneEditor({
  zoneOverrides,
  onChange,
  className,
}: BodyZoneEditorProps) {
  const handleSliderChange = useCallback(
    (key: keyof ZoneOverrides, values: number[]) => {
      onChange({
        ...zoneOverrides,
        [key]: values[0],
      });
    },
    [zoneOverrides, onChange],
  );

  const handleReset = useCallback(() => {
    onChange({ ...DEFAULT_ZONE_OVERRIDES });
  }, [onChange]);

  const hasChanges = Object.values(zoneOverrides).some((v) => v !== 0);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            Regolazione Zone
          </h3>
          <p className="text-xs text-muted-foreground">
            Ridistribuisci manualmente le masse corporee
          </p>
        </div>
        {hasChanges && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 gap-1.5 text-xs"
          >
            <RotateCcw className="size-3" />
            Reset
          </Button>
        )}
      </div>

      {/* Sliders */}
      <div className="space-y-3">
        {ZONE_SLIDERS.map(({ key, label, description }) => {
          const value = zoneOverrides[key];
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground/80">
                  {label}
                </label>
                <span
                  className={cn(
                    'text-[10px] font-mono tabular-nums',
                    value === 0
                      ? 'text-muted-foreground'
                      : value > 0
                        ? 'text-blue-400'
                        : 'text-blue-300',
                  )}
                >
                  {value > 0 ? '+' : ''}
                  {value.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[value]}
                min={-0.5}
                max={0.5}
                step={0.05}
                onValueChange={(values) => handleSliderChange(key, values)}
                aria-label={description}
                className="w-full"
              />
            </div>
          );
        })}
      </div>

      {/* Info */}
      <p className="text-[10px] text-muted-foreground/60 leading-tight">
        Muovi gli slider per regolare il volume di ciascuna zona. Il modello 3D
        e il point cloud si aggiorneranno in tempo reale.
      </p>
    </div>
  );
}
