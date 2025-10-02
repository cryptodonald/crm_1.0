'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useProductsList } from '@/hooks/use-products-list';
import { useProductVariants } from '@/hooks/use-product-variants';
import { 
  VARIANT_TYPES, 
  VARIANT_POSITIONS, 
  CreateProductVariantForm, 
  FlatProductVariant,
  VariantType,
  VariantPosition 
} from '@/types/products';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Settings,
  Palette,
  Maximize,
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

export default function ProductVariantsPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  
  const [isCreating, setIsCreating] = useState(false);
  const [editingVariant, setEditingVariant] = useState<FlatProductVariant | null>(null);

  // Get product info
  const { products } = useProductsList();
  const currentProduct = products.find(p => p.id === productId);
  const productName = currentProduct?.Nome_Prodotto || 'Prodotto';

  // Get variants for this product
  const { 
    variants, 
    loading, 
    createVariant, 
    updateVariant, 
    deleteVariant,
    refresh
  } = useProductVariants({ 
    productId,
    enabled: true 
  });

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Group variants by type
  const variantsByType = variants.reduce((groups, variant) => {
    const type = variant.Tipo_Variante || 'Accessorio';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(variant);
    return groups;
  }, {} as Record<VariantType, FlatProductVariant[]>);

  // Handle delete variant
  const handleDeleteVariant = async (variantId: string, variantName: string) => {
    if (confirm(`Sei sicuro di voler eliminare la variante "${variantName}"?`)) {
      const success = await deleteVariant(variantId);
      if (success) {
        toast.success('Variante eliminata con successo');
      }
    }
  };

  if (!currentProduct) {
    return (
      <AppLayoutCustom>
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <PageBreadcrumb 
            pageName="Prodotto non trovato" 
            items={[
              { label: 'Prodotti', href: '/products' },
              { label: 'Gestione Varianti' }
            ]}
          />
          <div className="px-4 lg:px-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Il prodotto richiesto non è stato trovato.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </AppLayoutCustom>
    );
  }

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb 
          pageName="Gestione Varianti" 
          items={[
            { label: 'Prodotti', href: '/products' },
            { label: productName, href: `/products/${productId}` },
            { label: 'Varianti' }
          ]}
        />

        <div className="px-4 lg:px-6">
          <div className="space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                  Varianti di {productName}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Gestisci le varianti configurabili per questo prodotto
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button variant="outline" asChild>
                  <Link href="/products">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Torna ai Prodotti
                  </Link>
                </Button>
                
                {variants.length > 0 && (
                  <Button variant="outline" asChild>
                    <Link href={`/products/${productId}/configure`}>
                      <Settings className="mr-2 h-4 w-4" />
                      Configuratore
                    </Link>
                  </Button>
                )}
                
                <CreateVariantDialog 
                  productId={productId}
                  productName={productName}
                  onSuccess={refresh}
                />
              </div>
            </div>

            {/* Product Info Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    {currentProduct.URL_Immagine_Principale ? (
                      <img 
                        src={currentProduct.URL_Immagine_Principale} 
                        alt={currentProduct.Nome_Prodotto} 
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <Package className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">{currentProduct.Nome_Prodotto}</h2>
                    <p className="text-muted-foreground text-sm">
                      Codice: {currentProduct.Codice_Matrice}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Prezzo base: {formatCurrency(currentProduct.Prezzo_Listino_Attuale || 0)}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <Badge variant={currentProduct.Attivo ? "default" : "secondary"}>
                      {currentProduct.Attivo ? 'Attivo' : 'Inattivo'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Variants by Type */}
            {VARIANT_TYPES.map(variantType => {
              const typeVariants = variantsByType[variantType] || [];
              const IconComponent = VARIANT_TYPE_ICONS[variantType];
              
              return (
                <Card key={variantType}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center">
                        <IconComponent className="mr-2 h-5 w-5" />
                        {variantType}
                        <Badge className="ml-2" variant="outline">
                          {typeVariants.length}
                        </Badge>
                      </div>
                      <CreateVariantDialog 
                        productId={productId}
                        productName={productName}
                        defaultType={variantType}
                        onSuccess={refresh}
                        trigger={
                          <Button size="sm" variant="outline">
                            <Plus className="mr-1 h-3 w-3" />
                            Aggiungi {variantType}
                          </Button>
                        }
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {typeVariants.length > 0 ? (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {typeVariants.map(variant => (
                          <div
                            key={variant.id}
                            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm truncate">
                                  {variant.Nome_Variante}
                                </h4>
                                {variant.Codice_Variante && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {variant.Codice_Variante}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center space-x-1">
                                <Badge 
                                  className={cn("text-xs", VARIANT_TYPE_COLORS[variant.Tipo_Variante || 'Accessorio'])}
                                >
                                  {variant.Attivo ? 'Attivo' : 'Inattivo'}
                                </Badge>
                              </div>
                            </div>
                            
                            {variant.Prezzo_Aggiuntivo_Attuale && variant.Prezzo_Aggiuntivo_Attuale !== 0 && (
                              <div className="mb-3">
                                <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                                  +{formatCurrency(variant.Prezzo_Aggiuntivo_Attuale)}
                                </p>
                              </div>
                            )}
                            
                            {variant.Posizione && variant.Posizione !== 'Nessuna' && (
                              <div className="mb-3">
                                <Badge variant="secondary" className="text-xs">
                                  {variant.Posizione}
                                </Badge>
                              </div>
                            )}
                            
                            {variant.Obbligatorio && (
                              <div className="mb-3">
                                <Badge variant="destructive" className="text-xs">
                                  Obbligatorio
                                </Badge>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between pt-3 border-t">
                              <div className="flex items-center space-x-1">
                                <EditVariantDialog 
                                  variant={variant}
                                  productName={productName}
                                  onSuccess={refresh}
                                  trigger={
                                    <Button size="sm" variant="ghost">
                                      <Edit className="h-3 w-3" />
                                    </Button>
                                  }
                                />
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteVariant(variant.id, variant.Nome_Variante)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <IconComponent className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">
                          Nessuna variante di tipo "{variantType}" configurata
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* Empty State */}
            {variants.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nessuna Variante Configurata</h3>
                  <p className="text-muted-foreground mb-4">
                    Inizia aggiungendo varianti per rendere questo prodotto configurabile
                  </p>
                  <CreateVariantDialog 
                    productId={productId}
                    productName={productName}
                    onSuccess={refresh}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  );
}

// Create Variant Dialog Component
function CreateVariantDialog({ 
  productId, 
  productName, 
  defaultType,
  onSuccess,
  trigger 
}: {
  productId: string;
  productName: string;
  defaultType?: VariantType;
  onSuccess: () => void;
  trigger?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateProductVariantForm>({
    Nome_Variante: '',
    ID_Prodotto: [productId],
    Tipo_Variante: defaultType || 'Dimensione',
    Codice_Variante: '',
    Prezzo_Aggiuntivo_Attuale: 0,
    Costo_Aggiuntivo_Attuale: 0,
    Posizione: 'Nessuna',
    Obbligatorio: false,
    Attivo: true,
  });

  const { createVariant } = useProductVariants();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const success = await createVariant(formData);
      if (success) {
        setIsOpen(false);
        setFormData({
          Nome_Variante: '',
          ID_Prodotto: [productId],
          Tipo_Variante: defaultType || 'Dimensione',
          Codice_Variante: '',
          Prezzo_Aggiuntivo_Attuale: 0,
          Costo_Aggiuntivo_Attuale: 0,
          Posizione: 'Nessuna',
          Obbligatorio: false,
          Attivo: true,
        });
        onSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button>
      <Plus className="mr-2 h-4 w-4" />
      Nuova Variante
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Nuova Variante per {productName}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Variante *</Label>
              <Input
                id="nome"
                value={formData.Nome_Variante}
                onChange={(e) => setFormData(prev => ({ ...prev, Nome_Variante: e.target.value }))}
                placeholder="es. Dimensione XL"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codice">Codice Variante</Label>
              <Input
                id="codice"
                value={formData.Codice_Variante}
                onChange={(e) => setFormData(prev => ({ ...prev, Codice_Variante: e.target.value }))}
                placeholder="es. XL"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo Variante</Label>
              <Select
                value={formData.Tipo_Variante}
                onValueChange={(value: VariantType) => setFormData(prev => ({ ...prev, Tipo_Variante: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona tipo" />
                </SelectTrigger>
                <SelectContent>
                  {VARIANT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="posizione">Posizione</Label>
              <Select
                value={formData.Posizione}
                onValueChange={(value: VariantPosition) => setFormData(prev => ({ ...prev, Posizione: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona posizione" />
                </SelectTrigger>
                <SelectContent>
                  {VARIANT_POSITIONS.map((position) => (
                    <SelectItem key={position} value={position}>
                      {position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prezzo">Prezzo Aggiuntivo (€)</Label>
              <Input
                id="prezzo"
                type="number"
                min="0"
                step="0.01"
                value={formData.Prezzo_Aggiuntivo_Attuale || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  Prezzo_Aggiuntivo_Attuale: e.target.value ? parseFloat(e.target.value) : 0
                }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costo">Costo Aggiuntivo (€)</Label>
              <Input
                id="costo"
                type="number"
                min="0"
                step="0.01"
                value={formData.Costo_Aggiuntivo_Attuale || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  Costo_Aggiuntivo_Attuale: e.target.value ? parseFloat(e.target.value) : 0
                }))}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="obbligatorio"
                checked={formData.Obbligatorio}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, Obbligatorio: checked }))}
              />
              <Label htmlFor="obbligatorio">Obbligatorio</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="attivo"
                checked={formData.Attivo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, Attivo: checked }))}
              />
              <Label htmlFor="attivo">Attivo</Label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creazione...' : 'Crea Variante'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Variant Dialog Component
function EditVariantDialog({ 
  variant, 
  productName, 
  onSuccess, 
  trigger 
}: {
  variant: FlatProductVariant;
  productName: string;
  onSuccess: () => void;
  trigger: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    Nome_Variante: variant.Nome_Variante,
    ID_Prodotto: variant.ID_Prodotto || [],
    Tipo_Variante: variant.Tipo_Variante || 'Dimensione' as VariantType,
    Codice_Variante: variant.Codice_Variante || '',
    Prezzo_Aggiuntivo_Attuale: variant.Prezzo_Aggiuntivo_Attuale || 0,
    Costo_Aggiuntivo_Attuale: variant.Costo_Aggiuntivo_Attuale || 0,
    Posizione: variant.Posizione || 'Nessuna' as VariantPosition,
    Obbligatorio: variant.Obbligatorio || false,
    Attivo: variant.Attivo || true,
  });

  const { updateVariant } = useProductVariants();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const success = await updateVariant(variant.id, formData);
      if (success) {
        setIsOpen(false);
        onSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Modifica Variante: {variant.Nome_Variante}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Variante *</Label>
              <Input
                id="nome"
                value={formData.Nome_Variante}
                onChange={(e) => setFormData(prev => ({ ...prev, Nome_Variante: e.target.value }))}
                placeholder="es. Dimensione XL"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codice">Codice Variante</Label>
              <Input
                id="codice"
                value={formData.Codice_Variante}
                onChange={(e) => setFormData(prev => ({ ...prev, Codice_Variante: e.target.value }))}
                placeholder="es. XL"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo Variante</Label>
              <Select
                value={formData.Tipo_Variante}
                onValueChange={(value: VariantType) => setFormData(prev => ({ ...prev, Tipo_Variante: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona tipo" />
                </SelectTrigger>
                <SelectContent>
                  {VARIANT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="posizione">Posizione</Label>
              <Select
                value={formData.Posizione}
                onValueChange={(value: VariantPosition) => setFormData(prev => ({ ...prev, Posizione: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona posizione" />
                </SelectTrigger>
                <SelectContent>
                  {VARIANT_POSITIONS.map((position) => (
                    <SelectItem key={position} value={position}>
                      {position}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="prezzo">Prezzo Aggiuntivo (€)</Label>
              <Input
                id="prezzo"
                type="number"
                min="0"
                step="0.01"
                value={formData.Prezzo_Aggiuntivo_Attuale || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  Prezzo_Aggiuntivo_Attuale: e.target.value ? parseFloat(e.target.value) : 0
                }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="costo">Costo Aggiuntivo (€)</Label>
              <Input
                id="costo"
                type="number"
                min="0"
                step="0.01"
                value={formData.Costo_Aggiuntivo_Attuale || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  Costo_Aggiuntivo_Attuale: e.target.value ? parseFloat(e.target.value) : 0
                }))}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="obbligatorio"
                checked={formData.Obbligatorio}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, Obbligatorio: checked }))}
              />
              <Label htmlFor="obbligatorio">Obbligatorio</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="attivo"
                checked={formData.Attivo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, Attivo: checked }))}
              />
              <Label htmlFor="attivo">Attivo</Label>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvataggio...' : 'Salva Modifiche'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}