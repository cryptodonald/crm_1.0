'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeadStato } from '@/types/leads';

interface LeadStageProgressProps {
  stato: LeadStato | undefined;
}

const STAGES: LeadStato[] = ['Nuovo', 'Attivo', 'Qualificato', 'Cliente'];

function Segment({
  label,
  state,
  isLast,
}: {
  label: string;
  state: 'done' | 'current' | 'future';
  isLast: boolean;
}) {
  const base = 'relative flex items-center gap-3 h-14 px-10 text-base font-medium select-none transition-colors';
  const rounded = cn(!isLast ? 'rounded-l-full' : 'rounded-full');
  const colorBg =
    state === 'done'
      ? 'bg-emerald-50 dark:bg-emerald-900/50'
      : state === 'current'
      ? 'bg-emerald-600'
      : 'bg-gray-100 dark:bg-gray-800';
  const colorText = state === 'current' ? 'text-white' : state === 'done' ? 'text-emerald-800 dark:text-emerald-200' : 'text-gray-600 dark:text-gray-300';
  const arrowColor = state === 'current' ? 'border-l-emerald-600' : state === 'done' ? 'border-l-emerald-50 dark:border-l-emerald-900/50' : 'border-l-gray-100 dark:border-l-gray-800';

  return (
    <div className={cn(base, rounded, colorBg, colorText)}>
      {state === 'done' ? (
        <Check className={cn('h-4 w-4', state === 'current' ? 'text-white' : 'text-emerald-700')} />
      ) : state === 'current' ? (
        <span className="h-2.5 w-2.5 rounded-full bg-white/90" />
      ) : (
        <span className="h-2.5 w-2.5 rounded-full bg-foreground/30 opacity-60" />
      )}
      <span className="truncate">{label}</span>

      {/* Arrow color (segment shape) */}
      {!isLast && (
        <span className={cn('pointer-events-none absolute top-0 -right-8 z-[1] h-0 w-0 border-y-[28px] border-y-transparent border-l-[28px]', arrowColor)} />
      )}
      {/* White divider wedge */}
      {!isLast && (
        <span className="pointer-events-none absolute top-0 -right-8 z-[2] h-0 w-0 border-y-[28px] border-y-transparent border-l-[14px] border-l-white dark:border-l-gray-900" />
      )}
    </div>
  );
}

export function LeadStageProgress({ stato }: LeadStageProgressProps) {
  const currentIndex = stato ? STAGES.indexOf(stato as LeadStato) : -1;
  const isClosed = stato === 'Chiuso';
  const isSuspended = stato === 'Sospeso';

  return (
    <div className={cn('w-full', (isClosed || isSuspended) && 'opacity-95')} aria-label="Lead stage progress">
      <div className="relative flex items-stretch gap-0 overflow-visible w-full">
        {STAGES.map((stage, idx) => {
          const isLast = idx === STAGES.length - 1;
          const state: 'done' | 'current' | 'future' =
            (isClosed || isSuspended)
              ? (idx <= (currentIndex >= 0 ? currentIndex : STAGES.length - 1) ? 'done' : 'future')
              : currentIndex > idx
              ? 'done'
              : currentIndex === idx
              ? 'current'
              : 'future';
          return (
            <div className="relative flex-1" style={{ zIndex: STAGES.length - idx }} key={stage}>
              <Segment label={stage} state={state} isLast={isLast && !(isClosed || isSuspended)} />
            </div>
          );
        })}

        {(isClosed || isSuspended) && (
          <div
            className={cn(
              'relative flex items-center gap-2 px-8 py-4 text-base font-semibold rounded-r-full',
              isClosed && 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
              isSuspended && 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200'
            )}
          >
            {isClosed ? 'Chiuso' : 'Sospeso'}
          </div>
        )}
      </div>
    </div>
  );
}
