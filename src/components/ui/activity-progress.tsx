'use client';

import { cn } from '@/lib/utils';
import { ActivityStato } from '@/types/activities';

interface ActivityProgressProps {
  stato: ActivityStato;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showPercentage?: boolean;
}

// Mapping stati → percentuale e colore
const getProgressFromState = (stato: ActivityStato) => {
  switch (stato) {
    case 'Da Pianificare':
      return { 
        percentage: 0, 
        color: 'text-gray-400 dark:text-gray-500', 
        strokeColor: '#9CA3AF', // gray-400
        bgColor: '#F3F4F6', // gray-100
        darkStrokeColor: '#6B7280', // gray-500 per dark mode
        darkBgColor: '#374151' // gray-700 per dark mode
      };
    case 'Pianificata':
      return { 
        percentage: 25, 
        color: 'text-blue-600 dark:text-blue-400', 
        strokeColor: '#2563EB', // blue-600
        bgColor: '#DBEAFE', // blue-100
        darkStrokeColor: '#60A5FA', // blue-400 per dark mode
        darkBgColor: '#1E3A8A' // blue-800 per dark mode
      };
    case 'In attesa':
      return { 
        percentage: 40, 
        color: 'text-orange-600 dark:text-orange-400', 
        strokeColor: '#EA580C', // orange-600
        bgColor: '#FED7AA', // orange-100
        darkStrokeColor: '#FB923C', // orange-400 per dark mode
        darkBgColor: '#C2410C' // orange-700 per dark mode
      };
    case 'In corso':
      return { 
        percentage: 55, 
        color: 'text-yellow-600 dark:text-yellow-400', 
        strokeColor: '#D97706', // yellow-600
        bgColor: '#FEF3C7', // yellow-100
        darkStrokeColor: '#FACC15', // yellow-400 per dark mode
        darkBgColor: '#A16207' // yellow-700 per dark mode
      };
    case 'Rimandata':
      return { 
        percentage: 10, 
        color: 'text-purple-600 dark:text-purple-400', 
        strokeColor: '#9333EA', // purple-600
        bgColor: '#E9D5FF', // purple-100
        darkStrokeColor: '#A855F7', // purple-400 per dark mode
        darkBgColor: '#7C2D12' // purple-700 per dark mode
      };
    case 'Completata':
      return { 
        percentage: 100, 
        color: 'text-green-600 dark:text-green-400', 
        strokeColor: '#16A34A', // green-600
        bgColor: '#DCFCE7', // green-100
        darkStrokeColor: '#4ADE80', // green-400 per dark mode
        darkBgColor: '#15803D' // green-700 per dark mode
      };
    case 'Annullata':
      return { 
        percentage: 0, 
        color: 'text-red-600 dark:text-red-400', 
        strokeColor: '#DC2626', // red-600
        bgColor: '#FEE2E2', // red-100
        darkStrokeColor: '#F87171', // red-400 per dark mode
        darkBgColor: '#B91C1C' // red-700 per dark mode
      };
    default:
      return { 
        percentage: 0, 
        color: 'text-gray-400 dark:text-gray-500', 
        strokeColor: '#9CA3AF',
        bgColor: '#F3F4F6',
        darkStrokeColor: '#6B7280',
        darkBgColor: '#374151'
      };
  }
};

// Configurazioni dimensioni
const sizeConfig = {
  xs: {
    size: 16,
    strokeWidth: 2,
    textSize: 'text-[7px]', // Molto piccolo per cerchi mini
    radius: 6,
  },
  sm: {
    size: 32,
    strokeWidth: 3,
    textSize: 'text-[9px]', // Extra small per cerchi piccoli
    radius: 14,
  },
  md: {
    size: 40,
    strokeWidth: 3,
    textSize: 'text-[10px]', // Più piccolo del text-xs
    radius: 18,
  },
  lg: {
    size: 48,
    strokeWidth: 4,
    textSize: 'text-xs', // text-xs per i cerchi grandi
    radius: 20,
  },
};

export function ActivityProgress({
  stato,
  size = 'md',
  className,
  showPercentage = true,
}: ActivityProgressProps) {
  const progress = getProgressFromState(stato);
  const config = sizeConfig[size];
  
  // Calcolo circonferenza e dash offset per l'animazione
  const circumference = 2 * Math.PI * config.radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress.percentage / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      {/* SVG Progress Circle */}
      <svg
        width={config.size}
        height={config.size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={config.radius}
          stroke={progress.bgColor}
          strokeWidth={config.strokeWidth}
          fill="transparent"
          className="dark:stroke-[var(--dark-bg-color)]"
          style={{'--dark-bg-color': progress.darkBgColor} as any}
        />
        
        {/* Progress circle */}
        <circle
          cx={config.size / 2}
          cy={config.size / 2}
          r={config.radius}
          stroke={progress.strokeColor}
          strokeWidth={config.strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-in-out dark:stroke-[var(--dark-stroke-color)]"
          style={{'--dark-stroke-color': progress.darkStrokeColor} as any}
        />
      </svg>
      
      {/* Percentage text overlay */}
      {showPercentage && (
        <div className={cn(
          'absolute inset-0 flex items-center justify-center font-medium',
          config.textSize,
          progress.color
        )}>
          {progress.percentage}%
        </div>
      )}
    </div>
  );
}

// Componente con layout simile all'immagine (4 stati in fila)
export function ActivityProgressSamples() {
  const sampleStates: { stato: ActivityStato; label: string }[] = [
    { stato: 'Da Pianificare', label: '0%' },
    { stato: 'In attesa', label: '40%' },
    { stato: 'In corso', label: '55%' },
    { stato: 'Completata', label: '100%' },
  ];

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
      {sampleStates.map((sample, index) => (
        <div key={index} className="flex flex-col items-center gap-2">
          <ActivityProgress 
            stato={sample.stato} 
            size="md"
            showPercentage={false}
          />
          <span className="text-sm font-medium text-gray-600">
            {sample.label}
          </span>
        </div>
      ))}
    </div>
  );
}
