"use client";

import * as React from "react";
import { Check, PlusCircle, XCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Option } from "@/types/data-table";

interface DataTablePersistentFilterProps {
  title?: string;
  options: Option[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  onReset: () => void;
  renderOption?: (option: Option, isSelected: boolean) => React.ReactNode;
  renderSelectedBadge?: (option: Option) => React.ReactNode;
}

export function DataTablePersistentFilter({
  title,
  options,
  selectedValues,
  onSelectionChange,
  onReset,
  renderOption,
  renderSelectedBadge,
}: DataTablePersistentFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  
  // Doppio sistema di controllo per prevenire chiusure
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

  const handleReset = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onReset();
    setOpen(false);
    preventCloseRef.current = false;
  }, [onReset]);
  
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
        <Button variant="outline" size="sm" className="border-dashed">
          {selectedValues.length > 0 ? (
            <div
              role="button"
              aria-label={`Clear ${title} filter`}
              tabIndex={0}
              onClick={handleReset}
              className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <XCircle className="h-4 w-4" />
            </div>
          ) : (
            <PlusCircle className="h-4 w-4" />
          )}
          {title}
          {selectedValues.length > 0 && (
            <>
              <Separator
                orientation="vertical"
                className="mx-0.5 data-[orientation=vertical]:h-4"
              />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden"
              >
                {selectedValues.length}
              </Badge>
              <div className="hidden items-center gap-1 lg:flex">
                {selectedValues.length > 2 ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal"
                  >
                    {selectedValues.length} selezionati
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedSet.has(option.value))
                    .map((option) => (
                      renderSelectedBadge ? (
                        <div key={option.value}>
                          {renderSelectedBadge(option)}
                        </div>
                      ) : (
                        <Badge
                          variant="secondary"
                          key={option.value}
                          className="rounded-sm px-1 font-normal"
                        >
                          {option.label}
                        </Badge>
                      )
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[200px] p-0" 
        align="start"
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
            placeholder={title}
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
                  className="flex cursor-pointer items-center px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
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
                  <div
                    className={cn(
                      "mr-3 flex h-4 w-4 items-center justify-center rounded-sm border-2",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/25"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  {renderOption ? (
                    <div className="flex-1 flex items-center">
                      {renderOption(option, isSelected)}
                    </div>
                  ) : (
                    <>
                      {option.icon && <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                      <span className="flex-1 truncate font-medium">{option.label}</span>
                    </>
                  )}
                  {(option.count !== undefined) && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {option.count}
                    </span>
                  )}
                </div>
              );
            })
          )}
          {selectedValues.length > 0 && (
            <>
              <Separator className="my-1" />
              <div
                className="flex cursor-pointer items-center justify-center px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={handleReset}
              >
                Rimuovi filtri
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
