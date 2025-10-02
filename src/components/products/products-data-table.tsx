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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Package,
  Image,
  DollarSign,
  TrendingUp,
  Grid3X3,
  Plus,
  FileText,
  Star,
  StarOff,
} from 'lucide-react';
import { ProductFilters, PRODUCT_CATEGORIES, ProductCategory } from '@/types/products';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Interfaccia per i dati del prodotto (estesa da quella esistente)
interface ProductData {
  id: string;
  createdTime: string;
  Codice_Matrice: string;
  Nome_Prodotto: string;
  Descrizione?: string;
  Categoria: string;
  Prezzo_Listino_Attuale?: number;
  Costo_Attuale?: number;
  Margine_Standard?: number;
  Attivo: boolean;
  In_Evidenza: boolean;
  URL_Immagine_Principale?: string;
  Foto_Prodotto?: Array<{ url: string }>;
  // Altri campi...
}

interface ProductsDataTableProps {
  products: ProductData[];
  loading: boolean;
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
  totalCount: number;
  onDeleteProduct?: (productId: string) => Promise<boolean>;
  onDeleteMultipleProducts?: (productIds: string[]) => Promise<number>;
  onUpdateProduct?: (productId: string, updates: Partial<ProductData>) => Promise<boolean>;
  className?: string;
  variants?: any[]; // Per contare le varianti
}

// Configurazione colonne visibili
const DEFAULT_VISIBLE_COLUMNS = {
  select: true,
  prodotto: true,
  categoria: true,
  prezzo: true,
  costo: true,
  margine: true,
  stato: true,
  azioni: true,
};

