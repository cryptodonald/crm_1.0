'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  Edit,
  Trash2,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  ShoppingCart,
  Calendar,
  Package,
  Euro,
  User,
  Settings2,
  Paperclip,
  Download,
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-picker';
import { DataTablePersistentFilter } from '@/components/data-table/data-table-persistent-filter';
import { DataTableColumnsSelector } from '@/components/data-table/data-table-columns-selector';
import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { DataTableBulkActions } from '@/components/data-table/data-table-bulk-actions';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { AvatarLead } from '@/components/ui/avatar-lead';
import Link from 'next/link';

// Tipi per gli ordini (da definire o importare)
interface OrderData {
  id: string; // Airtable record ID
  createdTime: string; // ISO timestamp
  ID_Ordine: string;
  Cliente_Nome?: string; // Campo calcolato/lookup
  Data_Ordine: string;
  Data_Consegna_Richiesta?: string;
  Stato_Ordine: string;
  Stato_Pagamento: string;
  Totale_Finale: number;
  Note_Cliente?: string;
  Note_Interne?: string;
  ID_Lead?: string[];
  ID_Venditore?: string[];
  Indirizzo_Consegna?: string;
  Modalita_Pagamento?: string;
  Totale_Lordo?: number;
  Totale_Sconto?: number;
  Totale_Netto?: number;
  Totale_IVA?: number;
  Allegati?: string[]; // Array di URL o nomi file
}

interface OrdersDataTableProps {
  orders: OrderData[];
  loading: boolean;
  totalCount: number;
  className?: string;
}

// Stati disponibili per gli ordini
const STATI_ORDINE_DISPONIBILI = [
  'Bozza',
  'Confermato', 
  'In_Produzione',
  'Spedito',
  'Consegnato',
  'Annullato',
];

const STATI_PAGAMENTO_DISPONIBILI = [
  'Non_Pagato',
  'Pagamento_Parziale',
  'Pagato',
  'Rimborsato',
];

// Componente per colonna Cliente con avatar e link
interface ClienteOrderColumnProps {
  order: OrderData;
  onClientClick?: (leadId: string) => void;
}

