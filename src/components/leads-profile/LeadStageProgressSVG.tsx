'use client';

import { LeadStato } from '@/types/leads';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  stato?: LeadStato;
}

// 🚀 Funnel Ottimizzato V3 - 7 Stati (aggiornato 2025-01-13)
const STAGES: LeadStato[] = [
  'Nuovo',
  'Contattato',        // Rinominato da 'Attivo'
  'Qualificato',
  'In Negoziazione',   // 🆕 Fase calda: appuntamenti, preventivi, trattative
  'Cliente',
  'Sospeso',
  'Perso'              // Rinominato da 'Chiuso'
];

export function LeadStageProgressSVG({ stato }: Props) {
  const idx = stato ? STAGES.indexOf(stato as LeadStato) : -1;
  const isDone = (i: number) => (idx >= 0 ? i < idx : false);
  const isCurrent = (i: number) => i === idx;
  
  // Debug logging
  console.log('📊 [LeadStageProgressSVG] Rendering with:', {
    stato,
    idx,
    stages: STAGES,
  });



  return (
    <div className="w-full">
      {/* Progress bar lineare con step indicators - ora usata per tutti i dispositivi */}
      <div className="space-y-4">
        {/* Progress bar principale */}
        <div className="relative w-full h-6 px-2 sm:h-8 sm:px-4">
          {/* Barra di sfondo - usando lo stesso posizionamento percentuale dei pallini */}
          <div 
            className="absolute top-1/2 transform -translate-y-1/2 bg-gray-300 dark:bg-gray-600 rounded-full h-2 sm:h-3"
            style={{
              left: `${8 + (0 * (100 - 16)) / 100}%`, // Posizione primo pallino
              right: `${8 + ((STAGES.length - 1) * (100 - 16)) / 100}%`, // Inverso dell'ultimo pallino
              width: `${((STAGES.length - 1) / (STAGES.length - 1)) * ((100 - 16))}%`, // Larghezza tra primo e ultimo
            }}
          >
            {/* Barra completata - formula: ((idx) / (N-1)) * 100% */}
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-500 ease-out sm:h-3"
              style={{ 
                width: idx >= 0 && STAGES.length > 1 
                  ? `${(idx / (STAGES.length - 1)) * 100}%` 
                  : '0%' 
              }}
            />
          </div>
          
          {/* Step indicators - posizionati sulla barra ristretta */}
          {STAGES.map((_, i) => {
            const isCompleted = isDone(i);
            const isActive = isCurrent(i);
            
            // Calcolo posizione percentuale sulla barra ristretta
            const position = STAGES.length > 1 ? (i / (STAGES.length - 1)) * 100 : 0;
            
            return (
              <div 
                key={i} 
                className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2"
                style={{ 
                  left: STAGES.length > 1 
                    ? `${8 + (position * (100 - 16)) / 100}%`
                    : '50%'
                }}
              >
                <div className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 bg-background dark:bg-gray-800 sm:w-8 sm:h-8 sm:border-3',
                  {
                    'border-green-500 bg-green-500 text-white': isCompleted,
                    'border-green-600 bg-green-600 text-white scale-110 shadow-md': isActive,
                    'border-gray-400 text-gray-500 dark:border-gray-500 dark:text-gray-400': !isCompleted && !isActive,
                  }
                )}>
                  {isCompleted ? (
                    <Check className="h-3 w-3 sm:h-4 sm:w-4" />
                  ) : (
                    <span className="text-xs font-bold sm:text-sm">{i + 1}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Labels sempre centrate sotto ogni pallino */}
        <div className="relative w-full h-6 sm:h-8">
          {STAGES.map((label, i) => {
            // Stessa posizione percentuale dei pallini
            const position = STAGES.length > 1 ? (i / (STAGES.length - 1)) * 100 : 0;
            
            return (
              <div 
                key={label} 
                className={cn(
                  'absolute top-0 text-xs font-medium transition-colors duration-200 whitespace-nowrap -translate-x-1/2 sm:text-sm',
                  {
                    'text-green-600 dark:text-green-400': isCurrent(i),
                    'text-green-500 dark:text-green-400': isDone(i),
                    'text-gray-500 dark:text-gray-400': !isCurrent(i) && !isDone(i),
                  }
                )}
                style={{ 
                  left: STAGES.length > 1 
                    ? `${8 + (position * (100 - 16)) / 100}%`
                    : '50%'
                }}
              >
                {label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
