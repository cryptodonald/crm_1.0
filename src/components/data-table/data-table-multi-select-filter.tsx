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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Option } from "@/types/data-table";

interface DataTableMultiSelectFilterProps {
  title?: string;
  options: Option[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  onReset: () => void;
}

export function DataTableMultiSelectFilter({
  title,
  options,
  selectedValues,
  onSelectionChange,
  onReset,
}: DataTableMultiSelectFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  
  // Refs per controllare lo stato senza causare re-render
  const isSelectingRef = React.useRef(false);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  // Filtra opzioni basate sulla ricerca
  const filteredOptions = React.useMemo(() => {
    if (!searchTerm) return options;
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  const selectedSet = new Set(selectedValues);

  const handleToggleOption = React.useCallback((optionValue: string) => {
    // Imposta il flag di selezione attiva
    isSelectingRef.current = true;
    
    const newValues = selectedSet.has(optionValue)
      ? selectedValues.filter(v => v !== optionValue)
      : [...selectedValues, optionValue];
    
    onSelectionChange(newValues);
    
    // Reset del flag dopo un breve delay
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      isSelectingRef.current = false;
    }, 100);
  }, [selectedValues, selectedSet, onSelectionChange]);

  const handleReset = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onReset();
    setOpen(false);
  }, [onReset]);
  
  // Gestione apertura/chiusura del popover con controllo selezione
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    // Se stiamo selezionando, non chiudere il popover
    if (!newOpen && isSelectingRef.current) {
      return;
    }
    setOpen(newOpen);
  }, []);
  
  // Cleanup del timeout su unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
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
                    {selectedValues.length} selected
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedSet.has(option.value))
                    .map((option) => (
                      <Badge
                        variant="secondary"
                        key={option.value}
                        className="rounded-sm px-1 font-normal"
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[12.5rem] p-0" align="start">
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={title}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="max-h-[18.75rem] overflow-y-auto overflow-x-hidden">
          {filteredOptions.length === 0 ? (
            <div className="p-2 text-center text-sm text-muted-foreground">
              No results found.
            </div>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = selectedSet.has(option.value);
              return (
                <div
                  key={option.value}
                  className="flex cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleOption(option.value);
                  }}
                >
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                  >
                    <Check className="h-4 w-4" />
                  </div>
                  {option.icon && <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />}
                  <span className="flex-1 truncate">{option.label}</span>
                  {option.count && (
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {option.count}
                    </span>
                  )}
                </div>
              );
            })
          )}
          {selectedValues.length > 0 && (
            <>
              <Separator />
              <div
                className="flex cursor-pointer items-center justify-center px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={handleReset}
              >
                Clear filters
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
