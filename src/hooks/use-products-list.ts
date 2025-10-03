import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FlatProduct, 
  ProductFilters, 
  ProductStatsResponse, 
  CreateProductForm, 
  UpdateProductForm,
  UseProductsListReturn,
  PRODUCT_CATEGORIES
} from '@/types/products';
import { useFetchWithRetry } from './use-fetch-with-retry';
import { toast } from 'sonner';

interface UseProductsListProps {
  filters?: ProductFilters;
  refreshKey?: number;
  enableSmartCache?: boolean;
  enabled?: boolean;
}

export function useProductsList({ 
  filters = {}, 
  refreshKey,
  enableSmartCache = true,
  enabled = true
}: UseProductsListProps = {}): UseProductsListReturn {
  
  const router = useRouter();
  const [products, setProducts] = useState<FlatProduct[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  // 🔧 Stabilizza i filtri per evitare re-render loops
  const stableFilters = useMemo(() => {
    if (!filters || Object.keys(filters).length === 0) {
      return {};
    }
    
    return {
      categoria: filters.categoria,
      attivo: filters.attivo,
      in_evidenza: filters.in_evidenza,
      prezzo_min: filters.prezzo_min,
      prezzo_max: filters.prezzo_max,
      margine_min: filters.margine_min,
      margine_max: filters.margine_max,
      search: filters.search,
    };
  }, [
    filters?.categoria?.length > 0 ? JSON.stringify(filters.categoria) : '',
    filters?.attivo?.toString() || '',
    filters?.in_evidenza?.toString() || '',
    filters?.prezzo_min ?? '',
    filters?.prezzo_max ?? '',
    filters?.margine_min ?? '',
    filters?.margine_max ?? '',
    filters?.search || '',
  ]);

  // Stable refresh key
  const stableRefreshKey = useMemo(() => refreshKey ?? 0, [refreshKey]);

  // Memoize fetch URL per prevenire ricreazione
  const fetchUrl = useMemo(() => {
    const queryParams = new URLSearchParams();
    
    // Aggiungi filtri solo se esistono
    if (stableFilters?.categoria && stableFilters.categoria.length > 0) {
      stableFilters.categoria.forEach(categoria => queryParams.append('categoria', categoria));
    }
    if (stableFilters?.attivo !== undefined) {
      queryParams.set('attivo', stableFilters.attivo.toString());
    }
    if (stableFilters?.in_evidenza !== undefined) {
      queryParams.set('in_evidenza', stableFilters.in_evidenza.toString());
    }
    if (stableFilters?.prezzo_min !== undefined) {
      queryParams.set('prezzo_min', stableFilters.prezzo_min.toString());
    }
    if (stableFilters?.prezzo_max !== undefined) {
      queryParams.set('prezzo_max', stableFilters.prezzo_max.toString());
    }
    if (stableFilters?.margine_min !== undefined) {
      queryParams.set('margine_min', stableFilters.margine_min.toString());
    }
    if (stableFilters?.margine_max !== undefined) {
      queryParams.set('margine_max', stableFilters.margine_max.toString());
    }
    if (stableFilters?.search) {
      queryParams.set('search', stableFilters.search);
    }
    
    // Sempre carica tutto per la lista
    queryParams.set('loadAll', 'true');
    queryParams.set('sortField', 'Nome_Prodotto');
    queryParams.set('sortDirection', 'asc');

    // Cache busting solo quando necessario
    if (!enableSmartCache && stableRefreshKey > 0) {
      queryParams.set('_t', stableRefreshKey.toString());
      queryParams.set('skipCache', 'true');
    }

    return `/api/products?${queryParams.toString()}`;
  }, [stableFilters, enableSmartCache, stableRefreshKey]);

  // 🚀 Funzione fetch stabile
  const fetchProductsFn = useCallback(async () => {
    console.log('🔍 [useProductsList] Fetching products from:', fetchUrl);
    
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: enableSmartCache ? 'default' : 'no-store',
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Prodotti non trovati');
      }
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.records) {
      throw new Error('Formato risposta non valido');
    }

    console.log(`✅ [useProductsList] Loaded ${data.records.length} products successfully`);
    return {
      records: data.records.map((record: any) => ({
        id: record.id,
        createdTime: record.createdTime,
        ...record.fields
      })),
      totalCount: data.records.length,
      fromCache: data.fromCache || false
    };
  }, [fetchUrl, enableSmartCache]);

  // Callback per retry stabile
  const onRetryCallback = useCallback((attempt: number, error: any) => {
    toast.warning(`Tentativo ${attempt} di ricaricamento prodotti...`);
    console.warn(`⚠️ [useProductsList] Retry ${attempt}:`, error.message);
  }, []);

  // Opzioni retry stabili
  const retryOptions = useMemo(() => ({
    maxRetries: 2,
    baseDelay: 1000,
    timeout: 20000,
    onRetry: onRetryCallback
  }), [onRetryCallback]);

  // Sistema di fetch con retry automatico
  const fetchProductsWithRetry = useFetchWithRetry(
    fetchProductsFn,
    retryOptions
  );

  // Sincronizza stato prodotti con fetch result
  useEffect(() => {
    if (fetchProductsWithRetry.data) {
      setProducts(fetchProductsWithRetry.data.records);
      setTotalCount(fetchProductsWithRetry.data.totalCount);
      
      if (fetchProductsWithRetry.data.fromCache) {
        console.log('⚡ [useProductsList] Data served from cache');
      } else {
        console.log('🔄 [useProductsList] Fresh data from server');
      }
    } else if (fetchProductsWithRetry.error) {
      setProducts([]);
      setTotalCount(0);
    }
  }, [fetchProductsWithRetry.data, fetchProductsWithRetry.error]);

  const isDisabled = !enabled;

  // Trigger fetch quando filtri cambiano
  useEffect(() => {
    if (!isDisabled) {
      fetchProductsWithRetry.execute();
    }
  }, [stableFilters, stableRefreshKey, isDisabled, fetchProductsWithRetry.execute]);

  // 🔄 Refresh function
  const refresh = useCallback(async () => {
    console.log('🔄 [useProductsList] Manual refresh triggered');
    await fetchProductsWithRetry.execute();
  }, [fetchProductsWithRetry.execute]);

  // 📊 Calcola statistiche dai prodotti caricati
  const stats = useMemo((): ProductStatsResponse | null => {
    console.log('🧮 [useProductsList] Calcolando stats con prodotti:', products?.length || 0, products);
    
    if (!products || products.length === 0) {
      console.log('⚠️ [useProductsList] Nessun prodotto trovato, restituendo null');
      return null;
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const totale = products.length;
    const attivi = products.filter(p => p.Attivo).length;
    
    console.log('📊 [useProductsList] Stats base:', { totale, attivi });
    console.log('🔍 [useProductsList] Primo prodotto dettaglio:', {
      Attivo: products[0]?.Attivo,
      tipoAttivo: typeof products[0]?.Attivo,
      Prezzo_Listino_Attuale: products[0]?.Prezzo_Listino_Attuale,
      Margine_Standard: products[0]?.Margine_Standard
    });
    const inEvidenza = products.filter(p => p.In_Evidenza).length;

    // Breakdown per categoria
    const byCategoria: Record<string, number> = {};
    PRODUCT_CATEGORIES.forEach(cat => {
      byCategoria[cat] = 0;
    });
    
    products.forEach(product => {
      const categoria = product.Categoria || 'Altro';
      byCategoria[categoria] = (byCategoria[categoria] || 0) + 1;
    });

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

    // Prodotti senza immagini
    const senzaImmagini = products.filter(p => 
      !p.URL_Immagine_Principale && 
      (!p.Foto_Prodotto || p.Foto_Prodotto.length === 0)
    ).length;

    // Creati negli ultimi 7 giorni
    const creatiUltimi7Giorni = products.filter(product => {
      if (!product.createdTime) return false;
      const createdDate = new Date(product.createdTime);
      return createdDate >= sevenDaysAgo;
    }).length;

    return {
      totalProducts: totale,
      activeProducts: attivi,
      featuredProducts: inEvidenza,
      totalInventoryValue: prezzoTotaleInventario,
      averageMargin: margineMediaPonderata,
      categoryBreakdown: byCategoria as any,
    };
  }, [products]);

  // 📝 Create product function
  const createProduct = useCallback(async (productData: CreateProductForm): Promise<{ id: string; success: boolean } | { success: false }> => {
    try {
      console.log('📝 [useProductsList] Creating new product:', productData);
      
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to create product');
      }

      const newProduct = await response.json();
      
      // Add to local state
      setProducts(prevProducts => [
        {
          id: newProduct.product.id,
          createdTime: newProduct.product.createdTime,
          ...newProduct.product
        },
        ...prevProducts
      ]);
      setTotalCount(prev => prev + 1);

      toast.success('Prodotto creato con successo');
      console.log('✅ [useProductsList] Product created successfully:', newProduct.product.id);
      
      return { id: newProduct.product.id, success: true };
    } catch (error) {
      console.error('❌ [useProductsList] Error creating product:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante la creazione del prodotto');
      return { success: false };
    }
  }, []);

  // ✏️ Update product function
  const updateProduct = useCallback(async (productId: string, updates: UpdateProductForm): Promise<boolean> => {
    try {
      console.log('✏️ [useProductsList] Updating product:', productId, updates);
      
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to update product');
      }

      const updatedProduct = await response.json();
      
      // Update in local state
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === productId 
            ? { ...product, ...updatedProduct.fields }
            : product
        )
      );

      toast.success('Prodotto aggiornato con successo');
      console.log('✅ [useProductsList] Product updated successfully:', productId);
      
      return true;
    } catch (error) {
      console.error('❌ [useProductsList] Error updating product:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante l\'aggiornamento del prodotto');
      return false;
    }
  }, []);

  // 🗑️ Delete single product function
  const deleteProduct = useCallback(async (productId: string): Promise<boolean> => {
    try {
      console.log('🗑️ [useProductsList] Deleting product:', productId);
      
      const response = await fetch('/api/products', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productIds: [productId] }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to delete product');
      }

      const result = await response.json();
      
      if (result.deleted > 0) {
        // Remove from local state
        setProducts(prevProducts => prevProducts.filter(product => product.id !== productId));
        setTotalCount(prev => prev - 1);
        
        toast.success('Prodotto eliminato con successo');
        console.log('✅ [useProductsList] Product deleted successfully:', productId);
        return true;
      } else {
        throw new Error('Nessun prodotto eliminato');
      }
    } catch (error) {
      console.error('❌ [useProductsList] Error deleting product:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante l\'eliminazione del prodotto');
      return false;
    }
  }, []);

  // 🗑️ Delete multiple products function
  const deleteMultipleProducts = useCallback(async (productIds: string[]): Promise<number> => {
    try {
      console.log('🗑️ [useProductsList] Deleting multiple products:', productIds.length);
      
      const response = await fetch('/api/products', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to delete products');
      }

      const result = await response.json();
      const deletedCount = result.deleted || 0;
      
      if (deletedCount > 0) {
        // Remove from local state
        setProducts(prevProducts => 
          prevProducts.filter(product => !result.deletedIds?.includes(product.id))
        );
        setTotalCount(prev => prev - deletedCount);
        
        toast.success(`${deletedCount} prodotti eliminati con successo`);
        console.log('✅ [useProductsList] Products deleted successfully:', deletedCount);
      }
      
      if (result.errors && result.errors.length > 0) {
        toast.warning(`${result.errors.length} prodotti non sono stati eliminati`);
      }
      
      return deletedCount;
    } catch (error) {
      console.error('❌ [useProductsList] Error deleting multiple products:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante l\'eliminazione dei prodotti');
      return 0;
    }
  }, []);

  return {
    products,
    loading: fetchProductsWithRetry.loading,
    error: fetchProductsWithRetry.error?.message || null,
    stats,
    createProduct,
    updateProduct,
    deleteProduct,
    deleteProducts: deleteMultipleProducts,
    filters: stableFilters,
    setFilters: () => {}, // Placeholder - implement if needed
    clearFilters: () => {}, // Placeholder - implement if needed
    searchTerm: stableFilters.search || '',
    setSearchTerm: () => {}, // Placeholder - implement if needed
    refresh,
    getProductById: (id: string) => products.find(p => p.id === id),
  };
}