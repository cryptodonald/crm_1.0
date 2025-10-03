import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { 
  ProductVariant, 
  FlatProductVariant,
  CreateProductVariantForm,
  UpdateProductVariantForm,
  UseProductVariantsReturn,
  VariantType,
  VariantPosition
} from '@/types/products';
import { useFetchWithRetry } from './use-fetch-with-retry';

interface UseProductVariantsProps {
  productId?: string;
  variantType?: VariantType;
  activeOnly?: boolean;
  refreshKey?: number;
  enabled?: boolean;
}

export function useProductVariants({
  productId,
  variantType,
  activeOnly = false,
  refreshKey,
  enabled = true
}: UseProductVariantsProps = {}): UseProductVariantsReturn {
  const [variants, setVariants] = useState<FlatProductVariant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔧 Build fetch URL with filters
  const fetchUrl = useMemo(() => {
    const queryParams = new URLSearchParams();
    
    // Add stable filters
    if (productId) queryParams.set('productId', productId);
    if (variantType) queryParams.set('variantType', variantType);
    if (activeOnly) queryParams.set('activeOnly', 'true');
    
    // Always load all for variants list
    queryParams.set('loadAll', 'true');
    queryParams.set('sortField', 'Nome_Variante');
    queryParams.set('sortDirection', 'asc');
    
    // Add refresh key for cache busting if needed
    if (refreshKey && refreshKey > 0) {
      queryParams.set('_t', refreshKey.toString());
    }
    
    return `/api/product-variants?${queryParams.toString()}`;
  }, [productId, variantType, activeOnly, refreshKey]);

  // 🚀 Stable fetch function
  const fetchVariantsFn = useCallback(async () => {
    console.log('🔍 [useProductVariants] Fetching variants from:', fetchUrl);
    
    const response = await fetch(fetchUrl);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ [useProductVariants] Loaded ${data.variants.length} variants successfully`);
    
    // Flatten variants for easier use in components
    return data.variants.map((variant: ProductVariant): FlatProductVariant => ({
      id: variant.id,
      createdTime: variant.createdTime,
      Nome_Variante: variant.fields.Nome_Variante || '',
      ID_Prodotto: variant.fields.ID_Prodotto || [],
      Tipo_Variante: variant.fields.Tipo_Variante,
      Codice_Variante: variant.fields.Codice_Variante,
      Prezzo_Aggiuntivo_Attuale: variant.fields.Prezzo_Aggiuntivo_Attuale,
      Costo_Aggiuntivo_Attuale: variant.fields.Costo_Aggiuntivo_Attuale,
      Posizione: variant.fields.Posizione,
      Obbligatorio: variant.fields.Obbligatorio || false,
      Attivo: variant.fields.Attivo || false,
      // Include strutture collegate per filtri
      Product_Structures: variant.fields.Product_Structures || [],
    }));
  }, [fetchUrl]);

  // Retry configuration
  const onRetryCallback = useCallback((attempt: number, error: any) => {
    toast.warning(`Tentativo ${attempt} di ricaricamento varianti...`);
    console.warn(`⚠️ [useProductVariants] Retry ${attempt}:`, error.message);
  }, []);

  // Setup retry system
  const fetchVariantsWithRetry = useFetchWithRetry(fetchVariantsFn, {
    maxRetries: 2,
    baseDelay: 1000,
    timeout: 20000,
    onRetry: onRetryCallback
  });

  // Sync variants state with fetch result
  useEffect(() => {
    if (fetchVariantsWithRetry.data) {
      setVariants(fetchVariantsWithRetry.data);
    } else if (fetchVariantsWithRetry.error) {
      setError(fetchVariantsWithRetry.error.message);
      setVariants([]);
    }
    setLoading(fetchVariantsWithRetry.loading);
  }, [fetchVariantsWithRetry.data, fetchVariantsWithRetry.error, fetchVariantsWithRetry.loading]);

  // Initial fetch on mount and when filters change
  useEffect(() => {
    if (enabled) {
      fetchVariantsWithRetry.execute();
    }
  }, [enabled, fetchUrl, fetchVariantsWithRetry.execute]);

  // 🔄 Manual refresh function
  const refresh = useCallback(async () => {
    console.log('🔄 [useProductVariants] Manual refresh triggered');
    await fetchVariantsWithRetry.execute();
  }, [fetchVariantsWithRetry.execute]);

  // 📝 Create variant function
  const createVariant = useCallback(async (variantData: CreateProductVariantForm): Promise<boolean> => {
    try {
      console.log('📝 [useProductVariants] Creating new variant:', variantData);
      
      const response = await fetch('/api/product-variants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(variantData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to create variant');
      }

      const newVariant = await response.json();
      
      // Add to local state
      setVariants(prevVariants => [
        {
          id: newVariant.id,
          createdTime: newVariant.createdTime,
          Nome_Variante: newVariant.fields.Nome_Variante || '',
          ID_Prodotto: newVariant.fields.ID_Prodotto || [],
          Tipo_Variante: newVariant.fields.Tipo_Variante,
          Codice_Variante: newVariant.fields.Codice_Variante,
          Prezzo_Aggiuntivo_Attuale: newVariant.fields.Prezzo_Aggiuntivo_Attuale,
          Costo_Aggiuntivo_Attuale: newVariant.fields.Costo_Aggiuntivo_Attuale,
          Posizione: newVariant.fields.Posizione,
          Obbligatorio: newVariant.fields.Obbligatorio || false,
          Attivo: newVariant.fields.Attivo || false,
          Product_Structures: newVariant.fields.Product_Structures || [],
        },
        ...prevVariants
      ]);

      toast.success('Variante creata con successo');
      console.log('✅ [useProductVariants] Variant created successfully:', newVariant.id);
      
      return true;
    } catch (error) {
      console.error('❌ [useProductVariants] Error creating variant:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante la creazione della variante');
      return false;
    }
  }, []);

  // ✏️ Update variant function
  const updateVariant = useCallback(async (variantId: string, updates: UpdateProductVariantForm): Promise<boolean> => {
    try {
      console.log('✏️ [useProductVariants] Updating variant:', variantId, updates);
      
      const response = await fetch(`/api/product-variants/${variantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to update variant');
      }

      const updatedVariant = await response.json();
      
      // Update in local state
      setVariants(prevVariants => 
        prevVariants.map(variant => 
          variant.id === variantId 
            ? {
                ...variant,
                ...updatedVariant.fields
              }
            : variant
        )
      );

      toast.success('Variante aggiornata con successo');
      console.log('✅ [useProductVariants] Variant updated successfully:', variantId);
      
      return true;
    } catch (error) {
      console.error('❌ [useProductVariants] Error updating variant:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante l\'aggiornamento della variante');
      return false;
    }
  }, []);

  // 🗑️ Delete variant function
  const deleteVariant = useCallback(async (variantId: string): Promise<boolean> => {
    try {
      console.log('🗑️ [useProductVariants] Deleting variant:', variantId);
      
      const response = await fetch(`/api/product-variants/${variantId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to delete variant');
      }

      const result = await response.json();
      
      if (result.success) {
        // Remove from local state
        setVariants(prevVariants => prevVariants.filter(variant => variant.id !== variantId));
        
        toast.success('Variante eliminata con successo');
        console.log('✅ [useProductVariants] Variant deleted successfully:', variantId);
        return true;
      } else {
        throw new Error('Nessuna variante eliminata');
      }
    } catch (error) {
      console.error('❌ [useProductVariants] Error deleting variant:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante l\'eliminazione della variante');
      return false;
    }
  }, []);

  // 🗑️ Delete multiple variants function
  const deleteVariants = useCallback(async (variantIds: string[]): Promise<boolean> => {
    try {
      console.log('🗑️ [useProductVariants] Deleting multiple variants:', variantIds.length);
      
      const response = await fetch('/api/product-variants', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ variantIds }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to delete variants');
      }

      const result = await response.json();
      
      if (result.success) {
        // Remove from local state
        setVariants(prevVariants => prevVariants.filter(variant => !variantIds.includes(variant.id)));
        
        toast.success(`${variantIds.length} varianti eliminate con successo`);
        console.log('✅ [useProductVariants] Variants deleted successfully:', variantIds.length);
        return true;
      } else {
        throw new Error('Nessuna variante eliminata');
      }
    } catch (error) {
      console.error('❌ [useProductVariants] Error deleting variants:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante l\'eliminazione delle varianti');
      return false;
    }
  }, []);

  // 🔍 Filter variants by product
  const variantsByProductId = useCallback((targetProductId: string) => {
    return variants.filter(variant => 
      variant.ID_Prodotto?.includes(targetProductId)
    );
  }, [variants]);

  // 🔍 Filter variants by type
  const variantsByType = useCallback((targetType: VariantType) => {
    return variants.filter(variant => 
      variant.Tipo_Variante === targetType
    );
  }, [variants]);

  // 🔍 Get only active variants
  const activeVariants = useCallback(() => {
    return variants.filter(variant => variant.Attivo);
  }, [variants]);

  // 🔍 Get variant by ID
  const getVariantById = useCallback((variantId: string) => {
    return variants.find(variant => variant.id === variantId);
  }, [variants]);

  return {
    variants,
    loading,
    error,
    createVariant,
    updateVariant,
    deleteVariant,
    deleteVariants,
    variantsByProductId,
    variantsByType,
    activeVariants,
    refresh,
    getVariantById,
  };
}