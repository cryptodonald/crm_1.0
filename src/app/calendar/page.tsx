'use client';

import { useState, useMemo, useCallback } from 'react';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isToday,
  parseISO,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { it } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCalendarEvents, useCalendarSync, useGoogleAccounts } from '@/hooks/use-google-calendar';
import { toast } from 'sonner';
import type { CalendarEvent } from '@/types/database';

type ViewType = 'month' | 'week' | 'day' | 'list';

const viewLabels: Record<ViewType, string> = {
  month: 'Mese',
  week: 'Settimana',
  day: 'Giorno',
  list: 'Lista',
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [syncing, setSyncing] = useState(false);

  const { accounts } = useGoogleAccounts();
  const { triggerSync } = useCalendarSync();

  // Compute date range for current view
  const { rangeStart, rangeEnd } = useMemo(() => {
    switch (view) {
      case 'month': {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        return {
          rangeStart: startOfWeek(monthStart, { weekStartsOn: 1 }).toISOString(),
          rangeEnd: endOfWeek(monthEnd, { weekStartsOn: 1 }).toISOString(),
        };
      }
      case 'week': {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return { rangeStart: weekStart.toISOString(), rangeEnd: weekEnd.toISOString() };
      }
      case 'day':
        return {
          rangeStart: startOfDay(currentDate).toISOString(),
          rangeEnd: endOfDay(currentDate).toISOString(),
        };
      case 'list': {
        // List shows next 30 days
        const listEnd = addDays(currentDate, 30);
        return { rangeStart: startOfDay(currentDate).toISOString(), rangeEnd: listEnd.toISOString() };
      }
    }
  }, [currentDate, view]);

  const { events, isLoading } = useCalendarEvents(rangeStart, rangeEnd);

  const navigate = useCallback(
    (direction: 'prev' | 'next' | 'today') => {
      if (direction === 'today') {
        setCurrentDate(new Date());
        return;
      }
      const delta = direction === 'next' ? 1 : -1;
      switch (view) {
        case 'month':
          setCurrentDate((d) => (delta > 0 ? addMonths(d, 1) : subMonths(d, 1)));
          break;
        case 'week':
          setCurrentDate((d) => (delta > 0 ? addWeeks(d, 1) : subWeeks(d, 1)));
          break;
        case 'day':
          setCurrentDate((d) => (delta > 0 ? addDays(d, 1) : subDays(d, 1)));
          break;
        case 'list':
          setCurrentDate((d) => (delta > 0 ? addDays(d, 30) : subDays(d, 30)));
          break;
      }
    },
    [view],
  );

  const handleSync = async () => {
    setSyncing(true);
    try {
      await triggerSync();
      toast.success('Sincronizzazione completata');
    } catch {
      toast.error('Errore nella sincronizzazione');
    } finally {
      setSyncing(false);
    }
  };

  const headerLabel = useMemo(() => {
    switch (view) {
      case 'month':
        return format(currentDate, 'MMMM yyyy', { locale: it });
      case 'week': {
        const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
        const we = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(ws, 'd MMM', { locale: it })} - ${format(we, 'd MMM yyyy', { locale: it })}`;
      }
      case 'day':
        return format(currentDate, 'EEEE d MMMM yyyy', { locale: it });
      case 'list':
        return 'Prossimi 30 giorni';
    }
  }, [currentDate, view]);

  const hasAccounts = accounts.length > 0;

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="Calendario" />
      </div>
      <div className="flex flex-col gap-4 px-4 lg:px-6 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarIcon className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight capitalize">{headerLabel}</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* View Switcher */}
          <div className="flex rounded-md border">
            {(Object.keys(viewLabels) as ViewType[]).map((v) => (
              <Button
                key={v}
                variant={view === v ? 'default' : 'ghost'}
                size="sm"
                className={cn('rounded-none first:rounded-l-md last:rounded-r-md', view !== v && 'border-0')}
                onClick={() => setView(v)}
              >
                {viewLabels[v]}
              </Button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => navigate('prev')}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('today')}>
              Oggi
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate('next')}>
              <ChevronRight className="size-4" />
            </Button>
          </div>

          {/* Sync */}
          {hasAccounts && (
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={cn('mr-2 size-3', syncing && 'animate-spin')} />
              Sincronizza
            </Button>
          )}
        </div>
      </div>

      {/* No accounts message */}
      {!hasAccounts && (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarIcon className="mx-auto size-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium mb-1">Nessun calendario collegato</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Collega un account Google nelle Impostazioni per visualizzare i tuoi eventi.
            </p>
            <Button asChild>
              <a href="/settings/calendar">Vai alle Impostazioni</a>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && hasAccounts && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Calendar Views */}
      {hasAccounts && !isLoading && (
        <>
          {view === 'month' && <MonthView currentDate={currentDate} events={events} />}
          {view === 'week' && <WeekView currentDate={currentDate} events={events} />}
          {view === 'day' && <DayView currentDate={currentDate} events={events} />}
          {view === 'list' && <ListView events={events} />}
        </>
      )}
    </div>
    </AppLayoutCustom>
  );
}

// ============================================================================
// Month View
// ============================================================================

function MonthView({ currentDate, events }: { currentDate: Date; events: CalendarEvent[] }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  return (
    <div className="rounded-lg border">
      {/* Header */}
      <div className="grid grid-cols-7 border-b">
        {weekDays.map((day) => (
          <div key={day} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>
      {/* Days grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayEvents = events.filter((e) =>
            isSameDay(parseISO(e.start_time as string), day),
          );
          const inMonth = isSameMonth(day, currentDate);

          return (
            <div
              key={idx}
              className={cn(
                'min-h-24 border-b border-r p-1.5 last:border-r-0',
                !inMonth && 'bg-muted/30',
              )}
            >
              <div
                className={cn(
                  'mb-1 text-xs font-medium',
                  isToday(day) && 'flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground',
                  !inMonth && 'text-muted-foreground',
                )}
              >
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => (
                  <EventChip key={event.id} event={event} />
                ))}
                {dayEvents.length > 3 && (
                  <p className="text-[10px] text-muted-foreground pl-1">
                    +{dayEvents.length - 3} altri
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Week View
// ============================================================================

function WeekView({ currentDate, events }: { currentDate: Date; events: CalendarEvent[] }) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(currentDate, { weekStartsOn: 1 }) });
  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00

  return (
    <div className="rounded-lg border overflow-auto">
      {/* Header */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b sticky top-0 bg-background z-10">
        <div className="border-r" />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              'px-2 py-2 text-center border-r last:border-r-0',
              isToday(day) && 'bg-primary/5',
            )}
          >
            <div className="text-xs text-muted-foreground">{format(day, 'EEE', { locale: it })}</div>
            <div className={cn(
              'text-sm font-medium',
              isToday(day) && 'text-primary font-bold',
            )}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>
      {/* Time grid */}
      {hours.map((hour) => (
        <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b last:border-b-0 min-h-12">
          <div className="border-r px-2 py-1 text-xs text-muted-foreground text-right">
            {`${hour}:00`}
          </div>
          {days.map((day) => {
            const hourEvents = events.filter((e) => {
              const eventDate = parseISO(e.start_time as string);
              return isSameDay(eventDate, day) && eventDate.getHours() === hour;
            });
            return (
              <div key={day.toISOString()} className="border-r last:border-r-0 p-0.5">
                {hourEvents.map((event) => (
                  <EventChip key={event.id} event={event} showTime />
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Day View
// ============================================================================

function DayView({ currentDate, events }: { currentDate: Date; events: CalendarEvent[] }) {
  const hours = Array.from({ length: 14 }, (_, i) => i + 7);
  const dayEvents = events.filter((e) => isSameDay(parseISO(e.start_time as string), currentDate));

  return (
    <div className="rounded-lg border">
      {hours.map((hour) => {
        const hourEvents = dayEvents.filter(
          (e) => parseISO(e.start_time as string).getHours() === hour,
        );
        return (
          <div key={hour} className="grid grid-cols-[80px_1fr] border-b last:border-b-0 min-h-14">
            <div className="border-r px-3 py-2 text-sm text-muted-foreground text-right">
              {`${hour}:00`}
            </div>
            <div className="p-1 space-y-1">
              {hourEvents.map((event) => (
                <EventChip key={event.id} event={event} showTime expanded />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// List View
// ============================================================================

function ListView({ events }: { events: CalendarEvent[] }) {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.start_time as string).getTime() - new Date(b.start_time as string).getTime(),
  );

  // Group by date
  const grouped = sortedEvents.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
    const key = format(parseISO(event.start_time as string), 'yyyy-MM-dd');
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});

  if (Object.keys(grouped).length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Nessun evento nei prossimi 30 giorni.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([dateKey, dayEvents]) => (
        <div key={dateKey}>
          <h3 className="text-sm font-semibold mb-2 capitalize">
            {format(parseISO(dateKey), 'EEEE d MMMM', { locale: it })}
            {isToday(parseISO(dateKey)) && (
              <Badge variant="secondary" className="ml-2 text-[10px]">Oggi</Badge>
            )}
          </h3>
          <div className="space-y-1">
            {dayEvents.map((event) => (
              <EventChip key={event.id} event={event} showTime expanded />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Event Chip
// ============================================================================

function EventChip({
  event,
  showTime = false,
  expanded = false,
}: {
  event: CalendarEvent;
  showTime?: boolean;
  expanded?: boolean;
}) {
  const color = event.calendar_color || event.color || '#4285F4';
  const time = event.all_day
    ? 'Tutto il giorno'
    : format(parseISO(event.start_time as string), 'HH:mm');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'w-full text-left rounded px-1.5 py-0.5 text-xs truncate transition-colors hover:opacity-80 text-foreground',
            expanded ? 'flex items-center gap-2 py-1.5 px-3 rounded-md border' : '',
          )}
          style={!expanded ? { backgroundColor: `${color}20`, borderLeft: `3px solid ${color}` } : undefined}
        >
          {expanded && (
            <div className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          )}
          {showTime && <span className="font-medium">{time}</span>}
          <span className={cn(expanded ? 'font-medium text-sm' : 'truncate')}>
            {event.title || 'Senza titolo'}
          </span>
          {expanded && event.source === 'crm' && (
            <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 shrink-0">CRM</Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="size-3 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: color }} />
            <div>
              <p className="font-medium text-sm">{event.title || 'Senza titolo'}</p>
              {event.calendar_name && (
                <p className="text-xs text-muted-foreground">
                  {event.calendar_name}
                </p>
              )}
            </div>
            <Badge variant="outline" className="ml-auto text-[10px] shrink-0">
              {event.source === 'crm' ? 'CRM' : 'Google'}
            </Badge>
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="size-3" />
              {event.all_day
                ? 'Tutto il giorno'
                : `${format(parseISO(event.start_time as string), 'HH:mm')}${event.end_time ? ` - ${format(parseISO(event.end_time as string), 'HH:mm')}` : ''}`}
            </div>
            {event.location && (
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3" />
                {event.location}
              </div>
            )}
          </div>

          {event.description && (
            <p className="text-xs text-muted-foreground line-clamp-3 pt-1 border-t">
              {event.description}
            </p>
          )}

          {event.source === 'crm' && event.activity_id && (
            <Button variant="outline" size="sm" className="w-full mt-1" asChild>
              <a href={`/activities/${event.activity_id}`}>
                <ExternalLink className="mr-1.5 size-3" />
                Vai all&apos;attività
              </a>
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
