'use client';

import { useState, useMemo, useEffect } from 'react';
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
  Plus,
  ShoppingCart,
  Calendar,
  Euro,
  User,
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
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

// Tipi per gli ordini
interface OrderData {
  id: string; // Airtable record ID
  createdTime: string; // ISO timestamp
  fields: {
    ID_Ordine?: string;
    Cliente_Nome?: string; // Campo calcolato/lookup
    Data_Ordine?: string;
    Data_Consegna_Richiesta?: string;
    Stato_Ordine?: string;
    Stato_Pagamento?: string;
    Totale_Finale?: number;
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
  };
  // Backward compatibility - fields can be flattened
  ID_Ordine?: string;
  Cliente_Nome?: string;
  Data_Ordine?: string;
  Data_Consegna_Richiesta?: string;
  Stato_Ordine?: string;
  Stato_Pagamento?: string;
  Totale_Finale?: number;
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

interface LeadOrdersPanelProps {
  leadId: string;
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

// Componente per colonna allegati
interface AllegatiColumnProps {
  order: OrderData;
  onAttachmentClick?: (url: string, filename: string) => void;
}

function AllegatiColumn({ order, onAttachmentClick }: AllegatiColumnProps) {
  const allegati = order.Allegati || [];
  
  if (allegati.length === 0) {
    return (
      <div className="flex items-center text-muted-foreground">
        <Paperclip className="mr-2 h-4 w-4" />
        <span className="text-sm">0</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2">
          <Paperclip className="mr-1 h-4 w-4" />
          <span className="text-sm">{allegati.length}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Allegati ({allegati.length})</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allegati.map((allegato, index) => (
          <DropdownMenuItem
            key={index}
            className="cursor-pointer"
            onClick={() => onAttachmentClick?.(allegato, `allegato-${index + 1}`)}
          >
            <Download className="mr-2 h-4 w-4" />
            <span className="truncate">Allegato {index + 1}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Helper functions per accesso sicuro ai campi
const getOrderField = (order: OrderData, fieldName: keyof OrderData['fields']): any => {
  // Prima prova i campi flattened per backward compatibility
  if (order[fieldName as keyof OrderData] !== undefined) {
    return order[fieldName as keyof OrderData];
  }
  // Poi prova nei fields nidificati
  return order.fields?.[fieldName];
};

const getOrderId = (order: OrderData): string => {
  return order.id || getOrderField(order, 'ID_Ordine') || '';
};

// Hook per caricare ordini del lead
function useLeadOrders(leadId: string) {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      if (!leadId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/orders?leadId=${leadId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch orders');
        }
        
        const data = await response.json();
        setOrders(data.records || []);
      } catch (err) {
        console.error('Error fetching lead orders:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [leadId]);

  return { orders, loading, error, refetch: () => fetchOrders() };
}

// Funzioni di utilità
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

const getStatusColor = (stato: string) => {
  switch (stato) {
    case 'Bozza':
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    case 'Confermato':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
    case 'In_Produzione':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
    case 'Spedito':
      return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
    case 'Consegnato':
      return 'bg-green-100 text-green-800 hover:bg-green-200';
    case 'Annullato':
      return 'bg-red-100 text-red-800 hover:bg-red-200';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  }
};

const getPaymentStatusColor = (stato: string) => {
  switch (stato) {
    case 'Non_Pagato':
      return 'bg-red-100 text-red-800 hover:bg-red-200';
    case 'Pagamento_Parziale':
      return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
    case 'Pagato':
      return 'bg-green-100 text-green-800 hover:bg-green-200';
    case 'Rimborsato':
      return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
  }
};

export function LeadOrdersPanel({ leadId, className }: LeadOrdersPanelProps) {
  const { orders, loading, error } = useLeadOrders(leadId);
  const router = useRouter();

  // Stati filtri
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [statoOrdineFilter, setStatoOrdineFilter] = useState<string[]>([]);
  const [statoPagamentoFilter, setStatoPagamentoFilter] = useState<string[]>([]);
  
  // Stati selezione e azioni
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Stati UI
  const [visibleColumns, setVisibleColumns] = useState({
    data: true,
    ordine: true,
    totale: true,
    stato: true,
    pagamento: true,
    allegati: true,
  });
  
  // Paginazione
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filtri e ordinamento
  const filteredAndSortedOrders = useMemo(() => {
    let filtered = [...orders];

    // Filtro ricerca
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(order => {
        const idOrdine = getOrderField(order, 'ID_Ordine');
        const clienteNome = getOrderField(order, 'Cliente_Nome');
        const noteCliente = getOrderField(order, 'Note_Cliente');
        return (
          idOrdine?.toLowerCase().includes(searchLower) ||
          clienteNome?.toLowerCase().includes(searchLower) ||
          noteCliente?.toLowerCase().includes(searchLower)
        );
      });
    }

    // Filtro date
    if (dateRange?.from || dateRange?.to) {
      filtered = filtered.filter(order => {
        const dataOrdine = getOrderField(order, 'Data_Ordine');
        if (!dataOrdine) return false;
        const orderDate = parseISO(dataOrdine);
        
        if (dateRange.from && orderDate < dateRange.from) return false;
        if (dateRange.to) {
          const endOfDay = new Date(dateRange.to);
          endOfDay.setHours(23, 59, 59, 999);
          if (orderDate > endOfDay) return false;
        }
        
        return true;
      });
    }

    // Filtro stato ordine
    if (statoOrdineFilter.length > 0) {
      filtered = filtered.filter(order => {
        const statoOrdine = getOrderField(order, 'Stato_Ordine') || 'Bozza';
        return statoOrdineFilter.includes(statoOrdine);
      });
    }

    // Filtro stato pagamento
    if (statoPagamentoFilter.length > 0) {
      filtered = filtered.filter(order => {
        const statoPagamento = getOrderField(order, 'Stato_Pagamento') || 'Non_Pagato';
        return statoPagamentoFilter.includes(statoPagamento);
      });
    }

    // Ordinamento per data (più recenti per primi)
    return filtered.sort((a, b) => {
      const dataA = getOrderField(a, 'Data_Ordine');
      const dataB = getOrderField(b, 'Data_Ordine');
      const dateA = dataA ? parseISO(dataA) : new Date(0);
      const dateB = dataB ? parseISO(dataB) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
  }, [orders, searchTerm, dateRange, statoOrdineFilter, statoPagamentoFilter]);

  // Paginazione
  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedOrders, currentPage, itemsPerPage]);

  // Conteggi per filtri
  const getStatoOrdineCounts = useMemo(() => {
    return STATI_ORDINE_DISPONIBILI.reduce((counts, stato) => {
      counts[stato] = orders.filter(order => {
        const statoOrdine = getOrderField(order, 'Stato_Ordine') || 'Bozza';
        return statoOrdine === stato;
      }).length;
      return counts;
    }, {} as Record<string, number>);
  }, [orders]);

  const getStatoPagamentoCounts = useMemo(() => {
    return STATI_PAGAMENTO_DISPONIBILI.reduce((counts, stato) => {
      counts[stato] = orders.filter(order => {
        const statoPagamento = getOrderField(order, 'Stato_Pagamento') || 'Non_Pagato';
        return statoPagamento === stato;
      }).length;
      return counts;
    }, {} as Record<string, number>);
  }, [orders]);

  // Gestione selezione
  const handleSelectOrder = (orderId: string, checked: boolean) => {
    setSelectedOrders(prev => 
      checked 
        ? [...prev, orderId]
        : prev.filter(id => id !== orderId)
    );
  };

  const handleSelectAll = () => {
    const allOrderIds = paginatedOrders.map(order => getOrderId(order));
    setSelectedOrders(prev => 
      prev.length === allOrderIds.length ? [] : allOrderIds
    );
  };

  const isAllSelected = paginatedOrders.length > 0 && selectedOrders.length === paginatedOrders.length;
  const isIndeterminate = selectedOrders.length > 0 && selectedOrders.length < paginatedOrders.length;

  // Gestione azioni
  const handleEditOrder = (orderId: string) => {
    router.push(`/orders/edit/${orderId}`);
  };

  const handleDeleteOrder = (orderId: string) => {
    setSelectedOrders([orderId]);
    setShowDeleteDialog(true);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Clear filters
  const hasActiveFilters = searchTerm || dateRange || statoOrdineFilter.length > 0 || statoPagamentoFilter.length > 0;
  
  const clearFilters = () => {
    setSearchTerm('');
    setDateRange(undefined);
    setStatoOrdineFilter([]);
    setStatoPagamentoFilter([]);
    setCurrentPage(1);
  };

  if (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Errore nel caricamento degli ordini: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header con conteggio */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-6 w-6 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Ordini del Lead
            </h3>
            {orders.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {orders.length}
              </Badge>
            )}
          </div>
          <Button 
            onClick={() => router.push('/orders/new')}
            size="sm"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Nuovo Ordine
          </Button>
        </div>

        {/* Filtri */}
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
                      <p>Nessun ordine per questo lead</p>
                      <p className="text-sm">
                        {hasActiveFilters ? 'Prova ad aggiustare i filtri' : 'Inizia creando il primo ordine'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOrders.map((order, index) => {
                  const orderId = getOrderId(order);
                  const dataOrdine = getOrderField(order, 'Data_Ordine');
                  const idOrdine = getOrderField(order, 'ID_Ordine');
                  const totaleFinalе = getOrderField(order, 'Totale_Finale');
                  const statoOrdine = getOrderField(order, 'Stato_Ordine') || 'Bozza';
                  const statoPagamento = getOrderField(order, 'Stato_Pagamento') || 'Non_Pagato';
                  const allegati = getOrderField(order, 'Allegati');
                  
                  return (
                  <TableRow key={orderId || `order-${index}`}>
                    <TableCell>
                      <Checkbox
                        checked={selectedOrders.includes(orderId)}
                        onCheckedChange={(checked) => handleSelectOrder(orderId, !!checked)}
                        aria-label={`Seleziona ordine ${idOrdine || 'N/A'}`}
                        className="translate-y-[2px]"
                      />
                    </TableCell>
                    {visibleColumns.data && (
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {dataOrdine 
                              ? format(parseISO(dataOrdine), 'dd MMM yyyy', { locale: it })
                              : 'N/A'
                            }
                          </span>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.ordine && (
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">#{idOrdine || 'N/A'}</span>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.totale && (
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Euro className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {formatCurrency(totaleFinalе || 0)}
                          </span>
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.stato && (
                      <TableCell>
                        <Badge className={getStatusColor(statoOrdine)}>
                          {statoOrdine.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.pagamento && (
                      <TableCell>
                        <Badge className={getPaymentStatusColor(statoPagamento)}>
                          {statoPagamento.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                    )}
                    {visibleColumns.allegati && (
                      <TableCell>
                        <AllegatiColumn
                          order={{...order, Allegati: allegati}}
                          onAttachmentClick={(attachmentUrl, fileName) => {
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
                            onClick={() => handleEditOrder(orderId)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Modifica
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                            onClick={() => handleDeleteOrder(orderId)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Elimina
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginazione */}
        {filteredAndSortedOrders.length > 0 && (
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
        )}

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
    </Card>
  );
}