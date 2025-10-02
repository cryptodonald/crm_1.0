import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { 
  UseProductConfiguratorReturn,
  FlatProduct,
  FlatProductVariant,
  OrderItemData,
  VariantType
} from '@/types/products';
import { useProductsList } from './use-products-list';
import { useProductVariants } from './use-product-variants';

interface UseProductConfiguratorProps {
  productId?: string;
  enabled?: boolean;
}

export function useProductConfigurator({
  productId,
  enabled = true
}: UseProductConfiguratorProps = {}): UseProductConfiguratorReturn {
  
  // Local state
  const [selectedVariants, setSelectedVariants] = useState<FlatProductVariant[]>([]);
  const [quantity, setQuantity] = useState(1);

  // Load product and variants
  const { products, loading: productsLoading } = useProductsList({
    enabled: enabled && !!productId,
    filters: { search: productId }
  });

  const { variants, loading: variantsLoading } = useProductVariants({
    productId,
    activeOnly: true,
    enabled: enabled && !!productId
  });

  // Get current product
  const product = useMemo(() => {
    if (!productId || !products.length) return null;
    return products.find(p => p.id === productId) || null;
  }, [productId, products]);

  // 🔧 Product selection
  const selectProduct = useCallback(async (newProductId: string) => {
    if (newProductId !== productId) {
      // Reset selected variants when changing product
      setSelectedVariants([]);
      // Set new product ID
      // Note: The product will be loaded via the useProductsList hook
    }
  }, [productId]);

  // ⭐ Variant operations
  const addVariant = useCallback((variantId: string) => {
    const variant = variants.find(v => v.id === variantId);
    if (variant) {
      setSelectedVariants(prev => {
        // Check if variant of same type already exists
        const existingIndex = prev.findIndex(v => v.Tipo_Variante === variant.Tipo_Variante);
        if (existingIndex >= 0) {
          // Replace existing variant of same type
          const newVariants = [...prev];
          newVariants[existingIndex] = variant;
          return newVariants;
        }
        // Add new variant
        return [...prev, variant];
      });
    }
  }, [variants]);

  const removeVariant = useCallback((variantId: string) => {
    setSelectedVariants(prev => prev.filter(v => v.id !== variantId));
  }, []);

  const clearVariants = useCallback(() => {
    setSelectedVariants([]);
  }, []);

  // Price calculations
  const calculations = useMemo(() => {
    if (!product) {
      return {
        basePrice: 0,
        variantsPrice: 0,
        totalPrice: 0,
        totalCost: 0,
        margine: 0
      };
    }

    // Base price and cost
    const basePrice = product.Prezzo_Listino_Attuale || 0;
    const baseCost = product.Costo_Attuale || 0;

    // Variants price and cost
    const variantsPrice = selectedVariants.reduce((sum, variant) => 
      sum + (variant.Prezzo_Aggiuntivo_Attuale || 0), 0);
    
    const variantsCost = selectedVariants.reduce((sum, variant) => 
      sum + (variant.Costo_Aggiuntivo_Attuale || 0), 0);

    // Totals
    const totalPrice = (basePrice + variantsPrice) * quantity;
    const totalCost = (baseCost + variantsCost) * quantity;
    
    // Margine in percentage
    const margine = totalPrice > 0 
      ? ((totalPrice - totalCost) / totalPrice) * 100 
      : 0;

    return {
      basePrice,
      variantsPrice,
      totalPrice,
      totalCost,
      margine
    };
  }, [product, selectedVariants, quantity]);

  // 📝 Generate order item data
  const generateOrderItem = useCallback((): OrderItemData => {
    if (!product || !productId) {
      throw new Error('No product selected');
    }

    // Generate configuration code
    const variantCodes = selectedVariants
      .sort((a, b) => (a.Tipo_Variante || '').localeCompare(b.Tipo_Variante || ''))
      .map(v => v.Codice_Variante)
      .filter(Boolean);

    const configCode = [product.Codice_Matrice, ...variantCodes].join('-');

    // Build configuration JSON
    const configJSON = {
      productId,
      basePrice: calculations.basePrice,
      variants: selectedVariants.map(v => ({
        id: v.id,
        type: v.Tipo_Variante,
        code: v.Codice_Variante,
        name: v.Nome_Variante,
        price: v.Prezzo_Aggiuntivo_Attuale || 0
      })),
      totalPrice: calculations.totalPrice / quantity, // Per unit
      totalCost: calculations.totalCost / quantity, // Per unit
      quantity
    };

    // Build name with main variants
    const mainVariants = selectedVariants
      .filter(v => ['Dimensione', 'Taglia'].includes(v.Tipo_Variante || ''))
      .map(v => v.Nome_Variante)
      .join(' ');

    const customName = mainVariants 
      ? `${product.Nome_Prodotto} ${mainVariants}`
      : product.Nome_Prodotto;

    return {
      ID_Ordine: [], // Will be set by order system
      ID_Prodotto: [productId],
      Configurazione_Varianti: selectedVariants.map(v => v.id),
      Quantita: quantity,
      Prezzo_Unitario: calculations.basePrice,
      Costo_Unitario: calculations.totalCost / quantity,
      Prezzo_Finale_Unitario: calculations.totalPrice / quantity,
      Totale_Riga: calculations.totalPrice,
      Configurazione_JSON: JSON.stringify(configJSON),
      Codice_Prodotto_Configurato: configCode,
      Nome_Prodotto_Personalizzato: customName
    };
  }, [product, productId, selectedVariants, quantity, calculations]);

  // 📊 Generate configuration JSON string
  const generateConfigurationJSON = useCallback(() => {
    return JSON.stringify({
      product: product ? {
        id: product.id,
        code: product.Codice_Matrice,
        name: product.Nome_Prodotto
      } : null,
      variants: selectedVariants.map(v => ({
        id: v.id,
        type: v.Tipo_Variante,
        code: v.Codice_Variante,
        name: v.Nome_Variante
      })),
      price: {
        base: calculations.basePrice,
        variants: calculations.variantsPrice,
        total: calculations.totalPrice
      },
      quantity
    }, null, 2);
  }, [product, selectedVariants, calculations, quantity]);

  // Group variants by type for UI
  const variantsByType = useMemo(() => {
    const groups: Record<VariantType, FlatProductVariant[]> = {} as any;
    variants.forEach(variant => {
      const type = variant.Tipo_Variante;
      if (type) {
        if (!groups[type]) {
          groups[type] = [];
        }
        groups[type].push(variant);
      }
    });
    return groups;
  }, [variants]);

  return {
    product,
    selectedVariants,
    totalPrice: calculations.totalPrice,
    totalCost: calculations.totalCost,
    margine: calculations.margine,
    loading: productsLoading || variantsLoading,
    selectProduct,
    addVariant,
    removeVariant,
    clearVariants,
    setQuantity,
    generateOrderItem,
    generateConfigurationJSON,
    variantsByType
  };
}