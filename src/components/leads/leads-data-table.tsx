'use client';

import * as React from 'react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LeadStatusBadge, LeadSourceBadge, ActivityStatusBadge } from '@/components/ui/smart-badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  X,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Phone,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Mail,
  User,
  Calendar,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Hash,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Copy,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Check,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DataTablePersistentFilter } from '@/components/data-table/data-table-persistent-filter';
import { DataTableColumnsSelector } from '@/components/data-table/data-table-columns-selector';
import { DataTableBulkActions } from '@/components/data-table/data-table-bulk-actions';
import { useTablePreferences } from '@/hooks/use-table-preferences';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { AvatarUser } from '@/components/ui/avatar-user';
import { DateRangePicker } from '@/components/ui/date-range-picker';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { format, isWithinInterval, startOfDay, endOfDay, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { EditLeadModal } from '@/components/leads/edit-lead-modal';
import { formatItalianPhone } from '@/lib/format-phone';

import type { Lead } from '@/types/database';

// Type alias for better readability
type LeadData = Lead;

interface LeadsFilters {
  stato?: string[];
  fonte?: string[];
  dateRange?: DateRange;
  search?: string;
}

interface LeadsDataTableProps {
  leads: LeadData[]; // Paginated leads to display
  allLeads: LeadData[]; // All leads for stats calculation
  loading: boolean;
  filters: LeadsFilters;
  onFiltersChange: (filters: LeadsFilters) => void;
  totalCount: number;
  sourcesLookup: Record<string, string>;
  sourcesColorLookup: Record<string, string | undefined>;
  onDeleteLead?: (leadId: string) => Promise<boolean>;
  onDeleteMultipleLeads?: (leadIds: string[]) => Promise<number>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdateLead?: (leadId: string, updates: Partial<any>) => Promise<boolean>;
  // Client-side pagination props
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  className?: string;
}

// Stati disponibili (da database schema)
function getStatiDisponibili(): string[] {
  // Direct return - stati dal DB Postgres
  return ['Nuovo', 'Contattato', 'Qualificato', 'In Negoziazione', 'Cliente', 'Sospeso', 'Chiuso'];
}

// Configurazione colonne visibili
const DEFAULT_VISIBLE_COLUMNS = {
  cliente: true,
  stato: true,
  fonte: true,
  citta: true,
  telefono: true,
  email: false,
  data: true,
  attivita: true,
  assegnatario: false,
  relazioni: false,
};

export function LeadsDataTable({
  leads,
  allLeads,
  loading,
  filters,
  onFiltersChange,
  totalCount,
  sourcesLookup,
  sourcesColorLookup,
  onDeleteLead,
  onDeleteMultipleLeads,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onUpdateLead,
  currentPage,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  className,
}: LeadsDataTableProps) {
  const router = useRouter();
  const { preferences, isLoaded, updateItemsPerPage, updateVisibleColumns } = useTablePreferences();
  
  // Client-side stats calculation from all leads
  const { byStatus, bySource } = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};
    
    // Apply same filters as main table (except the dimension being counted)
    allLeads.forEach(lead => {
      // For status counts: apply fonte/date/search filters, but NOT status filter
      let includeInStatus = true;
      if (filters.fonte && filters.fonte.length > 0 && lead.source_id && !filters.fonte.includes(lead.source_id)) {
        includeInStatus = false;
      }
      if (filters.dateRange?.from || filters.dateRange?.to) {
        const leadDate = lead.created_at ? new Date(lead.created_at) : null;
        if (!leadDate ||
            (filters.dateRange.from && leadDate < filters.dateRange.from) ||
            (filters.dateRange.to && leadDate > filters.dateRange.to)) {
          includeInStatus = false;
        }
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!(lead.name?.toLowerCase().includes(searchLower) ||
              lead.phone?.includes(filters.search) ||
              lead.email?.toLowerCase().includes(searchLower) ||
              lead.city?.toLowerCase().includes(searchLower))) {
          includeInStatus = false;
        }
      }
      
      if (includeInStatus && lead.status) {
        statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
      }
      
      // For source counts: apply stato/date/search filters, but NOT fonte filter
      let includeInSource = true;
      if (filters.stato && filters.stato.length > 0 && lead.status && !filters.stato.includes(lead.status)) {
        includeInSource = false;
      }
      if (filters.dateRange?.from || filters.dateRange?.to) {
        const leadDate = lead.created_at ? new Date(lead.created_at) : null;
        if (!leadDate ||
            (filters.dateRange.from && leadDate < filters.dateRange.from) ||
            (filters.dateRange.to && leadDate > filters.dateRange.to)) {
          includeInSource = false;
        }
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!(lead.name?.toLowerCase().includes(searchLower) ||
              lead.phone?.includes(filters.search) ||
              lead.email?.toLowerCase().includes(searchLower) ||
              lead.city?.toLowerCase().includes(searchLower))) {
          includeInSource = false;
        }
      }
      
      if (includeInSource && lead.source_id) {
        sourceCounts[lead.source_id] = (sourceCounts[lead.source_id] || 0) + 1;
      }
    });
    
    return { byStatus: statusCounts, bySource: sourceCounts };
  }, [allLeads, filters]);
  
  // Carica stati dinamicamente dallo schema
  const statiDisponibili = useMemo(() => getStatiDisponibili(), []);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const hasInitializedColumns = React.useRef(false);
  
  // Dialog eliminazione
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedContact, setCopiedContact] = useState<{ leadId: string; type: 'phone' | 'email' } | null>(null);
  const [activitiesPopoverOpen, setActivitiesPopoverOpen] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activitiesData, setActivitiesData] = useState<Record<string, any[]>>({});
  const [usersLookup, setUsersLookup] = useState<Record<string, { id: string; name: string; email?: string; role: string; avatar?: string; avatarUrl?: string }>>({});
  const [leadsLookup, setLeadsLookup] = useState<Record<string, { id: string; name: string; gender?: string }>>({});
  
  // Input ref for focus management
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Modal modifica lead
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<LeadData | null>(null);
  
  // Menu contestuale (tasto destro)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; leadId: string } | null>(null);

  // Apply preferences after loading with one-time migration for new column structure
  React.useEffect(() => {
    if (isLoaded && preferences && !hasInitializedColumns.current) {
      const MIGRATION_KEY = 'leads-table-migration-v1';
      const hasMigrated = localStorage.getItem(MIGRATION_KEY);
      
      if (!hasMigrated) {
        // One-time migration: split contatti into telefono/email, hide assegnatario/relazioni
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const oldPrefs = preferences.visibleColumns as any;
        const migratedColumns = {
          ...DEFAULT_VISIBLE_COLUMNS,
          ...oldPrefs,
          // If old 'contatti' existed, apply to both telefono and email
          telefono: oldPrefs.contatti !== undefined ? oldPrefs.contatti : true,
          email: false,
          assegnatario: false,
          relazioni: false,
        };
        // Remove old 'contatti' key if exists
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (migratedColumns as any).contatti;
        
        setVisibleColumns(migratedColumns);
        updateVisibleColumns(migratedColumns as Record<string, boolean>);
        localStorage.setItem(MIGRATION_KEY, 'true');
      } else {
        // Normal load: merge saved preferences with defaults to ensure all keys exist
        const mergedColumns = {
          ...DEFAULT_VISIBLE_COLUMNS,
          ...(preferences.visibleColumns as typeof DEFAULT_VISIBLE_COLUMNS),
        };
        setVisibleColumns(mergedColumns);
      }
      
      hasInitializedColumns.current = true;
      
      // Notify parent of itemsPerPage from preferences
      if (preferences.itemsPerPage !== itemsPerPage) {
        onItemsPerPageChange(preferences.itemsPerPage);
      }
    }
  }, [isLoaded, preferences, itemsPerPage, onItemsPerPageChange, updateVisibleColumns]);

  // Activities count now comes from SQL aggregation in getLeads() - no separate fetch needed!
  
  // Create leads lookup from current leads (no fetch needed - referral info already in API response!)
  React.useEffect(() => {
    if (!leads || leads.length === 0) return;
    
    const lookup: Record<string, { id: string; name: string; gender?: string }> = {};
    
    // Add current page leads to lookup
    leads.forEach(lead => {
      lookup[lead.id] = {
        id: lead.id,
        name: lead.name || 'Sconosciuto',
        gender: lead.gender || undefined
      };
      
      // Add referral lead info if present (from SQL subquery)
      if (lead.referral_lead_id && lead.referral_lead_name) {
        lookup[lead.referral_lead_id] = {
          id: lead.referral_lead_id,
          name: lead.referral_lead_name,
          gender: lead.referral_lead_gender || undefined
        };
      }
    });
    
    setLeadsLookup(lookup);
  }, [leads]);
  
  // Fetch users for Assegnatario column
  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.users) {
            setUsersLookup(data.users);
          }
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);

  // Server-side search and pagination: use leads directly (already filtered by API)
  const paginatedLeads = leads;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // Crea una mappa di tutti i lead per lookup veloce (incluse le referenze)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const leadsMap = useMemo(() => {
    const map: Record<string, { Nome: string; Gender?: 'male' | 'female' | 'unknown' }> = {};
    leads.forEach(lead => {
      map[lead.id] = {
        Nome: lead.name || '',
        Gender: (lead.gender as 'male' | 'female') || 'unknown'
      };
    });
    return map;
  }, [leads]);

  // Preserve focus during search operations
  useEffect(() => {
    if (searchTerm && document.activeElement !== searchInputRef.current) {
      // Restore focus after re-render (client-side filtering is instant)
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads]); // Re-focus after data updates
  
  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    // Instant search - no debounce needed (client-side filtering)
    handleFilterChange('search', value || undefined);
    onPageChange(1); // Reset to page 1 on search
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleFilterChange = (key: keyof LeadsFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
    onPageChange(1); // Reset to page 1 on filter change
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    setSelectedLeads(prev =>
      checked ? [...prev, leadId] : prev.filter(id => id !== leadId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedLeads(checked ? paginatedLeads.map(lead => lead.id) : []);
  };

  const isAllSelected = selectedLeads.length === paginatedLeads.length && paginatedLeads.length > 0;

  const handleDeleteSelectedLeads = () => {
    if (selectedLeads.length === 0) return;
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (onDeleteMultipleLeads && selectedLeads.length > 1) {
        const deleted = await onDeleteMultipleLeads(selectedLeads);
        toast.success(`${deleted} lead eliminati con successo`);
      } else if (onDeleteLead && selectedLeads.length === 1) {
        const success = await onDeleteLead(selectedLeads[0]);
        if (success) {
          toast.success('Lead eliminato con successo');
        }
      }
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Errore durante eliminazione:', error);
      toast.error('Errore durante l\'eliminazione del lead');
    } finally {
      setIsDeleting(false);
      setSelectedLeads([]);
    }
  };

  const handleExportSelectedLeads = () => {
    console.log('Export:', selectedLeads);
    // TODO: Implement export
  };

  const handleVisibleColumnsChange = (newColumns: typeof DEFAULT_VISIBLE_COLUMNS) => {
    setVisibleColumns(newColumns);
    updateVisibleColumns(newColumns as Record<string, boolean>);
  };

  const handleCopyId = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Failed to copy ID:', error);
    }
  };

  const handleCopyContact = async (leadId: string, type: 'phone' | 'email', value: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopiedContact({ leadId, type });
      setTimeout(() => setCopiedContact(null), 2000);
    } catch (error) {
      console.error('Failed to copy contact:', error);
    }
  };

  const loadActivitiesForLead = async (leadId: string) => {
    // Se già caricato, non ricaricare
    if (activitiesData[leadId]) return;

    try {
      // Carica le attività dal database per questo lead (prime 5)
      const response = await fetch(`/api/activities?lead_id=${leadId}`);
      if (!response.ok) throw new Error('Failed to fetch activities');
      
      const data = await response.json();
      const activities = data.activities || [];
      
      // Prendi solo le prime 5 per il popover
      const limitedActivities = activities.slice(0, 5);
      
      setActivitiesData(prev => ({
        ...prev,
        [leadId]: limitedActivities
      }));
    } catch (error) {
      console.error('Error loading activities:', error);
      setActivitiesData(prev => ({
        ...prev,
        [leadId]: []
      }));
    }
  };
  
  // Handler per aprire modal modifica
  const handleEditLead = (lead: LeadData) => {
    setLeadToEdit(lead);
    setEditModalOpen(true);
  };
  
  // Handler per chiudere modal modifica con refresh
  const handleEditModalClose = () => {
    setEditModalOpen(false);
    setLeadToEdit(null);
    // Refresh della tabella se necessario
  };
  
  // Chiudi menu contestuale quando si clicca fuori
  React.useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);


  // Colori ora gestiti tramite sistema centralizzato

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {Array.from({ length: 6 }).map((_, i) => (
                  <TableHead key={i}>
                    <Skeleton className="h-4 w-20" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
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
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              ref={searchInputRef}
              placeholder="Cerca Leads..."
              value={searchTerm}
              onChange={e => handleSearch(e.target.value)}
              className="pr-9 pl-9"
              autoComplete="off"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-muted absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2 p-0"
                onClick={() => {
                  handleSearch('');
                  searchInputRef.current?.focus();
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Filtro Stato */}
          <DataTablePersistentFilter
            title="Stato"
            options={statiDisponibili.map(stato => ({
              label: stato,
              value: stato,
              count: byStatus[stato] || 0,
            }))}
            selectedValues={filters.stato || []}
            onSelectionChange={values => {
              handleFilterChange('stato', values.length ? values : undefined);
            }}
            onReset={() => {
              handleFilterChange('stato', undefined);
            }}
            renderSelectedBadge={(option) => (
              <LeadStatusBadge status={option.value} />
            )}
          />

          {/* Filtro Fonte */}
          <DataTablePersistentFilter
            title="Fonte"
            options={Object.entries(sourcesLookup).map(([id, name]) => ({
              label: name,
              value: id,
              count: bySource[id] || 0,
            }))}
            selectedValues={filters.fonte || []}
            onSelectionChange={values => {
              handleFilterChange('fonte', values.length ? values : undefined);
            }}
            onReset={() => {
              handleFilterChange('fonte', undefined);
            }}
            renderSelectedBadge={(option) => (
              <LeadSourceBadge 
                source={option.label} 
                sourceColorFromDB={sourcesColorLookup[option.value]}
              />
            )}
          />

          {/* Filtro Date Range */}
          <DateRangePicker
            date={filters.dateRange}
            onDateChange={(dateRange) => {
              handleFilterChange('dateRange', dateRange);
            }}
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* Bulk Actions */}
          <DataTableBulkActions
            selectedCount={selectedLeads.length}
            onClearSelection={() => setSelectedLeads([])}
            onExport={handleExportSelectedLeads}
            onDelete={handleDeleteSelectedLeads}
          />

          {/* Reset filtri */}
          {(filters.stato?.length || filters.fonte?.length || filters.dateRange?.from || searchTerm) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                onFiltersChange({});
                onPageChange(1);
              }}
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
              { label: 'Cliente', value: 'cliente' },
              { label: 'Stato', value: 'stato' },
              { label: 'Fonte', value: 'fonte' },
              { label: 'Città', value: 'citta' },
              { label: 'Telefono', value: 'telefono' },
              { label: 'Email', value: 'email' },
              { label: 'Data', value: 'data' },
              { label: 'Attività', value: 'attivita' },
              { label: 'Assegnatario', value: 'assegnatario' },
              { label: 'Relazioni', value: 'relazioni' },
            ]}
            selectedValues={Object.entries(visibleColumns)
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              .filter(([_, visible]) => visible)
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              .map(([column, _]) => column)}
            onSelectionChange={values => {
              const newVisibleColumns = {
                cliente: values.includes('cliente'),
                stato: values.includes('stato'),
                fonte: values.includes('fonte'),
                citta: values.includes('citta'),
                telefono: values.includes('telefono'),
                email: values.includes('email'),
                data: values.includes('data'),
                attivita: values.includes('attivita'),
                assegnatario: values.includes('assegnatario'),
                relazioni: values.includes('relazioni'),
              };
              handleVisibleColumnsChange(newVisibleColumns);
            }}
          />
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
                />
              </TableHead>
              {visibleColumns.cliente && (
                <TableHead className="text-foreground font-semibold">
                  Cliente
                </TableHead>
              )}
              {visibleColumns.stato && (
                <TableHead className="text-foreground font-semibold">
                  Stato
                </TableHead>
              )}
              {visibleColumns.fonte && (
                <TableHead className="text-foreground font-semibold">
                  Fonte
                </TableHead>
              )}
              {visibleColumns.citta && (
                <TableHead className="text-foreground font-semibold">
                  Città
                </TableHead>
              )}
              {visibleColumns.telefono && (
                <TableHead className="text-foreground font-semibold">
                  Telefono
                </TableHead>
              )}
              {visibleColumns.email && (
                <TableHead className="text-foreground font-semibold">
                  Email
                </TableHead>
              )}
              {visibleColumns.data && (
                <TableHead className="text-foreground font-semibold">
                  Data
                </TableHead>
              )}
              {visibleColumns.attivita && (
                <TableHead className="text-foreground font-semibold">
                  Attività
                </TableHead>
              )}
              {visibleColumns.assegnatario && (
                <TableHead className="text-foreground font-semibold">
                  Assegnatario
                </TableHead>
              )}
              {visibleColumns.relazioni && (
                <TableHead className="text-foreground font-semibold">
                  Relazioni
                </TableHead>
              )}
              <TableHead className="text-foreground w-[50px] font-semibold"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="text-muted-foreground flex flex-col items-center justify-center">
                    <Search className="mb-2 h-8 w-8" />
                    <p>Nessun lead corrisponde ai criteri di ricerca</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedLeads.map(lead => {
                // Ottieni ID fonte, nome e colore (source_id è UUID singolo, non array)
                const fonteId = lead.source_id;
                const fonteName = fonteId ? sourcesLookup[fonteId] : null;
                const fonteColorHex = fonteId ? sourcesColorLookup[fonteId] : undefined;
                
                return (
                <TableRow 
                  key={lead.id}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, leadId: lead.id });
                  }}
                  className="cursor-default"
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedLeads.includes(lead.id)}
                      onCheckedChange={checked =>
                        handleSelectLead(lead.id, !!checked)
                      }
                      aria-label={`Seleziona ${lead.name}`}
                    />
                  </TableCell>
                  
                  {/* Colonna Cliente: Avatar + Nome */}
                  {visibleColumns.cliente && (
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div 
                                onClick={(e) => handleCopyId(lead.id, e)}
                                className="cursor-pointer"
                              >
                                <AvatarLead 
                                  nome={lead.name || ''} 
                                  gender={lead.gender as 'male' | 'female' | 'unknown'} 
                                  size="md" 
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                {copiedId === lead.id ? 'ID copiato!' : 'Clicca per copiare ID'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <a
                          href={`/leads/${lead.id}`}
                          className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {lead.name}
                        </a>
                      </div>
                    </TableCell>
                  )}
                  
                  {/* Colonna Stato */}
                  {visibleColumns.stato && (
                    <TableCell>
                      <LeadStatusBadge 
                        status={lead.status || 'Nuovo'} 
                        className="text-xs"
                      />
                    </TableCell>
                  )}
                  
                  {/* Colonna Fonte */}
                  {visibleColumns.fonte && (
                    <TableCell>
                      {fonteName ? (
                        <LeadSourceBadge 
                          source={fonteName}
                          sourceColorFromDB={fonteColorHex}
                          className="text-xs"
                        />
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  )}
                  
                  {/* Colonna Città */}
                  {visibleColumns.citta && (
                    <TableCell className="text-sm">
                      {lead.city ? (
                        <span className="text-foreground">{lead.city}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  
                  {/* Colonna Telefono */}
                  {visibleColumns.telefono && (
                    <TableCell>
                      {lead.phone ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className="text-sm cursor-pointer hover:text-primary transition-colors"
                                onClick={(e) => handleCopyContact(lead.id, 'phone', lead.phone!, e)}
                              >
                                {formatItalianPhone(lead.phone)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                {copiedContact?.leadId === lead.id && copiedContact?.type === 'phone'
                                  ? 'Telefono copiato!'
                                  : 'Clicca per copiare telefono'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                  )}
                  
                  {/* Colonna Email */}
                  {visibleColumns.email && (
                    <TableCell>
                      {lead.email ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className="text-sm cursor-pointer hover:text-primary transition-colors truncate max-w-[200px] block"
                                onClick={(e) => handleCopyContact(lead.id, 'email', lead.email!, e)}
                              >
                                {lead.email}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                {copiedContact?.leadId === lead.id && copiedContact?.type === 'email'
                                  ? 'Email copiata!'
                                  : 'Clicca per copiare email'}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-sm text-muted-foreground">Nessuna</span>
                      )}
                    </TableCell>
                  )}
                  
                  {/* Colonna Data */}
                  {visibleColumns.data && (
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>
                          {lead.created_at
                            ? format(new Date(lead.created_at), 'd MMM yyyy', { locale: it })
                            : '—'}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  
                  {/* Colonna Attività */}
                  {visibleColumns.attivita && (
                    <TableCell>
                      {(() => {
                        const activitiesCount = lead.activities_count || 0;
                        const hasActivities = activitiesCount > 0;
                        
                        return hasActivities ? (
                        <Popover 
                          open={activitiesPopoverOpen === lead.id} 
                          onOpenChange={(open) => {
                            if (open) {
                              setActivitiesPopoverOpen(lead.id);
                              loadActivitiesForLead(lead.id);
                            } else {
                              setActivitiesPopoverOpen(null);
                            }
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-auto p-0 hover:bg-transparent"
                            >
                              <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                                <Activity className="h-4 w-4 text-foreground" />
                                <span className="text-sm font-medium text-foreground">
                                  {activitiesCount}
                                </span>
                                <span className="text-xs text-foreground">
                                  {activitiesCount === 1 ? 'attività' : 'attività'}
                                </span>
                              </div>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-0" align="start">
                            <div className="flex flex-col">
                              {/* Header */}
                              <div className="px-4 py-3 border-b">
                                <h4 className="font-semibold text-sm">Attività recenti</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {activitiesCount} {activitiesCount === 1 ? 'attività' : 'attività'} totali
                                </p>
                              </div>
                              
                              {/* Lista attività */}
                              <div className="max-h-[300px] overflow-y-auto">
                                {activitiesCount > 5 && (
                                  <div className="px-4 py-2 bg-muted/30 border-b">
                                    <p className="text-xs text-muted-foreground">
                                      Mostrando le prime 5 di {activitiesCount} attività
                                    </p>
                                  </div>
                                )}
                                {!activitiesData[lead.id] ? (
                                  <div className="px-4 py-8 text-center">
                                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"></div>
                                    <p className="text-xs text-muted-foreground mt-2">Caricamento attività...</p>
                                  </div>
                                ) : activitiesData[lead.id].length === 0 ? (
                                  <div className="px-4 py-8 text-center">
                                    <p className="text-sm text-muted-foreground">Nessuna attività trovata</p>
                                  </div>
                                ) : (
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  activitiesData[lead.id].map((activity: any) => {
                                    const activityDate = activity.activity_date ? new Date(activity.activity_date) : null;
                                    const relativeTime = activityDate ? formatDistanceToNow(activityDate, { addSuffix: true, locale: it }) : null;
                                    const tipo = activity.type || 'Attività';
                                    const titolo = activity.title;
                                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                    const priorita = activity.priority;
                                    const esito = activity.outcome;
                                    const stato = activity.status;
                                    
                                    return (
                                      <div 
                                        key={activity.id}
                                        className="px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0 cursor-pointer"
                                        onClick={() => {
                                          setActivitiesPopoverOpen(null);
                                          router.push(`/leads/${lead.id}#activities`);
                                        }}
                                      >
                                        <div className="flex items-start gap-3">
                                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                            <Activity className="h-4 w-4 text-primary" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            {/* Tipo e Data */}
                                            <div className="flex items-center justify-between gap-2">
                                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <span className="text-sm font-medium truncate">{tipo}</span>
                                                {stato && (
                                                  <ActivityStatusBadge status={stato} className="text-[10px] h-4 px-1.5" />
                                                )}
                                              </div>
                                              {relativeTime && (
                                                <span className="text-xs text-muted-foreground shrink-0">
                                                  {relativeTime}
                                                </span>
                                              )}
                                            </div>
                                            
                                            {/* Titolo */}
                                            {titolo && (
                                              <p className="text-xs text-foreground mt-0.5 line-clamp-1">
                                                {titolo}
                                              </p>
                                            )}
                                            
                                            {/* Esito */}
                                            {esito && (
                                              <p className="text-xs text-muted-foreground mt-0.5">
                                                {esito}
                                              </p>
                                            )}
                                            
                                            {/* Note */}
                                            {activity.notes && (
                                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                {activity.notes}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                              
                              {/* Footer */}
                              <div className="px-4 py-3 border-t bg-muted/20">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-center text-xs"
                                  onClick={() => {
                                    setActivitiesPopoverOpen(null);
                                    router.push(`/leads/${lead.id}#activities`);
                                  }}
                                >
                                  Vedi tutte le attività
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                        ) : (
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Nessuna</span>
                        </div>
                        );
                      })()}
                    </TableCell>
                  )}
                  
                  {/* Colonna Assegnatario */}
                  {visibleColumns.assegnatario && (
                    <TableCell>
                      {(() => {
                        const assignedToIds = lead.assigned_to || [];
                        const hasAssignedUsers = assignedToIds.length > 0;
                        
                        return hasAssignedUsers ? (
                          <div className="flex items-center gap-2">
                            {assignedToIds.slice(0, 2).map((userId, idx) => {
                              const userData = usersLookup[userId];
                              
                              if (!userData) {
                                return (
                                  <div key={idx} className="flex items-center gap-1.5 px-2 py-1">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">Sconosciuto</span>
                                  </div>
                                );
                              }
                              
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/50 transition-colors"
                                >
                                  <AvatarUser
                                    nome={userData.name}
                                    avatarUrl={userData.avatarUrl}
                                    ruolo={userData.role}
                                    size="sm"
                                  />
                                  <span className="text-xs text-foreground">{userData.name}</span>
                                </div>
                              );
                            })}
                            {assignedToIds.length > 2 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 cursor-help">
                                      +{assignedToIds.length - 2}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="max-w-xs">
                                      <p className="text-xs font-semibold mb-1">Altri assegnatari:</p>
                                      {assignedToIds.slice(2).map((userId, idx) => {
                                        const userData = usersLookup[userId];
                                        return (
                                          <p key={idx} className="text-xs text-muted-foreground">
                                            {userData?.name || 'Sconosciuto'}
                                          </p>
                                        );
                                      })}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Non assegnato</span>
                        );
                      })()}
                    </TableCell>
                  )}
                  
                  {/* Colonna Relazioni */}
                  {visibleColumns.relazioni && (
                    <TableCell>
                      {(() => {
                        const referralLeadId = lead.referral_lead_id;
                        const hasReferral = !!referralLeadId;
                        const referralLead = referralLeadId ? leadsLookup[referralLeadId] : null;
                        
                        return hasReferral && referralLead ? (
                          <a
                            href={`/leads/${referralLeadId}`}
                            onClick={(e) => {
                              e.preventDefault();
                              router.push(`/leads/${referralLeadId}`);
                            }}
                            className="flex items-center gap-1.5 hover:bg-muted/50 px-2 py-1 rounded-md transition-colors cursor-pointer"
                          >
                            <AvatarLead
                              nome={referralLead.name}
                              gender={referralLead.gender as 'male' | 'female' | 'unknown' || 'unknown'}
                              size="sm"
                            />
                            <span className="text-xs text-foreground hover:text-primary transition-colors">
                              {referralLead.name}
                            </span>
                          </a>
                        ) : (
                          <span className="text-sm text-muted-foreground">Nessuna</span>
                        );
                      })()}
                    </TableCell>
                  )}
                  
                  {/* Menu Azioni */}
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
                          onClick={() => router.push(`/leads/${lead.id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Dettagli
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleEditLead(lead)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Modifica
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            setSelectedLeads([lead.id]);
                            setShowDeleteDialog(true);
                          }}
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

      {/* Pagination con row selector */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
        {/* Left: Selected rows info */}
        <div className="flex items-center gap-2">
          {selectedLeads.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              {selectedLeads.length} {selectedLeads.length === 1 ? 'riga selezionata' : 'righe selezionate'}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {totalCount} {totalCount === 1 ? 'risultato' : 'risultati'}
            </p>
          )}
        </div>

        {/* Right: Rows per page + Pagination controls */}
        <div className="flex items-center gap-6">
          {/* Rows per page selector */}
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground whitespace-nowrap">
              Righe per pagina
            </p>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                const newValue = Number(value);
                onItemsPerPageChange(newValue);
                updateItemsPerPage(newValue);
              }}
            >
              <SelectTrigger className="w-[70px]">
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
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) onPageChange(currentPage - 1);
                  }}
                  aria-disabled={currentPage === 1}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
              
              {/* First page */}
              {currentPage > 2 && (
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(1);
                    }}
                  >
                    1
                  </PaginationLink>
                </PaginationItem>
              )}
              
              {/* Ellipsis before current */}
              {currentPage > 3 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              
              {/* Previous page */}
              {currentPage > 1 && (
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(currentPage - 1);
                    }}
                  >
                    {currentPage - 1}
                  </PaginationLink>
                </PaginationItem>
              )}
              
              {/* Current page */}
              <PaginationItem>
                <PaginationLink
                  href="#"
                  isActive
                  onClick={(e) => e.preventDefault()}
                >
                  {currentPage}
                </PaginationLink>
              </PaginationItem>
              
              {/* Next page */}
              {currentPage < totalPages && (
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(currentPage + 1);
                    }}
                  >
                    {currentPage + 1}
                  </PaginationLink>
                </PaginationItem>
              )}
              
              {/* Ellipsis after current */}
              {currentPage < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              
              {/* Last page */}
              {currentPage < totalPages - 1 && (
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(totalPages);
                    }}
                  >
                    {totalPages}
                  </PaginationLink>
                </PaginationItem>
              )}
              
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage < totalPages) onPageChange(currentPage + 1);
                  }}
                  aria-disabled={currentPage === totalPages}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          )}
        </div>
      </div>

      {/* Menu contestuale (tasto destro) */}
      {contextMenu && (() => {
        const lead = leads.find(l => l.id === contextMenu.leadId);
        if (!lead) return null;
        
        return (
          <div
            className="fixed z-50 bg-popover text-popover-foreground shadow-md rounded-md border min-w-[200px]"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-1">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                {lead.name}
              </div>
              <div className="h-px bg-border my-1" />
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-sm transition-colors cursor-pointer"
                onClick={() => {
                  router.push(`/leads/${lead.id}`);
                  setContextMenu(null);
                }}
              >
                <Eye className="h-4 w-4" />
                Dettagli
              </button>
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-sm transition-colors cursor-pointer"
                onClick={() => {
                  handleEditLead(lead);
                  setContextMenu(null);
                }}
              >
                <Edit className="h-4 w-4" />
                Modifica
              </button>
              <div className="h-px bg-border my-1" />
              <button
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-sm transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedLeads([lead.id]);
                  setShowDeleteDialog(true);
                  setContextMenu(null);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Elimina
              </button>
            </div>
          </div>
        );
      })()}

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent size="sm" className="p-4 gap-3">
          <AlertDialogHeader className="!grid-rows-none !place-items-start space-y-1 pb-0 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted mt-0.5">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              </div>
              <div className="flex-1">
                <AlertDialogTitle className="text-base font-semibold">
                  {selectedLeads.length === 1 ? 'Eliminare il lead?' : `Eliminare ${selectedLeads.length} lead?`}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm mt-1">
                  <span className="text-destructive font-medium">Questa azione è irreversibile</span> e eliminerà anche tutte le attività, note e ordini associati.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="bg-muted/50 -mx-4 -mb-4 px-4 py-3 border-t mt-2 !flex !flex-row !justify-end gap-2">
            <AlertDialogCancel size="sm" disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              size="sm"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminazione...' : 'Elimina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Modal modifica lead */}
      {leadToEdit && (
        <EditLeadModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          lead={leadToEdit}
          onSuccess={handleEditModalClose}
        />
      )}
    </div>
  );
}
