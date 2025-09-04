'use client';

import * as React from 'react';
import { Table } from '@tanstack/react-table';

import { cn } from '@/lib/utils';

interface DataTableAdvancedToolbarProps<TData>
  extends React.HTMLAttributes<HTMLDivElement> {
  table: Table<TData>;
}

export function DataTableAdvancedToolbar<TData>({
  table,
  children,
  className,
  ...props
}: DataTableAdvancedToolbarProps<TData>) {
  return (
    <div
      className={cn(
        'flex w-full items-center justify-between space-x-2 overflow-auto p-1',
        className
      )}
      {...props}
    >
      <div className="flex flex-1 items-center space-x-2">{children}</div>
    </div>
  );
}
