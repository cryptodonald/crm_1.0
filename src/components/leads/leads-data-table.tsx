'use client';

import * as React from 'react';
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
  Phone,
  Mail,
  FileText,
  User,
  Calendar,
  Hash,
  Copy,
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
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DataTablePersistentFilter } from '@/components/data-table/data-table-persistent-filter';
import { DataTableColumnsSelector } from '@/components/data-table/data-table-columns-selector';
import { DataTableBulkActions } from '@/components/data-table/data-table-bulk-actions';
import { useTablePreferences } from '@/hooks/use-table-preferences';
import { AvatarLead } from '@/components/ui/avatar-lead';
import { AvatarUser } from '@/components/ui/avatar-user';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { format, isWithinInterval, startOfDay, endOfDay, formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
// import { getLeadStatusColor, getSourceColor } from '@/lib/airtable-colors'; // Migrato a SmartBadge
import { getSelectOptions } from '@/lib/airtable-schema-helper';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { EditLeadModal } from '@/components/leads/edit-lead-modal';

import type { AirtableLead } from '@/types/airtable.generated';

// Type alias for better readability
type LeadData = AirtableLead;

interface LeadsFilters {
  stato?: string[];
  fonte?: string[];
  dateRange?: DateRange;
  search?: string;
}

interface LeadsDataTableProps {
  leads: LeadData[];
  loading: boolean;
  filters: LeadsFilters;
  onFiltersChange: (filters: LeadsFilters) => void;
  totalCount: number;
  sourcesLookup: Record<string, string>;
  sourcesColorLookup: Record<string, string | undefined>;
  onDeleteLead?: (leadId: string) => Promise<boolean>;
  onDeleteMultipleLeads?: (leadIds: string[]) => Promise<number>;
  onUpdateLead?: (leadId: string, updates: Partial<any>) => Promise<boolean>;
  className?: string;
}

// Carica dinamicamente gli stati disponibili dallo schema Airtable
function getStatiDisponibili(): string[] {
  try {
    const options = getSelectOptions('Lead', 'Stato');
    if (!options || options.length === 0) {
      throw new Error('Schema non disponibile o vuoto');
    }
    return options.map(opt => opt.name);
  } catch (error) {
    console.error('Errore caricamento stati da schema:', error);
    // Fallback solo se lo schema non è disponibile
    return ['Nuovo', 'Attivo', 'Qualificato', 'Cliente', 'Chiuso', 'Sospeso'];
  }
}

// Configurazione colonne visibili
const DEFAULT_VISIBLE_COLUMNS = {
  cliente: true,
  contatti: true,
  data: true,
  attivita: true,
  relazioni: true,
  assegnatario: true,
  documenti: true,
};

export function LeadsDataTable({
  leads,
  loading,
  filters,
  onFiltersChange,
  totalCount,
  sourcesLookup,
  sourcesColorLookup,
  onDeleteLead,
  onDeleteMultipleLeads,
  onUpdateLead,
  className,
}: LeadsDataTableProps) {
  const router = useRouter();
  const { preferences, isLoaded, updateItemsPerPage, updateVisibleColumns } = useTablePreferences();
  
  // Carica stati dinamicamente dallo schema
  const statiDisponibili = useMemo(() => getStatiDisponibili(), []);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Dialog eliminazione
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedContact, setCopiedContact] = useState<{ leadId: string; type: 'phone' | 'email' } | null>(null);
  const [activitiesPopoverOpen, setActivitiesPopoverOpen] = useState<string | null>(null);
  const [activitiesData, setActivitiesData] = useState<Record<string, any[]>>({});
  const [usersLookup, setUsersLookup] = useState<Record<string, { id: string; nome: string; email?: string; ruolo: string; avatar?: string; avatarUrl?: string }>>({});
  
  // Modal modifica lead
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<LeadData | null>(null);
  
  // Menu contestuale (tasto destro)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; leadId: string } | null>(null);

  // Apply preferences after loading
  React.useEffect(() => {
    if (isLoaded && preferences) {
      setVisibleColumns(preferences.visibleColumns as typeof DEFAULT_VISIBLE_COLUMNS);
      setItemsPerPage(preferences.itemsPerPage);
    }
  }, [isLoaded, preferences]);

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

  // Filter and paginate leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch =
        !searchTerm ||
        lead.fields.Nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.fields.Email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.fields.Telefono?.includes(searchTerm) ||
        lead.fields.ID?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStato =
        !filters.stato ||
        filters.stato.length === 0 ||
        (lead.fields.Stato && filters.stato.includes(lead.fields.Stato));

      const matchesFonte =
        !filters.fonte ||
        filters.fonte.length === 0 ||
        (lead.fields.Fonte && lead.fields.Fonte.some(f => filters.fonte?.includes(f)));

      const matchesDateRange =
        !filters.dateRange?.from ||
        (lead.fields.Data && (() => {
          const leadDate = new Date(lead.fields.Data);
          const from = startOfDay(filters.dateRange.from!);
          const to = filters.dateRange.to ? endOfDay(filters.dateRange.to) : endOfDay(filters.dateRange.from!);
          return isWithinInterval(leadDate, { start: from, end: to });
        })());

      return matchesSearch && matchesStato && matchesFonte && matchesDateRange;
    });
  }, [leads, searchTerm, filters.stato, filters.fonte, filters.dateRange]);

  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLeads, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);

  // Crea una mappa di tutti i lead per lookup veloce (incluse le referenze)
  const leadsMap = useMemo(() => {
    const map: Record<string, { Nome: string; Gender?: 'male' | 'female' | 'unknown' }> = {};
    leads.forEach(lead => {
      map[lead.id] = {
        Nome: lead.fields.Nome || '',
        Gender: lead.fields.Gender || 'unknown'
      };
    });
    return map;
  }, [leads]);

  // Handlers
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (key: keyof LeadsFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
    setCurrentPage(1);
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

  const loadActivitiesForLead = async (leadId: string, activityIds: string[]) => {
    // Se già caricato, non ricaricare
    if (activitiesData[leadId]) return;

    try {
      // Carica le attività in batch
      const promises = activityIds.slice(0, 5).map(id => 
        fetch(`/api/activities/${id}`).then(res => res.ok ? res.json() : null)
      );
      const results = await Promise.all(promises);
      const validActivities = results.filter(a => a !== null);
      
      setActivitiesData(prev => ({
        ...prev,
        [leadId]: validActivities
      }));
    } catch (error) {
      console.error('Error loading activities:', error);
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

          {/* Filtro Stato */}
          <DataTablePersistentFilter
            title="Stato"
            options={statiDisponibili.map(stato => ({
              label: stato,
              value: stato,
              count: leads.filter(l => l.fields.Stato === stato).length,
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
              count: leads.filter(l => l.fields.Fonte?.includes(id)).length,
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
                setCurrentPage(1);
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
              { label: 'Contatti', value: 'contatti' },
              { label: 'Data', value: 'data' },
              { label: 'Attività', value: 'attivita' },
              { label: 'Relazioni', value: 'relazioni' },
              { label: 'Assegnatario', value: 'assegnatario' },
              { label: 'Documenti', value: 'documenti' },
            ]}
            selectedValues={Object.entries(visibleColumns)
              .filter(([_, visible]) => visible)
              .map(([column, _]) => column)}
            onSelectionChange={values => {
              const newVisibleColumns = {
                cliente: values.includes('cliente'),
                contatti: values.includes('contatti'),
                data: values.includes('data'),
                attivita: values.includes('attivita'),
                relazioni: values.includes('relazioni'),
                assegnatario: values.includes('assegnatario'),
                documenti: values.includes('documenti'),
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
              {visibleColumns.data && (
                <TableHead className="text-foreground font-semibold">
                  Data
                </TableHead>
              )}
              {visibleColumns.contatti && (
                <TableHead className="text-foreground font-semibold">
                  Contatti
                </TableHead>
              )}
              {visibleColumns.attivita && (
                <TableHead className="text-foreground font-semibold">
                  Attività
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
              {visibleColumns.documenti && (
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
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedLeads.map(lead => {
                // Ottieni ID fonte, nome e colore
                const fonteId = lead.fields.Fonte && Array.isArray(lead.fields.Fonte) && lead.fields.Fonte.length > 0 ? lead.fields.Fonte[0] : null;
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
                      aria-label={`Seleziona ${lead.fields.Nome}`}
                    />
                  </TableCell>
                  
                  {/* Colonna Cliente: Avatar + Nome + Badges */}
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
                                  nome={lead.fields.Nome || ''} 
                                  gender={lead.fields.Gender} 
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
                        
                        <div className="flex flex-col">
                          {/* Nome e Città sulla stessa riga */}
                          <div className="flex items-baseline gap-2">
                            <a
                              href={`/leads/${lead.id}`}
                              className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                            >
                              {lead.fields.Nome}
                            </a>
                            {lead.fields.Città && (
                              <span className="text-xs font-normal text-muted-foreground">
                                {lead.fields.Città}
                              </span>
                            )}
                          </div>
                          
                          {/* Badge Stato e Fonte */}
                          <div className="flex items-center gap-1.5 mt-1">
                            <LeadStatusBadge 
                              status={lead.fields.Stato || 'Nuovo'} 
                              className="text-xs"
                            />
                            {fonteName && (
                              <LeadSourceBadge 
                                source={fonteName}
                                sourceColorFromDB={fonteColorHex}
                                className="text-xs"
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                  )}
                  
                  {/* Colonna Data */}
                  {visibleColumns.data && (
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>
                          {lead.fields.Data
                            ? format(new Date(lead.fields.Data), 'd MMM yyyy', { locale: it })
                            : '—'}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  
                  {/* Colonna Contatti: Icone + Valori */}
                  {visibleColumns.contatti && (
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {lead.fields.Telefono && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div 
                                  className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors group"
                                  onClick={(e) => handleCopyContact(lead.id, 'phone', lead.fields.Telefono!, e)}
                                >
                                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="font-mono tracking-tight">{lead.fields.Telefono}</span>
                                </div>
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
                        )}
                        {lead.fields.Email && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div 
                                  className="flex items-center gap-2 text-sm cursor-pointer hover:text-primary transition-colors group min-w-0"
                                  onClick={(e) => handleCopyContact(lead.id, 'email', lead.fields.Email!, e)}
                                >
                                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <span className="truncate max-w-[220px] font-normal">{lead.fields.Email}</span>
                                </div>
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
                        )}
                      </div>
                    </TableCell>
                  )}
                  
                  {/* Colonna Attività */}
                  {visibleColumns.attivita && (
                    <TableCell>
                      {(() => {
                        // Supporta sia Activities che Attività per compatibilità
                        const activities = lead.fields.Activities || (lead.fields as any)['Attività'] || [];
                        const hasActivities = Array.isArray(activities) && activities.length > 0;
                        
                        return hasActivities ? (
                        <Popover 
                          open={activitiesPopoverOpen === lead.id} 
                          onOpenChange={(open) => {
                            if (open) {
                              setActivitiesPopoverOpen(lead.id);
                              loadActivitiesForLead(lead.id, activities);
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
                                  {activities.length}
                                </span>
                                <span className="text-xs text-foreground">
                                  {activities.length === 1 ? 'attività' : 'attività'}
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
                                  {activities.length} {activities.length === 1 ? 'attività' : 'attività'} totali
                                </p>
                              </div>
                              
                              {/* Lista attività */}
                              <div className="max-h-[300px] overflow-y-auto">
                                {activities.length > 5 && (
                                  <div className="px-4 py-2 bg-muted/30 border-b">
                                    <p className="text-xs text-muted-foreground">
                                      Mostrando le prime 5 di {activities.length} attività
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
                                  activitiesData[lead.id].map((activity: any) => {
                                    const activityDate = activity.fields?.Data ? new Date(activity.fields.Data) : null;
                                    const relativeTime = activityDate ? formatDistanceToNow(activityDate, { addSuffix: true, locale: it }) : null;
                                    const tipo = activity.fields?.Tipo || 'Attività';
                                    const titolo = activity.fields?.Titolo;
                                    const priorita = activity.fields?.['Priorità'];
                                    const esito = activity.fields?.Esito;
                                    const stato = activity.fields?.Stato;
                                    
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
                                            {activity.fields?.Note && (
                                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                                {activity.fields.Note}
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
                  
                  {/* Colonna Relazioni */}
                  {visibleColumns.relazioni && (
                    <TableCell>
                      {(() => {
                        const referenze = lead.fields.Referenza || [];
                        const nomiReferenze = lead.fields['Nome referenza'];
                        
                        // Converti nomiReferenze in array se è una stringa
                        const nomiArray = typeof nomiReferenze === 'string' 
                          ? nomiReferenze.split(',').map(n => n.trim()) 
                          : Array.isArray(nomiReferenze) 
                            ? nomiReferenze 
                            : [];
                        
                        const hasReferenze = referenze.length > 0 && nomiArray.length > 0;
                        
                        return hasReferenze ? (
                          <div className="flex items-center gap-2">
                            {nomiArray.slice(0, 2).map((nome, idx) => {
                              const referenzaId = referenze[idx];
                              const referenzaData = leadsMap[referenzaId];
                              const gender = referenzaData?.Gender || 'unknown';
                              
                              return (
                                <a
                                  key={idx}
                                  href={`/leads/${referenzaId}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    router.push(`/leads/${referenzaId}`);
                                  }}
                                  className="flex items-center gap-1.5 hover:bg-muted/50 px-2 py-1 rounded-md transition-colors cursor-pointer"
                                >
                                  <AvatarLead
                                    nome={referenzaData?.Nome || nome}
                                    gender={gender}
                                    size="sm"
                                  />
                                  <span className="text-xs text-foreground hover:text-primary transition-colors">{nome}</span>
                                </a>
                              );
                            })}
                            {nomiArray.length > 2 && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 cursor-help">
                                      +{nomiArray.length - 2}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="max-w-xs">
                                      <p className="text-xs font-semibold mb-1">Altre referenze:</p>
                                      {nomiArray.slice(2).map((nome, idx) => (
                                        <p key={idx} className="text-xs text-muted-foreground">{nome}</p>
                                      ))}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Nessuna</span>
                        );
                      })()}
                    </TableCell>
                  )}
                  
                  {/* Colonna Assegnatario */}
                  {visibleColumns.assegnatario && (
                    <TableCell>
                      {(() => {
                        const assignedToIds = lead.fields.Assegnatario || [];
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
                                    nome={userData.nome}
                                    avatarUrl={userData.avatarUrl}
                                    ruolo={userData.ruolo}
                                    size="sm"
                                  />
                                  <span className="text-xs text-foreground">{userData.nome}</span>
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
                                            {userData?.nome || 'Sconosciuto'}
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
                  
                  {/* Colonna Documenti */}
                  {visibleColumns.documenti && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {lead.fields.Note ? lead.fields.Note.slice(0, 50) + '...' : 'Nessun documento'}
                        </span>
                      </div>
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
              {filteredLeads.length} {filteredLeads.length === 1 ? 'risultato' : 'risultati'}
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
                setItemsPerPage(newValue);
                setCurrentPage(1);
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
                    if (currentPage > 1) setCurrentPage(prev => prev - 1);
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
                      setCurrentPage(1);
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
                      setCurrentPage(currentPage - 1);
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
                      setCurrentPage(currentPage + 1);
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
                      setCurrentPage(totalPages);
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
                    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
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
                {lead.fields.Nome}
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Conferma eliminazione
            </AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare {selectedLeads.length === 1 ? 'questo lead' : `questi ${selectedLeads.length} lead`}?
              <br />
              <br />
              <span className="text-destructive font-medium">Questa azione è irreversibile</span> e eliminerà anche tutte le attività, note e ordini associati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Eliminazione...' : 'Elimina definitivamente'}
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
