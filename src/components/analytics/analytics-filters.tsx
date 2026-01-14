'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-picker';
import { DateRange } from 'react-day-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter } from 'lucide-react';
import type { LeadSource } from '@/types/analytics';

interface AnalyticsFiltersProps {
  onFilterChange: (filters: { 
    dateStart?: string; 
    dateEnd?: string;
    fonte?: LeadSource;
  }) => void;
}

export function AnalyticsFilters({ onFilterChange }: AnalyticsFiltersProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedFonte, setSelectedFonte] = useState<LeadSource | 'all'>('all');

  const sources: LeadSource[] = ['Meta', 'Instagram', 'Google', 'Sito', 'Referral', 'Organico'];

  const applyFilters = () => {
    const filters: { dateStart?: string; dateEnd?: string; fonte?: LeadSource } = {};
    
    if (dateRange?.from && dateRange?.to) {
      filters.dateStart = dateRange.from.toISOString().split('T')[0];
      filters.dateEnd = dateRange.to.toISOString().split('T')[0];
    }
    
    if (selectedFonte !== 'all') {
      filters.fonte = selectedFonte;
    }
    
    onFilterChange(filters);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
      const filters: any = {
        dateStart: range.from.toISOString().split('T')[0],
        dateEnd: range.to.toISOString().split('T')[0],
      };
      if (selectedFonte !== 'all') {
        filters.fonte = selectedFonte;
      }
      onFilterChange(filters);
    } else {
      onFilterChange(selectedFonte !== 'all' ? { fonte: selectedFonte } : {});
    }
  };

  const handleFonteChange = (value: string) => {
    const newFonte = value as LeadSource | 'all';
    setSelectedFonte(newFonte);
    
    const filters: any = {};
    if (dateRange?.from && dateRange?.to) {
      filters.dateStart = dateRange.from.toISOString().split('T')[0];
      filters.dateEnd = dateRange.to.toISOString().split('T')[0];
    }
    if (newFonte !== 'all') {
      filters.fonte = newFonte;
    }
    
    onFilterChange(filters);
  };

  // Quick filters
  const setQuickFilter = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const range = { from: start, to: end };
    setDateRange(range);
    
    const filters: any = {
      dateStart: start.toISOString().split('T')[0],
      dateEnd: end.toISOString().split('T')[0],
    };
    
    if (selectedFonte !== 'all') {
      filters.fonte = selectedFonte;
    }
    
    onFilterChange(filters);
  };

  const handleReset = () => {
    setDateRange(undefined);
    setSelectedFonte('all');
    onFilterChange({});
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range Picker */}
          <div className="flex-1 min-w-[280px] max-w-[320px]">
            <DateRangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              placeholder="Seleziona periodo"
              className="w-full"
            />
          </div>

          {/* Fonte Select */}
          <div className="w-[180px]">
            <Select value={selectedFonte} onValueChange={handleFonteChange}>
              <SelectTrigger>
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Tutte le fonti" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutte le fonti</SelectItem>
                {sources.map((fonte) => (
                  <SelectItem key={fonte} value={fonte}>
                    {fonte}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickFilter(7)}
            >
              7gg
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickFilter(30)}
            >
              30gg
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickFilter(90)}
            >
              90gg
            </Button>
          </div>

          {/* Reset Button */}
          {(dateRange || selectedFonte !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="ml-auto"
            >
              Reset filtri
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
