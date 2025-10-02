'use client';

/**
 * 🔍 CalendarFilters - Filtri avanzati per calendario attività
 * 
 * Features:
 * - Filtri per stato attività (da fare, in corso, completate)
 * - Filtri per priorità (bassa, media, alta, urgente)
 * - Filtri per tipo attività (chiamata, email, whatsapp, etc.)
 * - Filtri per assegnatario
 * - Legenda colori
 * - Statistiche rapide
 */

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { X, Filter, ChevronDown, ChevronRight, Users, Calendar, Clock, Phone, Mail, MessageSquare, RotateCcw, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityData, ActivityStato, ActivityPriorita, ActivityTipo } from '@/types/activities';
import { KANBAN_COLUMNS, getKanbanColumnFromState } from '@/types/activities';
import type { CalendarFilters } from '@/hooks/use-calendar';

// ===== TYPES =====
interface CalendarFiltersProps {
  activities: ActivityData[];
  filters: CalendarFilters;
  onFiltersChange: (filters: CalendarFilters) => void;
  onClearFilters: () => void;
  className?: string;
}

interface FilterStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
  todayCount: number;
  weekCount: number;
  overdueCount: number;
}

// ===== HELPER FUNCTIONS =====
const calculateStats = (activities: ActivityData[]): FilterStats => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const stats: FilterStats = {
    total: activities.length,
    byStatus: {},
    byPriority: {},
    byType: {},
    todayCount: 0,
    weekCount: 0,
    overdueCount: 0,
  };

  activities.forEach(activity => {
    // Conta per stato
    const stato = activity.Stato || 'Non specificato';
    stats.byStatus[stato] = (stats.byStatus[stato] || 0) + 1;

    // Conta per priorità
    const priorita = activity.Priorità || 'Non specificato';
    stats.byPriority[priorita] = (stats.byPriority[priorita] || 0) + 1;

    // Conta per tipo
    const tipo = activity.Tipo || 'Non specificato';
    stats.byType[tipo] = (stats.byType[tipo] || 0) + 1;

    // Conta per timeline
    if (activity.Data) {
      const activityDate = new Date(activity.Data);
      const activityDateOnly = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());

      // Oggi
      if (activityDateOnly.getTime() === today.getTime()) {
        stats.todayCount++;
      }

      // Prossimi 7 giorni
      if (activityDate >= now && activityDate <= weekFromNow) {
        stats.weekCount++;
      }

      // Scadute (nel passato e non completate)
      if (activityDate < now && !['Completata', 'Annullata'].includes(activity.Stato)) {
        stats.overdueCount++;
      }
    }
  });

  return stats;
};