export function ProductsDataTable({
  products,
  loading,
  filters,
  onFiltersChange,
  totalCount,
  onDeleteProduct,
  onDeleteMultipleProducts,
  onUpdateProduct,
  className,
  variants = [],
}: ProductsDataTableProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState(DEFAULT_VISIBLE_COLUMNS);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Stati per selezione e ordinamento
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [sortField, setSortField] = useState<string>('Nome_Prodotto');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Stati per dialog di eliminazione
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtri applicati
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Ricerca globale
    if (searchTerm.length > 2) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.Nome_Prodotto?.toLowerCase().includes(searchLower) ||
        product.Codice_Matrice?.toLowerCase().includes(searchLower) ||
        product.Descrizione?.toLowerCase().includes(searchLower)
      );
    }

    // Filtro categoria (supporta array di categorie)
    if (filters.categoria && filters.categoria.length > 0) {
      filtered = filtered.filter(product => 
        filters.categoria!.includes(product.Categoria as ProductCategory)
      );
    }

    // Filtro attivo
    if (filters.attivo !== undefined) {
      filtered = filtered.filter(product => product.Attivo === filters.attivo);
    }

    // Filtro in evidenza
    if (filters.in_evidenza !== undefined) {
      filtered = filtered.filter(product => product.In_Evidenza === filters.in_evidenza);
    }

    // Filtro prezzo minimo
    if (filters.prezzo_min !== undefined && filters.prezzo_min > 0) {
      filtered = filtered.filter(product => 
        (product.Prezzo_Listino_Attuale || 0) >= filters.prezzo_min!
      );
    }

    // Filtro prezzo massimo
    if (filters.prezzo_max !== undefined && filters.prezzo_max > 0) {
      filtered = filtered.filter(product => 
        (product.Prezzo_Listino_Attuale || 0) <= filters.prezzo_max!
      );
    }

    return filtered;
  }, [products, searchTerm, filters]);

  // Prodotti ordinati
  const sortedProducts = useMemo(() => {
    if (!sortField) return filteredProducts;

    return [...filteredProducts].sort((a, b) => {
      let aValue = a[sortField as keyof ProductData] as any;
      let bValue = b[sortField as keyof ProductData] as any;

      // Handle undefined values
      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';

      // Convert to string for comparison
      aValue = String(aValue).toLowerCase();
      bValue = String(bValue).toLowerCase();

      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [filteredProducts, sortField, sortDirection]);

  // Paginazione
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedProducts, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);

  // Helper functions
  const formatCurrency = (value?: number): string => {
    if (!value) return '-';
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const formatPercentage = (value?: number): string => {
    if (!value) return '-';
    return `${(value * 100).toFixed(1)}%`;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Materassi': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'Accessori': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Cuscini': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Basi': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'Altro': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    };
    return colors[category] || colors['Altro'];
  };


  // Event handlers
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedProducts(checked ? paginatedProducts.map(p => p.id) : []);
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    setSelectedProducts(prev =>
      checked
        ? [...prev, productId]
        : prev.filter(id => id !== productId)
    );
  };

  const handleDeleteSelected = async () => {
    if (!onDeleteMultipleProducts) return;

    setIsDeleting(true);
    try {
      const deletedCount = await onDeleteMultipleProducts(selectedProducts);
      console.log(`✅ Deleted ${deletedCount}/${selectedProducts.length} products`);
      setSelectedProducts([]);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('❌ Failed to delete products:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingle = async (productId: string) => {
    if (!onDeleteProduct) return;

    try {
      const success = await onDeleteProduct(productId);
      if (success) {
        console.log('✅ Product deleted successfully');
      }
    } catch (error) {
      console.error('❌ Failed to delete product:', error);
    }
  };

  const handleToggleInEvidenza = async (productId: string, currentValue: boolean) => {
    if (!onUpdateProduct) return;

    try {
      const success = await onUpdateProduct(productId, { In_Evidenza: !currentValue });
      if (success) {
        console.log('✅ Product updated successfully');
      }
    } catch (error) {
      console.error('❌ Failed to update product:', error);
    }
  };

  // Rendering
  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="border rounded-lg">
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-10 w-10 rounded" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header con filtri */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Ricerca */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca prodotti..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Filtri */}
        <div className="flex items-center gap-2">
          {/* Filtro Categoria - per compatibilità, supportiamo una categoria singola */}
          <Select
            value={filters.categoria && filters.categoria.length > 0 ? filters.categoria[0] : 'all'}
            onValueChange={(value) => {
              const newCategoria = value === 'all' ? undefined : [value as ProductCategory];
              onFiltersChange({ ...filters, categoria: newCategoria });
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le categorie</SelectItem>
              {PRODUCT_CATEGORIES.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro Attivo */}
          <Select
            value={filters.attivo === undefined ? 'all' : String(filters.attivo)}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                attivo: value === 'all' ? undefined : value === 'true'
              })
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti</SelectItem>
              <SelectItem value="true">Attivi</SelectItem>
              <SelectItem value="false">Inattivi</SelectItem>
            </SelectContent>
          </Select>

          {/* Aggiungi prodotto */}
          <Button size="sm" asChild>
            <Link href="/products/new">
              <Plus className="mr-2 h-4 w-4" />
              Nuovo
            </Link>
          </Button>
        </div>
      </div>

      {/* Azioni bulk se ci sono elementi selezionati */}
      {selectedProducts.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">
            {selectedProducts.length} prodotto{selectedProducts.length !== 1 ? 'i' : ''} selezionat{selectedProducts.length !== 1 ? 'i' : 'o'}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedProducts([])}
            >
              <X className="mr-2 h-4 w-4" />
              Annulla selezione
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Elimina selezionati
            </Button>
          </div>
        </div>
      )}

      {/* Tabella */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <Checkbox
                  checked={
                    paginatedProducts.length > 0 &&
                    selectedProducts.length === paginatedProducts.length
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8 data-[state=open]:bg-accent"
                  onClick={() => handleSort('Nome_Prodotto')}
                >
                  <span>Prodotto</span>
                  {sortField === 'Nome_Prodotto' ? (
                    sortDirection === 'asc' ? (
                      <ChevronUp className="ml-2 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-2 h-4 w-4" />
                    )
                  ) : (
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  )}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => handleSort('Categoria')}
                >
                  <span>Categoria</span>
                  {sortField === 'Categoria' ? (
                    sortDirection === 'asc' ? (
                      <ChevronUp className="ml-2 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-2 h-4 w-4" />
                    )
                  ) : (
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  )}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => handleSort('Prezzo_Listino_Attuale')}
                >
                  <span>Prezzo</span>
                  {sortField === 'Prezzo_Listino_Attuale' ? (
                    sortDirection === 'asc' ? (
                      <ChevronUp className="ml-2 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-2 h-4 w-4" />
                    )
                  ) : (
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  )}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => handleSort('Costo_Attuale')}
                >
                  <span>Costo</span>
                  {sortField === 'Costo_Attuale' ? (
                    sortDirection === 'asc' ? (
                      <ChevronUp className="ml-2 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-2 h-4 w-4" />
                    )
                  ) : (
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  )}
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="-ml-3 h-8"
                  onClick={() => handleSort('Margine_Standard')}
                >
                  <span>Margine</span>
                  {sortField === 'Margine_Standard' ? (
                    sortDirection === 'asc' ? (
                      <ChevronUp className="ml-2 h-4 w-4" />
                    ) : (
                      <ChevronDown className="ml-2 h-4 w-4" />
                    )
                  ) : (
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  )}
                </Button>
              </TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <Package className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {searchTerm || Object.keys(filters).length > 0
                        ? 'Nessun prodotto trovato con i filtri applicati'
                        : 'Nessun prodotto disponibile'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedProducts.map((product) => {
                const isSelected = selectedProducts.includes(product.id);

                return (
                  <TableRow
                    key={product.id}
                    className={cn(
                      'group',
                      isSelected && 'bg-muted/50'
                    )}
                  >
                    {/* Checkbox */}
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleSelectProduct(product.id, checked as boolean)
                        }
                      />
                    </TableCell>

                    {/* Prodotto */}
                    <TableCell className="max-w-[300px]">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                          {product.URL_Immagine_Principale || product.Foto_Prodotto?.[0]?.url ? (
                            <img 
                              src={product.URL_Immagine_Principale || product.Foto_Prodotto?.[0]?.url} 
                              alt={product.Nome_Prodotto} 
                              className="w-8 h-8 object-cover rounded"
                            />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">
                            {product.Nome_Prodotto}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">{product.Codice_Matrice}</p>
                          {product.Descrizione && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-xs text-muted-foreground truncate mt-1 max-w-[200px] cursor-help">
                                    {product.Descrizione}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[400px]">
                                  <p className="text-xs whitespace-pre-line">{product.Descrizione}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    
                    {/* Categoria */}
                    <TableCell>
                      <Badge variant="outline" className={getCategoryColor(product.Categoria)}>
                        {product.Categoria}
                      </Badge>
                    </TableCell>
                    
                    {/* Prezzo */}
                    <TableCell className="text-right">
                      {product.Prezzo_Listino_Attuale ? (
                        <div className="font-medium">
                          {formatCurrency(product.Prezzo_Listino_Attuale)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    
                    {/* Costo */}
                    <TableCell className="text-right">
                      {product.Costo_Attuale ? (
                        <div className="font-medium text-orange-600 dark:text-orange-400">
                          {formatCurrency(product.Costo_Attuale)}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    
                    {/* Margine */}
                    <TableCell className="text-right">
                      {product.Margine_Standard ? (
                        <Badge variant="outline" className="font-mono">
                          {formatPercentage(product.Margine_Standard)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    
                    {/* Stato */}
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={product.Attivo ? "default" : "secondary"}>
                          {product.Attivo ? "Attivo" : "Inattivo"}
                        </Badge>
                        {product.In_Evidenza && (
                          <Star className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                    </TableCell>
                    
                    {/* Azioni */}
                    <TableCell>
                      <div className="flex items-center justify-end space-x-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
                          <Link href={`/products/${product.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" asChild>
                          <Link href={`/products/${product.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleToggleInEvidenza(product.id, product.In_Evidenza)}
                            >
                              {product.In_Evidenza ? (
                                <>
                                  <StarOff className="mr-2 h-4 w-4" />
                                  Rimuovi da evidenza
                                </>
                              ) : (
                                <>
                                  <Star className="mr-2 h-4 w-4" />
                                  Metti in evidenza
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteSingle(product.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Elimina
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginazione */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, sortedProducts.length)} di {sortedProducts.length} prodotti
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Precedente
            </Button>
            <span className="text-sm">
              Pagina {currentPage} di {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Successiva
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog eliminazione multipla */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare {selectedProducts.length} prodotto{selectedProducts.length !== 1 ? 'i' : ''}?
              Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Eliminazione...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Elimina {selectedProducts.length} prodotto{selectedProducts.length !== 1 ? 'i' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}