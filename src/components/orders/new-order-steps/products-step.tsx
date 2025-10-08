'use client';

import React, { useState, useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import Link from 'next/link';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { FormMessageSubtle } from '@/components/ui/form-message-subtle';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Package, 
  Plus, 
  Trash2, 
  ChevronDown, 
  Check, 
  X, 
  Loader2,
  Euro,
  ShoppingBag,
  Settings,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrderFormData } from '../new-order-modal';
import { useProducts } from '@/hooks/use-products';
import { useLeadsData } from '@/hooks/use-leads-data';
import { useUsers } from '@/hooks/use-users';
import { FlatProduct, FlatProductVariant, PRODUCT_CATEGORIES } from '@/types/products';
import { LeadData } from '@/types/leads';
import { AvatarLead } from '@/components/ui/avatar-lead';

interface ProductsStepProps {
  form: UseFormReturn<OrderFormData>;
}

// Extended order item with product reference
interface ExtendedOrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  discount_amount?: number;
  total: number;
  // Add product reference for easier access
  product?: FlatProduct;
  selectedVariants?: FlatProductVariant[];
  configuration?: {
    [key: string]: any;
  };
}


export function ProductsStep({ form }: ProductsStepProps) {
  // ===== STATO PRODUCTS SELECTOR =====
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showProductSelector, setShowProductSelector] = useState(false);
  
  // ===== HOOKS SERVIZI =====
  const { products, variants, loading: productsLoading } = useProducts();
  
  // ===== LOGICA PRODOTTI =====
  const items = form.watch('items') || [];
  
  // Filtra prodotti client-side (simile al customer selector)
  const filteredProducts = productSearchQuery.length > 0 
    ? products.filter(product =>
        product.Nome_Prodotto?.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
        product.Codice_Matrice?.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
        product.Categoria?.toLowerCase().includes(productSearchQuery.toLowerCase())
      ).slice(0, 15) // Limita a 15 risultati quando si cerca
    : products.filter(product => product.Attivo !== false).slice(0, 20); // Mostra primi 20 prodotti attivi

  const handleProductSelect = (product: FlatProduct) => {
    const currentItems = form.getValues('items') || [];
    
    // Controlla se il prodotto è già stato aggiunto
    const existingItemIndex = currentItems.findIndex(item => item.product_id === product.id);
    
    if (existingItemIndex >= 0) {
      // Se esiste già, aumenta la quantità
      const updatedItems = [...currentItems];
      updatedItems[existingItemIndex].quantity += 1;
      updatedItems[existingItemIndex].total = 
        updatedItems[existingItemIndex].quantity * updatedItems[existingItemIndex].unit_price;
      form.setValue('items', updatedItems);
    } else {
      // Altrimenti aggiungi nuovo item
      const newItem = {
        product_id: product.id,
        product_name: product.Nome_Prodotto || 'Prodotto senza nome',
        quantity: 1,
        unit_price: product.Prezzo_Listino_Attuale || 0,
        discount_percentage: 0,
        total: product.Prezzo_Listino_Attuale || 0,
      };
      form.setValue('items', [...currentItems, newItem]);
    }
    
    setShowProductSelector(false);
    setProductSearchQuery('');
  };

  const removeItem = (index: number) => {
    const currentItems = form.getValues('items') || [];
    form.setValue('items', currentItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const currentItems = form.getValues('items') || [];
    const updatedItems = [...currentItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // Calcola totale quando cambiano quantità, prezzo o sconto percentuale
    if (['quantity', 'unit_price', 'discount_percentage'].includes(field)) {
      const item = updatedItems[index];
      const baseAmount = item.quantity * item.unit_price;
      
      // Calcola sconto solo percentuale
      const discountAmount = item.discount_percentage && item.discount_percentage > 0 
        ? baseAmount * (item.discount_percentage / 100) 
        : 0;
      
      // Il totale è l'importo base meno lo sconto
      updatedItems[index].total = Math.max(0, baseAmount - discountAmount);
    }
    
    form.setValue('items', updatedItems);
  };
  
  // Calcola totali
  const subtotalBeforeDiscount = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  const totalDiscounts = items.reduce((sum, item) => {
    const baseAmount = item.quantity * item.unit_price;
    const discountAmount = item.discount_percentage && item.discount_percentage > 0 
      ? baseAmount * (item.discount_percentage / 100) 
      : 0;
    return sum + discountAmount;
  }, 0);
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  
  // Totale finale senza abbuono
  const finalTotal = subtotal;
  
  // Hook per caricare gli utenti (venditori) - utilizzando hook reale
  const { users, loading: usersLoading } = useUsers();
  const [sellerOpen, setSellerOpen] = useState(false);
  
  // Watch per valore selezionato venditore
  const selectedSellerId = form.watch('seller_id');
  
  // Convert users object to array (come nel lead qualificazione-step)
  const usersArray = users ? Object.values(users) : [];
  
  const handleSellerSelect = (userId: string) => {
    form.setValue('seller_id', userId);
    setSellerOpen(false);
  };
  
  const removeSeller = () => {
    form.setValue('seller_id', undefined);
  };
  
  const selectedSellerUser = selectedSellerId 
    ? usersArray.find(user => user.id === selectedSellerId) 
    : null;

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <div className="space-y-6">
          {/* Venditore Assegnato - Prima sezione */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-base font-medium">Venditore Assegnato</h4>
              <p className="text-sm text-muted-foreground">
                Seleziona il venditore responsabile di questo ordine.
              </p>
            </div>
            
            <FormField
              control={form.control}
              name="seller_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    Venditore
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Popover open={sellerOpen} onOpenChange={setSellerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between h-auto py-3"
                        >
                          <div className="flex items-center gap-3">
                            {selectedSellerUser ? (
                              <>
                                <AvatarLead
                                  nome={selectedSellerUser.nome}
                                  customAvatar={selectedSellerUser.avatar}
                                  isAdmin={selectedSellerUser.ruolo === 'Admin'}
                                  size="sm"
                                  showTooltip={false}
                                />
                                <div className="text-left">
                                  <div className="font-medium text-sm">{selectedSellerUser.nome}</div>
                                  <div className="text-xs text-muted-foreground">{selectedSellerUser.ruolo}</div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="text-left">
                                  <div className="text-muted-foreground text-sm">Seleziona venditore</div>
                                  <div className="text-xs text-muted-foreground">Obbligatorio per l'ordine</div>
                                </div>
                              </>
                            )}
                          </div>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full min-w-[320px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Cerca utente..." />
                          <CommandList>
                            <CommandEmpty>
                              {usersLoading ? "Caricamento utenti..." : "Nessun utente trovato."}
                            </CommandEmpty>
                            {!usersLoading && (
                              <CommandGroup>
                                {usersArray.map((user) => (
                                  <CommandItem
                                    key={user.id}
                                    onSelect={() => handleSellerSelect(user.id)}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex items-center gap-3 w-full">
                                      <AvatarLead
                                        nome={user.nome}
                                        customAvatar={user.avatar}
                                        isAdmin={user.ruolo === 'Admin'}
                                        size="md"
                                        showTooltip={false}
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-sm truncate">{user.nome}</span>
                                          <Badge variant="outline" className="text-xs">{user.ruolo}</Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                          {user.telefono || user.email || 'Nessun contatto'}
                                        </div>
                                      </div>
                                      <Check
                                        className={cn(
                                          "h-4 w-4 flex-shrink-0",
                                          selectedSellerId === user.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessageSubtle />
                </FormItem>
              )}
            />
          </div>
          
          {/* Product Selector */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-base font-medium">Selezione Prodotti</h4>
              <p className="text-sm text-muted-foreground">
                Aggiungi i prodotti all'ordine e configura prezzi e sconti.
              </p>
            </div>
            
            <FormField
              control={form.control}
              name="items"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    Prodotti Ordine
                    <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Popover open={showProductSelector} onOpenChange={setShowProductSelector}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {items.length > 0 
                                ? `${items.length} prodott${items.length > 1 ? 'i' : 'o'} (${totalItems} pz.)`
                                : "Aggiungi prodotti all'ordine"
                              }
                            </span>
                          </div>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full min-w-[500px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Cerca prodotto per nome, codice o categoria..."
                            value={productSearchQuery}
                            onValueChange={setProductSearchQuery}
                          />
                          <CommandList>
                            {productsLoading && (
                              <div className="flex items-center justify-center p-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="ml-2 text-sm text-muted-foreground">
                                  Caricamento prodotti...
                                </span>
                              </div>
                            )}
                            
                            {!productsLoading && filteredProducts.length === 0 && (
                              <CommandEmpty>
                                {productSearchQuery.length > 0 ? 'Nessun prodotto trovato.' : 'Nessun prodotto disponibile.'}
                              </CommandEmpty>
                            )}
                            
                            {!productsLoading && filteredProducts.length > 0 && (
                              <CommandGroup>
                                {filteredProducts.map((product) => (
                                  <CommandItem
                                    key={product.id}
                                    onSelect={() => handleProductSelect(product)}
                                    className="cursor-pointer p-3"
                                  >
                                    <div className="flex items-center gap-3 w-full">
                                      {/* Product Icon */}
                                      <div className="flex-shrink-0 w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                                        <Package className="h-5 w-5 text-muted-foreground" />
                                      </div>
                                      
                                      {/* Product Info */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="font-medium text-sm truncate">{product.Nome_Prodotto}</span>
                                          {product.Categoria && (
                                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                                              {product.Categoria}
                                            </Badge>
                                          )}
                                          {product.In_Evidenza && (
                                            <Badge className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800">
                                              In Evidenza
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                          Codice: {product.Codice_Matrice}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                          Prezzo: {product.Prezzo_Listino_Attuale ? `€${product.Prezzo_Listino_Attuale.toFixed(2)}` : 'Non definito'}
                                        </div>
                                      </div>
                                      
                                      <div className="flex-shrink-0">
                                        <Plus className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </FormControl>
                  <FormMessageSubtle />
                </FormItem>
              )}
            />
          </div>
          
          {/* Selected Products Table */}
          {items.length > 0 && (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                          Prodotto
                        </th>
                        <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 w-20">
                          Qta
                        </th>
                        <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 w-32">
                          Prezzo Unit.
                        </th>
                        <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 w-24">
                          Sconto %
                        </th>
                        <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 w-32">
                          Totale
                        </th>
                        <th className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 w-16">
                          Azioni
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map((item, index) => {
                        const product = products.find(p => p.id === item.product_id);
                        return (
                          <tr key={index} className="hover:bg-muted/20 transition-colors">
                            {/* Product Info */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-md flex items-center justify-center">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm truncate">{item.product_name}</span>
                                    {product?.Categoria && (
                                      <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5">
                                        {product.Categoria}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Codice: {product?.Codice_Matrice || 'N/A'}
                                  </div>
                                  {product && variants.some(v => v.ID_Prodotto?.includes(product.id)) && (
                                    <div className="mt-1">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-6 px-2"
                                        disabled
                                      >
                                        <Settings className="mr-1 h-2.5 w-2.5" />
                                        Varianti
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            
                            {/* Quantity */}
                            <td className="px-4 py-3 text-center">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                className="h-8 w-16 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </td>
                            
                            {/* Unit Price */}
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-xs text-muted-foreground">€</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unit_price}
                                  onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                  className="h-8 w-20 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                              </div>
                            </td>
                            
                            {/* Discount - Solo percentuale */}
                            <td className="px-2 py-3 text-center">
                              <div className="flex items-center justify-center">
                                <div className="flex items-center gap-0.5">
                                  <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={item.discount_percentage || 0}
                                    onChange={(e) => updateItem(index, 'discount_percentage', parseFloat(e.target.value) || 0)}
                                    className="h-8 w-16 text-center text-xs border-r-0 rounded-r-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    placeholder="0"
                                  />
                                  <div className="h-8 px-2 bg-muted border border-l-0 rounded-r-md flex items-center text-xs text-muted-foreground">
                                    %
                                  </div>
                                </div>
                              </div>
                            </td>
                            
                            {/* Total */}
                            <td className="px-4 py-3 text-right">
                              <div className="font-medium">
                                €{item.total.toFixed(2)}
                              </div>
                            </td>
                            
                            {/* Actions */}
                            <td className="px-4 py-3 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {/* Empty State */}
          {items.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingBag className="mx-auto h-16 w-16 mb-4 opacity-50" />
              <h4 className="font-medium text-lg mb-2">Nessun prodotto selezionato</h4>
              <p className="text-sm mb-6">
                Seleziona i prodotti dal catalogo per iniziare a creare l'ordine.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowProductSelector(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Sfoglia Prodotti
              </Button>
            </div>
          )}
          
          {/* Order Summary - Solo totali */}
          {items.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-base font-medium">Riepilogo Totali</h4>
                <p className="text-sm text-muted-foreground">
                  Verifica i calcoli e il totale finale dell'ordine.
                </p>
              </div>
              
              {/* Totali - Sezione unificata */}
              <div className="space-y-4 p-4 bg-muted/20 rounded-lg border-2 border-dashed border-muted">
                <div className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Calcolo Totali</div>
                  
                  {/* Dettagli importi */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground text-sm">Importo prodotti:</span>
                      <span className="font-medium text-sm">€{subtotalBeforeDiscount.toFixed(2)}</span>
                    </div>
                    
                    {totalDiscounts > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground text-sm">Sconti applicati:</span>
                        <span className="font-medium text-green-600 text-sm">-€{totalDiscounts.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-medium text-sm">Subtotale:</span>
                      <span className="font-semibold text-sm">€{subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  {/* Totale finale */}
                  <div className="pt-4 border-t-2 border-primary/20">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Totale Finale:</span>
                      <span className="text-2xl font-bold text-primary">€{finalTotal.toFixed(2)}</span>
                    </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