// ===== STATUS FILTER COMPONENT =====
const StatusFilters: React.FC<{
  activities: ActivityData[];
  selectedStates: string[];
  onChange: (states: string[]) => void;
}> = ({ activities, selectedStates, onChange }) => {
  const [isOpen, setIsOpen] = useState(true);

  // Raggruppa per colonna Kanban
  const statusGroups = React.useMemo(() => {
    const groups = {
      'to-do': { label: 'Da fare', states: new Set<string>(), count: 0 },
      'in-progress': { label: 'In corso', states: new Set<string>(), count: 0 },
      'done': { label: 'Completate', states: new Set<string>(), count: 0 },
    };

    activities.forEach(activity => {
      const kanbanColumn = getKanbanColumnFromState(activity.Stato);
      groups[kanbanColumn].states.add(activity.Stato);
      groups[kanbanColumn].count++;
    });

    return groups;
  }, [activities]);

  const handleStateToggle = (stato: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedStates, stato]);
    } else {
      onChange(selectedStates.filter(s => s !== stato));
    }
  };

  // Design coerente con il resto del CRM - solo colori standard
  const getStatusColor = (kanbanColumn: string) => {
    switch (kanbanColumn) {
      case 'to-do':
        return 'bg-muted border-border text-foreground';
      case 'in-progress':
        return 'bg-muted/70 border-border text-foreground';
      case 'done':
        return 'bg-muted/50 border-border text-muted-foreground';
      default:
        return 'bg-muted border-border text-foreground';
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between font-medium">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Stati Attività
          </div>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 pt-2">
        {Object.entries(statusGroups).map(([columnId, group]) => (
          <div key={columnId} className="space-y-2">
            <div className={cn(
              'px-3 py-2 rounded-lg border text-sm font-medium',
              getStatusColor(columnId)
            )}>
              <div className="flex items-center justify-between">
                <span>{group.label}</span>
                <Badge variant="secondary" className="text-xs">
                  {group.count}
                </Badge>
              </div>
            </div>
            
            <div className="pl-4 space-y-2">
              {Array.from(group.states).map(stato => (
                <div key={stato} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${stato}`}
                    checked={selectedStates.includes(stato)}
                    onCheckedChange={(checked) => handleStateToggle(stato, checked as boolean)}
                  />
                  <label 
                    htmlFor={`status-${stato}`}
                    className="text-sm cursor-pointer flex-1"
                  >
                    {stato}
                  </label>
                  <Badge variant="outline" className="text-xs">
                    {activities.filter(a => a.Stato === stato).length}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

// ===== PRIORITY FILTERS COMPONENT =====
const PriorityFilters: React.FC<{
  activities: ActivityData[];
  selectedPriorities: string[];
  onChange: (priorities: string[]) => void;
}> = ({ activities, selectedPriorities, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const priorityStats = React.useMemo(() => {
    const stats: Record<string, number> = {};
    activities.forEach(activity => {
      const priorita = activity.Priorità || 'Non specificato';
      stats[priorita] = (stats[priorita] || 0) + 1;
    });
    return stats;
  }, [activities]);

  const getPriorityColor = (priorita: string) => {
    // Solo due livelli di priorità visiva - senza colori invasivi
    switch (priorita) {
      case 'Urgente':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'Alta':
        return 'bg-primary/10 text-primary border-primary/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const handlePriorityToggle = (priorita: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedPriorities, priorita]);
    } else {
      onChange(selectedPriorities.filter(p => p !== priorita));
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between font-medium">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Priorità
          </div>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pt-2">
        {Object.entries(priorityStats)
          .sort(([a], [b]) => {
            const order = { 'Urgente': 0, 'Alta': 1, 'Media': 2, 'Bassa': 3, 'Non specificato': 4 };
            return (order[a as keyof typeof order] ?? 5) - (order[b as keyof typeof order] ?? 5);
          })
          .map(([priorita, count]) => (
            <div key={priorita} className="flex items-center space-x-2">
              <Checkbox
                id={`priority-${priorita}`}
                checked={selectedPriorities.includes(priorita)}
                onCheckedChange={(checked) => handlePriorityToggle(priorita, checked as boolean)}
              />
              <label 
                htmlFor={`priority-${priorita}`}
                className="cursor-pointer flex-1"
              >
                <div className={cn(
                  'px-2 py-1 rounded text-xs border inline-flex items-center gap-2',
                  getPriorityColor(priorita)
                )}>
                  <span>{priorita}</span>
                  <Badge variant="secondary" className="text-xs">
                    {count}
                  </Badge>
                </div>
              </label>
            </div>
          ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

// ===== TYPE FILTERS COMPONENT =====
const TypeFilters: React.FC<{
  activities: ActivityData[];
  selectedTypes: string[];
  onChange: (types: string[]) => void;
}> = ({ activities, selectedTypes, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const typeStats = React.useMemo(() => {
    const stats: Record<string, number> = {};
    activities.forEach(activity => {
      const tipo = activity.Tipo || 'Non specificato';
      stats[tipo] = (stats[tipo] || 0) + 1;
    });
    return stats;
  }, [activities]);

  const getTypeIcon = (tipo: string) => {
    const iconProps = { className: 'w-4 h-4 text-muted-foreground' };
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

  const handleTypeToggle = (tipo: string, checked: boolean) => {
    if (checked) {
      onChange([...selectedTypes, tipo]);
    } else {
      onChange(selectedTypes.filter(t => t !== tipo));
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="w-full justify-between font-medium">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Tipo Attività
          </div>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-2 pt-2">
        {Object.entries(typeStats).map(([tipo, count]) => (
          <div key={tipo} className="flex items-center space-x-2">
            <Checkbox
              id={`type-${tipo}`}
              checked={selectedTypes.includes(tipo)}
              onCheckedChange={(checked) => handleTypeToggle(tipo, checked as boolean)}
            />
            <label 
              htmlFor={`type-${tipo}`}
              className="text-sm cursor-pointer flex-1 flex items-center gap-2"
            >
              {getTypeIcon(tipo)}
              <span>{tipo}</span>
              <Badge variant="outline" className="text-xs ml-auto">
                {count}
              </Badge>
            </label>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};

// ===== MAIN COMPONENT =====
export const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  activities,
  filters,
  onFiltersChange,
  onClearFilters,
  className
}) => {
  const stats = React.useMemo(() => calculateStats(activities), [activities]);
  
  const hasActiveFilters = React.useMemo(() => {
    return (filters.stati && filters.stati.length > 0) ||
           (filters.priorita && filters.priorita.length > 0) ||
           (filters.tipi && filters.tipi.length > 0) ||
           (filters.assegnatari && filters.assegnatari.length > 0);
  }, [filters]);

  const handleStatusChange = (stati: string[]) => {
    onFiltersChange({ ...filters, stati });
  };

  const handlePriorityChange = (priorita: string[]) => {
    onFiltersChange({ ...filters, priorita });
  };

  const handleTypeChange = (tipi: string[]) => {
    onFiltersChange({ ...filters, tipi });
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtri
          </CardTitle>
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              Reset
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Panoramica - design simile a LeadsStats */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Panoramica</h4>
          
          {/* Statistiche con design a card dell'immagine */}
          <div className="grid grid-cols-2 gap-3">
            <div className="from-muted/30 to-muted/60 border-border bg-gradient-to-br p-3 rounded-lg border text-center">
              <div className="text-2xl font-bold">{(() => {
                const byStatus = { 'to-do': 0, 'in-progress': 0, 'done': 0 };
                activities.forEach(activity => {
                  const kanbanColumn = getKanbanColumnFromState(activity.Stato);
                  byStatus[kanbanColumn]++;
                });
                return byStatus['to-do'];
              })()}</div>
              <div className="text-sm text-muted-foreground">Da fare</div>
            </div>
            <div className="from-muted/30 to-muted/60 border-border bg-gradient-to-br p-3 rounded-lg border text-center">
              <div className="text-2xl font-bold">{(() => {
                const byStatus = { 'to-do': 0, 'in-progress': 0, 'done': 0 };
                activities.forEach(activity => {
                  const kanbanColumn = getKanbanColumnFromState(activity.Stato);
                  byStatus[kanbanColumn]++;
                });
                return byStatus['in-progress'];
              })()}</div>
              <div className="text-sm text-muted-foreground">In corso</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="from-muted/30 to-muted/60 border-border bg-gradient-to-br p-3 rounded-lg border text-center">
              <div className="text-2xl font-bold">{(() => {
                const byStatus = { 'to-do': 0, 'in-progress': 0, 'done': 0 };
                activities.forEach(activity => {
                  const kanbanColumn = getKanbanColumnFromState(activity.Stato);
                  byStatus[kanbanColumn]++;
                });
                return byStatus['done'];
              })()}</div>
              <div className="text-sm text-muted-foreground">Completate</div>
            </div>
            {stats.overdueCount > 0 && (
              <div className="from-destructive/10 to-destructive/20 border-destructive/20 bg-gradient-to-br p-3 rounded-lg border text-center">
                <div className="text-2xl font-bold text-destructive">{stats.overdueCount}</div>
                <div className="text-sm text-destructive/80">In ritardo</div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Filtri per stato */}
        <StatusFilters
          activities={activities}
          selectedStates={filters.stati || []}
          onChange={handleStatusChange}
        />

        <Separator />

        {/* Filtri per priorità */}
        <PriorityFilters
          activities={activities}
          selectedPriorities={filters.priorita || []}
          onChange={handlePriorityChange}
        />

        <Separator />

        {/* Filtri per tipo */}
        <TypeFilters
          activities={activities}
          selectedTypes={filters.tipi || []}
          onChange={handleTypeChange}
        />
      </CardContent>
    </Card>
  );
};