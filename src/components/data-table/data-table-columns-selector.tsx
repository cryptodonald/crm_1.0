"use client";

import * as React from "react";
import { Check, Settings2, Search, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { cn } from "@/lib/utils";

interface ColumnOption {
  label: string;
  value: string;
}

interface DataTableColumnsSelectorProps {
  title?: string;
  options: ColumnOption[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
}

export function DataTableColumnsSelector({
  title = "View",
  options,
  selectedValues,
  onSelectionChange,
}: DataTableColumnsSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  
  // Refs per controllare lo stato senza causare re-render
  const preventCloseRef = React.useRef(false);
  const selectionTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Filtra opzioni basate sulla ricerca
  const filteredOptions = React.useMemo(() => {
    if (!searchTerm) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const selectedSet = new Set(selectedValues);

  const handleToggleOption = React.useCallback((optionValue: string) => {
    // Blocca la chiusura del popover
    preventCloseRef.current = true;
    
    const newValues = selectedSet.has(optionValue)
      ? selectedValues.filter(v => v !== optionValue)
      : [...selectedValues, optionValue];
    
    // Chiama il callback ma mantieni il popover aperto
    onSelectionChange(newValues);
    
    // Reset del flag di protezione con delay
    if (selectionTimeoutRef.current) {
      clearTimeout(selectionTimeoutRef.current);
    }
    selectionTimeoutRef.current = setTimeout(() => {
      preventCloseRef.current = false;
    }, 200);
  }, [selectedValues, selectedSet, onSelectionChange]);
  
  // Gestione personalizzata dell'apertura/chiusura
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    // Se stiamo cercando di chiudere ma c'è la protezione attiva, ignora
    if (!newOpen && preventCloseRef.current) {
      return;
    }
    
    setOpen(newOpen);
    
    // Reset search quando si chiude
    if (!newOpen) {
      setSearchTerm("");
    }
  }, []);

  // Gestione click fuori dal componente
  const handlePopoverClick = React.useCallback((e: React.MouseEvent) => {
    // Previene la propagazione dell'evento per evitare chiusure accidentali
    e.stopPropagation();
  }, []);
  
  // Cleanup dei timeout
  React.useEffect(() => {
    return () => {
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="mr-2 h-4 w-4" />
          {title}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[200px] p-0" 
        align="end"
        onClick={handlePopoverClick}
        ref={contentRef}
        onPointerDownOutside={(e) => {
          // Se stiamo selezionando, previeni la chiusura
          if (preventCloseRef.current) {
            e.preventDefault();
          }
        }}
      >
        <div className="flex items-center border-b px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            placeholder="Cerca colonne..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <div className="max-h-[18.75rem] overflow-y-auto overflow-x-hidden">
          {filteredOptions.length === 0 ? (
            <div className="p-2 text-center text-sm text-muted-foreground">
              Nessun risultato trovato.
            </div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = selectedSet.has(option.value);
              return (
                <div
                  key={option.value}
                  className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleOption(option.value);
                  }}
                  onMouseDown={(e) => {
                    // Previeni il default comportamento che potrebbe chiudere il popover
                    e.preventDefault();
                  }}
                >
                  <span className="font-medium">{option.label}</span>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
