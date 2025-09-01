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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Settings2,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-picker';
import {
  LeadData,
  LeadsFilters,
  LeadStato,
  LeadProvenienza,
} from '@/types/leads';
import {
  ClienteColumn,
  ContattiColumn,
  DataColumn,
  RelazioniColumn,
  AssegnatarioColumn,
  NoteAllegatiColumn,
} from './leads-table-columns';

interface LeadsDataTableProps {
  leads: LeadData[];
  loading: boolean;
  filters: LeadsFilters;
  onFiltersChange: (filters: LeadsFilters) => void;
  totalCount: number;
  hasMore?: boolean; // Keep for backward compatibility but not used
  onLoadMore?: () => void; // Keep for backward compatibility but not used
  className?: string;
}

// Configurazione colonne visibili
const DEFAULT_VISIBLE_COLUMNS = {
  cliente: true,
  contatti: true,
  data: true,
  relazioni: true,
  assegnatario: true,
  note: true,
};

export function LeadsDataTable({
  leads,
  loading,
  filters,
  onFiltersChange,
  totalCount,
  hasMore, // Not used since we load all data
  onLoadMore, // Not used since we load all data
  className,
}: LeadsDataTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showStatoFilter, setShowStatoFilter] = useState(false);
  const [showProvenienzaFilter, setShowProvenienzaFilter] = useState(false);

  // Stati disponibili da Airtable
  const STATI_DISPONIBILI: LeadStato[] = [
    'Nuovo',
    'Attivo',
    'Qualificato',
    'Cliente',
    'Chiuso',
    'Sospeso',
  ];
  const PROVENIENZE_DISPONIBILI: LeadProvenienza[] = [
    'Meta',
    'Instagram',
    'Google',
    'Sito',
    'Referral',
    'Organico',
  ];

  // Normalizza stringa di ricerca per telefoni
  const normalizePhoneSearch = (search: string): string => {
    return search.replace(/[\s+()-]/g, ''); // Rimuove spazi, +, parentesi e trattini
  };

  // Funzione per calcolare conteggi dinamici per ogni stato
  const getStatoCounts = useMemo(() => {
    return STATI_DISPONIBILI.reduce(
      (counts, stato) => {
        const count = leads.filter(lead => {
          // Applica solo filtri diversi da stato
          const matchesSearch =
            !searchTerm ||
            (() => {
              const searchLower = searchTerm.toLowerCase();
              const normalizedSearch = normalizePhoneSearch(searchTerm);
              const leadPhoneNormalized = lead.Telefono
                ? normalizePhoneSearch(lead.Telefono)
                : '';
              return (
                lead.Nome?.toLowerCase().includes(searchLower) ||
                lead.Email?.toLowerCase().includes(searchLower) ||
                (lead.Telefono &&
                  (lead.Telefono.includes(searchTerm) ||
                    leadPhoneNormalized.includes(normalizedSearch) ||
                    leadPhoneNormalized.includes(
                      normalizedSearch.replace(/^39/, '')
                    ) ||
                    leadPhoneNormalized.includes('39' + normalizedSearch))) ||
                lead.Città?.toLowerCase().includes(searchLower) ||
                lead.ID?.toLowerCase().includes(searchLower)
              );
            })();

          const matchesDateRange =
            !dateRange?.from ||
            !dateRange?.to ||
            (() => {
              if (!lead.Data) return false;
              const leadDate = new Date(lead.Data);
              return leadDate >= dateRange.from! && leadDate <= dateRange.to!;
            })();

          const matchesProvenienza =
            !filters.provenienza ||
            filters.provenienza.length === 0 ||
            filters.provenienza.includes(lead.Provenienza);
          const matchesStato = lead.Stato === stato;

          return (
            matchesSearch &&
            matchesDateRange &&
            matchesProvenienza &&
            matchesStato
          );
        }).length;

        counts[stato] = count;
        return counts;
      },
      {} as Record<LeadStato, number>
    );
  }, [leads, searchTerm, dateRange, filters.provenienza]);

  // Funzione per calcolare conteggi dinamici per ogni provenienza
  const getProvenienzaCounts = useMemo(() => {
    return PROVENIENZE_DISPONIBILI.reduce(
      (counts, provenienza) => {
        const count = leads.filter(lead => {
          // Applica solo filtri diversi da provenienza
          const matchesSearch =
            !searchTerm ||
            (() => {
              const searchLower = searchTerm.toLowerCase();
              const normalizedSearch = normalizePhoneSearch(searchTerm);
              const leadPhoneNormalized = lead.Telefono
                ? normalizePhoneSearch(lead.Telefono)
                : '';
              return (
                lead.Nome?.toLowerCase().includes(searchLower) ||
                lead.Email?.toLowerCase().includes(searchLower) ||
                (lead.Telefono &&
                  (lead.Telefono.includes(searchTerm) ||
                    leadPhoneNormalized.includes(normalizedSearch) ||
                    leadPhoneNormalized.includes(
                      normalizedSearch.replace(/^39/, '')
                    ) ||
                    leadPhoneNormalized.includes('39' + normalizedSearch))) ||
                lead.Città?.toLowerCase().includes(searchLower) ||
                lead.ID?.toLowerCase().includes(searchLower)
              );
            })();

          const matchesDateRange =
            !dateRange?.from ||
            !dateRange?.to ||
            (() => {
              if (!lead.Data) return false;
              const leadDate = new Date(lead.Data);
              return leadDate >= dateRange.from! && leadDate <= dateRange.to!;
            })();

          const matchesStato =
            !filters.stato ||
            filters.stato.length === 0 ||
            filters.stato.includes(lead.Stato);
          const matchesProvenienza = lead.Provenienza === provenienza;

          return (
            matchesSearch &&
            matchesDateRange &&
            matchesStato &&
            matchesProvenienza
          );
        }).length;

        counts[provenienza] = count;
        return counts;
      },
      {} as Record<LeadProvenienza, number>
    );
  }, [leads, searchTerm, dateRange, filters.stato]);

  // Filter and paginate leads
  const filteredLeads = useMemo(() => {
    const filtered = leads.filter(lead => {
      // Extended text search filter - searches in Nome, Email, Telefono, Città, and ID
      const matchesSearch =
        !searchTerm ||
        (() => {
          const searchLower = searchTerm.toLowerCase();
          const normalizedSearch = normalizePhoneSearch(searchTerm);

          // Normalizza il numero di telefono del lead per il confronto
          const leadPhoneNormalized = lead.Telefono
            ? normalizePhoneSearch(lead.Telefono)
            : '';

          return (
            lead.Nome?.toLowerCase().includes(searchLower) ||
            lead.Email?.toLowerCase().includes(searchLower) ||
            // Ricerca telefono: sia formato originale che normalizzato
            (lead.Telefono &&
              (lead.Telefono.includes(searchTerm) || // Formato originale
                leadPhoneNormalized.includes(normalizedSearch) || // Numeri puri
                leadPhoneNormalized.includes(
                  normalizedSearch.replace(/^39/, '')
                ) || // Senza prefisso 39
                leadPhoneNormalized.includes('39' + normalizedSearch))) || // Con prefisso 39 aggiunto
            lead.Città?.toLowerCase().includes(searchLower) ||
            lead.ID?.toLowerCase().includes(searchLower)
          );
        })();

      // Date range filter
      const matchesDateRange =
        !dateRange?.from ||
        !dateRange?.to ||
        (() => {
          if (!lead.Data) return false;
          const leadDate = new Date(lead.Data);
          return leadDate >= dateRange.from! && leadDate <= dateRange.to!;
        })();

      // Stato filter - supporta selezioni multiple
      const matchesStato =
        !filters.stato ||
        filters.stato.length === 0 ||
        filters.stato.includes(lead.Stato);

      // Provenienza filter - supporta selezioni multiple
      const matchesProvenienza =
        !filters.provenienza ||
        filters.provenienza.length === 0 ||
        filters.provenienza.includes(lead.Provenienza);

      return (
        matchesSearch && matchesDateRange && matchesStato && matchesProvenienza
      );
    });

    return filtered;
  }, [leads, searchTerm, dateRange, filters.stato, filters.provenienza]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLeads, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, filters, dateRange]);

  // Gestione ricerca
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Gestione filtri
  const handleFilterChange = (key: keyof LeadsFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateRange(undefined);
    onFiltersChange({});
    setCurrentPage(1);
  };

  // Azioni sui lead
  const handleViewLead = (leadId: string) => {
    console.log('View lead:', leadId);
  };

  const handleEditLead = (leadId: string) => {
    console.log('Edit lead:', leadId);
  };

  const handleDeleteLead = (leadId: string) => {
    console.log('Delete lead:', leadId);
  };

  // Recupera dati utenti dall'API
  const {
    users: usersData,
    loading: usersLoading,
    error: usersError,
  } = useUsers();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-10 w-64" />
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
                <TableHead>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
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
      {/* Error Alert for Users API */}
      {usersError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Errore nel caricamento dati utenti: {usersError}. I nomi assegnatari
            potrebbero non essere visualizzati correttamente.
          </AlertDescription>
        </Alert>
      )}

      {/* Search and Filters - No Background Box */}
      <div className="space-y-4">
        {/* Search and Filter Controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Input */}
          <div className="relative max-w-xs flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Cerca Leads..."
              value={searchTerm}
              onChange={e => handleSearch(e.target.value)}
              className="pr-9 pl-9"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-muted absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 p-0"
                onClick={() => handleSearch('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Filters and Controls */}
          <div className="flex items-center space-x-2">
            {/* Date Range Picker */}
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder="Filtra per periodo"
              className="w-64"
            />

            {/* Filtro Stato */}
            <DropdownMenu
              open={showStatoFilter}
              onOpenChange={setShowStatoFilter}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-[160px] justify-between">
                  <span className="truncate">
                    {!filters.stato || filters.stato.length === 0
                      ? 'Stato'
                      : filters.stato.length === 1
                        ? filters.stato[0]
                        : `${filters.stato.length} stati`}
                  </span>
                  <span className="ml-2">▼</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[160px]" align="start">
                <DropdownMenuLabel>Filtra per Stato</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={!filters.stato}
                  onCheckedChange={() => handleFilterChange('stato', undefined)}
                >
                  Tutti
                </DropdownMenuCheckboxItem>
                {STATI_DISPONIBILI.map(stato => {
                  const toggleStato = () => {
                    const currentStati = filters.stato || [];
                    if (currentStati.includes(stato)) {
                      // Rimuovi stato
                      const newStati = currentStati.filter(s => s !== stato);
                      handleFilterChange(
                        'stato',
                        newStati.length > 0 ? newStati : undefined
                      );
                    } else {
                      // Aggiungi stato
                      const newStati = [...currentStati, stato];
                      handleFilterChange('stato', newStati);
                    }
                  };

                  return (
                    <DropdownMenuCheckboxItem
                      key={stato}
                      checked={filters.stato?.includes(stato) || false}
                      onCheckedChange={() => toggleStato()}
                    >
                      <span className="flex w-full items-center justify-between">
                        <span>{stato}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {getStatoCounts[stato]}
                        </span>
                      </span>
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Filtro Provenienza */}
            <DropdownMenu
              open={showProvenienzaFilter}
              onOpenChange={setShowProvenienzaFilter}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-[180px] justify-between">
                  <span className="truncate">
                    {!filters.provenienza || filters.provenienza.length === 0
                      ? 'Provenienza'
                      : filters.provenienza.length === 1
                        ? filters.provenienza[0]
                        : `${filters.provenienza.length} provenienze`}
                  </span>
                  <span className="ml-2">▼</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[180px]" align="start">
                <DropdownMenuLabel>Filtra per Provenienza</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={!filters.provenienza}
                  onCheckedChange={() =>
                    handleFilterChange('provenienza', undefined)
                  }
                >
                  Tutte
                </DropdownMenuCheckboxItem>
                {PROVENIENZE_DISPONIBILI.map(provenienza => {
                  const toggleProvenienza = () => {
                    const currentProvenienze = filters.provenienza || [];
                    if (currentProvenienze.includes(provenienza)) {
                      // Rimuovi provenienza
                      const newProvenienze = currentProvenienze.filter(
                        p => p !== provenienza
                      );
                      handleFilterChange(
                        'provenienza',
                        newProvenienze.length > 0 ? newProvenienze : undefined
                      );
                    } else {
                      // Aggiungi provenienza
                      const newProvenienze = [
                        ...currentProvenienze,
                        provenienza,
                      ];
                      handleFilterChange('provenienza', newProvenienze);
                    }
                  };

                  return (
                    <DropdownMenuCheckboxItem
                      key={provenienza}
                      checked={
                        filters.provenienza?.includes(provenienza) || false
                      }
                      onCheckedChange={() => toggleProvenienza()}
                    >
                      <span className="flex w-full items-center justify-between">
                        <span>{provenienza}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {getProvenienzaCounts[provenienza]}
                        </span>
                      </span>
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Selettore colonne visibili */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="mr-2 h-4 w-4" />
                  Colonne
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Colonne visibili</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.cliente}
                  onCheckedChange={checked =>
                    setVisibleColumns(prev => ({ ...prev, cliente: !!checked }))
                  }
                >
                  Cliente
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.contatti}
                  onCheckedChange={checked =>
                    setVisibleColumns(prev => ({
                      ...prev,
                      contatti: !!checked,
                    }))
                  }
                >
                  Contatti
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.data}
                  onCheckedChange={checked =>
                    setVisibleColumns(prev => ({ ...prev, data: !!checked }))
                  }
                >
                  Data
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.relazioni}
                  onCheckedChange={checked =>
                    setVisibleColumns(prev => ({
                      ...prev,
                      relazioni: !!checked,
                    }))
                  }
                >
                  Relazioni
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.assegnatario}
                  onCheckedChange={checked =>
                    setVisibleColumns(prev => ({
                      ...prev,
                      assegnatario: !!checked,
                    }))
                  }
                >
                  Assegnatario
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.note}
                  onCheckedChange={checked =>
                    setVisibleColumns(prev => ({ ...prev, note: !!checked }))
                  }
                >
                  Documenti
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Active Filters */}
        {(filters.provenienza?.length ||
          filters.stato?.length ||
          dateRange?.from) && (
          <div className="flex items-center space-x-2">
            {dateRange?.from && (
              <Badge
                variant="secondary"
                className="hover:bg-secondary/80 cursor-pointer gap-1"
                onClick={() => setDateRange(undefined)}
              >
                {dateRange.from && dateRange.to
                  ? `${dateRange.from.toLocaleDateString('it-IT')} - ${dateRange.to.toLocaleDateString('it-IT')}`
                  : dateRange.from.toLocaleDateString('it-IT')}
                <X className="h-3 w-3" />
              </Badge>
            )}
            {filters.stato?.map(stato => (
              <Badge
                key={stato}
                variant="secondary"
                className="hover:bg-secondary/80 cursor-pointer gap-1"
                onClick={() => handleFilterChange('stato', undefined)}
              >
                {stato}
                <X className="h-3 w-3" />
              </Badge>
            ))}
            {filters.provenienza?.map(provenienza => (
              <Badge
                key={provenienza}
                variant="secondary"
                className="hover:bg-secondary/80 cursor-pointer gap-1"
                onClick={() => handleFilterChange('provenienza', undefined)}
              >
                {provenienza}
                <X className="h-3 w-3" />
              </Badge>
            ))}
            {(filters.stato?.length ||
              filters.provenienza?.length ||
              dateRange?.from) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground gap-2"
              >
                <X className="h-4 w-4" />
                Cancella Tutto
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {visibleColumns.cliente && (
                <TableHead className="text-foreground font-semibold first:rounded-tl-md">
                  Cliente
                </TableHead>
              )}
              {visibleColumns.contatti && (
                <TableHead className="text-foreground font-semibold">
                  Contatti
                </TableHead>
              )}
              {visibleColumns.data && (
                <TableHead className="text-foreground font-semibold">
                  Data
                </TableHead>
              )}
              {visibleColumns.relazioni && (
                <TableHead className="text-foreground font-semibold">
                  Relazioni
                </TableHead>
              )}
              {visibleColumns.assegnatario && (
                <TableHead className="text-foreground font-semibold">
                  Assegnatario
                </TableHead>
              )}
              {visibleColumns.note && (
                <TableHead className="text-foreground font-semibold">
                  Documenti
                </TableHead>
              )}
              <TableHead className="text-foreground w-[50px] font-semibold"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="text-muted-foreground flex flex-col items-center justify-center">
                    <Search className="mb-2 h-8 w-8" />
                    <p>Nessun lead corrisponde ai criteri di ricerca</p>
                    <p className="text-sm">
                      Prova ad aggiustare la ricerca o i filtri
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedLeads.map(lead => (
                <TableRow key={lead.id}>
                  {visibleColumns.cliente && (
                    <TableCell>
                      <ClienteColumn
                        lead={lead}
                        onReferenceClick={refId =>
                          console.log('Reference clicked:', refId)
                        }
                      />
                    </TableCell>
                  )}
                  {visibleColumns.contatti && (
                    <TableCell>
                      <ContattiColumn lead={lead} />
                    </TableCell>
                  )}
                  {visibleColumns.data && (
                    <TableCell>
                      <DataColumn lead={lead} />
                    </TableCell>
                  )}
                  {visibleColumns.relazioni && (
                    <TableCell>
                      <RelazioniColumn
                        lead={lead}
                        onOrdersClick={leadId =>
                          console.log('Orders clicked:', leadId)
                        }
                        onActivitiesClick={leadId =>
                          console.log('Activities clicked:', leadId)
                        }
                      />
                    </TableCell>
                  )}
                  {visibleColumns.assegnatario && (
                    <TableCell>
                      <AssegnatarioColumn
                        lead={lead}
                        usersData={usersData}
                        onAssigneeClick={userId =>
                          console.log('Assignee clicked:', userId)
                        }
                      />
                    </TableCell>
                  )}
                  {visibleColumns.note && (
                    <TableCell>
                      <NoteAllegatiColumn
                        lead={lead}
                        onNotesClick={leadId =>
                          console.log('Notes clicked:', leadId)
                        }
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
                        <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => handleViewLead(lead.id)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Dettagli
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => handleEditLead(lead.id)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Modifica
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-red-600 hover:text-red-600"
                          onClick={() => handleDeleteLead(lead.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Elimina
                        </Button>
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
            Caricati <strong>{totalCount}</strong> lead totali
            {filteredLeads.length !== totalCount && (
              <span>
                {' '}
                • <strong>{filteredLeads.length}</strong> corrispondono ai
                filtri
              </span>
            )}
          </span>
        </div>

        {/* Pagination for display (local pagination on all loaded data) */}
        {filteredLeads.length > 0 && (
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
