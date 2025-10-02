'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { CalendarView } from '@/components/calendar/calendar-view';
import { NewActivityModal } from '@/components/activities/new-activity-modal';
import { DataTablePersistentFilter } from '@/components/data-table/data-table-persistent-filter';
import { useCalendar } from '@/hooks/use-calendar';
import { useActivitiesClean } from '@/hooks/use-activities-clean';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Grid3X3,
  List,
  Clock,
  AlertCircle,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityData, ActivityStato, ActivityTipo } from '@/types/activities';
import { KANBAN_COLUMNS, getKanbanColumnFromState } from '@/types/activities';
import { toast } from 'sonner';

export default function CalendarPage() {
  // Hook calendario per navigazione e filtri
  const {
    currentDate,
    selectedDate,
    currentView,
    filters,
    goToNext,
    goToPrevious,
    goToToday,
    goToDate,
    selectDate,
    setView,
    setFilters,
    clearFilters,
    getDateRange,
    getDisplayTitle,
    isToday,
    isSelected,
    isCurrentMonth
  } = useCalendar();

  // Hook attività - carica tutte le attività
  const {
    activities,
    loading: activitiesLoading,
    error: activitiesError,
    createActivity,
    updateActivity,
    deleteActivity
  } = useActivitiesClean(undefined, { loadAll: true });

  // Stato UI locale
  const [selectedActivity, setSelectedActivity] = useState<ActivityData | null>(null);
  
  // Stato per il modal di attività
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [preselectedDate, setPreselectedDate] = useState<Date | null>(null);
  const [editingActivity, setEditingActivity] = useState<ActivityData | null>(null);

  // Filtra attività in base ai filtri attivi
  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    
    let filtered = [...activities];
    
    // Filtro per data range (in base alla vista corrente)
    const { start, end } = getDateRange();
    filtered = filtered.filter(activity => {
      if (!activity.Data) return false;
      const activityDate = new Date(activity.Data);
      return activityDate >= start && activityDate <= end;
    });
    
    // Filtro per stati
    if (filters.stati && filters.stati.length > 0) {
      filtered = filtered.filter(activity => 
        filters.stati!.includes(activity.Stato)
      );
    }
    
    // Filtro per priorità
    if (filters.priorita && filters.priorita.length > 0) {
      filtered = filtered.filter(activity => 
        activity.Priorità && filters.priorita!.includes(activity.Priorità)
      );
    }
    
    // Filtro per tipi
    if (filters.tipi && filters.tipi.length > 0) {
      filtered = filtered.filter(activity => 
        filters.tipi!.includes(activity.Tipo)
      );
    }
    
    return filtered;
  }, [activities, filters, getDateRange]);

  // useEffect per aprire il modal quando editingActivity viene settato (risolve race condition)
  useEffect(() => {
    if (editingActivity && !activityModalOpen) {
      setActivityModalOpen(true);
    }
  }, [editingActivity, activityModalOpen]);

  // Handlers
  const handleDateClick = (date: Date) => {
    selectDate(date);
  };

  const handleActivityClick = (activity: ActivityData) => {
    // FORZA chiusura del modal e reset completo degli stati
    setActivityModalOpen(false);
    setEditingActivity(null);
    setSelectedActivity(null);
    setPreselectedDate(null);
    
    // Usa timeout per assicurare che gli stati siano resettati prima di settare i nuovi
    setTimeout(() => {
      setSelectedActivity(activity);
      setEditingActivity(activity);
      setPreselectedDate(null);
    }, 100); // 100ms dovrebbero bastare per il reset
  };

  const handleCreateActivity = (date: Date) => {
    setEditingActivity(null);
    setPreselectedDate(date);
    setActivityModalOpen(true);
  };
  
  const handleNewActivityClick = () => {
    setEditingActivity(null);
    setPreselectedDate(null);
    setActivityModalOpen(true);
  };
  
  const handleActivityModalSuccess = async (updatedActivity?: ActivityData) => {
    // Ricarica le attività per avere i dati più recenti
    // L'hook useActivitiesClean dovrebbe gestire automaticamente il refresh
    toast.success('Attività aggiornata nel calendario!');
    
    // Reset stati modal
    setEditingActivity(null);
    setPreselectedDate(null);
  };
  
  // Handler per quando il modal si chiude (sia per success che per cancel)
  const handleActivityModalClose = (open: boolean) => {
    setActivityModalOpen(open);
    if (!open) {
      // Reset editing activity when modal closes
      setEditingActivity(null);
      setSelectedActivity(null);
      setPreselectedDate(null);
    }
  };
  
  // Effetto per gestire la preselezionamento data nel modal
  // Quando il modal si apre con una data preselezionata, iniettiamo la data nel localStorage
  // in modo che il modal la rilevi come parte di una "bozza"
  useEffect(() => {
    if (activityModalOpen && preselectedDate && !editingActivity) {
      // Creiamo una bozza temporanea con la data preselezionata
      const preselectedActivity = {
        Data: preselectedDate.toISOString(),
        Tipo: 'Chiamata',
        Stato: 'Pianificata',
        Priorità: 'Media',
        'Durata stimata': 30,
        'ID Lead': [],
        Assegnatario: [],
        Note: '',
        Obiettivo: '',
        Esito: '',
        'Prossima azione': '',
        'Data prossima azione': null,
        allegati: []
      };
      
      // Salva temporaneamente nel localStorage per il modal
      const draftKey = 'newActivityDraft';
      const timestampKey = 'newActivityDraftTimestamp';
      
      // Backup della bozza esistente se presente
      const existingDraft = localStorage.getItem(draftKey);
      const existingTimestamp = localStorage.getItem(timestampKey);
      
      // Imposta la bozza con la data preselezionata
      localStorage.setItem(draftKey, JSON.stringify(preselectedActivity));
      localStorage.setItem(timestampKey, Date.now().toString());
      
      // Cleanup quando il modal si chiude
      return () => {
        // Ripristina la bozza originale se c'era
        if (existingDraft && existingTimestamp) {
          localStorage.setItem(draftKey, existingDraft);
          localStorage.setItem(timestampKey, existingTimestamp);
        } else {
          localStorage.removeItem(draftKey);
          localStorage.removeItem(timestampKey);
        }
      };
    }
  }, [activityModalOpen, preselectedDate, editingActivity]);

  const handleViewChange = (view: typeof currentView) => {
    setView(view);
  };

  return (
    <AppLayoutCustom>
      <div className="flex flex-col h-full">
        <PageBreadcrumb pageName="Calendario" />
        
        <div className="flex flex-1 p-6 overflow-hidden">
          {/* Area principale calendario */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header con navigazione */}
            <div className="flex items-center justify-between mb-6 gap-4">
              {/* Navigazione date */}
              <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
                <Button variant="outline" size="sm" onClick={goToPrevious}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <h1 className="text-base md:text-xl font-semibold whitespace-nowrap overflow-hidden text-ellipsis min-w-0 flex-shrink">
                  {getDisplayTitle()}
                </h1>
                
                <Button variant="outline" size="sm" onClick={goToNext}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                
                <Button variant="outline" size="sm" onClick={goToToday} className="hidden sm:flex">
                  Oggi
                </Button>
                
                {/* Filtri inline accanto a Oggi */}
                {!activitiesLoading && !activitiesError && (
                  <>
                    {/* Filtro Stato */}
                    <DataTablePersistentFilter
                      title="Stato"
                      options={(() => {
                        // Calcola conteggi per ogni stato
                        const counts: Record<string, number> = {};
                        (activities || []).forEach(activity => {
                          counts[activity.Stato] = (counts[activity.Stato] || 0) + 1;
                        });
                        
                        const allStati = Array.from(new Set((activities || []).map(a => a.Stato).filter(Boolean)));
                        return allStati.map(stato => ({
                          label: stato,
                          value: stato,
                          count: counts[stato] || 0,
                        }));
                      })()}
                      selectedValues={filters.stati || []}
                      onSelectionChange={(values) => {
                        setFilters({ ...filters, stati: values.length ? values : undefined });
                      }}
                      onReset={() => {
                        setFilters({ ...filters, stati: undefined });
                      }}
                    />
                    
                    {/* Filtro Tipo */}
                    <DataTablePersistentFilter
                      title="Tipo"
                      options={(() => {
                        // Calcola conteggi per ogni tipo
                        const counts: Record<string, number> = {};
                        (activities || []).forEach(activity => {
                          counts[activity.Tipo] = (counts[activity.Tipo] || 0) + 1;
                        });
                        
                        const allTipi = Array.from(new Set((activities || []).map(a => a.Tipo).filter(Boolean)));
                        return allTipi.map(tipo => ({
                          label: tipo,
                          value: tipo,
                          count: counts[tipo] || 0,
                        }));
                      })()}
                      selectedValues={filters.tipi || []}
                      onSelectionChange={(values) => {
                        setFilters({ ...filters, tipi: values.length ? values : undefined });
                      }}
                      onReset={() => {
                        setFilters({ ...filters, tipi: undefined });
                      }}
                    />
                    
                    {/* Reset generale - appare solo se ci sono filtri attivi */}
                    {((filters.stati && filters.stati.length > 0) || (filters.tipi && filters.tipi.length > 0)) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                        className="h-8 px-2 lg:px-3"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Reset
                      </Button>
                    )}
                  </>
                )}
              </div>
              
              {/* Controlli vista e azioni */}
              <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                {/* Selettore vista - compatto su mobile */}
                <div className="flex border rounded-lg">
                  <Button
                    variant={currentView === 'month' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleViewChange('month')}
                    className="rounded-r-none px-2"
                  >
                    <Grid3X3 className="w-4 h-4" />
                    <span className="hidden md:inline ml-1">Mese</span>
                  </Button>
                  <Button
                    variant={currentView === 'week' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleViewChange('week')}
                    className="rounded-none border-x-0 px-2"
                  >
                    <CalendarIcon className="w-4 h-4" />
                    <span className="hidden md:inline ml-1">Sett</span>
                  </Button>
                  <Button
                    variant={currentView === 'agenda' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleViewChange('agenda')}
                    className="rounded-l-none px-2"
                  >
                    <List className="w-4 h-4" />
                    <span className="hidden md:inline ml-1">Agenda</span>
                  </Button>
                </div>
                
                {/* Crea attività */}
                <Button size="sm" onClick={handleNewActivityClick} className="px-2">
                  <Plus className="w-4 h-4" />
                  <span className="hidden md:inline ml-1">Nuova Attività</span>
                </Button>
              </div>
            </div>
            
            {/* Loading e errori */}
            {activitiesLoading && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">Caricamento attività...</p>
                </div>
              </div>
            )}
            
            {activitiesError && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-red-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                  <p>Errore nel caricamento: {activitiesError}</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Riprova
                  </Button>
                </div>
              </div>
            )}
            
            {/* Calendario principale */}
            {!activitiesLoading && !activitiesError && (
              <div className="flex-1 overflow-hidden">
                <CalendarView
                  view={currentView}
                  currentDate={currentDate}
                  selectedDate={selectedDate}
                  activities={filteredActivities}
                  onDateClick={handleDateClick}
                  onActivityClick={handleActivityClick}
                  onCreateActivity={handleCreateActivity}
                  isToday={isToday}
                  isSelected={isSelected}
                  isCurrentMonth={isCurrentMonth}
                  className="h-full"
                />
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modal per creazione/modifica attività */}
      <NewActivityModal
        open={activityModalOpen}
        onOpenChange={handleActivityModalClose}
        onSuccess={handleActivityModalSuccess}
        activity={editingActivity}
        prefilledLeadId={undefined}
      />
    </AppLayoutCustom>
  );
}
