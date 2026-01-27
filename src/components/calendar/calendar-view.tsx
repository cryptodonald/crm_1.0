'use client';

/**
 * 📅 CalendarView - Replica Google Calendar per CRM
 * 
 * Design coerente con il resto del CRM:
 * - Vista mese: Griglia Google Calendar classica
 * - Vista settimana: Timeline con slot orari
 * - Vista agenda: Lista attività cronologica
 * - Colori: Solo muted, primary, secondary (no custom colors)
 * - Icone: Solo Lucide React (no emoji)
 */

import React from 'react';
import { format, isSameDay, isSameMonth, isToday, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar, Clock, Plus, Phone, Mail, MessageSquare, Users, RotateCcw, FileText, ExternalLink } from 'lucide-react';
import type { CalendarView } from '@/hooks/use-calendar';
import type { ActivityData } from '@/types/activities';
import { KANBAN_COLUMNS, getKanbanColumnFromState } from '@/types/activities';
import type { CalendarEvent, GoogleCalendarEventFormatted } from '@/lib/google-calendar-adapter';
import {
  isGoogleCalendarEvent,
  getEventDate,
  getEventTitle,
  getEventType,
  getEventStatus,
  getEventNotes,
} from '@/lib/google-calendar-adapter';

// ===== TYPES =====
interface CalendarViewProps {
  view: CalendarView;
  currentDate: Date;
  selectedDate: Date | null;
  activities: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onActivityClick: (activity: ActivityData | GoogleCalendarEventFormatted) => void;
  onCreateActivity: (date: Date) => void;
  isToday: (date: Date) => boolean;
  isSelected: (date: Date) => boolean;
  isCurrentMonth: (date: Date) => boolean;
  className?: string;
}

