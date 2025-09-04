'use client';

import { useState, useMemo } from 'react';
import { useUsers } from '@/hooks/use-users';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Settings2,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-picker';
import {
  ActivityData,
  ActivityFilters,
  ActivityStatus,
  ActivityType,
  ActivityObjective,
  ActivityPriority,
} from '@/types/activities';
import {
  ClienteColumn,
  DataColumn,
  ObiettiviColumn,
  AssegnatarioColumn,
  FollowUpColumn,
  DocumentiColumn,
} from './activities-table-columns';

interface ActivitiesDataTableProps {
  activities: ActivityData[];
  loading: boolean;
  filters: ActivityFilters;
  onFiltersChange: (filters: ActivityFilters) => void;
  totalCount: number;
  hasMore?: boolean;
  onLoadMore?: () => void;
  className?: string;
}

// Configurazione colonne visibili
const DEFAULT_VISIBLE_COLUMNS = {
  cliente: true,
  data: true,
  obiettivi: true,
  assegnatario: true,
  followup: true,
  documenti: true,
};

export function ActivitiesDataTable({
  activities,
  loading,
  filters,
  onFiltersChange,
  totalCount,
  hasMore,
  onLoadMore,
  className,
}: ActivitiesDataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dateRange, setDateRange] = useState<any | undefined>();
  const [showStatoFilter, setShowStatoFilter] = useState(false);
  const [showTipoFilter, setShowTipoFilter] = useState(false);
  const [showObiettivoFilter, setShowObiettivoFilter] = useState(false);
  const [showPrioritaFilter, setShowPrioritaFilter] = useState(false);

  // Recupera dati utenti dall'API per la colonna assegnatario
  const {
    users: usersData,
    loading: usersLoading,
    error: usersError,
  } = useUsers();

  // Stati disponibili da Airtable
  const STATI_DISPONIBILI: ActivityStatus[] = [
    'Da Pianificare',
    'Pianificata',
    'In corso',
    'In attesa',
    'Completata',
    'Annullata',
    'Rimandata',
  ];
  
  const TIPI_DISPONIBILI: ActivityType[] = [
    'Chiamata',
    'WhatsApp',
    'Email',
    'SMS',
    'Consulenza',
    'Follow-up',
    'Altro',
  ];
  
  const OBIETTIVI_DISPONIBILI: ActivityObjective[] = [
    'Primo contatto',
    'Qualificazione lead',
    'Presentazione prodotto',
    'Invio preventivo',
    'Follow-up preventivo',
    'Negoziazione',
    'Chiusura ordine',
    'Fissare appuntamento',
    'Confermare appuntamento',
    'Promemoria appuntamento',
    'Consegna prodotto',
    'Assistenza tecnica',
    'Controllo soddisfazione',
    'Upsell Cross-sell',
    'Richiesta recensione',
  ];
  
  const PRIORITA_DISPONIBILI: ActivityPriority[] = [
    'Bassa',
    'Media',
    'Alta',
    'Urgente',
  ];

  // Funzione per calcolare conteggi dinamici per ogni stato
  // Applica tutti i filtri TRANNE il filtro stato corrente
  const getStatoCounts = useMemo(() => {
    return STATI_DISPONIBILI.reduce(
      (counts, stato) => {
        const count = activities.filter(activity => {
          const matchesSearch =
            !searchTerm ||
            (() => {
              const searchLower = searchTerm.toLowerCase();
              return (
                activity.Titolo?.toLowerCase().includes(searchLower) ||
                activity['Nome Lead']?.[0]?.toLowerCase().includes(searchLower) ||
                activity.Note?.toLowerCase().includes(searchLower) ||
                activity.id?.toLowerCase().includes(searchLower)
              );
            })();

          const matchesDateRange =
            !dateRange?.from ||
            !dateRange?.to ||
            (() => {
              if (!activity.Data) return false;
              const activityDate = new Date(activity.Data);
              return activityDate >= dateRange.from! && activityDate <= dateRange.to!;
            })();

          // Per i conteggi degli stati, ignoriamo tutti gli altri filtri di categoria
          // Applichiamo solo search e dateRange + questo specifico stato
          const matchesStato = activity.Stato === stato;

          return (
            matchesSearch &&
            matchesDateRange &&
            matchesStato
          );
        }).length;

        counts[stato] = count;
        return counts;
      },
      {} as Record<ActivityStatus, number>
    );
  }, [activities, searchTerm, dateRange]); // Solo search e dateRange

  // Funzione per calcolare conteggi dinamici per ogni tipo
  const getTipoCounts = useMemo(() => {
    return TIPI_DISPONIBILI.reduce(
      (counts, tipo) => {
        const count = activities.filter(activity => {
          const matchesSearch =
            !searchTerm ||
            (() => {
              const searchLower = searchTerm.toLowerCase();
              return (
                activity.Titolo?.toLowerCase().includes(searchLower) ||
                activity['Nome Lead']?.[0]?.toLowerCase().includes(searchLower) ||
                activity.Note?.toLowerCase().includes(searchLower) ||
                activity.id?.toLowerCase().includes(searchLower)
              );
            })();

          const matchesDateRange =
            !dateRange?.from ||
            !dateRange?.to ||
            (() => {
              if (!activity.Data) return false;
              const activityDate = new Date(activity.Data);
              return activityDate >= dateRange.from! && activityDate <= dateRange.to!;
            })();

          // Per i conteggi dei tipi, ignoriamo tutti gli altri filtri di categoria
          // Applichiamo solo search e dateRange + questo specifico tipo
          const matchesTipo = activity.Tipo === tipo;

          return (
            matchesSearch &&
            matchesDateRange &&
            matchesTipo
          );
        }).length;

        counts[tipo] = count;
        return counts;
      },
      {} as Record<ActivityType, number>
    );
  }, [activities, searchTerm, dateRange]); // Solo search e dateRange

  // Applica filtri ai dati
  const filteredData = useMemo(() => {
    return activities.filter(activity => {
      const matchesSearch =
        !searchTerm ||
        (() => {
          const searchLower = searchTerm.toLowerCase();
          return (
            activity.Titolo?.toLowerCase().includes(searchLower) ||
            activity['Nome Lead']?.[0]?.toLowerCase().includes(searchLower) ||
            activity.Note?.toLowerCase().includes(searchLower) ||
            activity.id?.toLowerCase().includes(searchLower)
          );
        })();

      const matchesDateRange =
        !dateRange?.from ||
        !dateRange?.to ||
        (() => {
          if (!activity.Data) return false;
          const activityDate = new Date(activity.Data);
          return activityDate >= dateRange.from! && activityDate <= dateRange.to!;
        })();

      const matchesStato =
        !filters.stato ||
        (Array.isArray(filters.stato) ? filters.stato.length === 0 || filters.stato.includes(activity.Stato) : filters.stato === activity.Stato);

      const matchesTipo =
        !filters.tipo ||
        (Array.isArray(filters.tipo) ? filters.tipo.length === 0 || filters.tipo.includes(activity.Tipo) : filters.tipo === activity.Tipo);

      const matchesPriorita =
        !filters.priorita ||
        (Array.isArray(filters.priorita) ? filters.priorita.length === 0 || filters.priorita.includes(activity.Priorità) : filters.priorita === activity.Priorità);

      return (
        matchesSearch &&
        matchesDateRange &&
        matchesStato &&
        matchesTipo &&
        matchesPriorita
      );
    });
  }, [activities, searchTerm, dateRange, filters]);

  // Paginazione
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // Reset pagina quando cambiano i filtri
  const handleFiltersChange = (newFilters: any) => {
    setCurrentPage(1);
    onFiltersChange(newFilters);
  };

  if (loading && activities.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[30px]">
                  <Skeleton className="h-4 w-4" />
                </TableHead>
                {Object.entries(visibleColumns).map(([key, visible]) =>
                  visible ? (
                    <TableHead key={key}>
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                  ) : null
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  {Object.entries(visibleColumns).map(([key, visible]) =>
                    visible ? (
                      <TableCell key={key}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ) : null
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search and Filter Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Input */}
          <div className="relative max-w-xs flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Cerca attività..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-9 pl-9"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-muted absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 p-0"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Filters and Controls */}
          <div className="flex items-center space-x-2">
            {/* Filtro data */}
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder="Seleziona periodo"
              className="w-64"
            />

            {/* Filtro Stato */}
            <DropdownMenu open={showStatoFilter} onOpenChange={setShowStatoFilter}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-[160px] justify-between">
                  <span className="truncate">
                    {!filters.stato || (Array.isArray(filters.stato) && filters.stato.length === 0)
                      ? 'Stato'
                      : Array.isArray(filters.stato)
                        ? filters.stato.length === 1
                          ? filters.stato[0]
                          : `${filters.stato.length} stati`
                        : filters.stato}
                  </span>
                  <span className="ml-2">▼</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[160px] max-h-[300px] overflow-y-auto" align="start">
                <DropdownMenuLabel>Filtra per Stato</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={!filters.stato}
                  onCheckedChange={() => handleFiltersChange({ ...filters, stato: undefined })}
                >
                  Tutti
                </DropdownMenuCheckboxItem>
                {STATI_DISPONIBILI.map((stato) => {
                  const toggleStato = () => {
                    // Assicurati che currentStati sia sempre un array
                    const currentStati = Array.isArray(filters.stato) 
                      ? filters.stato 
                      : filters.stato ? [filters.stato] : [];
                    
                    if (currentStati.includes(stato)) {
                      // Rimuovi stato
                      const newStati = currentStati.filter(s => s !== stato);
                      handleFiltersChange({
                        ...filters,
                        stato: newStati.length > 0 ? newStati : undefined
                      });
                    } else {
                      // Aggiungi stato
                      const newStati = [...currentStati, stato];
                      handleFiltersChange({ ...filters, stato: newStati });
                    }
                  };

                  return (
                    <DropdownMenuCheckboxItem
                      key={stato}
                      checked={
                        Array.isArray(filters.stato) 
                          ? filters.stato.includes(stato)
                          : filters.stato === stato || false
                      }
                      onCheckedChange={() => toggleStato()}
                    >
                      <span className="flex w-full items-center justify-between">
                        <span>{stato}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {getStatoCounts[stato] || 0}
                        </span>
                      </span>
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Filtro Tipo */}
            <DropdownMenu open={showTipoFilter} onOpenChange={setShowTipoFilter}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-[160px] justify-between">
                  <span className="truncate">
                    {!filters.tipo || (Array.isArray(filters.tipo) && filters.tipo.length === 0)
                      ? 'Tipo'
                      : Array.isArray(filters.tipo)
                        ? filters.tipo.length === 1
                          ? filters.tipo[0]
                          : `${filters.tipo.length} tipi`
                        : filters.tipo}
                  </span>
                  <span className="ml-2">▼</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[160px] max-h-[300px] overflow-y-auto" align="start">
                <DropdownMenuLabel>Filtra per Tipo</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={!filters.tipo}
                  onCheckedChange={() => handleFiltersChange({ ...filters, tipo: undefined })}
                >
                  Tutti
                </DropdownMenuCheckboxItem>
                {TIPI_DISPONIBILI.map((tipo) => {
                  const toggleTipo = () => {
                    // Assicurati che currentTipi sia sempre un array
                    const currentTipi = Array.isArray(filters.tipo) 
                      ? filters.tipo 
                      : filters.tipo ? [filters.tipo] : [];
                    
                    if (currentTipi.includes(tipo)) {
                      // Rimuovi tipo
                      const newTipi = currentTipi.filter(t => t !== tipo);
                      handleFiltersChange({
                        ...filters,
                        tipo: newTipi.length > 0 ? newTipi : undefined
                      });
                    } else {
                      // Aggiungi tipo
                      const newTipi = [...currentTipi, tipo];
                      handleFiltersChange({ ...filters, tipo: newTipi });
                    }
                  };

                  return (
                    <DropdownMenuCheckboxItem
                      key={tipo}
                      checked={
                        Array.isArray(filters.tipo) 
                          ? filters.tipo.includes(tipo)
                          : filters.tipo === tipo || false
                      }
                      onCheckedChange={() => toggleTipo()}
                    >
                      <span className="flex w-full items-center justify-between">
                        <span>{tipo}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {getTipoCounts[tipo] || 0}
                        </span>
                      </span>
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Filtro Obiettivo */}
            <DropdownMenu open={showObiettivoFilter} onOpenChange={setShowObiettivoFilter}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-between">
                  <span className="truncate">
                    {!filters.obiettivo || (Array.isArray(filters.obiettivo) && filters.obiettivo.length === 0)
                      ? 'Obiettivo'
                      : Array.isArray(filters.obiettivo)
                        ? filters.obiettivo.length === 1
                          ? filters.obiettivo[0]
                          : `${filters.obiettivo.length} obiettivi`
                        : filters.obiettivo}
                  </span>
                  <span className="ml-2">▼</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[200px] max-h-[300px] overflow-y-auto" align="start">
                <DropdownMenuLabel>Filtra per Obiettivo</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={!filters.obiettivo}
                  onCheckedChange={() => handleFiltersChange({ ...filters, obiettivo: undefined })}
                >
                  Tutti
                </DropdownMenuCheckboxItem>
                {OBIETTIVI_DISPONIBILI.map((obiettivo) => {
                  const toggleObiettivo = () => {
                    // Assicurati che currentObiettivi sia sempre un array
                    const currentObiettivi = Array.isArray(filters.obiettivo) 
                      ? filters.obiettivo 
                      : filters.obiettivo ? [filters.obiettivo] : [];
                    
                    if (currentObiettivi.includes(obiettivo)) {
                      // Rimuovi obiettivo
                      const newObiettivi = currentObiettivi.filter(o => o !== obiettivo);
                      handleFiltersChange({
                        ...filters,
                        obiettivo: newObiettivi.length > 0 ? newObiettivi : undefined
                      });
                    } else {
                      // Aggiungi obiettivo
                      const newObiettivi = [...currentObiettivi, obiettivo];
                      handleFiltersChange({ ...filters, obiettivo: newObiettivi });
                    }
                  };

                  return (
                    <DropdownMenuCheckboxItem
                      key={obiettivo}
                      checked={
                        Array.isArray(filters.obiettivo) 
                          ? filters.obiettivo.includes(obiettivo)
                          : filters.obiettivo === obiettivo || false
                      }
                      onCheckedChange={() => toggleObiettivo()}
                    >
                      <span className="flex w-full items-center justify-between">
                        <span>{obiettivo}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          0
                        </span>
                      </span>
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Configurazione colonne */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="mr-2 h-4 w-4" />
                  Colonne
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Colonne visibili</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(visibleColumns).map(([key, visible]) => (
                  <DropdownMenuCheckboxItem
                    key={key}
                    checked={visible}
                    onCheckedChange={(checked) =>
                      setVisibleColumns(prev => ({ ...prev, [key]: !!checked }))
                    }
                  >
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Tabella */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[30px] text-foreground font-semibold">
                <Checkbox />
              </TableHead>
              {visibleColumns.cliente && (
                <TableHead className="text-foreground font-semibold">
                  Cliente
                </TableHead>
              )}
              {visibleColumns.data && (
                <TableHead className="text-foreground font-semibold">
                  Data
                </TableHead>
              )}
              {visibleColumns.obiettivi && (
                <TableHead className="text-foreground font-semibold">
                  Obiettivi
                </TableHead>
              )}
              {visibleColumns.assegnatario && (
                <TableHead className="text-foreground font-semibold">
                  Assegnatario
                </TableHead>
              )}
              {visibleColumns.followup && (
                <TableHead className="text-foreground font-semibold">
                  Follow-up
                </TableHead>
              )}
              {visibleColumns.documenti && (
                <TableHead className="text-foreground font-semibold">
                  Documenti
                </TableHead>
              )}
              <TableHead className="w-[30px] text-foreground font-semibold"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={Object.values(visibleColumns).filter(Boolean).length + 2}
                  className="h-24 text-center"
                >
                  {searchTerm || dateRange || filters.stato?.length || filters.tipo?.length
                    ? "Nessuna attività trovata con i filtri correnti."
                    : "Nessuna attività disponibile."}
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>
                    <Checkbox />
                  </TableCell>
                  {visibleColumns.cliente && (
                    <TableCell>
                      <ClienteColumn activity={activity} />
                    </TableCell>
                  )}
                  {visibleColumns.data && (
                    <TableCell>
                      <DataColumn activity={activity} />
                    </TableCell>
                  )}
                  {visibleColumns.obiettivi && (
                    <TableCell>
                      <ObiettiviColumn activity={activity} />
                    </TableCell>
                  )}
                  {visibleColumns.assegnatario && (
                    <TableCell>
                      <AssegnatarioColumn 
                        activity={activity}
                        usersData={usersData}
                        onAssigneeClick={(userId) => console.log('Assignee clicked:', userId)}
                      />
                    </TableCell>
                  )}
                  {visibleColumns.followup && (
                    <TableCell>
                      <FollowUpColumn activity={activity} />
                    </TableCell>
                  )}
                  {visibleColumns.documenti && (
                    <TableCell>
                      <DocumentiColumn 
                        activity={activity}
                        onNotesClick={(activityId) => console.log('Notes clicked:', activityId)}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          Visualizza
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Modifica
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Info and Pagination Controls */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center space-x-4">
          {/* Data Info */}
          <span className="text-muted-foreground text-sm">
            Caricate <strong>{totalCount}</strong> attività totali
            {filteredData.length !== totalCount && (
              <span>
                {' '}
                • <strong>{filteredData.length}</strong> corrispondono ai
                filtri
              </span>
            )}
          </span>
        </div>

        {/* Pagination for display (local pagination on all loaded data) */}
        {filteredData.length > 0 && (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <Select
                value={itemsPerPage.toString()}
                onValueChange={value => {
                  setItemsPerPage(parseInt(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-muted-foreground text-sm">per pagina</span>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Precedente
                </Button>

                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={
                          currentPage === pageNum ? 'default' : 'outline'
                        }
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="gap-1"
                >
                  Successivo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
