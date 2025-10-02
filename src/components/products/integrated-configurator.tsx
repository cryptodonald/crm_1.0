'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  ProductStructure,
  VariantOption,
  generateProductCode,
  validateProductCode,
  PREDEFINED_STRUCTURES
} from '@/types/product-structures';
import {
  ArrowLeft,
  Settings,
  Code,
  Check,
  AlertTriangle,
  Copy,
  Save,
  DollarSign,
  TrendingUp,
  Building2,
  Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';
import { useProductStructures } from '@/hooks/use-product-structures';
import { useProductVariants } from '@/hooks/use-product-variants';

// Note: Now using real variants from Product_Variants table via useProductVariants hook

interface IntegratedConfiguratorProps {
  productData: any;
  uploadedFiles?: any;
  onComplete: (generatedCode: string, generatedName: string, variantConfiguration: any) => void;
  onBack: () => void;
  loading?: boolean;
}

export function IntegratedConfigurator({ 
  productData,
  uploadedFiles,
  onComplete, 
  onBack,
  loading: externalLoading = false,
}: IntegratedConfiguratorProps) {
  const { structures } = useProductStructures();
  const { variants } = useProductVariants({ activeOnly: true });
  const [selectedStructure, setSelectedStructure] = useState<ProductStructure | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [basePrice, setBasePrice] = useState<number>(productData.Prezzo_Listino_Attuale || 800);
  const [baseCost, setBaseCost] = useState<number>(productData.Costo_Attuale || 400);
  const [loading, setLoading] = useState(false);

  // Initialize structure from productData using real structures
  useEffect(() => {
    if (productData.structure_id && structures.length > 0) {
      const realStructure = structures.find(s => s.name === productData.structure_id);
      if (realStructure) {
        // Convert real structure to ProductStructure format
        const convertedStructure: ProductStructure = {
          id: realStructure.id,
          name: realStructure.name,
          display_name: realStructure.name,
          description: realStructure.description,
          fields: realStructure.fields || [],
          active: realStructure.active,
          created_at: realStructure.created_at,
          updated_at: realStructure.updated_at,
        };
        console.log('🏠️ [Configurator] Loaded structure:', convertedStructure.name, 'with', convertedStructure.fields.length, 'fields');
        setSelectedStructure(convertedStructure);
      }
    }
  }, [productData.structure_id, structures]);
  
  // Load existing configuration for editing
  useEffect(() => {
    if (productData.existing_configuration && selectedStructure) {
      const existingConfig = productData.existing_configuration;
      
      console.log('🔄 [Configurator] Loading existing configuration:', existingConfig);
      
      // Populate selected variants from existing configuration
      if (existingConfig.selected_variants) {
        setSelectedVariants(existingConfig.selected_variants);
        console.log('✅ [Configurator] Restored selected variants:', existingConfig.selected_variants);
      }
      
      // Restore pricing if available
      if (existingConfig.final_pricing) {
        if (existingConfig.final_pricing.totalPrice) {
          setBasePrice(existingConfig.final_pricing.totalPrice);
        }
        if (existingConfig.final_pricing.totalCost) {
          setBaseCost(existingConfig.final_pricing.totalCost);
        }
        console.log('✅ [Configurator] Restored pricing:', existingConfig.final_pricing);
      }
      
      toast.success('Configurazione esistente caricata!');
    }
  }, [productData.existing_configuration, selectedStructure]);

  // Generate product code
  const generatedCode = useMemo(() => {
    if (!selectedStructure) return '';
    return generateProductCode(selectedStructure, selectedVariants);
  }, [selectedStructure, selectedVariants]);
  
  // Generate compact product name: just model and dimensions  
  const generatedName = useMemo(() => {
    if (!selectedStructure) return '';
    
    let baseName = productData.Categoria || 'Prodotto';
    
    // Convert plural to singular for cleaner names
    if (baseName === 'Materassi') baseName = 'Materasso';
    if (baseName === 'Cuscini') baseName = 'Cuscino';
    
    const structureName = selectedStructure.name;
    
    // Extract dimensions only
    const dimensions: string[] = [];
    
    Object.entries(selectedVariants).forEach(([fieldId, variantCode]) => {
      const selectedVariant = variants.find(v => v.Codice_Variante === variantCode);
      if (!selectedVariant) return;
      
      const fieldIdLower = fieldId.toLowerCase();
      const variantName = selectedVariant.Nome_Variante || '';
      
      // Only extract dimensions for the name
      if (fieldIdLower.includes('larghezza') || fieldIdLower.includes('lunghezza')) {
        const match = variantName.match(/(\d+)\s*cm/);
        if (match) dimensions.push(match[1]);
      }
    });
    
    // Build compact name: "Categoria Struttura Dimensioni"
    let compactName = `${baseName} ${structureName}`;
    
    if (dimensions.length >= 2) {
      compactName += ` ${dimensions[0]}x${dimensions[1]}`;
    } else if (dimensions.length === 1) {
      compactName += ` ${dimensions[0]}cm`;
    }
    
    return compactName;
  }, [selectedStructure, selectedVariants, variants, productData.Categoria]);
  
  // Generate detailed description
  const generatedDescription = useMemo(() => {
    if (!selectedStructure) return '';
    
    let baseName = productData.Categoria || 'Prodotto';
    if (baseName === 'Materassi') baseName = 'Materasso';
    if (baseName === 'Cuscini') baseName = 'Cuscino';
    
    let description = `${baseName} strutturato con configurazione:\n`;
    
    // Group variants by type (skip dimensions as they're in the name)
    const details: string[] = [];
    
    Object.entries(selectedVariants).forEach(([fieldId, variantCode]) => {
      const selectedVariant = variants.find(v => v.Codice_Variante === variantCode);
      if (!selectedVariant) return;
      
      const fieldIdLower = fieldId.toLowerCase();
      const variantName = selectedVariant.Nome_Variante || '';
      
      // Skip dimensions (already in name)
      if (fieldIdLower.includes('larghezza') || fieldIdLower.includes('lunghezza')) {
        return;
      }
      
      // Add other details
      if (fieldIdLower.includes('taglia')) {
        const existingTaglie = details.find(d => d.startsWith('- Taglie:'));
        if (existingTaglie) {
          const index = details.indexOf(existingTaglie);
          details[index] = existingTaglie + ', ' + variantName;
        } else {
          details.push(`- Taglie: ${variantName}`);
        }
      } else if (fieldIdLower.includes('topper')) {
        details.push(`- Topper: ${variantName}`);
      } else if (fieldIdLower.includes('cover')) {
        details.push(`- Cover: ${variantName}`);
      } else {
        // Generic field
        const fieldLabel = fieldId.charAt(0).toUpperCase() + fieldId.slice(1).toLowerCase();
        details.push(`- ${fieldLabel}: ${variantName}`);
      }
    });
    
    if (details.length > 0) {
      description += details.join('\n');
    } else {
      description += '- Configurazione base';
    }
    
    return description;
  }, [selectedStructure, selectedVariants, variants, productData.Categoria]);

  // Calculate pricing
  const pricing = useMemo(() => {
    if (!selectedStructure) return { totalPrice: basePrice, totalCost: baseCost, margin: 0 };

    let totalPrice = basePrice;
    let totalCost = baseCost;

    // Add modifiers from selected variants using real variants
    Object.entries(selectedVariants).forEach(([fieldId, variantCode]) => {
      const selectedVariant = variants.find(v => v.Codice_Variante === variantCode);
      if (selectedVariant) {
        totalPrice += selectedVariant.Prezzo_Aggiuntivo_Attuale || 0;
        totalCost += selectedVariant.Costo_Aggiuntivo_Attuale || 0;
      }
    });

    const margin = totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice) * 100 : 0;
    return { totalPrice, totalCost, margin };
  }, [selectedStructure, selectedVariants, basePrice, baseCost]);

  // Validate current configuration
  const validation = useMemo(() => {
    if (!selectedStructure || !generatedCode) return { valid: false, errors: [] };
    return validateProductCode(generatedCode, selectedStructure);
  }, [selectedStructure, generatedCode]);

  const handleVariantSelection = (fieldId: string, variantCode: string) => {
    setSelectedVariants(prev => ({
      ...prev,
      [fieldId]: variantCode
    }));
  };

  const copyCodeToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      toast.success('Codice copiato negli appunti!');
    }
  };

  // Complete configuration and pass data to parent
  const handleComplete = () => {
    if (!validation.valid || !generatedCode || !generatedName) {
      toast.error('Configurazione non valida');
      return;
    }
    
    // Prepare the complete variant configuration
    const variantConfiguration = {
      structure_name: selectedStructure?.name,
      selected_variants: selectedVariants,
      generated_code: generatedCode,
      generated_name: generatedName,
      generated_description: generatedDescription,
      final_pricing: {
        totalPrice: pricing.totalPrice,
        totalCost: pricing.totalCost,
        margin: pricing.margin
      },
      configuration_timestamp: new Date().toISOString()
    };
    
    // Pass all data back to parent for final creation
    onComplete(generatedCode, generatedName, variantConfiguration);
  };

  if (!selectedStructure) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Configurazione Strutturata</h2>
            <p className="text-muted-foreground">Caricamento struttura in corso...</p>
          </div>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna al Form
          </Button>
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Struttura non trovata. Torna al form e seleziona una struttura valida.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Configurazione: {selectedStructure.name}</h2>
          <p className="text-muted-foreground">Configura le varianti per generare il codice prodotto</p>
        </div>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna al Form
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Pricing Summary */}
          <Card className="border-dashed border-2 bg-gradient-to-br from-muted/30 to-muted/60">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Prezzi Base</h3>
                    <p className="text-sm text-muted-foreground">Configurati nel form principale</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prezzo Base</Label>
                    <Input
                      type="number"
                      value={basePrice}
                      onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Costo Base</Label>
                    <Input
                      type="number"
                      value={baseCost}
                      onChange={(e) => setBaseCost(parseFloat(e.target.value) || 0)}
                      className="font-mono"
                    />
                  </div>
                </div>

                {/* Pricing Summary */}
                {Object.keys(selectedVariants).length > 0 && (
                  <div className="rounded-xl bg-card border p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-muted-foreground">Totale: </span>
                        <span className="font-bold text-lg">€{pricing.totalPrice.toFixed(2)}</span>
                      </div>
                      <Badge variant="outline" className="font-bold">
                        {pricing.margin.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Variant Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Code className="mr-2 h-5 w-5" />
                Configurazione Varianti
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {selectedStructure.fields
                  .sort((a, b) => a.position - b.position)
                  .map((field) => {
                    // Get real variants for this field type
                    const fieldVariants = variants.filter(v => 
                      v.Tipo_Variante?.toLowerCase().includes(field.id?.toLowerCase()) ||
                      field.id?.toLowerCase().includes(v.Tipo_Variante?.toLowerCase())
                    );
                    const activeOptions = fieldVariants
                      .filter(variant => variant.Attivo)
                      .sort((a, b) => (a.Posizione || 0) - (b.Posizione || 0)); // Sort by position
                    
                    console.log(`🔧 [Configurator] Field "${field.id}" (${field.name}): found ${activeOptions.length} variants`, activeOptions);
                    
                    return (
                      <div key={field.id} className="space-y-3 p-4 rounded-xl bg-card border">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="text-sm font-semibold">{field.name}</h5>
                            {field.required && (
                              <Badge variant="outline" className="text-xs mt-1">Richiesto</Badge>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs font-mono">
                            #{field.position}
                          </Badge>
                        </div>
                        
                        <Select
                          value={selectedVariants[field.id] || ''}
                          onValueChange={(value) => handleVariantSelection(field.id, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Seleziona ${field.name.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {activeOptions.length > 0 ? (
                              activeOptions.map((variant) => (
                                <SelectItem key={variant.id} value={variant.Codice_Variante || ''}>
                                  <div className="flex items-center justify-between w-full">
                                    <span>{variant.Nome_Variante}</span>
                                    <Badge variant="outline" className="text-xs ml-2">
                                      {variant.Codice_Variante}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-options" disabled>
                                Nessuna variante disponibile per {field.name}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Panel */}
        <div className="space-y-6">
          {/* Generated Code */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">
                  <Code className="inline w-3 h-3 mr-1" />
                  Codice Generato
                </Label>
                <div className="bg-gradient-to-r from-muted/50 to-muted/70 p-4 rounded-lg border-2 border-dashed">
                  <div className="font-mono text-lg font-bold tracking-wide text-center select-all">
                    {generatedCode ? (
                      <span className="inline-block whitespace-nowrap px-2">
                        {generatedCode.replace(/\s/g, '')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm font-normal">
                        Configura i campi richiesti
                      </span>
                    )}
                  </div>
                  {generatedCode && (
                    <div className="mt-3 flex justify-center">
                      <Button size="sm" variant="outline" onClick={copyCodeToClipboard}>
                        <Copy className="w-3 h-3 mr-1" />
                        Copia
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Validation */}
                {validation.errors.length > 0 && (
                  <div className="bg-muted/30 border rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium mb-1">
                          Campi mancanti ({validation.errors.length})
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {validation.errors.map((error, index) => {
                            const fieldName = error.replace("Required field '", "").replace("' is missing", "");
                            return (
                              <Badge key={index} variant="outline" className="text-xs">
                                {fieldName}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {validation.valid && (
                  <Alert>
                    <Check className="h-4 w-4" />
                    <AlertDescription>
                      Configurazione valida!
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Nome prodotto generato */}
                {generatedName && (
                  <div className="bg-muted/30 p-3 rounded-lg border">
                    <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                      Nome Prodotto Generato
                    </Label>
                    <p className="text-sm font-medium">{generatedName}</p>
                  </div>
                )}
                
                <Button 
                  className="w-full"
                  disabled={!validation.valid || externalLoading}
                  onClick={handleComplete}
                >
                  {externalLoading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Creazione prodotto in corso...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Completa e Crea Prodotto
                    </>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={onBack}
                >
                  Torna al Form
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}