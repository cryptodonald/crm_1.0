'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useProductConfigurator } from '@/hooks/use-product-configurator';
import { useProductsList } from '@/hooks/use-products-list';
import { VARIANT_TYPES, VariantType } from '@/types/products';
import {
  Package,
  Plus,
  Minus,
  X,
  ArrowLeft,
  ShoppingCart,
  Calculator,
  Palette,
  Maximize,
  Star,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';

const VARIANT_TYPE_ICONS = {
  'Dimensione': Maximize,
  'Taglia': Maximize,
  'Topper': Plus,
  'Cover': Palette,
  'Accessorio': Package
};

const VARIANT_TYPE_COLORS = {
  'Dimensione': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Taglia': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'Topper': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Cover': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Accessorio': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
};

export default function ProductConfigurePage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  const [quantity, setQuantity] = useState(1);
  const [showConfiguration, setShowConfiguration] = useState(false);

  // Get product info for breadcrumb
  const { products } = useProductsList();
  const currentProduct = products.find(p => p.id === productId);
  const productName = currentProduct?.Nome_Prodotto || 'Prodotto';

  // Product configurator hook
  const {
    product,
    selectedVariants,
    totalPrice,
    totalCost,
    margine,
    loading,
    addVariant,
    removeVariant,
    clearVariants,
    generateOrderItem,
    generateConfigurationJSON,
    variantsByType
  } = useProductConfigurator({ productId });

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Handle quantity change
  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= 99) {
      setQuantity(newQuantity);
    }
  };

  // Handle add to cart (placeholder)
  const handleAddToCart = () => {
    try {
      const orderItem = generateOrderItem();
      console.log('Order item generated:', orderItem);
      toast.success('Configurazione pronta per l\'ordine!');
      // Here you would typically navigate to order creation or add to cart
      // router.push('/orders/new?productConfig=' + encodeURIComponent(JSON.stringify(orderItem)));
    } catch (error) {
      toast.error('Errore nella generazione della configurazione');
    }
  };

  // Loading state
  if (loading) {
    return (
      <AppLayoutCustom>
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="px-4 lg:px-6">
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground animate-pulse mb-4" />
                <p className="text-muted-foreground">Caricamento configuratore...</p>
              </div>
            </div>
          </div>
        </div>
      </AppLayoutCustom>
    );
  }

  // Product not found
  if (!product) {
    return (
      <AppLayoutCustom>
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <PageBreadcrumb 
            pageName="Prodotto non trovato" 
            items={[
              { label: 'Prodotti', href: '/products' },
              { label: 'Configuratore' }
            ]}
          />
          <div className="px-4 lg:px-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Il prodotto richiesto non è stato trovato o non ha varianti configurabili.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </AppLayoutCustom>
    );
  }

  const hasVariants = Object.keys(variantsByType).length > 0;

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb 
          pageName="Configuratore Prodotto" 
          items={[
            { label: 'Prodotti', href: '/products' },
            { label: productName, href: `/products/${productId}` },
            { label: 'Configuratore' }
          ]}
        />

        <div className="px-4 lg:px-6">
          <div className="grid gap-6 lg:grid-cols-3">
            
            {/* Product Info & Configuration */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Product Header */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        {product.URL_Immagine_Principale ? (
                          <img 
                            src={product.URL_Immagine_Principale} 
                            alt={product.Nome_Prodotto} 
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-blue-600 dark:text-blue-300" />
                        )}
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {product.Nome_Prodotto}
                        </h1>
                        <p className="text-muted-foreground">
                          Codice: {product.Codice_Matrice}
                        </p>
                        {product.Categoria && (
                          <Badge className="mt-2" variant="secondary">
                            {product.Categoria}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <Button variant="outline" asChild>
                      <Link href="/products">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Torna
                      </Link>
                    </Button>
                  </div>

                  {product.Descrizione && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        {product.Descrizione}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Variant Selection */}
              {hasVariants ? (
                <div className="space-y-4">
                  {VARIANT_TYPES.map(variantType => {
                    const variants = variantsByType[variantType] || [];
                    if (variants.length === 0) return null;

                    const IconComponent = VARIANT_TYPE_ICONS[variantType];
                    const selectedVariant = selectedVariants.find(v => v.Tipo_Variante === variantType);

                    return (
                      <Card key={variantType}>
                        <CardHeader>
                          <CardTitle className="flex items-center text-lg">
                            <IconComponent className="mr-2 h-5 w-5" />
                            {variantType}
                            {selectedVariant && (
                              <Badge className={cn("ml-2", VARIANT_TYPE_COLORS[variantType])}>
                                {selectedVariant.Nome_Variante}
                              </Badge>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {variants.map(variant => {
                              const isSelected = selectedVariants.some(v => v.id === variant.id);
                              const price = variant.Prezzo_Aggiuntivo_Attuale;
                              
                              return (
                                <div
                                  key={variant.id}
                                  className={cn(
                                    "border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md",
                                    isSelected 
                                      ? "border-primary bg-primary/5 ring-1 ring-primary/20" 
                                      : "border-border hover:border-primary/50"
                                  )}
                                  onClick={() => {
                                    if (isSelected) {
                                      removeVariant(variant.id);
                                    } else {
                                      addVariant(variant.id);
                                    }
                                  }}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-sm truncate">
                                        {variant.Nome_Variante}
                                      </h4>
                                      {variant.Codice_Variante && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {variant.Codice_Variante}
                                        </p>
                                      )}
                                      {price && price !== 0 && (
                                        <p className="text-sm font-semibold mt-2 text-green-600 dark:text-green-400">
                                          +{formatCurrency(price)}
                                        </p>
                                      )}
                                    </div>
                                    {isSelected && (
                                      <CheckCircle2 className="h-5 w-5 text-primary ml-2 flex-shrink-0" />
                                    )}
                                  </div>
                                  
                                  {variant.Obbligatorio && (
                                    <div className="mt-3 pt-3 border-t border-dashed">
                                      <Badge variant="destructive" className="text-xs">
                                        Obbligatorio
                                      </Badge>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nessuna variante disponibile</h3>
                    <p className="text-muted-foreground">
                      Questo prodotto non ha varianti configurabili.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Order Summary */}
            <div className="space-y-6">
              
              {/* Selected Variants Summary */}
              {selectedVariants.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-lg">
                      Configurazione Selezionata
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearVariants}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedVariants.map(variant => (
                      <div key={variant.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex items-center space-x-2">
                          <Badge className={cn("text-xs", VARIANT_TYPE_COLORS[variant.Tipo_Variante || 'Accessorio'])}>
                            {variant.Tipo_Variante}
                          </Badge>
                          <span className="text-sm font-medium">{variant.Nome_Variante}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {variant.Prezzo_Aggiuntivo_Attuale && variant.Prezzo_Aggiuntivo_Attuale !== 0 && (
                            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                              +{formatCurrency(variant.Prezzo_Aggiuntivo_Attuale)}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeVariant(variant.id)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Price Calculation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Calculator className="mr-2 h-5 w-5" />
                    Riepilogo Prezzi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  
                  {/* Quantity Selector */}
                  <div className="space-y-2">
                    <Label>Quantità</Label>
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(quantity - 1)}
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        min="1"
                        max="99"
                        value={quantity}
                        onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                        className="w-20 text-center"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuantityChange(quantity + 1)}
                        disabled={quantity >= 99}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Price Breakdown */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Prodotto base</span>
                      <span>{formatCurrency((product.Prezzo_Listino_Attuale || 0))}</span>
                    </div>
                    
                    {selectedVariants.map(variant => (
                      variant.Prezzo_Aggiuntivo_Attuale && variant.Prezzo_Aggiuntivo_Attuale !== 0 && (
                        <div key={variant.id} className="flex justify-between text-sm text-muted-foreground">
                          <span>+ {variant.Nome_Variante}</span>
                          <span>{formatCurrency(variant.Prezzo_Aggiuntivo_Attuale)}</span>
                        </div>
                      )
                    ))}
                    
                    <Separator />
                    
                    <div className="flex justify-between text-sm">
                      <span>Subtotale (per unità)</span>
                      <span className="font-semibold">
                        {formatCurrency((totalPrice / quantity) || 0)}
                      </span>
                    </div>
                    
                    {quantity > 1 && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Quantità × {quantity}</span>
                        <span>×{quantity}</span>
                      </div>
                    )}
                    
                    <Separator />
                    
                    <div className="flex justify-between text-lg font-bold">
                      <span>Totale</span>
                      <span className="text-primary">{formatCurrency(totalPrice * quantity)}</span>
                    </div>

                    {margine > 0 && (
                      <div className="text-xs text-muted-foreground text-center">
                        Margine: {margine.toFixed(1)}%
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button 
                      className="w-full" 
                      onClick={handleAddToCart}
                      disabled={!product}
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Aggiungi all'Ordine
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => setShowConfiguration(!showConfiguration)}
                    >
                      {showConfiguration ? 'Nascondi' : 'Mostra'} Configurazione JSON
                    </Button>
                  </div>
                  
                  {/* Configuration JSON */}
                  {showConfiguration && (
                    <div className="mt-4">
                      <Label className="text-xs">Configurazione JSON:</Label>
                      <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-40">
                        {generateConfigurationJSON()}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  );
}