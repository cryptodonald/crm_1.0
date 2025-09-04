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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Plus,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  CheckCircle,
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
} from '../leads/leads-table-columns';
import { DataTablePersistentFilter } from '@/components/data-table/data-table-persistent-filter';
import { DataTableColumnsSelector } from '@/components/data-table/data-table-columns-selector';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { DataTableBulkActions } from '@/components/data-table/data-table-bulk-actions';
import { ColumnDef, useReactTable, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, SortingState, ColumnFiltersState, VisibilityState } from '@tanstack/react-table';

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
  
  // Stati per TanStack Table
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    cliente: true,
    contatti: true, 
    data: true,
    relazioni: true,
    assegnatario: true,
    note: true,
  });
  // Stati per checkbox e ordinamento
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Stati per dialog di eliminazione e risultato
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [resultMessage, setResultMessage] = useState({ type: '', title: '', message: '' });
  const [showExportErrorDialog, setShowExportErrorDialog] = useState(false);

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

          // Per i conteggi degli stati, ignoriamo tutti gli altri filtri di categoria
          // Applichiamo solo search e dateRange + questo specifico stato
          const matchesStato = lead.Stato === stato;

          return (
            matchesSearch &&
            matchesDateRange &&
            matchesStato
          );
        }).length;

        counts[stato] = count;
        return counts;
      },
      {} as Record<LeadStato, number>
    );
  }, [leads, searchTerm, dateRange]); // NON include filters.stato

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

          // Per i conteggi delle provenienze, ignoriamo il filtro provenienza
          // Applichiamo solo search, dateRange, stato + questa specifica provenienza
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
  }, [leads, searchTerm, dateRange, filters.stato]); // NON include filters.provenienza

  // Filter and sort leads
  const filteredAndSortedLeads = useMemo(() => {
    // Prima applica i filtri
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

    // Poi applica l'ordinamento se specificato
    if (sortField && sortField === 'Data') {
      return [...filtered].sort((a, b) => {
        const dateA = a.Data ? new Date(a.Data).getTime() : 0;
        const dateB = b.Data ? new Date(b.Data).getTime() : 0;
        
        if (sortDirection === 'asc') {
          return dateA - dateB;
        } else {
          return dateB - dateA;
        }
      });
    }

    return filtered;
  }, [leads, searchTerm, dateRange, filters.stato, filters.provenienza, sortField, sortDirection]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedLeads.length / itemsPerPage);
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedLeads.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedLeads, currentPage, itemsPerPage]);

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

  // Gestione checkbox
  const handleSelectLead = (leadId: string, checked: boolean) => {
    setSelectedLeads(prev => 
      checked 
        ? [...prev, leadId]
        : prev.filter(id => id !== leadId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedLeads(checked ? paginatedLeads.map(lead => lead.id) : []);
  };

  const isAllSelected = selectedLeads.length === paginatedLeads.length && paginatedLeads.length > 0;
  const isIndeterminate = selectedLeads.length > 0 && selectedLeads.length < paginatedLeads.length;

  // Gestione ordinamento con reset al terzo click
  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        // Reset: rimuovi l'ordinamento
        setSortField('');
        setSortDirection('desc');
      }
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      // Icona combinata con chevron compatti e vicini
      return (
        <div className="ml-2 relative flex h-4 w-4 items-center justify-center">
          <ChevronUp className="absolute h-2.5 w-2.5 opacity-70 -translate-y-[3px] stroke-[2.5]" />
          <ChevronDown className="absolute h-2.5 w-2.5 opacity-70 translate-y-[3px] stroke-[2.5]" />
        </div>
      );
    }
    return sortDirection === 'asc' 
      ? <ChevronUp className="ml-2 h-4 w-4 stroke-[2]" />
      : <ChevronDown className="ml-2 h-4 w-4 stroke-[2]" />;
  };

  // Funzione per esportare leads selezionati in CSV completo
  const handleExportSelectedLeads = () => {
    const selectedLeadsData = filteredAndSortedLeads.filter(lead => selectedLeads.includes(lead.id));
    
    if (selectedLeadsData.length === 0) {
      setResultMessage({
        type: 'error',
        title: 'Export fallito',
        message: 'Nessun lead selezionato per l\'esportazione'
      });
      setShowResultDialog(true);
      return;
    }

    // Headers completi - TUTTI I 19 CAMPI
    const csvHeaders = [
      'ID', 'Nome', 'Email', 'Telefono', 'Indirizzo', 'CAP', 'Città',
      'Stato', 'Provenienza', 'Data', 'Data Creazione', 'Esigenza', 
      'Note', 'Conversations', 'Referenza', 'Nome Referenza',
      'Assegnatario', 'Ordini', 'Attività'
    ];
    
    // Funzione helper per gestire array
    const formatArray = (arr: string[] | undefined): string => {
      return arr && arr.length > 0 ? arr.join('; ') : '';
    };
    
    // Funzione helper per formattare allegati
    const formatAllegati = (allegati: any[] | undefined): string => {
      if (!allegati || allegati.length === 0) return '';
      return allegati.map(a => a.filename || a.url || '').join('; ');
    };

    const csvData = selectedLeadsData.map(lead => [
      lead.ID || '',
      lead.Nome || '',
      lead.Email || '',
      lead.Telefono || '',
      lead.Indirizzo || '',
      lead.CAP?.toString() || '',
      lead.Città || '',
      lead.Stato || '',
      lead.Provenienza || '',
      lead.Data ? new Date(lead.Data).toLocaleDateString('it-IT') : '',
      lead.createdTime ? new Date(lead.createdTime).toLocaleDateString('it-IT') : '',
      lead.Esigenza || '',
      lead.Note || '',
      lead.Conversations || '',
      formatArray(lead.Referenza),
      formatArray(lead['Nome referenza']),
      formatArray(lead.Assegnatario),
      formatArray(lead.Ordini),
      formatArray(lead.Attività)
    ]);

    // Crea contenuto CSV
    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `leads-export-completo-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(`✅ Esportati ${selectedLeadsData.length} leads con tutti i ${csvHeaders.length} campi`);
  };

  // Funzione per mostrare dialog di eliminazione
  const handleDeleteSelectedLeads = () => {
    if (selectedLeads.length === 0) {
      return;
    }
    setShowDeleteDialog(true);
  };

  // Funzione per confermare eliminazione con API reale
  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    
    try {
      const response = await fetch('/api/leads', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ leadIds: selectedLeads }),
      });

      if (!response.ok) {
        throw new Error(`Errore ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('🗑️ Risultato eliminazione:', result);

      if (result.success) {
        // Successo
        const deletedCount = result.deleted;
        const errorCount = result.requested - result.deleted;
        
        if (errorCount > 0) {
          setResultMessage({
            type: 'warning',
            title: 'Eliminazione parziale',
            message: `${deletedCount} leads eliminati, ${errorCount} errori`
          });
        } else {
          setResultMessage({
            type: 'success',
            title: 'Eliminazione completata',
            message: `${deletedCount} lead${deletedCount > 1 ? 's' : ''} eliminat${deletedCount > 1 ? 'i' : 'o'} con successo`
          });
        }
        
        // Chiudi dialog di conferma e mostra risultato
        setShowDeleteDialog(false);
        setShowResultDialog(true);
        
        // Refresh della pagina per aggiornare i dati dopo un delay
        setTimeout(() => {
          window.location.reload();
        }, 1500);
        
      } else {
        throw new Error('Eliminazione fallita');
      }
    } catch (error) {
      console.error('❌ Errore durante eliminazione:', error);
      setResultMessage({
        type: 'error',
        title: 'Errore eliminazione',
        message: `Errore durante l'eliminazione: ${error}`
      });
      setShowDeleteDialog(false);
      setShowResultDialog(true);
    } finally {
      setIsDeleting(false);
      setSelectedLeads([]);
    }
  };

  // Funzione per deselezionare tutto
  const handleClearSelection = () => {
    setSelectedLeads([]);
  };

  // Azioni sui lead
  const handleViewLead = (leadId: string) => {
    window.open(`/leads/${leadId}`, '_blank');
  };

  const handleEditLead = (leadId: string) => {
    console.log('Edit lead:', leadId);
    // TODO: Implementare modifica inline o navigazione a form di edit
  };

  const handleDeleteLead = (leadId: string) => {
    // Implementa eliminazione singola se necessario
    setSelectedLeads([leadId]);
    setShowDeleteDialog(true);
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
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input e Filtri principali */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
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

            {/* Date Range Picker */}
            <DateRangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder="Filtra per periodo"
              className="w-full sm:w-56"
            />

            {/* Filtro Stato con componente persistente */}
            <DataTablePersistentFilter
              title="Stato"
              options={STATI_DISPONIBILI.map(stato => ({
                label: stato,
                value: stato,
                count: getStatoCounts[stato] || 0,
              }))}
              selectedValues={filters.stato || []}
              onSelectionChange={(values) => {
                handleFilterChange('stato', values.length ? values : undefined);
              }}
              onReset={() => {
                handleFilterChange('stato', undefined);
              }}
            />

            {/* Filtro Provenienza con componente persistente */}
            <DataTablePersistentFilter
              title="Provenienza"
              options={PROVENIENZE_DISPONIBILI.map(provenienza => ({
                label: provenienza,
                value: provenienza,
                count: getProvenienzaCounts[provenienza] || 0,
              }))}
              selectedValues={filters.provenienza || []}
              onSelectionChange={(values) => {
                handleFilterChange('provenienza', values.length ? values : undefined);
              }}
              onReset={() => {
                handleFilterChange('provenienza', undefined);
              }}
            />
          </div>

          {/* Controlli secondari */}
          <div className="flex items-center space-x-2">
            {/* Bulk Actions - appare solo quando ci sono righe selezionate */}
            <DataTableBulkActions
              selectedCount={selectedLeads.length}
              onClearSelection={handleClearSelection}
              onExport={handleExportSelectedLeads}
              onDelete={handleDeleteSelectedLeads}
            />

            {/* Pulsante Reset globale - appare solo quando ci sono filtri attivi */}
            {(filters.stato?.length || filters.provenienza?.length || dateRange?.from || searchTerm) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setDateRange(undefined);
                  onFiltersChange({});
                  setCurrentPage(1);
                }}
                className="h-8 px-2 lg:px-3"
              >
                <X className="mr-2 h-4 w-4" />
                Reimposta
              </Button>
            )}

            {/* Selettore colonne visibili */}
            <DataTableColumnsSelector
              title="Colonne"
              options={[
                { label: "Cliente", value: "cliente" },
                { label: "Contatti", value: "contatti" },
                { label: "Data", value: "data" },
                { label: "Relazioni", value: "relazioni" },
                { label: "Assegnatario", value: "assegnatario" },
                { label: "Documenti", value: "note" },
              ]}
              selectedValues={Object.entries(visibleColumns)
                .filter(([_, visible]) => visible)
                .map(([column, _]) => column)
              }
              onSelectionChange={(values) => {
                const newVisibleColumns = {
                  cliente: values.includes('cliente'),
                  contatti: values.includes('contatti'),
                  data: values.includes('data'),
                  relazioni: values.includes('relazioni'),
                  assegnatario: values.includes('assegnatario'),
                  note: values.includes('note'),
                };
                setVisibleColumns(newVisibleColumns);
              }}
            />
          </div>
        </div>

      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Seleziona tutto"
                  className="translate-y-[2px]"
                  ref={(el) => {
                    if (el) el.indeterminate = isIndeterminate;
                  }}
                />
              </TableHead>
              {visibleColumns.cliente && (
                <TableHead className="text-foreground font-semibold">
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
                  <DataTableColumnHeader 
                    column={{
                      getCanSort: () => true,
                      getCanHide: () => false,
                      getIsSorted: () => {
                        if (sortField === 'Data') {
                          return sortDirection === 'asc' ? 'asc' : 'desc';
                        }
                        return false;
                      },
                      toggleSorting: (desc?: boolean) => {
                        if (sortField === 'Data') {
                          if (sortDirection === 'desc' && !desc) {
                            setSortDirection('asc');
                          } else if (sortDirection === 'asc' && desc) {
                            setSortDirection('desc');
                          } else {
                            // Reset
                            setSortField('');
                            setSortDirection('desc');
                          }
                        } else {
                          setSortField('Data');
                          setSortDirection(desc ? 'desc' : 'asc');
                        }
                      },
                      clearSorting: () => {
                        setSortField('');
                        setSortDirection('desc');
                      }
                    } as any}
                    title="Data"
                  />
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
            {filteredAndSortedLeads.length === 0 ? (
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
                  <TableCell>
                    <Checkbox
                      checked={selectedLeads.includes(lead.id)}
                      onCheckedChange={(checked) => handleSelectLead(lead.id, !!checked)}
                      aria-label={`Seleziona ${lead.Nome || lead.ID}`}
                      className="translate-y-[2px]"
                    />
                  </TableCell>
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
                          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 group transition-colors"
                          onClick={() => handleDeleteLead(lead.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4 text-red-600 group-hover:text-red-700 transition-colors" />
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

      {/* Paginazione ESATTA dalla demo */}
      <DataTablePagination 
        table={{
          getFilteredSelectedRowModel: () => ({ rows: [] }),
          getFilteredRowModel: () => ({ rows: filteredAndSortedLeads }),
          getState: () => ({ 
            pagination: { 
              pageIndex: currentPage - 1, 
              pageSize: itemsPerPage 
            } 
          }),
          setPageSize: (size: number) => {
            setItemsPerPage(size);
            setCurrentPage(1);
          },
          getPageCount: () => totalPages,
          setPageIndex: (index: number) => setCurrentPage(index + 1),
          getCanPreviousPage: () => currentPage > 1,
          getCanNextPage: () => currentPage < totalPages,
          previousPage: () => setCurrentPage(prev => Math.max(1, prev - 1)),
          nextPage: () => setCurrentPage(prev => Math.min(totalPages, prev + 1)),
        } as any}
      />

      {/* Dialog di conferma eliminazione */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Conferma eliminazione
            </DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare <strong>{selectedLeads.length}</strong> lead{selectedLeads.length > 1 ? 's' : ''}?
              <br />
              <span className="font-medium mt-1 block">
                Questa azione non può essere annullata.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="gap-2 hover:bg-red-700 transition-colors"
            >
              {isDeleting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Eliminazione...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 transition-colors" />
                  Elimina {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog di risultato (successo/errore/warning) */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {resultMessage.type === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
              {resultMessage.type === 'error' && <AlertTriangle className="h-5 w-5 text-destructive" />}
              {resultMessage.type === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
              {resultMessage.title}
            </DialogTitle>
            <DialogDescription className={`${
              resultMessage.type === 'success' ? 'text-green-700' :
              resultMessage.type === 'error' ? 'text-red-700' :
              resultMessage.type === 'warning' ? 'text-amber-700' :
              'text-muted-foreground'
            }`}>
              {resultMessage.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowResultDialog(false)}
              variant={resultMessage.type === 'success' ? 'default' : 'outline'}
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
