import React from 'react';
import { cn } from '@/lib/utils';

interface StatIndicatorProps {
  label: string;
  value: string | number;
  className?: string;
}

interface StatsIndicatorsProps {
  stats: StatIndicatorProps[];
  className?: string;
}

/**
 * Componente condiviso per visualizzare indicatori statistici
 * Rispetta il design system grigio dell'app
 */
export function StatsIndicators({ stats, className }: StatsIndicatorsProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-6", className)}>
      {stats.map((stat, index) => (
        <div key={index} className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-muted-foreground/60 rounded-full"></div>
          <span className="text-sm text-muted-foreground">
            <span className="font-medium">{stat.value}</span> {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Componente per singolo indicatore statistico
 */
export function StatIndicator({ label, value, className }: StatIndicatorProps) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="w-2 h-2 bg-muted-foreground/60 rounded-full"></div>
      <span className="text-sm text-muted-foreground">
        <span className="font-medium">{value}</span> {label}
      </span>
    </div>
  );
}