// ===== ACTIVITY CARD COMPONENT =====
const ActivityCard: React.FC<{
  activity: CalendarEvent;
  compact?: boolean;
  onClick: () => void;
}> = ({ activity, compact = false, onClick }) => {
  const isGoogleEvent = isGoogleCalendarEvent(activity);
  
  // Per eventi Google Calendar, usa uno stato fisso
  const kanbanColumn = isGoogleEvent ? 'done' : getKanbanColumnFromState((activity as ActivityData).Stato);
  const columnConfig = KANBAN_COLUMNS[kanbanColumn];
  
  // Determina il colore in base allo stato
  // Usa colori distintivi per ogni categoria di stato
  const getStatusVariant = (stato: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch (kanbanColumn) {
      case 'to-do':
        return 'outline'; // Blu outline per attività da fare
      case 'in-progress':
        return 'secondary'; // Ambra per attività in corso
      case 'done':
        return 'default'; // Verde per attività completate
      default:
        return 'outline';
    }
  };

  const getStatusClasses = (stato: string) => {
    switch (kanbanColumn) {
      case 'to-do':
        return 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100'; // Blu per attività da fare
      case 'in-progress':
        return 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100'; // Ambra per in corso
      case 'done':
        return 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200'; // Verde per completate
      default:
        return 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getPriorityIndicator = (priorita?: string) => {
    // Solo un piccolo indicatore, no colori invasivi
    switch (priorita) {
      case 'Urgente':
        return 'border-l-2 border-l-destructive';
      case 'Alta':
        return 'border-l-2 border-l-primary';
      default:
        return '';
    }
  };

  const getTypeIcon = (tipo: string) => {
    const iconProps = { className: 'w-3 h-3 text-muted-foreground' };
    if (tipo === 'Evento Google Calendar') {
      return <ExternalLink {...iconProps} />; // Icona diversa per Google Calendar
    }
    switch (tipo) {
      case 'Chiamata':
        return <Phone {...iconProps} />;
      case 'WhatsApp':
        return <MessageSquare {...iconProps} />;
      case 'Email':
        return <Mail {...iconProps} />;
      case 'SMS':
        return <MessageSquare {...iconProps} />;
      case 'Consulenza':
        return <Users {...iconProps} />;
      case 'Follow-up':
        return <RotateCcw {...iconProps} />;
      default:
        return <FileText {...iconProps} />;
    }
  };

  if (compact) {
    // Versione compatta per celle calendario - stile Google Calendar
    const eventTitle = getEventTitle(activity);
    const eventType = getEventType(activity);
    const eventDate = getEventDate(activity);
    const eventStatus = getEventStatus(activity);
    
    return (
      <div
        onClick={onClick}
        className={cn(
          'w-full text-left px-1.5 py-1 mb-0.5 rounded-sm border transition-all cursor-pointer text-xs',
          'hover:shadow-sm hover:border-foreground/30 hover:bg-background/50',
          isGoogleEvent ? 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-100' : getStatusClasses((activity as ActivityData).Stato),
          !isGoogleEvent && getPriorityIndicator((activity as ActivityData).Priorità),
          // Rendi le attività completate leggermente più opache
          kanbanColumn === 'done' && 'opacity-80'
        )}
      >
        <div className="flex items-center gap-1 min-w-0">
          <div className="flex-shrink-0">
            {getTypeIcon(eventType)}
          </div>
          <div className="truncate flex-1 font-medium leading-tight">
            {eventTitle}
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5 leading-none">
          {format(eventDate, 'HH:mm')}
        </div>
      </div>
    );
  }

  // Versione espansa per vista agenda
  const eventTitle = getEventTitle(activity);
  const eventType = getEventType(activity);
  const eventDate = getEventDate(activity);
  const eventStatus = getEventStatus(activity);
  const eventNotes = getEventNotes(activity);
  
  return (
    <div
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-lg border transition-all cursor-pointer',
        'hover:shadow-sm hover:border-foreground/20 bg-background',
        isGoogleEvent ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30' : getStatusClasses((activity as ActivityData).Stato),
        !isGoogleEvent && getPriorityIndicator((activity as ActivityData).Priorità),
        // Rendi le attività completate leggermente più opache
        kanbanColumn === 'done' && 'opacity-80'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {getTypeIcon(eventType)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-sm truncate">
                {eventTitle}
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {eventType}
              </p>
            </div>
            <Badge variant={getStatusVariant(eventStatus)} className="text-xs shrink-0 ml-2">
              {eventStatus}
            </Badge>
          </div>
          
          {eventNotes && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {eventNotes}
            </p>
          )}
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
            <Clock className="w-3 h-3" />
            {format(eventDate, 'EEEE d MMMM, HH:mm', { locale: it })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== DAY ACTIVITIES POPOVER COMPONENT =====
const DayActivitiesPopover: React.FC<{
  date: Date;
  activities: CalendarEvent[];
  onActivityClick: (activity: CalendarEvent) => void;
  children: React.ReactNode;
}> = ({ date, activities, onActivityClick, children }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4" />
            <h3 className="font-semibold">
              {format(date, 'EEEE, d MMMM yyyy', { locale: it })}
            </h3>
            <Badge variant="outline" className="text-xs">
              {activities.length}
            </Badge>
          </div>
          
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {activities.map((activity, index) => (
              <div
                key={activity.id}
                onClick={() => {
                  setOpen(false);
                  onActivityClick(activity);
                }}
                className="cursor-pointer"
              >
                <ActivityCard
                  activity={activity}
                  compact={true}
                  onClick={() => {}} // onClick vuoto per evitare conflitti
                />
              </div>
            ))}
          </div>
          
          {activities.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nessuna attività per questo giorno
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

// ===== MONTH VIEW COMPONENT =====
const MonthView: React.FC<{
  currentDate: Date;
  selectedDate: Date | null;
  activities: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onActivityClick: (activity: CalendarEvent) => void;
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
    const grouped: Record<string, CalendarEvent[]> = {};
    activities.forEach(activity => {
      const eventDate = getEventDate(activity);
      const dateKey = format(eventDate, 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(activity);
    });
    return grouped;
  }, [activities]);

  const getActivitiesForDate = (date: Date): CalendarEvent[] => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return activitiesByDate[dateKey] || [];
  };

  const dayNames = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  return (
    <div className="flex flex-col h-full bg-background border rounded-lg">
      {/* Header giorni della settimana - stile Google Calendar */}
      <div className="grid grid-cols-7 border-b">
        {dayNames.map(day => (
          <div key={day} className="p-3 text-center font-medium text-sm text-muted-foreground border-r last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Griglia calendario - celle più grandi stile Google */}
      <div className="flex-1 flex flex-col">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex-1 grid grid-cols-7 border-b last:border-b-0">
            {week.map(day => {
              const dayActivities = getActivitiesForDate(day);
              const isDayToday = checkIsToday(day);
              const isDaySelected = isSelected(day);
              const isDayCurrentMonth = isCurrentMonth(day);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    // Responsive: più piccole su mobile, più grandi su desktop
                    'relative min-h-[110px] md:min-h-[130px] lg:min-h-[150px] p-1.5 md:p-2.5 border-r last:border-r-0 cursor-pointer transition-colors group overflow-hidden',
                    'hover:bg-muted/30 touch-manipulation', // touch-friendly
                    isDaySelected && 'bg-primary/5 ring-1 ring-primary/20',
                    !isDayCurrentMonth && 'text-muted-foreground/50 bg-muted/10'
                  )}
                  onClick={() => onDateClick(day)}
                >
                  {/* Header cella con numero giorno */}
                  <div className="flex items-center justify-between mb-2">
                    {/* Numero del giorno - cliccabile se ci sono molte attività */}
                    {dayActivities.length > 4 ? (
                      <DayActivitiesPopover
                        date={day}
                        activities={dayActivities}
                        onActivityClick={onActivityClick}
                      >
                        <div 
                          className={cn(
                            'relative cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors',
                            'text-sm font-semibold',
                            isDayToday && 'text-primary',
                            !isDayToday && isDayCurrentMonth && 'text-foreground',
                            !isDayCurrentMonth && 'text-muted-foreground/50'
                          )}
                          onClick={(e) => e.stopPropagation()}
                          title={`Vedi tutte le ${dayActivities.length} attività`}
                        >
                          {format(day, 'd')}
                          {isDayToday && (
                            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full"></div>
                          )}
                        </div>
                      </DayActivitiesPopover>
                    ) : (
                      <div className="relative">
                        <span className={cn(
                          'text-sm font-semibold inline-block',
                          isDayToday && 'text-primary',
                          !isDayToday && isDayCurrentMonth && 'text-foreground',
                          !isDayCurrentMonth && 'text-muted-foreground/50'
                        )}>
                          {format(day, 'd')}
                        </span>
                        {isDayToday && (
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-primary rounded-full"></div>
                        )}
                      </div>
                    )}
                    
                    {/* Bottone add attività - visibile al hover */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreateActivity(day);
                      }}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Lista attività del giorno */}
                  <div className="space-y-1 overflow-hidden">
                    {dayActivities.slice(0, 4).map((activity, index) => (
                      <div
                        key={activity.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onActivityClick(activity);
                        }}
                      >
                        <ActivityCard
                          activity={activity}
                          compact
                          onClick={() => onActivityClick(activity)}
                        />
                      </div>
                    ))}
                    
                    {/* Indicator per attività aggiuntive con popover */}
                    {dayActivities.length > 4 && (
                      <DayActivitiesPopover
                        date={day}
                        activities={dayActivities}
                        onActivityClick={onActivityClick}
                      >
                        <div 
                          className="text-xs text-muted-foreground px-2 py-1 hover:bg-muted/50 rounded cursor-pointer transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          +{dayActivities.length - 4} altre attività
                        </div>
                      </DayActivitiesPopover>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// ===== WEEK VIEW COMPONENT =====
const WeekView: React.FC<{
  currentDate: Date;
  activities: CalendarEvent[];
  onActivityClick: (activity: CalendarEvent) => void;
  onCreateActivity: (date: Date) => void;
  isToday: (date: Date) => boolean;
}> = ({ currentDate, activities, onActivityClick, onCreateActivity, isToday: checkIsToday }) => {
  // Calcola i giorni della settimana
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(weekStart, { weekStartsOn: 1 })
  });

  // Ore della giornata (8-20)
  const hours = Array.from({ length: 13 }, (_, i) => i + 8);
  
  // Filtra e raggruppa attività per giorno e ora
  const getActivitiesForDayAndHour = (day: Date, hour: number) => {
    return activities.filter(activity => {
      const activityDate = getEventDate(activity);
      return (
        isSameDay(activityDate, day) &&
        activityDate.getHours() === hour
      );
    });
  };
  
  // Ottieni tutte le attività per un giorno
  const getActivitiesForDay = (day: Date) => {
    return activities.filter(activity => {
      const activityDate = getEventDate(activity);
      return isSameDay(activityDate, day);
    });
  };

  return (
    <div className="flex flex-col h-full bg-background border rounded-lg">
      {/* Header giorni della settimana - stile come MonthView */}
      <div className="grid grid-cols-8 border-b">
        <div className="p-3 border-r text-xs text-muted-foreground"></div>
        {weekDays.map(day => {
          const isDayToday = checkIsToday(day);
          return (
            <div key={day.toISOString()} className="p-3 text-center border-r last:border-r-0">
              <div className="font-medium text-sm mb-1">{format(day, 'EEE', { locale: it })}</div>
              <div className={cn(
                'text-lg font-semibold h-8 w-8 flex items-center justify-center rounded-full mx-auto transition-colors',
                isDayToday && 'bg-primary text-primary-foreground',
                !isDayToday && 'text-foreground hover:bg-muted'
              )}>
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Griglia orari con stile simile al mese */}
      <div className="flex-1 overflow-auto">
        {hours.map(hour => (
          <div key={hour} className="grid grid-cols-8 border-b last:border-b-0 min-h-[80px]">
            {/* Colonna orari */}
            <div className="p-2 border-r text-xs text-muted-foreground bg-muted/20 flex items-start">
              <span className="font-medium">{hour}:00</span>
            </div>
            
            {/* Colonne giorni */}
            {weekDays.map(day => {
              const hourActivities = getActivitiesForDayAndHour(day, hour);
              const dayActivities = getActivitiesForDay(day);
              
              return (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className={cn(
                    'relative p-2 border-r last:border-r-0 cursor-pointer transition-colors group min-h-[80px]',
                    'hover:bg-muted/30'
                  )}
                  onClick={() => {
                    const dateTime = new Date(day);
                    dateTime.setHours(hour, 0, 0, 0);
                    onCreateActivity(dateTime);
                  }}
                >
                  {/* Bottone add attività - visibile al hover */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      const dateTime = new Date(day);
                      dateTime.setHours(hour, 0, 0, 0);
                      onCreateActivity(dateTime);
                    }}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                  
                  {/* Attività per questo slot temporale */}
                  <div className="space-y-1">
                    {hourActivities.slice(0, 2).map((activity) => (
                      <div
                        key={activity.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onActivityClick(activity);
                        }}
                      >
                        <ActivityCard
                          activity={activity}
                          compact={true}
                          onClick={() => onActivityClick(activity)}
                        />
                      </div>
                    ))}
                    {hourActivities.length > 2 && (
                      <DayActivitiesPopover
                        date={day}
                        activities={hourActivities}
                        onActivityClick={onActivityClick}
                      >
                        <div 
                          className="text-xs text-muted-foreground px-2 py-1 hover:bg-muted/50 rounded cursor-pointer transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          +{hourActivities.length - 2} altre attività
                        </div>
                      </DayActivitiesPopover>
                    )}
                  </div>
                  
                  {/* Attività all-day o senza ora specifica - solo nella prima ora (8:00) */}
                  {hour === 8 && dayActivities.filter(activity => {
                    const activityDate = getEventDate(activity);
                    const activityHour = activityDate.getHours();
                    return activityHour === 0 || activityHour < 8 || activityHour > 20;
                  }).length > 0 && (
                    <DayActivitiesPopover
                      date={day}
                      activities={dayActivities.filter(activity => {
                        const activityDate = getEventDate(activity);
                        const activityHour = activityDate.getHours();
                        return activityHour === 0 || activityHour < 8 || activityHour > 20;
                      })}
                      onActivityClick={onActivityClick}
                    >
                      <div 
                        className="absolute top-2 left-2 right-8 bg-primary/10 border border-primary/30 rounded px-2 py-1 cursor-pointer hover:bg-primary/20 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="text-xs font-medium text-primary">
                          {dayActivities.filter(activity => {
                            const activityDate = getEventDate(activity);
                            const activityHour = activityDate.getHours();
                            return activityHour === 0 || activityHour < 8 || activityHour > 20;
                          }).length} attività giornaliere
                        </div>
                      </div>
                    </DayActivitiesPopover>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// ===== AGENDA VIEW COMPONENT =====
const AgendaView: React.FC<{
  activities: CalendarEvent[];
  onActivityClick: (activity: CalendarEvent) => void;
}> = ({ activities, onActivityClick }) => {
  // Raggruppa attività per data
  const activitiesByDate = React.useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    activities
      .sort((a, b) => getEventDate(a).getTime() - getEventDate(b).getTime())
      .forEach(activity => {
        const eventDate = getEventDate(activity);
        const dateKey = format(eventDate, 'yyyy-MM-dd');
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
            isToday={checkIsToday}
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