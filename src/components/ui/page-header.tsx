import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatsIndicators } from './stats-indicators';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  stats?: Array<{ label: string; value: string | number }>;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Componente condiviso per header delle pagine
 * Mantiene consistenza nel design e layout
 */
export function PageHeader({
  title,
  description,
  icon: Icon,
  stats,
  actions,
  className
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="space-y-1">
        <div className="flex items-center space-x-3">
          {Icon && <Icon className="h-6 w-6 text-muted-foreground" />}
          <h1 className="text-3xl font-bold tracking-tight">
            {title}
          </h1>
        </div>
        {description && (
          <p className="text-muted-foreground max-w-2xl">
            {description}
          </p>
        )}
        {stats && stats.length > 0 && (
          <StatsIndicators 
            className="mt-3"
            stats={stats}
          />
        )}
      </div>
      
      {actions && (
        <div className="flex items-center space-x-3">
          {actions}
        </div>
      )}
    </div>
  );
}