'use client';

import { Button } from '@/components/ui/button';
import { Download, Trash2, X, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTableBulkActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onExport: () => void;
  onDelete: () => void;
  onMerge?: () => void;
  className?: string;
}

export function DataTableBulkActions({
  selectedCount,
  onClearSelection,
  onExport,
  onDelete,
  onMerge,
  className
}: DataTableBulkActionsProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2",
      className
    )}>
      {/* Counter e Clear */}
      <div className="flex items-center gap-2 bg-background border border-border rounded-md px-3 py-1.5">
        <span className="text-sm font-medium">
          {selectedCount} selezionat{selectedCount === 1 ? 'o' : 'i'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-4 w-4 p-0 hover:bg-muted"
        >
          <X className="h-3 w-3" />
          <span className="sr-only">Deseleziona tutto</span>
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        {selectedCount >= 2 && onMerge && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMerge}
            className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-600 transition-all duration-200 group"
            title="Unisci selezionati"
          >
            <Link2 className="h-4 w-4 transition-all duration-200 group-hover:scale-110" />
            <span className="sr-only">Unisci</span>
          </Button>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onExport}
          className="h-8 w-8 p-0 hover:bg-muted"
          title="Esporta selezionati"
        >
          <Download className="h-4 w-4" />
          <span className="sr-only">Esporta</span>
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-8 w-8 p-0 hover:bg-destructive hover:text-white transition-all duration-200 group"
          title="Elimina selezionati"
        >
          <Trash2 className="h-4 w-4 transition-all duration-200 group-hover:scale-110 group-hover:text-white" />
          <span className="sr-only">Elimina</span>
        </Button>
      </div>
    </div>
  );
}
