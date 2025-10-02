'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { ProductFilters, FlatProduct, FlatProductVariant } from '@/types/products';

// Riusiamo i tipi esistenti

interface UseProductsOptions {
  initialFilters?: ProductFilters;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseProductsReturn {
  products: FlatProduct[];
  variants: FlatProductVariant[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  filters: ProductFilters;
  // Actions
  refreshProducts: () => Promise<void>;
  setFilters: (filters: ProductFilters) => void;
  deleteProduct: (productId: string) => Promise<boolean>;
  deleteMultipleProducts: (productIds: string[]) => Promise<number>;
  updateProduct: (productId: string, updates: Partial<FlatProduct>) => Promise<boolean>;
  fetchSingleProduct: (productId: string) => Promise<FlatProduct | null>;
}

export function useProducts(options: UseProductsOptions = {}): UseProductsReturn {
  const {
    initialFilters = {},
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
  } = options;

  // States
  const [products, setProducts] = useState<FlatProduct[]>([]);
  const [variants, setVariants] = useState<FlatProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);

  // Fetch products from API
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Fetching products...');
      const response = await fetch('/api/products?loadAll=true');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // L'API esistente restituisce {records: [...]} non {success: true, products: [...]}
      if (!data.records) {
        throw new Error('No records found in API response');
      }

      console.log(`✅ Loaded ${data.records?.length || 0} products`);
      setProducts(data.records || []);
      
      // Fetch variants separately if needed
      try {
        const variantsResponse = await fetch('/api/product-variants?loadAll=true');
        if (variantsResponse.ok) {
          const variantsData = await variantsResponse.json();
          setVariants(variantsData.records || []);
        }
      } catch (varErr) {
        console.warn('⚠️ Could not load variants:', varErr);
        setVariants([]);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Error fetching products:', errorMessage);
      setError(errorMessage);
      toast.error('Errore nel caricamento dei prodotti');
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete single product
  const deleteProduct = useCallback(async (productId: string): Promise<boolean> => {
    try {
      console.log(`🗑️ Deleting product: ${productId}`);
      
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete product');
      }

      // Remove from local state
      setProducts(prev => prev.filter(p => p.id !== productId));
      
      toast.success('Prodotto eliminato con successo');
      console.log(`✅ Product deleted: ${productId}`);
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error(`❌ Error deleting product ${productId}:`, errorMessage);
      toast.error('Errore durante l\'eliminazione del prodotto');
      return false;
    }
  }, []);

  // Delete multiple products
  const deleteMultipleProducts = useCallback(async (productIds: string[]): Promise<number> => {
    let deletedCount = 0;
    
    try {
      console.log(`🗑️ Deleting ${productIds.length} products...`);
      
      // Delete products in parallel (but limit concurrency)
      const deletePromises = productIds.map(async (productId) => {
        try {
          const success = await deleteProduct(productId);
          return success ? 1 : 0;
        } catch {
          return 0;
        }
      });

      const results = await Promise.all(deletePromises);
      deletedCount = results.reduce((sum, result) => sum + result, 0);

      if (deletedCount === productIds.length) {
        toast.success(`${deletedCount} prodotti eliminati con successo`);
      } else if (deletedCount > 0) {
        toast.warning(`${deletedCount}/${productIds.length} prodotti eliminati`);
      } else {
        toast.error('Nessun prodotto è stato eliminato');
      }

      console.log(`✅ Deleted ${deletedCount}/${productIds.length} products`);
      return deletedCount;

    } catch (err) {
      console.error('❌ Error deleting multiple products:', err);
      toast.error('Errore durante l\'eliminazione multipla');
      return deletedCount;
    }
  }, [deleteProduct]);

  // Fetch single product
  const fetchSingleProduct = useCallback(async (productId: string): Promise<FlatProduct | null> => {
    try {
      console.log(`🔍 Fetching single product: ${productId}`);
      
      const response = await fetch(`/api/products/${productId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`⚠️ Product not found: ${productId}`);
          return null;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.product) {
        throw new Error(data.error || 'No product data received');
      }

      console.log(`✅ Single product loaded:`, data.product);
      return data.product;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error(`❌ Error fetching single product ${productId}:`, errorMessage);
      return null;
    }
  }, []);

  // Update single product
  const updateProduct = useCallback(async (productId: string, updates: Partial<FlatProduct>): Promise<boolean> => {
    try {
      console.log(`📝 Updating product: ${productId}`, updates);
      
      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update product');
      }

      // Update local state
      setProducts(prev => prev.map(p => 
        p.id === productId 
          ? { ...p, ...updates }
          : p
      ));
      
      toast.success('Prodotto aggiornato con successo');
      console.log(`✅ Product updated: ${productId}`);
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error(`❌ Error updating product ${productId}:`, errorMessage);
      toast.error('Errore durante l\'aggiornamento del prodotto');
      return false;
    }
  }, []);

  // Refresh products
  const refreshProducts = useCallback(async () => {
    await fetchProducts();
  }, [fetchProducts]);

  // Total count (for compatibility with table component)
  const totalCount = useMemo(() => products.length, [products]);

  // Initial fetch
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      if (!loading) {
        fetchProducts();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loading, fetchProducts]);

  return {
    products,
    variants,
    loading,
    error,
    totalCount,
    filters,
    refreshProducts,
    setFilters,
    deleteProduct,
    deleteMultipleProducts,
    updateProduct,
    fetchSingleProduct,
  };
}