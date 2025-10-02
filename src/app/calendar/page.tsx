'use client';

import React, { useState, useMemo } from 'react';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { CalendarView } from '@/components/calendar/calendar-view';
import { CalendarFilters } from '@/components/calendar/calendar-filters';
import { useCalendar } from '@/hooks/use-calendar';
import { useActivitiesClean } from '@/hooks/use-activities-clean';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Grid3X3,
  List,
  Clock,
  Users,
  Activity,
  CheckCircle,
  Circle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityData } from '@/types/activities';
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<ActivityData | null>(null);

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

  // Statistiche per il periodo corrente
  const stats = useMemo(() => {
    const byStatus = { 'to-do': 0, 'in-progress': 0, 'done': 0 };
    const byPriority = { 'Urgente': 0, 'Alta': 0, 'Media': 0, 'Bassa': 0 };
    let overdueCount = 0;
    const now = new Date();
    
    filteredActivities.forEach(activity => {
      const kanbanColumn = getKanbanColumnFromState(activity.Stato);
      byStatus[kanbanColumn]++;
      
      if (activity.Priorità) {
        byPriority[activity.Priorità as keyof typeof byPriority]++;
      }
      
      // Conta scadute
      if (activity.Data && new Date(activity.Data) < now && !['Completata', 'Annullata'].includes(activity.Stato)) {
        overdueCount++;
      }
    });
    
    return {
      total: filteredActivities.length,
      byStatus,
      byPriority,
      overdueCount
    };
  }, [filteredActivities]);

  // Handlers
  const handleDateClick = (date: Date) => {
    selectDate(date);
  };

  const handleActivityClick = (activity: ActivityData) => {
    setSelectedActivity(activity);
    // TODO: Apri modal dettaglio attività
    toast.info(`Clicked su: ${activity['Nome Lead'] && activity['Nome Lead'][0] || 'Attività'}`);
  };

  const handleCreateActivity = (date: Date) => {
    // TODO: Apri modal creazione attività con data preselezionata
    toast.info(`Crea attività per: ${date.toLocaleDateString('it-IT')}`);
  };

  const handleViewChange = (view: typeof currentView) => {
    setView(view);
  };

  return (
    <AppLayoutCustom>
      <div className="flex flex-col h-full">
        <PageBreadcrumb pageName="Calendario" />
        
        <div className="flex flex-1 gap-6 p-6 overflow-hidden">
          {/* Sidebar Filtri */}
          {sidebarOpen && (
            <div className="w-80 flex-shrink-0 space-y-4">
              {/* Statistiche rapide */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Panoramica
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{stats.byStatus['to-do']}</div>
                      <div className="text-sm text-blue-600">Da fare</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{stats.byStatus['in-progress']}</div>
                      <div className="text-sm text-yellow-600">In corso</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{stats.byStatus['done']}</div>
                      <div className="text-sm text-green-600">Completate</div>
                    </div>
                    {stats.overdueCount > 0 && (
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{stats.overdueCount}</div>
                        <div className="text-sm text-red-600">In ritardo</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Filtri */}
              <CalendarFilters
                activities={activities || []}
                filters={filters}
                onFiltersChange={setFilters}
                onClearFilters={clearFilters}
              />
            </div>
          )}
          
          {/* Area principale calendario */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header con navigazione */}
            <div className="flex items-center justify-between mb-6">
              {/* Navigazione date */}
              <div className="flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={goToPrevious}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <h1 className="text-xl font-semibold">{getDisplayTitle()}</h1>
                
                <Button variant="outline" size="sm" onClick={goToNext}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Oggi
                </Button>
              </div>
              
              {/* Controlli vista e azioni */}
              <div className="flex items-center gap-2">
                {/* Selettore vista */}
                <div className="flex border rounded-lg">
                  <Button
                    variant={currentView === 'month' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleViewChange('month')}
                    className="rounded-r-none"
                  >
                    <Grid3X3 className="w-4 h-4 mr-1" />
                    Mese
                  </Button>
                  <Button
                    variant={currentView === 'week' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleViewChange('week')}
                    className="rounded-none border-x-0"
                  >
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    Settimana
                  </Button>
                  <Button
                    variant={currentView === 'agenda' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => handleViewChange('agenda')}
                    className="rounded-l-none"
                  >
                    <List className="w-4 h-4 mr-1" />
                    Agenda
                  </Button>
                </div>
                
                {/* Toggle sidebar */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  {sidebarOpen ? 'Nascondi' : 'Filtri'}
                </Button>
                
                {/* Crea attività */}
                <Button size="sm" onClick={() => handleCreateActivity(new Date())}>
                  <Plus className="w-4 h-4 mr-1" />
                  Nuova Attività
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
    </AppLayoutCustom>
  );
}
