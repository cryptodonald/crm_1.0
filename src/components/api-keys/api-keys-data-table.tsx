'use client';

import { useState, useMemo } from 'react';
import { ApiKeyData } from '@/lib/kv';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  MoreHorizontal,
  Eye,
  Edit2,
  Trash2,
  Copy,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Activity,
  Shield,
  Search,
  Filter,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { it } from 'date-fns/locale';

interface ApiKeysDataTableProps {
  apiKeys: ApiKeyData[];
  loading: boolean;
  onEdit: (apiKey: ApiKeyData) => void;
  onDelete: (id: string) => Promise<void>;
  onView: (apiKey: ApiKeyData) => void;
  className?: string;
}

export function ApiKeysDataTable({
  apiKeys,
  loading,
  onEdit,
  onDelete,
  onView,
  className,
}: ApiKeysDataTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<ApiKeyData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showCategoriesFilter, setShowCategoriesFilter] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Get unique categories from API keys, grouped by main service
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    apiKeys.forEach(key => {
      if (key.service) {
        // Extract main service name (e.g., "airtable" from "airtable-api" or "airtable-webhook")
        const mainService = key.service.split('-')[0].toLowerCase();
        categories.add(mainService);
      }
    });
    return Array.from(categories).sort();
  }, [apiKeys]);

  // Filter and sort API keys based on search term, selected categories, and sorting
  const filteredApiKeys = useMemo(() => {
    let filtered = apiKeys.filter(apiKey => {
      // Text search filter
      const matchesSearch =
        !searchTerm ||
        apiKey.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (apiKey.description &&
          apiKey.description.toLowerCase().includes(searchTerm.toLowerCase()));

      // Category filter - match by main service name
      const matchesCategory =
        selectedCategories.length === 0 ||
        (apiKey.service &&
          selectedCategories.some(category =>
            apiKey.service.toLowerCase().startsWith(category.toLowerCase())
          ));

      return matchesSearch && matchesCategory;
    });

    // Apply sorting
    if (sortBy === 'name') {
      filtered = filtered.sort((a, b) => {
        const comparison = a.name.localeCompare(b.name, 'it', {
          sensitivity: 'base',
        });
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [apiKeys, searchTerm, selectedCategories, sortBy, sortOrder]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredApiKeys.length / itemsPerPage);
  const paginatedApiKeys = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredApiKeys.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredApiKeys, currentPage, itemsPerPage]);

  // Reset to first page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategories, sortBy, sortOrder]);

  // Handle category filter toggle
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategories([]);
    setSortBy(null);
    setCurrentPage(1);
  };

  const handleSort = (column: 'name') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column: 'name') => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="text-foreground/70 h-4 w-4" />
    ) : (
      <ArrowDown className="text-foreground/70 h-4 w-4" />
    );
  };

  const handleDeleteClick = (apiKey: ApiKeyData) => {
    setKeyToDelete(apiKey);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!keyToDelete) return;

    setIsDeleting(true);
    try {
      await onDelete(keyToDelete.id);
      setDeleteDialogOpen(false);
      setKeyToDelete(null);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = async (apiKey: ApiKeyData) => {
    try {
      // We need to copy the full decrypted value, not the masked preview
      const response = await fetch(`/api/api-keys/${apiKey.id}`);
      if (response.ok) {
        const data = await response.json();
        // The API should return the full decrypted value for copying
        await navigator.clipboard.writeText(data.fullValue || apiKey.key);
        setCopiedKey(apiKey.id);
        setTimeout(() => setCopiedKey(null), 2000);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const getStatusBadge = (apiKey: ApiKeyData) => {
    if (!apiKey.isActive) {
      return <Badge variant="secondary">Inattiva</Badge>;
    }

    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return <Badge variant="destructive">Scaduta</Badge>;
    }

    if (apiKey.expiresAt) {
      const expiryDate = new Date(apiKey.expiresAt);
      const now = new Date();
      const daysUntilExpiry =
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      if (daysUntilExpiry <= 7) {
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            In Scadenza
          </Badge>
        );
      }
    }

    return (
      <Badge variant="default" className="bg-green-100 text-green-800">
        Attiva
      </Badge>
    );
  };

  const getPermissionsBadges = (permissions: string[]) => {
    const colors: { [key: string]: string } = {
      read: 'bg-blue-100 text-blue-800',
      write: 'bg-orange-100 text-orange-800',
      delete: 'bg-red-100 text-red-800',
      admin: 'bg-purple-100 text-purple-800',
    };

    return permissions.slice(0, 2).map(permission => (
      <Badge
        key={permission}
        variant="secondary"
        className={`text-xs ${colors[permission] || 'bg-gray-100 text-gray-800'}`}
      >
        {permission}
      </Badge>
    ));
  };

  if (loading) {
    return (
      <div className={`space-y-4 ${className || ''}`}>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (apiKeys.length === 0) {
    return (
      <div className={`space-y-4 ${className || ''}`}>
        <div className="rounded-md border">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="text-lg font-medium">Nessuna Chiave API Trovata</h3>
            <p className="text-muted-foreground mb-4">
              Crea la tua prima chiave API per iniziare ad usare le API
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* Search and Filter Controls */}
      <div className="space-y-4">
        {/* Search Bar and Filter Controls */}
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
            <Input
              placeholder="Cerca chiavi API per nome o descrizione..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex items-center gap-3">
            {/* Category Filter */}
            {availableCategories.length > 0 && (
              <DropdownMenu
                open={showCategoriesFilter}
                onOpenChange={setShowCategoriesFilter}
              >
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Categorie
                    {selectedCategories.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-1 h-5 min-w-[20px] text-xs"
                      >
                        {selectedCategories.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Filtra per Categoria</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableCategories.map(category => (
                    <DropdownMenuItem
                      key={category}
                      className="flex cursor-pointer items-center gap-2"
                      onSelect={e => {
                        e.preventDefault(); // Prevent menu from closing
                        toggleCategory(category);
                      }}
                    >
                      <Checkbox
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={() => toggleCategory(category)}
                        onClick={e => e.stopPropagation()} // Prevent double toggle
                      />
                      <span className="capitalize">{category}</span>
                    </DropdownMenuItem>
                  ))}
                  {selectedCategories.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setSelectedCategories([])}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancella Categorie
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Active Filters */}
            {selectedCategories.map(category => (
              <Badge
                key={category}
                variant="secondary"
                className="hover:bg-secondary/80 cursor-pointer gap-1"
                onClick={() => toggleCategory(category)}
              >
                {category}
                <X className="h-3 w-3" />
              </Badge>
            ))}

            {/* Clear All Filters */}
            {(searchTerm || selectedCategories.length > 0) && (
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
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="text-foreground font-semibold first:rounded-tl-md last:rounded-tr-md">
                <Button
                  variant="ghost"
                  className="text-foreground hover:text-foreground/80 h-auto p-0 font-semibold hover:bg-transparent"
                  onClick={() => handleSort('name')}
                >
                  <span className="flex items-center gap-1">
                    Nome
                    {getSortIcon('name')}
                  </span>
                </Button>
              </TableHead>
              <TableHead className="text-foreground font-semibold">
                Categoria
              </TableHead>
              <TableHead className="text-foreground font-semibold">
                Stato
              </TableHead>
              <TableHead className="text-foreground font-semibold">
                Permessi
              </TableHead>
              <TableHead className="text-foreground font-semibold">
                Utilizzo
              </TableHead>
              <TableHead className="text-foreground font-semibold">
                Creata
              </TableHead>
              <TableHead className="text-foreground font-semibold">
                Ultima Attività
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApiKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="text-muted-foreground flex flex-col items-center justify-center">
                    <Search className="mb-2 h-8 w-8" />
                    <p>Nessuna chiave API corrisponde ai criteri di ricerca</p>
                    <p className="text-sm">
                      Prova ad aggiustare la ricerca o i filtri
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedApiKeys.map(apiKey => (
                <TableRow key={apiKey.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{apiKey.name}</div>
                      {apiKey.description && (
                        <div className="text-muted-foreground text-sm">
                          {apiKey.description}
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <code className="bg-muted rounded px-2 py-1 text-xs">
                          {(apiKey as any).keyPreview || (apiKey.key as string)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(apiKey)}
                          className="h-6 w-6 p-0"
                          title={
                            copiedKey === apiKey.id
                              ? 'Copiato!'
                              : 'Copia Chiave API'
                          }
                        >
                          {copiedKey === apiKey.id ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {apiKey.service ? (
                      <Badge variant="outline" className="capitalize">
                        {apiKey.service}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(apiKey)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {getPermissionsBadges(apiKey.permissions)}
                      {apiKey.permissions.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{apiKey.permissions.length - 2} altro
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Activity className="text-muted-foreground h-3 w-3" />
                      <span className="text-sm">
                        {apiKey.usageCount.toLocaleString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Calendar className="text-muted-foreground h-3 w-3" />
                      <span className="text-sm">
                        {format(new Date(apiKey.createdAt), 'd MMM yyyy', {
                          locale: it,
                        })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {apiKey.lastUsed ? (
                      <span className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(apiKey.lastUsed), {
                          addSuffix: true,
                          locale: it,
                        })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">Mai</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onView(apiKey)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Dettagli
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(apiKey)}>
                          <Edit2 className="mr-2 h-4 w-4" />
                          Modifica
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(apiKey)}
                          className="text-red-600"
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

      {/* Pagination Controls */}
      {filteredApiKeys.length > 0 && (
        <div className="flex items-center justify-between">
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
                      variant={currentPage === pageNum ? 'default' : 'outline'}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span>Elimina Chiave API</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare la chiave API "{keyToDelete?.name}"?
              Questa azione non può essere annullata e revokerà immediatamente
              l'accesso per tutte le applicazioni che utilizzano questa chiave.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Eliminazione...' : 'Elimina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
