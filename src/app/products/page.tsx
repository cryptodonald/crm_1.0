'use client';

import React, { useState, useMemo } from 'react';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ProductsDataTable } from '@/components/products/products-data-table';
import { useProducts } from '@/hooks/use-products';
import { useProductsList } from '@/hooks/use-products-list';
import { useProductVariants } from '@/hooks/use-product-variants';
import { ProductsStats } from '@/components/products/products-stats';
import { ProductFilters, PRODUCT_CATEGORIES } from '@/types/products';
import {
  Package,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Star,
  DollarSign,
  TrendingUp,
  Image,
  Settings,
  Wrench,
  Grid3X3,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function ProductsPage() {
  const [filters, setFilters] = useState<ProductFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  // Hook per gestire i prodotti con il nuovo sistema
  const {
    products,
    variants,
    loading,
    error,
    totalCount,
    refreshProducts,
    setFilters: setProductFilters,
    deleteProduct,
    deleteMultipleProducts,
    updateProduct,
  } = useProducts({
    initialFilters: {
      ...filters,
      search: searchTerm.length > 2 ? searchTerm : undefined
    }
  });
  
  // Calcoliamo le statistiche direttamente dai prodotti di useProducts
  const directStats = useMemo(() => {
    if (!products || products.length === 0) return null;
    
    const totale = products.length;
    const attivi = products.filter(p => p.Attivo === true || p.Attivo === 1).length;
    const inEvidenza = products.filter(p => p.In_Evidenza === true || p.In_Evidenza === 1).length;
    
    // Calcoli prezzi
    const prodottiConPrezzo = products.filter(p => p.Prezzo_Listino_Attuale && p.Prezzo_Listino_Attuale > 0);
    const prezzoTotaleInventario = prodottiConPrezzo.reduce((sum, p) => sum + (p.Prezzo_Listino_Attuale || 0), 0);
    const prezzoMedio = prodottiConPrezzo.length > 0 ? prezzoTotaleInventario / prodottiConPrezzo.length : 0;
    
    // Margine medio ponderato
    const prodottiConMargine = products.filter(p => p.Margine_Standard && p.Prezzo_Listino_Attuale);
    let margineMediaPonderata = 0;
    if (prodottiConMargine.length > 0) {
      const sommaMarginePesate = prodottiConMargine.reduce((sum, p) => {
        const margine = (p.Margine_Standard || 0) * 100; // Convert from decimal to percentage
        const peso = p.Prezzo_Listino_Attuale || 0;
        return sum + (margine * peso);
      }, 0);
      const sommaPreziTotale = prodottiConMargine.reduce((sum, p) => sum + (p.Prezzo_Listino_Attuale || 0), 0);
      margineMediaPonderata = sommaPreziTotale > 0 ? sommaMarginePesate / sommaPreziTotale : 0;
    }
    
    return {
      totalProducts: totale,
      activeProducts: attivi,
      featuredProducts: inEvidenza,
      totalInventoryValue: prezzoTotaleInventario,
      averageMargin: margineMediaPonderata,
    };
  }, [products]);

  // Handler per i filtri
  const handleFilterChange = (key: keyof ProductFilters, value: any) => {
    const newFilters = {
      ...filters,
      [key]: value === 'all' ? undefined : value
    };
    setFilters(newFilters);
    setProductFilters(newFilters);
  };

  const handleFiltersChange = (newFilters: ProductFilters) => {
    setFilters(newFilters);
    setProductFilters(newFilters);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({});
    setProductFilters({});
    setSearchTerm('');
  };

  // Calcola statistiche usando directStats (dati diretti da useProducts)
  const productStats = useMemo(() => {
    if (!directStats) return null;
    
    return {
      totale: directStats.totalProducts,
      attivi: directStats.activeProducts,
      prezzoTotaleInventario: directStats.totalInventoryValue,
      prezzoMedio: directStats.totalProducts > 0 ? 
                   directStats.totalInventoryValue / directStats.totalProducts : 0,
      margineMediaPonderata: directStats.averageMargin,
      inEvidenza: directStats.featuredProducts,
      senzaImmagini: 0, // TODO: aggiungere calcolo se necessario
      // Varianti attive
      variantiAttive: variants.filter(v => v.Attivo).length,
    };
  }, [directStats, variants]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
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
  
  // Get variant count for a product
  const getVariantCount = (productId: string) => {
    return variants.filter(v => v.ID_Prodotto?.includes(productId) && v.Attivo).length;
  };

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb pageName="Prodotti" />

        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Header Section - Pattern identico a LeadsPage */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Prodotti</h1>
                <p className="text-muted-foreground">
                  Gestisci e monitora il catalogo prodotti dal sistema CRM
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshProducts}
                  disabled={loading}
                  title="Aggiorna i dati"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Aggiornando...' : 'Aggiorna'}
                </Button>
                <Button size="sm" asChild>
                  <Link href="/products/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Nuovo Prodotto
                  </Link>
                </Button>
              </div>
            </div>

            {/* Error Alert - Pattern identico a LeadsPage */}
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{error}</span>
                </AlertDescription>
              </Alert>
            )}

            {/* Stats - Pattern identico a LeadsPage */}
            {productStats && !loading && (
              <ProductsStats
                stats={productStats}
                loading={loading}
                className="w-full"
              />
            )}

            {/* Navigazione Rapida - Sostituisce la tabella per ora */}
            <Card className="border-dashed border-2 bg-gradient-to-br from-muted/30 to-muted/60">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header con icona e info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                        <Wrench className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">Gestione Prodotti</h3>
                        <p className="text-sm text-muted-foreground">Accedi alle funzioni principali per gestire il catalogo</p>
                      </div>
                    </div>
                  </div>

                  {/* Pulsanti di navigazione */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <Button 
                      asChild 
                      variant="outline" 
                      className="h-auto p-4 justify-start hover:shadow-md transition-all duration-200"
                    >
                      <Link href="/products/new" className="flex items-center space-x-3 w-full">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Plus className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col items-start space-y-1">
                          <span className="font-medium text-sm">Nuovo Prodotto</span>
                          <span className="text-xs text-muted-foreground">
                            Crea prodotti semplici o strutturati
                          </span>
                        </div>
                      </Link>
                    </Button>
                    
                    <Button 
                      asChild 
                      variant="outline" 
                      className="h-auto p-4 justify-start hover:shadow-md transition-all duration-200"
                    >
                      <Link href="/products/structure-variants" className="flex items-center space-x-3 w-full">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Grid3X3 className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex flex-col items-start space-y-1">
                          <span className="font-medium text-sm">Gestione Varianti</span>
                          <span className="text-xs text-muted-foreground">
                            Configura opzioni e prezzi varianti
                          </span>
                        </div>
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabella Prodotti */}
            <ProductsDataTable
              products={products}
              variants={variants}
              loading={loading}
              filters={filters}
              onFiltersChange={handleFiltersChange}
              totalCount={totalCount}
              onDeleteProduct={deleteProduct}
              onDeleteMultipleProducts={deleteMultipleProducts}
              onUpdateProduct={updateProduct}
            />
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  );
}