function ClienteOrderColumn({ order, onClientClick }: ClienteOrderColumnProps) {
  // Separa i nomi dei clienti
  const clientNames = order.Cliente_Nome ? order.Cliente_Nome.split(', ') : [];
  const leadIds = order.ID_Lead || [];
  
  // Se non ci sono nomi ma ci sono ID lead, mostra fallback
  if (clientNames.length === 0 && leadIds.length === 0) {
    return (
      <div className="flex items-center space-x-2 text-muted-foreground">
        <User className="h-4 w-4" />
        <span className="text-sm">N/A</span>
      </div>
    );
  }
  
  // Se c'è un solo cliente
  if (clientNames.length === 1) {
    const clientName = clientNames[0];
    const leadId = leadIds[0];
    
    return (
      <div className="flex items-center space-x-3">
        <AvatarLead
          nome={clientName}
          size="md"
          showTooltip={false}
        />
        <div className="min-w-0 flex-1">
          {leadId ? (
            <a
              href={`/leads/${leadId}`}
              onClick={(e) => {
                e.preventDefault();
                onClientClick?.(leadId);
              }}
              className="text-sm font-medium text-foreground hover:text-primary hover:underline cursor-pointer truncate block"
              title={clientName}
            >
              {clientName}
            </a>
          ) : (
            <span className="text-sm font-medium text-foreground truncate block" title={clientName}>
              {clientName}
            </span>
          )}
        </div>
      </div>
    );
  }
  
  // Se ci sono più clienti
  const firstClient = clientNames[0];
  const firstLeadId = leadIds[0];
  const additionalCount = clientNames.length - 1;
  
  return (
    <div className="flex items-center space-x-3">
      <AvatarLead
        nome={firstClient}
        size="md"
        showTooltip={false}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center space-x-2">
          {firstLeadId ? (
            <a
              href={`/leads/${firstLeadId}`}
              onClick={(e) => {
                e.preventDefault();
                onClientClick?.(firstLeadId);
              }}
              className="text-sm font-medium text-foreground hover:text-primary hover:underline cursor-pointer truncate"
              title={order.Cliente_Nome}
            >
              {firstClient}
            </a>
          ) : (
            <span 
              className="text-sm font-medium text-foreground truncate" 
              title={order.Cliente_Nome}
            >
              {firstClient}
            </span>
          )}
          {additionalCount > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors cursor-pointer"
                  title={`Vedi altri ${additionalCount} client${additionalCount > 1 ? 'i' : 'e'}`}
                >
                  +{additionalCount}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {clientNames.slice(1).map((clientName, index) => {
                  const leadId = leadIds[index + 1]; // +1 perché saltiamo il primo
                  return (
                    <DropdownMenuItem 
                      key={index}
                      className="cursor-pointer"
                      onClick={() => leadId && onClientClick?.(leadId)}
                    >
                      <div className="flex items-center space-x-2">
                        <AvatarLead
                          nome={clientName}
                          size="sm"
                          showTooltip={false}
                        />
                        <span className="font-medium">{clientName}</span>
                        {!leadId && (
                          <span className="text-xs text-muted-foreground">(No ID)</span>
                        )}
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}

// Configurazione colonne visibili
const DEFAULT_VISIBLE_COLUMNS = {
  data: true,
  cliente: true,
  ordine: true,
  totale: true,
  stato: true,
  pagamento: true,
  allegati: true,
}

// Componente per colonna Allegati
interface AllegatiOrderColumnProps {
  order: OrderData;
  onAttachmentClick?: (attachmentUrl: string, attachmentName: string) => void;
}

function AllegatiOrderColumn({ order, onAttachmentClick }: AllegatiOrderColumnProps) {
  const allegati = order.Allegati || [];
  
  if (allegati.length === 0) {
    return (
      <div className="flex items-center justify-center text-muted-foreground">
        <span className="text-xs">--</span>
      </div>
    );
  }
  
  // Se c'è un solo allegato
  if (allegati.length === 1) {
    const allegato = allegati[0];
    const fileName = allegato.split('/').pop() || allegato;
    
    return (
      <div className="flex items-center space-x-2">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <button
          onClick={() => onAttachmentClick?.(allegato, fileName)}
          className="text-sm text-primary hover:underline cursor-pointer truncate max-w-[120px]"
          title={fileName}
        >
          {fileName}
        </button>
      </div>
    );
  }
  
  // Se ci sono più allegati
  return (
    <div className="flex items-center space-x-2">
      <Paperclip className="h-4 w-4 text-muted-foreground" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button 
            className="text-sm text-primary hover:underline cursor-pointer"
            title={`${allegati.length} allegat${allegati.length > 1 ? 'i' : 'o'}`}
          >
            {allegati.length} file{allegati.length > 1 ? 's' : ''}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {allegati.map((allegato, index) => {
            const fileName = allegato.split('/').pop() || allegato;
            return (
              <DropdownMenuItem 
                key={index}
                className="cursor-pointer"
                onClick={() => onAttachmentClick?.(allegato, fileName)}
              >
                <div className="flex items-center space-x-2">
                  <Download className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium truncate max-w-[200px]" title={fileName}>
                    {fileName}
                  </span>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function OrdersDataTable({
  orders,
  loading,
  totalCount,
  className,
}: OrdersDataTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  // Stati per filtri
  const [statoOrdineFilter, setStatoOrdineFilter] = useState<string[]>([]);
  const [statoPagamentoFilter, setStatoPagamentoFilter] = useState<string[]>([]);
  
  // Stati per checkbox e ordinamento  
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Stati per dialog di eliminazione
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Funzioni helper per colori badge
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Bozza': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'Confermato': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'In_Produzione': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Spedito': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'Consegnato': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Annullato': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Non_Pagato': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'Pagamento_Parziale': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Pagato': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Rimborsato': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  // Calcolo conteggi dinamici per stati ordine
  const getStatoOrdineCounts = useMemo(() => {
    return STATI_ORDINE_DISPONIBILI.reduce(
      (counts, stato) => {
        const count = orders.filter(order => {
          const matchesSearch =
            !searchTerm ||
            order.ID_Ordine?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.Cliente_Nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.Note_Cliente?.toLowerCase().includes(searchTerm.toLowerCase());

          const matchesDateRange =
            !dateRange?.from ||
            !dateRange?.to ||
            (() => {
              if (!order.Data_Ordine) return false;
              const orderDate = new Date(order.Data_Ordine);
              return orderDate >= dateRange.from! && orderDate <= dateRange.to!;
            })();

          const matchesStato = order.Stato_Ordine === stato;

          return matchesSearch && matchesDateRange && matchesStato;
        }).length;

        counts[stato] = count;
        return counts;
      },
      {} as Record<string, number>
    );
  }, [orders, searchTerm, dateRange]);

  // Calcolo conteggi dinamici per stati pagamento
  const getStatoPagamentoCounts = useMemo(() => {
    return STATI_PAGAMENTO_DISPONIBILI.reduce(
      (counts, stato) => {
        const count = orders.filter(order => {
          const matchesSearch =
            !searchTerm ||
            order.ID_Ordine?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.Cliente_Nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.Note_Cliente?.toLowerCase().includes(searchTerm.toLowerCase());

          const matchesDateRange =
            !dateRange?.from ||
            !dateRange?.to ||
            (() => {
              if (!order.Data_Ordine) return false;
              const orderDate = new Date(order.Data_Ordine);
              return orderDate >= dateRange.from! && orderDate <= dateRange.to!;
            })();

          const matchesStatoOrdine =
            statoOrdineFilter.length === 0 ||
            statoOrdineFilter.includes(order.Stato_Ordine);
          const matchesStato = order.Stato_Pagamento === stato;

          return matchesSearch && matchesDateRange && matchesStatoOrdine && matchesStato;
        }).length;

        counts[stato] = count;
        return counts;
      },
      {} as Record<string, number>
    );
  }, [orders, searchTerm, dateRange, statoOrdineFilter]);

  // Filtro e ordinamento ordini
  const filteredAndSortedOrders = useMemo(() => {
    const filtered = orders.filter(order => {
      const matchesSearch =
        !searchTerm ||
        order.ID_Ordine?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.Cliente_Nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.Note_Cliente?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesDateRange =
        !dateRange?.from ||
        !dateRange?.to ||
        (() => {
          if (!order.Data_Ordine) return false;
          const orderDate = new Date(order.Data_Ordine);
          return orderDate >= dateRange.from! && orderDate <= dateRange.to!;
        })();

      const matchesStatoOrdine =
        statoOrdineFilter.length === 0 ||
        statoOrdineFilter.includes(order.Stato_Ordine);

      const matchesStatoPagamento =
        statoPagamentoFilter.length === 0 ||
        statoPagamentoFilter.includes(order.Stato_Pagamento);

      return matchesSearch && matchesDateRange && matchesStatoOrdine && matchesStatoPagamento;
    });

    // Ordinamento se specificato
    if (sortField === 'Data_Ordine') {
      return [...filtered].sort((a, b) => {
        const dateA = a.Data_Ordine ? new Date(a.Data_Ordine).getTime() : 0;
        const dateB = b.Data_Ordine ? new Date(b.Data_Ordine).getTime() : 0;
        
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

    return filtered;
  }, [orders, searchTerm, dateRange, statoOrdineFilter, statoPagamentoFilter, sortField, sortDirection]);

  // Paginazione
  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedOrders, currentPage, itemsPerPage]);

  // Reset a prima pagina quando cambiano i filtri
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, statoOrdineFilter, statoPagamentoFilter, dateRange]);

  // Gestione ricerca
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Gestione checkbox
  const handleSelectOrder = (orderId: string, checked: boolean) => {
    setSelectedOrders(prev => 
      checked 
        ? [...prev, orderId]
        : prev.filter(id => id !== orderId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedOrders(checked ? paginatedOrders.map(order => order.ID_Ordine) : []);
  };

  const isAllSelected = selectedOrders.length === paginatedOrders.length && paginatedOrders.length > 0;
  const isIndeterminate = selectedOrders.length > 0 && selectedOrders.length < paginatedOrders.length;

  // Azioni sui ordini
  const handleEditOrder = (orderId: string) => {
    router.push(`/orders/edit/${orderId}`);
  };

  const handleDeleteOrder = (orderId: string) => {
    setSelectedOrders([orderId]);
    setShowDeleteDialog(true);
  };

  // Reset filtri
  const clearFilters = () => {
    setSearchTerm('');
    setDateRange(undefined);
    setStatoOrdineFilter([]);
    setStatoPagamentoFilter([]);
    setCurrentPage(1);
  };

  const hasActiveFilters = 
    searchTerm || 
    dateRange?.from || 
    statoOrdineFilter.length > 0 || 
    statoPagamentoFilter.length > 0;

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
                {Array.from({ length: 7 }).map((_, i) => (
                  <TableHead key={i}>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
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
      {/* Filtri - Stile identico ai leads */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search e Filtri principali */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Cerca Ordini..."
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

            {/* Filtro Stato Ordine */}
            <DataTablePersistentFilter
              title="Stato Ordine"
              options={STATI_ORDINE_DISPONIBILI.map(stato => ({
                label: stato.replace('_', ' '),
                value: stato,
                count: getStatoOrdineCounts[stato] || 0,
              }))}
              selectedValues={statoOrdineFilter}
              onSelectionChange={setStatoOrdineFilter}
              onReset={() => setStatoOrdineFilter([])}
            />

            {/* Filtro Stato Pagamento */}
            <DataTablePersistentFilter
              title="Stato Pagamento"
              options={STATI_PAGAMENTO_DISPONIBILI.map(stato => ({
                label: stato.replace('_', ' '),
                value: stato,
                count: getStatoPagamentoCounts[stato] || 0,
              }))}
              selectedValues={statoPagamentoFilter}
              onSelectionChange={setStatoPagamentoFilter}
              onReset={() => setStatoPagamentoFilter([])}
            />
          </div>

          {/* Controlli secondari */}
          <div className="flex items-center space-x-2">
            {/* Bulk Actions */}
            <DataTableBulkActions
              selectedCount={selectedOrders.length}
              onClearSelection={() => setSelectedOrders([])}
              onExport={() => {
                // TODO: Implementare esportazione ordini
                console.log('Export orders:', selectedOrders);
              }}
              onDelete={() => setShowDeleteDialog(true)}
            />

            {/* Reset globale */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="h-8 px-2 lg:px-3"
              >
                <X className="mr-2 h-4 w-4" />
                Reimposta
              </Button>
            )}

            {/* Selettore colonne */}
            <DataTableColumnsSelector
              title="Colonne"
              options={[
                { label: "Data", value: "data" },
                { label: "Cliente", value: "cliente" },
                { label: "Ordine", value: "ordine" },
                { label: "Totale", value: "totale" },
                { label: "Stato", value: "stato" },
                { label: "Pagamento", value: "pagamento" },
                { label: "Allegati", value: "allegati" },
              ]}
              selectedValues={Object.entries(visibleColumns)
                .filter(([_, visible]) => visible)
                .map(([column, _]) => column)
              }
              onSelectionChange={(values) => {
                const newVisibleColumns = {
                  data: values.includes('data'),
                  cliente: values.includes('cliente'),
                  ordine: values.includes('ordine'),
                  totale: values.includes('totale'),
                  stato: values.includes('stato'),
                  pagamento: values.includes('pagamento'),
                  allegati: values.includes('allegati'),
                };
                setVisibleColumns(newVisibleColumns);
              }}
            />
          </div>
        </div>
      </div>

      {/* Tabella */}
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
              {visibleColumns.data && (
                <TableHead className="text-foreground font-semibold">
                  Data Ordine
                </TableHead>
              )}
              {visibleColumns.cliente && (
                <TableHead className="text-foreground font-semibold">
                  Cliente
                </TableHead>
              )}
              {visibleColumns.ordine && (
                <TableHead className="text-foreground font-semibold">
                  Ordine
                </TableHead>
              )}
              {visibleColumns.totale && (
                <TableHead className="text-foreground font-semibold">
                  Totale
                </TableHead>
              )}
              {visibleColumns.stato && (
                <TableHead className="text-foreground font-semibold">
                  Stato
                </TableHead>
              )}
              {visibleColumns.pagamento && (
                <TableHead className="text-foreground font-semibold">
                  Pagamento
                </TableHead>
              )}
              {visibleColumns.allegati && (
                <TableHead className="text-foreground font-semibold">
                  Allegati
                </TableHead>
              )}
              <TableHead className="text-foreground w-[50px] font-semibold"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="text-muted-foreground flex flex-col items-center justify-center">
                    <ShoppingCart className="mb-2 h-8 w-8" />
                    <p>Nessun ordine corrisponde ai criteri di ricerca</p>
                    <p className="text-sm">
                      Prova ad aggiustare la ricerca o i filtri
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedOrders.map(order => (
                <TableRow key={order.ID_Ordine}>
                  <TableCell>
                    <Checkbox
                      checked={selectedOrders.includes(order.ID_Ordine)}
                      onCheckedChange={(checked) => handleSelectOrder(order.ID_Ordine, !!checked)}
                      aria-label={`Seleziona ordine ${order.ID_Ordine}`}
                      className="translate-y-[2px]"
                    />
                  </TableCell>
                  {visibleColumns.data && (
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {order.Data_Ordine 
                            ? format(parseISO(order.Data_Ordine), 'dd MMM yyyy', { locale: it })
                            : 'N/A'
                          }
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.cliente && (
                    <TableCell>
                      <ClienteOrderColumn 
                        order={order}
                        onClientClick={(leadId) => {
                          // Naviga alla pagina del lead
                          router.push(`/leads/${leadId}`);
                        }}
                      />
                    </TableCell>
                  )}
                  {visibleColumns.ordine && (
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">#{order.ID_Ordine}</span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.totale && (
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <Euro className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {formatCurrency(order.Totale_Finale || 0)}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.stato && (
                    <TableCell>
                      <Badge className={getStatusColor(order.Stato_Ordine || 'Bozza')}>
                        {(order.Stato_Ordine || 'Bozza').replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.pagamento && (
                    <TableCell>
                      <Badge className={getPaymentStatusColor(order.Stato_Pagamento || 'Non_Pagato')}>
                        {(order.Stato_Pagamento || 'Non_Pagato').replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.allegati && (
                    <TableCell>
                      <AllegatiOrderColumn
                        order={order}
                        onAttachmentClick={(attachmentUrl, fileName) => {
                          // Apri l'allegato in una nuova finestra o scaricalo
                          window.open(attachmentUrl, '_blank');
                        }}
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
                        <DropdownMenuItem
                          className="cursor-pointer"
                          onClick={() => handleEditOrder(order.ID_Ordine)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Modifica
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                          onClick={() => handleDeleteOrder(order.ID_Ordine)}
                        >
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

      {/* Paginazione */}
      <DataTablePagination 
        table={{
          getFilteredSelectedRowModel: () => ({ rows: [] }),
          getFilteredRowModel: () => ({ rows: filteredAndSortedOrders }),
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

      {/* Dialog conferma eliminazione */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Conferma eliminazione
            </DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare <strong>{selectedOrders.length}</strong> ordine{selectedOrders.length > 1 ? 'i' : ''}?
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
              onClick={() => {
                // TODO: Implementare eliminazione
                console.log('Delete orders:', selectedOrders);
                setShowDeleteDialog(false);
                setSelectedOrders([]);
              }}
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
                  Elimina {selectedOrders.length} ordine{selectedOrders.length > 1 ? 'i' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}