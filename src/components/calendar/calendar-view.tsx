'use client';

/**
 * 📅 CalendarView - Componente principale vista calendario
 * 
 * Supporta multiple viste:
 * - Vista mese: Griglia 7x6 giorni
 * - Vista settimana: Timeline 7 giorni con orari
 * - Vista giorno: Timeline dettagliata singolo giorno
 * - Vista agenda: Lista attività ordinate per data
 */

import React from 'react';
import { format, isSameDay, isSameMonth, isToday, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Plus } from 'lucide-react';
import type { CalendarView } from '@/hooks/use-calendar';
import type { ActivityData } from '@/types/activities';
import { KANBAN_COLUMNS, getKanbanColumnFromState } from '@/types/activities';

// ===== TYPES =====
interface CalendarViewProps {
  view: CalendarView;
  currentDate: Date;
  selectedDate: Date | null;
  activities: ActivityData[];
  onDateClick: (date: Date) => void;
  onActivityClick: (activity: ActivityData) => void;
  onCreateActivity: (date: Date) => void;
  isToday: (date: Date) => boolean;
  isSelected: (date: Date) => boolean;
  isCurrentMonth: (date: Date) => boolean;
  className?: string;
}

// ===== ACTIVITY CARD COMPONENT =====
const ActivityCard: React.FC<{
  activity: ActivityData;
  compact?: boolean;
  onClick: () => void;
}> = ({ activity, compact = false, onClick }) => {
  const kanbanColumn = getKanbanColumnFromState(activity.Stato);
  const columnConfig = KANBAN_COLUMNS[kanbanColumn];
  
  // Determina il colore in base allo stato
  const getStatusColor = (stato: string) => {
    switch (kanbanColumn) {
      case 'to-do':
        return 'bg-blue-100 border-blue-200 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 border-yellow-200 text-yellow-800';
      case 'done':
        return 'bg-green-100 border-green-200 text-green-800';
      default:
        return 'bg-gray-100 border-gray-200 text-gray-800';
    }
  };

  const getPriorityColor = (priorita?: string) => {
    switch (priorita) {
      case 'Urgente':
        return 'bg-red-500';
      case 'Alta':
        return 'bg-orange-500';
      case 'Media':
        return 'bg-yellow-500';
      case 'Bassa':
        return 'bg-green-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getTypeIcon = (tipo: string) => {
    switch (tipo) {
      case 'Chiamata':
        return '📞';
      case 'WhatsApp':
        return '💬';
      case 'Email':
        return '📧';
      case 'SMS':
        return '💬';
      case 'Consulenza':
        return '👥';
      case 'Follow-up':
        return '🔄';
      default:
        return '📋';
    }
  };

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          'w-full text-left px-2 py-1 rounded text-xs border transition-colors hover:opacity-80',
          getStatusColor(activity.Stato)
        )}
      >
        <div className="flex items-center gap-1">
          <span>{getTypeIcon(activity.Tipo)}</span>
          <span className="truncate flex-1">
            {activity['Nome Lead'] && activity['Nome Lead'][0] || 'Attività'}
          </span>
          {activity.Priorità && (
            <div className={cn('w-2 h-2 rounded-full', getPriorityColor(activity.Priorità))} />
          )}
        </div>
        {activity.Data && (
          <div className="text-xs opacity-60 mt-1">
            {format(new Date(activity.Data), 'HH:mm')}
          </div>
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-colors hover:opacity-80',
        getStatusColor(activity.Stato)
      )}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg">{getTypeIcon(activity.Tipo)}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">
              {activity['Nome Lead'] && activity['Nome Lead'][0] || 'Attività'}
            </span>
            {activity.Priorità && (
              <div className={cn('w-3 h-3 rounded-full', getPriorityColor(activity.Priorità))} />
            )}
          </div>
          <div className="text-sm opacity-70 mt-1">
            {activity.Tipo} - {activity.Stato}
          </div>
          {activity.Data && (
            <div className="flex items-center gap-1 text-xs opacity-60 mt-1">
              <Clock className="w-3 h-3" />
              {format(new Date(activity.Data), 'HH:mm')}
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

// ===== MONTH VIEW COMPONENT =====
const MonthView: React.FC<{
  currentDate: Date;
  selectedDate: Date | null;
  activities: ActivityData[];
  onDateClick: (date: Date) => void;
  onActivityClick: (activity: ActivityData) => void;
  onCreateActivity: (date: Date) => void;
  isToday: (date: Date) => boolean;
  isSelected: (date: Date) => boolean;
  isCurrentMonth: (date: Date) => boolean;
}> = ({ 
  currentDate, 
  selectedDate, 
  activities, 
  onDateClick, 
  onActivityClick, 
  onCreateActivity, 
  isToday: checkIsToday, 
  isSelected, 
  isCurrentMonth 
}) => {
  // Calcola i giorni da mostrare (6 settimane complete)
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weeks: Date[][] = [];
  
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // Raggruppa attività per data
  const activitiesByDate = React.useMemo(() => {
    const grouped: Record<string, ActivityData[]> = {};
    activities.forEach(activity => {
      if (activity.Data) {
        const dateKey = format(new Date(activity.Data), 'yyyy-MM-dd');
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(activity);
      }
    });
    return grouped;
  }, [activities]);

  const getActivitiesForDate = (date: Date): ActivityData[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return activitiesByDate[dateKey] || [];
  };

  const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  return (
    <div className="flex flex-col h-full">
      {/* Header giorni della settimana */}
      <div className="grid grid-cols-7 gap-px bg-muted p-1 rounded-t-lg">
        {dayNames.map(day => (
          <div key={day} className="bg-background p-2 text-center font-medium text-sm text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Griglia calendario */}
      <div className="flex-1 grid grid-rows-6 gap-px bg-muted p-1 rounded-b-lg">
        {weeks.map((week, weekIndex) => (
          <React.Fragment key={weekIndex}>
            {week.map(day => {
              const dayActivities = getActivitiesForDate(day);
              const isDayToday = checkIsToday(day);
              const isDaySelected = isSelected(day);
              const isDayCurrentMonth = isCurrentMonth(day);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'bg-background p-2 flex flex-col gap-1 min-h-[120px] cursor-pointer transition-colors',
                    'hover:bg-muted/50',
                    isDaySelected && 'ring-2 ring-primary',
                    !isDayCurrentMonth && 'text-muted-foreground bg-muted/30'
                  )}
                  onClick={() => onDateClick(day)}
                >
                  {/* Numero giorno */}
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'text-sm font-medium',
                      isDayToday && 'bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center'
                    )}>
                      {format(day, 'd')}
                    </span>
                    {/* Bottone aggiungi attività */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-5 h-5 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateActivity(day);
                      }}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Attività del giorno */}
                  <div className="flex-1 space-y-1 overflow-hidden">
                    {dayActivities.slice(0, 3).map(activity => (
                      <ActivityCard
                        key={activity.id}
                        activity={activity}
                        compact
                        onClick={() => onActivityClick(activity)}
                      />
                    ))}
                    {dayActivities.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center py-1">
                        +{dayActivities.length - 3} altre
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// ===== WEEK VIEW COMPONENT =====
const WeekView: React.FC<{
  currentDate: Date;
  activities: ActivityData[];
  onActivityClick: (activity: ActivityData) => void;
  onCreateActivity: (date: Date) => void;
}> = ({ currentDate, activities, onActivityClick, onCreateActivity }) => {
  // Calcola i giorni della settimana
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(weekStart, { weekStartsOn: 1 })
  });

  // Ore della giornata (8-20)
  const hours = Array.from({ length: 13 }, (_, i) => i + 8);

  return (
    <div className="flex flex-col h-full">
      {/* Header giorni */}
      <div className="flex border-b">
        <div className="w-16 p-2 border-r"></div>
        {weekDays.map(day => (
          <div key={day.toISOString()} className="flex-1 p-2 text-center border-r last:border-r-0">
            <div className="font-medium">{format(day, 'EEE d', { locale: it })}</div>
            {isToday(day) && (
              <div className="w-2 h-2 bg-primary rounded-full mx-auto mt-1"></div>
            )}
          </div>
        ))}
      </div>

      {/* Griglia orari */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-h-full">
          {/* Colonna orari */}
          <div className="w-16 border-r">
            {hours.map(hour => (
              <div key={hour} className="h-16 p-2 border-b text-xs text-muted-foreground">
                {hour}:00
              </div>
            ))}
          </div>

          {/* Colonne giorni */}
          {weekDays.map(day => (
            <div key={day.toISOString()} className="flex-1 border-r last:border-r-0">
              {hours.map(hour => (
                <div
                  key={hour}
                  className="h-16 p-1 border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() => {
                    const dateTime = new Date(day);
                    dateTime.setHours(hour, 0, 0, 0);
                    onCreateActivity(dateTime);
                  }}
                >
                  {/* TODO: Mostra attività per questo slot temporale */}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ===== AGENDA VIEW COMPONENT =====
const AgendaView: React.FC<{
  activities: ActivityData[];
  onActivityClick: (activity: ActivityData) => void;
}> = ({ activities, onActivityClick }) => {
  // Raggruppa attività per data
  const activitiesByDate = React.useMemo(() => {
    const grouped: Record<string, ActivityData[]> = {};
    activities
      .filter(activity => activity.Data)
      .sort((a, b) => new Date(a.Data!).getTime() - new Date(b.Data!).getTime())
      .forEach(activity => {
        const dateKey = format(new Date(activity.Data!), 'yyyy-MM-dd');
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(activity);
      });
    return grouped;
  }, [activities]);

  return (
    <div className="space-y-6">
      {Object.entries(activitiesByDate).map(([dateKey, dayActivities]) => (
        <div key={dateKey} className="space-y-2">
          <h3 className="font-semibold text-lg border-b pb-2">
            {format(new Date(dateKey), 'EEEE, d MMMM yyyy', { locale: it })}
          </h3>
          <div className="space-y-2">
            {dayActivities.map(activity => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onClick={() => onActivityClick(activity)}
              />
            ))}
          </div>
        </div>
      ))}
      
      {Object.keys(activitiesByDate).length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nessuna attività programmata</p>
        </div>
      )}
    </div>
  );
};

// ===== MAIN COMPONENT =====
export const CalendarView: React.FC<CalendarViewProps> = ({
  view,
  currentDate,
  selectedDate,
  activities,
  onDateClick,
  onActivityClick,
  onCreateActivity,
  isToday: checkIsToday,
  isSelected,
  isCurrentMonth,
  className
}) => {
  switch (view) {
    case 'month':
      return (
        <div className={cn('h-full', className)}>
          <MonthView
            currentDate={currentDate}
            selectedDate={selectedDate}
            activities={activities}
            onDateClick={onDateClick}
            onActivityClick={onActivityClick}
            onCreateActivity={onCreateActivity}
            isToday={checkIsToday}
            isSelected={isSelected}
            isCurrentMonth={isCurrentMonth}
          />
        </div>
      );
    
    case 'week':
      return (
        <div className={cn('h-full', className)}>
          <WeekView
            currentDate={currentDate}
            activities={activities}
            onActivityClick={onActivityClick}
            onCreateActivity={onCreateActivity}
          />
        </div>
      );
    
    case 'agenda':
      return (
        <div className={cn('h-full overflow-auto', className)}>
          <AgendaView
            activities={activities}
            onActivityClick={onActivityClick}
          />
        </div>
      );
    
    default:
      return (
        <div className={cn('h-full', className)}>
          <MonthView
            currentDate={currentDate}
            selectedDate={selectedDate}
            activities={activities}
            onDateClick={onDateClick}
            onActivityClick={onActivityClick}
            onCreateActivity={onCreateActivity}
            isToday={checkIsToday}
            isSelected={isSelected}
            isCurrentMonth={isCurrentMonth}
          />
        </div>
      );
  }
};