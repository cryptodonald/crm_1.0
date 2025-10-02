/**
 * 📅 Hook Calendario - Gestione stato e navigazione calendario
 * 
 * Hook centralizzato per:
 * - Navigazione tra date (mese precedente/successivo)
 * - Cambio viste (mese, settimana, giorno, agenda)
 * - Filtri attività per periodo
 * - Stato UI del calendario
 */

import { useState, useMemo, useCallback } from 'react';
import { addMonths, subMonths, startOfMonth, endOfMonth, format, isSameMonth, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';

// ===== TYPES =====
export type CalendarView = 'month' | 'week' | 'day' | 'agenda';

export interface CalendarFilters {
  stati?: string[];
  priorita?: string[];
  tipi?: string[];
  assegnatari?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface UseCalendarReturn {
  // Date e navigazione
  currentDate: Date;
  selectedDate: Date | null;
  currentView: CalendarView;
  
  // Navigazione
  goToNext: () => void;
  goToPrevious: () => void;
  goToToday: () => void;
  goToDate: (date: Date) => void;
  selectDate: (date: Date | null) => void;
  
  // Viste
  setView: (view: CalendarView) => void;
  
  // Filtri
  filters: CalendarFilters;
  setFilters: (filters: CalendarFilters) => void;
  clearFilters: () => void;
  
  // Utility per le viste
  getDateRange: () => { start: Date; end: Date };
  getDisplayTitle: () => string;
  getDatesInRange: () => Date[];
  
  // Stato UI
  isToday: (date: Date) => boolean;
  isSelected: (date: Date) => boolean;
  isCurrentMonth: (date: Date) => boolean;
}

const DEFAULT_FILTERS: CalendarFilters = {
  stati: [],
  priorita: [],
  tipi: [],
  assegnatari: [],
  dateRange: undefined,
};

// ===== MAIN HOOK =====
export const useCalendar = (): UseCalendarReturn => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentView, setCurrentView] = useState<CalendarView>('month');
  const [filters, setFiltersState] = useState<CalendarFilters>(DEFAULT_FILTERS);

  // ===== NAVIGAZIONE DATE =====
  const goToNext = useCallback(() => {
    setCurrentDate(prev => {
      switch (currentView) {
        case 'month':
          return addMonths(prev, 1);
        case 'week':
          return new Date(prev.getTime() + 7 * 24 * 60 * 60 * 1000);
        case 'day':
          return new Date(prev.getTime() + 24 * 60 * 60 * 1000);
        default:
          return addMonths(prev, 1);
      }
    });
  }, [currentView]);

  const goToPrevious = useCallback(() => {
    setCurrentDate(prev => {
      switch (currentView) {
        case 'month':
          return subMonths(prev, 1);
        case 'week':
          return new Date(prev.getTime() - 7 * 24 * 60 * 60 * 1000);
        case 'day':
          return new Date(prev.getTime() - 24 * 60 * 60 * 1000);
        default:
          return subMonths(prev, 1);
      }
    });
  }, [currentView]);

  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  }, []);

  const goToDate = useCallback((date: Date) => {
    setCurrentDate(date);
    setSelectedDate(date);
  }, []);

  const selectDate = useCallback((date: Date | null) => {
    setSelectedDate(date);
  }, []);

  // ===== GESTIONE VISTE =====
  const setView = useCallback((view: CalendarView) => {
    setCurrentView(view);
  }, []);

  // ===== GESTIONE FILTRI =====
  const setFilters = useCallback((newFilters: CalendarFilters) => {
    setFiltersState(newFilters);
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  // ===== UTILITY DATE RANGE =====
  const getDateRange = useCallback((): { start: Date; end: Date } => {
    switch (currentView) {
      case 'month': {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        return { start, end };
      }
      
      case 'week': {
        // Calcola inizio e fine settimana (lunedì-domenica)
        const start = new Date(currentDate);
        start.setDate(currentDate.getDate() - ((currentDate.getDay() + 6) % 7));
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        
        return { start, end };
      }
      
      case 'day': {
        const start = new Date(currentDate);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(currentDate);
        end.setHours(23, 59, 59, 999);
        
        return { start, end };
      }
      
      case 'agenda': {
        // Per l'agenda, mostra il prossimo mese
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        
        const end = addMonths(start, 1);
        end.setHours(23, 59, 59, 999);
        
        return { start, end };
      }
      
      default:
        return getDateRange();
    }
  }, [currentDate, currentView]);

  // ===== DISPLAY UTILITIES =====
  const getDisplayTitle = useCallback((): string => {
    switch (currentView) {
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale: it });
      case 'week': {
        const { start, end } = getDateRange();
        if (isSameMonth(start, end)) {
          return format(start, "d", { locale: it }) + '-' + format(end, "d MMMM yyyy", { locale: it });
        }
        return format(start, "d MMM", { locale: it }) + ' - ' + format(end, "d MMM yyyy", { locale: it });
      }
      case 'day':
        return format(currentDate, 'EEEE, d MMMM yyyy', { locale: it });
      case 'agenda':
        return 'Prossime attività';
      default:
        return format(currentDate, 'MMMM yyyy', { locale: it });
    }
  }, [currentDate, currentView, getDateRange]);

  const getDatesInRange = useCallback((): Date[] => {
    const { start, end } = getDateRange();
    const dates: Date[] = [];
    const current = new Date(start);
    
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }, [getDateRange]);

  // ===== STATE UTILITIES =====
  const isToday = useCallback((date: Date): boolean => {
    const today = new Date();
    return isSameDay(date, today);
  }, []);

  const isSelected = useCallback((date: Date): boolean => {
    if (!selectedDate) return false;
    return isSameDay(date, selectedDate);
  }, [selectedDate]);

  const isCurrentMonth = useCallback((date: Date): boolean => {
    return isSameMonth(date, currentDate);
  }, [currentDate]);

  return {
    // Date e navigazione
    currentDate,
    selectedDate,
    currentView,
    
    // Navigazione
    goToNext,
    goToPrevious,
    goToToday,
    goToDate,
    selectDate,
    
    // Viste
    setView,
    
    // Filtri
    filters,
    setFilters,
    clearFilters,
    
    // Utility
    getDateRange,
    getDisplayTitle,
    getDatesInRange,
    
    // Stato UI
    isToday,
    isSelected,
    isCurrentMonth,
  };
};