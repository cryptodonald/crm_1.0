'use client';

import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  StickyNote,
  Activity,
  ShoppingCart,
  Paperclip,
} from 'lucide-react';

export type LeadSection =
  | 'overview'
  | 'notes'
  | 'activities'
  | 'orders'
  | 'files';

interface LeadSidebarNavProps {
  activeSection: LeadSection;
  onSectionChange: (section: LeadSection) => void;
  activityCount?: number;
  noteCount?: number;
  orderCount?: number;
  fileCount?: number;
}

const NAV_ITEMS = [
  {
    id: 'overview' as LeadSection,
    label: 'Panoramica',
    icon: LayoutDashboard,
  },
  {
    id: 'notes' as LeadSection,
    label: 'Note',
    icon: StickyNote,
    countKey: 'noteCount' as const,
  },
  {
    id: 'activities' as LeadSection,
    label: 'Attività',
    icon: Activity,
    countKey: 'activityCount' as const,
  },
  {
    id: 'orders' as LeadSection,
    label: 'Ordini',
    icon: ShoppingCart,
    countKey: 'orderCount' as const,
  },
  {
    id: 'files' as LeadSection,
    label: 'File',
    icon: Paperclip,
    countKey: 'fileCount' as const,
  },
];

export function LeadSidebarNav({
  activeSection,
  onSectionChange,
  activityCount = 0,
  noteCount = 0,
  orderCount = 0,
  fileCount = 0,
}: LeadSidebarNavProps) {
  const counts = {
    activityCount,
    noteCount,
    orderCount,
    fileCount,
  };

  return (
    <nav className="flex flex-col gap-1 p-2">
      {NAV_ITEMS.map((item: typeof NAV_ITEMS[number]) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;
        const count = item.countKey ? counts[item.countKey as keyof typeof counts] : undefined;

        return (
          <button
            key={item.id}
            onClick={() => onSectionChange(item.id)}
            className={cn(
              'flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </div>
            {count !== undefined && count > 0 && (
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-semibold',
                  isActive
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
