'use client';

import React, { useState, useMemo } from 'react';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ProductStructure,
  StructureField,
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
  Info,
  Copy,
  Plus,
  Package,
  DollarSign,
  TrendingUp,
  Building2,
  Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

// Mock variant options - in real app, these would come from database/CSV
const MOCK_VARIANT_OPTIONS: Record<string, VariantOption[]> = {
  // Materasso variants
  modello: [
    { id: '1', code: 'M1', name: 'Modello Basic', active: true, price_modifier: 0, cost_modifier: 0 },
    { id: '2', code: 'M2', name: 'Modello Comfort', active: true, price_modifier: 100, cost_modifier: 50 },
    { id: '3', code: 'M3', name: 'Modello Premium', active: true, price_modifier: 200, cost_modifier: 100 },
  ],
  larghezza: [
    { id: '4', code: '090', name: 'Larghezza 90cm', active: true, price_modifier: 0, cost_modifier: 0 },
    { id: '5', code: '120', name: 'Larghezza 120cm', active: true, price_modifier: 50, cost_modifier: 25 },
    { id: '6', code: '140', name: 'Larghezza 140cm', active: true, price_modifier: 100, cost_modifier: 50 },
    { id: '7', code: '160', name: 'Larghezza 160cm', active: true, price_modifier: 150, cost_modifier: 75 },
    { id: '8', code: '180', name: 'Larghezza 180cm', active: true, price_modifier: 200, cost_modifier: 100 },
  ],
  lunghezza: [
    { id: '9', code: '190', name: 'Lunghezza 190cm', active: true, price_modifier: 0, cost_modifier: 0 },
    { id: '10', code: '200', name: 'Lunghezza 200cm', active: true, price_modifier: 50, cost_modifier: 25 },
    { id: '11', code: '210', name: 'Lunghezza 210cm', active: true, price_modifier: 100, cost_modifier: 50 },
  ],
  taglia_sx: [
    { id: '12', code: '##', name: 'Nessuna taglia', active: true, price_modifier: 0, cost_modifier: 0 },
    { id: '13', code: '0S', name: 'Taglia S', active: true, price_modifier: 30, cost_modifier: 15 },
    { id: '14', code: '0M', name: 'Taglia M', active: true, price_modifier: 40, cost_modifier: 20 },
    { id: '15', code: '0L', name: 'Taglia L', active: true, price_modifier: 50, cost_modifier: 25 },
    { id: '16', code: '0X', name: 'Taglia XL', active: true, price_modifier: 60, cost_modifier: 30 },
  ],
  taglia_dx: [
    { id: '17', code: '##', name: 'Nessuna taglia', active: true, price_modifier: 0, cost_modifier: 0 },
    { id: '18', code: '0S', name: 'Taglia S', active: true, price_modifier: 30, cost_modifier: 15 },
    { id: '19', code: '0M', name: 'Taglia M', active: true, price_modifier: 40, cost_modifier: 20 },
    { id: '20', code: '0L', name: 'Taglia L', active: true, price_modifier: 50, cost_modifier: 25 },
    { id: '21', code: '0X', name: 'Taglia XL', active: true, price_modifier: 60, cost_modifier: 30 },
  ],
  topper_sx: [
    { id: '22', code: '##', name: 'Nessun topper', active: true, price_modifier: 0, cost_modifier: 0 },
    { id: '23', code: 'T1', name: 'Topper Basic', active: true, price_modifier: 80, cost_modifier: 40 },
    { id: '24', code: 'T2', name: 'Topper Memory', active: true, price_modifier: 120, cost_modifier: 60 },
    { id: '25', code: 'T3', name: 'Topper Gel', active: true, price_modifier: 150, cost_modifier: 75 },
    { id: '26', code: 'T4', name: 'Topper Premium', active: true, price_modifier: 200, cost_modifier: 100 },
  ],
  topper_dx: [
    { id: '27', code: '##', name: 'Nessun topper', active: true, price_modifier: 0, cost_modifier: 0 },
    { id: '28', code: 'T1', name: 'Topper Basic', active: true, price_modifier: 80, cost_modifier: 40 },
    { id: '29', code: 'T2', name: 'Topper Memory', active: true, price_modifier: 120, cost_modifier: 60 },
    { id: '30', code: 'T3', name: 'Topper Gel', active: true, price_modifier: 150, cost_modifier: 75 },
    { id: '31', code: 'T4', name: 'Topper Premium', active: true, price_modifier: 200, cost_modifier: 100 },
  ],
  cover: [
    { id: '32', code: '##', name: 'Nessun cover', active: true, price_modifier: 0, cost_modifier: 0 },
    { id: '33', code: 'C1', name: 'Cover Basic', active: true, price_modifier: 50, cost_modifier: 25 },
    { id: '34', code: 'C2', name: 'Cover Waterproof', active: true, price_modifier: 80, cost_modifier: 40 },
    { id: '35', code: 'C3', name: 'Cover Antiacaro', active: true, price_modifier: 100, cost_modifier: 50 },
    { id: '36', code: 'C4', name: 'Cover Premium', active: true, price_modifier: 120, cost_modifier: 60 },
  ],
  
  // Rete variants (aggiungere quando necessario)
  colore_telaio: [
    { id: '37', code: 'BK', name: 'Nero', active: true, price_modifier: 0, cost_modifier: 0 },
    { id: '38', code: 'WH', name: 'Bianco', active: true, price_modifier: 20, cost_modifier: 10 },
    { id: '39', code: 'LW', name: 'Legno', active: true, price_modifier: 50, cost_modifier: 25 },
  ],
  modello_piedino: [
    { id: '40', code: '##', name: 'Nessun piedino', active: true, price_modifier: 0, cost_modifier: 0 },
    { id: '41', code: 'P1', name: 'Piedino Basic', active: true, price_modifier: 30, cost_modifier: 15 },
    { id: '42', code: 'P2', name: 'Piedino Comfort', active: true, price_modifier: 50, cost_modifier: 25 },
  ],
  misura_piedino: [
    { id: '43', code: '##', name: 'Nessuna misura', active: true, price_modifier: 0, cost_modifier: 0 },
    { id: '44', code: '20', name: '20cm', active: true, price_modifier: 0, cost_modifier: 0 },
    { id: '45', code: '25', name: '25cm', active: true, price_modifier: 10, cost_modifier: 5 },
    { id: '46', code: '30', name: '30cm', active: true, price_modifier: 20, cost_modifier: 10 },
  ],
  colore_piedino: [
    { id: '47', code: 'BK', name: 'Nero', active: true, price_modifier: 0, cost_modifier: 0 },
    { id: '48', code: 'WH', name: 'Bianco', active: true, price_modifier: 0, cost_modifier: 0 },
    { id: '49', code: 'LW', name: 'Legno', active: true, price_modifier: 15, cost_modifier: 8 },
  ],
  motorizzazione: [
    { id: '50', code: '##', name: 'Nessuna motorizzazione', active: true, price_modifier: 0, cost_modifier: 0 },
    { id: '51', code: 'M1', name: 'Motore Basic', active: true, price_modifier: 300, cost_modifier: 150 },
    { id: '52', code: 'M2', name: 'Motore Premium', active: true, price_modifier: 500, cost_modifier: 250 },
    { id: '53', code: 'EC', name: 'Motore Elettronico', active: true, price_modifier: 800, cost_modifier: 400 },
  ],
};

export default function StructuredConfiguratorPage() {
  const [selectedStructure, setSelectedStructure] = useState<ProductStructure | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [basePrice, setBasePrice] = useState<number>(800); // Base price for calculation
  const [baseCost, setBaseCost] = useState<number>(400); // Base cost for calculation
  const [realVariantOptions, setRealVariantOptions] = useState<Record<string, VariantOption[]>>({});
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [availableStructures, setAvailableStructures] = useState<ProductStructure[]>([]);
  const [loadingStructures, setLoadingStructures] = useState(false);

  // Load real structures from database
  const loadRealStructures = async () => {
    setLoadingStructures(true);
    try {
      const response = await fetch('/api/product-structures');
      
      if (!response.ok) {
        throw new Error(`Failed to load structures: ${response.status}`);
      }
      
      const result = await response.json();
      const structures = result.structures || [];
      
      // Converti le strutture dal formato API al formato ProductStructure
      const productStructures: ProductStructure[] = structures.map((structure: any) => ({
        id: structure.id,
        name: structure.name,
        description: structure.description,
        fields: structure.fields || [], // I campi dovrebbero essere parsed dal JSON
        created_at: structure.created_at,
        updated_at: structure.updated_at,
        active: structure.active !== false
      }));
      
      setAvailableStructures(productStructures.filter(s => s.active));
      console.log(`✅ Loaded ${productStructures.length} structures from database`);
      
      // Seleziona la prima struttura se nessuna è selezionata
      if (!selectedStructure && productStructures.length > 0) {
        const firstStructure = productStructures.find(s => s.active) || productStructures[0];
        setSelectedStructure(firstStructure);
        loadRealVariants(firstStructure.name);
      }
      
    } catch (error: any) {
      console.error('❌ Error loading structures:', error);
      toast.error('Errore nel caricamento strutture: ' + error.message);
      // Fallback alle strutture predefinite
      const fallbackStructures = PREDEFINED_STRUCTURES.map(s => ({
        ...s,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      setAvailableStructures(fallbackStructures);
      if (!selectedStructure && fallbackStructures.length > 0) {
        setSelectedStructure(fallbackStructures[0]);
        loadRealVariants(fallbackStructures[0].name);
      }
    } finally {
      setLoadingStructures(false);
    }
  };

  // Load real variants from database
  const loadRealVariants = async (structureName?: string) => {
    setLoadingVariants(true);
    try {
      // Usa l'API esistente per caricare le varianti strutturate
      const response = await fetch('/api/structure-variants');
      
      if (!response.ok) {
        throw new Error(`Failed to load variants: ${response.status}`);
      }
      
      const result = await response.json();
      const variants = result.variants || [];
      
      // Group variants by field_name (questo corrisponde al Tipo_Variante)
      const groupedVariants: Record<string, VariantOption[]> = {};
      
      variants.forEach((variant: any) => {
        // Mappa le varianti reali ai field_id della struttura predefinita
        const realFieldId = variant.field_id || 'unknown';
        let mappedFieldIds: string[] = [];
        
        // Mappa i campi reali ai campi della struttura
        switch (realFieldId) {
          case 'taglia':
            mappedFieldIds = ['taglia_sx', 'taglia_dx']; // Duplica per sinistro e destro
            break;
          case 'topper':
            mappedFieldIds = ['topper_sx', 'topper_dx']; // Duplica per sinistro e destro
            break;
          default:
            mappedFieldIds = [realFieldId]; // Usa direttamente (modello, larghezza, lunghezza, cover)
        }
        
        // Aggiungi la variante per ciascun field_id mappato
        mappedFieldIds.forEach(fieldId => {
          if (!groupedVariants[fieldId]) {
            groupedVariants[fieldId] = [];
          }
          
          groupedVariants[fieldId].push({
            id: variant.id,
            code: variant.code,
            name: variant.name,
            description: variant.description || '',
            price_modifier: variant.price_modifier || 0,
            cost_modifier: variant.cost_modifier || 0,
            active: variant.active !== false
          });
        });
      });
      
      setRealVariantOptions(groupedVariants);
      console.log(`✅ Loaded ${variants.length} real variants for configurator, grouped by field:`, Object.keys(groupedVariants));
    } catch (error: any) {
      console.error('❌ Error loading real variants:', error);
      toast.error('Errore nel caricamento varianti: ' + error.message);
      // Fallback to mock data
      setRealVariantOptions(MOCK_VARIANT_OPTIONS);
    } finally {
      setLoadingVariants(false);
    }
  };

  // Initialize by loading structures and variants
  React.useEffect(() => {
    // Carica le strutture reali all'avvio
    loadRealStructures();
  }, []);
  
  // Reload variants when structure changes
  React.useEffect(() => {
    if (selectedStructure) {
      loadRealVariants(selectedStructure.name);
    }
  }, [selectedStructure?.name]);

  // Generate product code
  const generatedCode = useMemo(() => {
    if (!selectedStructure) return '';
    return generateProductCode(selectedStructure, selectedVariants);
  }, [selectedStructure, selectedVariants]);

  // Calculate total price and cost
  const pricing = useMemo(() => {
    if (!selectedStructure) return { totalPrice: basePrice, totalCost: baseCost, margin: 0 };

    let totalPrice = basePrice;
    let totalCost = baseCost;

    // Add modifiers from selected variants
    Object.entries(selectedVariants).forEach(([fieldId, variantCode]) => {
      const variantOptions = realVariantOptions[fieldId] || [];
      const selectedOption = variantOptions.find(option => option.code === variantCode);
      if (selectedOption) {
        totalPrice += selectedOption.price_modifier || 0;
        totalCost += selectedOption.cost_modifier || 0;
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

  const handleStructureChange = (structureId: string) => {
    const structure = availableStructures.find(s => s.id === structureId);
    if (structure) {
      setSelectedStructure(structure);
      setSelectedVariants({}); // Reset selections
      loadRealVariants(structure.name); // Reload variants for new structure
    }
  };

  const copyCodeToClipboard = () => {
    if (generatedCode) {
      navigator.clipboard.writeText(generatedCode);
      toast.success('Codice copiato negli appunti!');
    }
  };

  const resetConfiguration = () => {
    setSelectedVariants({});
    toast.info('Configurazione azzerata');
  };

  // Crea prodotto strutturato reale
  const createStructuredProduct = async () => {
    if (!selectedStructure || !validation.valid || !generatedCode) {
      toast.error('Configurazione non valida');
      return;
    }

    try {
      // Calcola nome prodotto descrittivo con logica specifica per tipo campo
      const modelVariant = Object.entries(selectedVariants)
        .find(([fieldId]) => fieldId === 'modello');
      
      const sizeVariants = Object.entries(selectedVariants)
        .filter(([fieldId]) => fieldId === 'larghezza' || fieldId === 'lunghezza');
      
      let productName = selectedStructure.name;
      
      // Aggiungi modello se presente
      if (modelVariant) {
        const [fieldId, variantCode] = modelVariant;
        const options = realVariantOptions[fieldId] || [];
        const option = options.find(opt => opt.code === variantCode);
        if (option) {
          // Pulisci il nome del modello rimuovendo "Modello " se presente
          const modelName = option.name.replace(/^Modello\s+/i, '');
          productName += ` ${modelName}`;
        }
      }
      
      // Aggiungi dimensioni se presenti (larghezza x lunghezza)
      if (sizeVariants.length > 0) {
        const sizeNames = sizeVariants
          .sort((a, b) => a[0] === 'larghezza' ? -1 : 1) // larghezza prima di lunghezza
          .map(([fieldId, variantCode]) => {
            const options = realVariantOptions[fieldId] || [];
            const option = options.find(opt => opt.code === variantCode);
            if (option) {
              // Estrai solo il numero dalle misure (es. "160" da "Larghezza 160cm")
              const match = option.name.match(/\d+/);
              return match ? match[0] : variantCode;
            }
            return variantCode;
          })
          .filter(Boolean);
        
        if (sizeNames.length > 0) {
          productName += ` ${sizeNames.join('x')}`;
        }
      }
      // Genera descrizione completa con tutte le varianti selezionate
      const allSelectedVariantNames = Object.entries(selectedVariants)
        .map(([fieldId, variantCode]) => {
          const options = realVariantOptions[fieldId] || [];
          const option = options.find(opt => opt.code === variantCode);
          return option ? option.name : variantCode;
        })
        .filter(Boolean);
      
      const productDescription = `Configurazione: ${allSelectedVariantNames.join(', ')}`;
      
      // Calcola margine in percentuale
      const marginPercentage = pricing.totalPrice > 0 ? 
        ((pricing.totalPrice - pricing.totalCost) / pricing.totalPrice) * 100 : 0;
      
      // Crea configurazione JSON dettagliata
      const configurationData = {
        structure_name: selectedStructure.name,
        structure_id: selectedStructure.id,
        generated_code: generatedCode,
        base_price: basePrice,
        base_cost: baseCost,
        total_price: pricing.totalPrice,
        total_cost: pricing.totalCost,
        margin_percentage: marginPercentage,
        selected_variants: selectedVariants,
        variant_details: Object.entries(selectedVariants).map(([fieldId, variantCode]) => {
          const options = realVariantOptions[fieldId] || [];
          const option = options.find(opt => opt.code === variantCode);
          return {
            field_id: fieldId,
            field_name: selectedStructure.fields.find(f => f.id === fieldId)?.name || fieldId,
            variant_code: variantCode,
            variant_name: option?.name || variantCode,
            price_modifier: option?.price_modifier || 0,
            cost_modifier: option?.cost_modifier || 0
          };
        })
      };
      
      // Usa l'ultimo campo URL disponibile per salvare la configurazione JSON
      const configurationJson = JSON.stringify(configurationData, null, 2);
      
      // Raccogli gli ID delle varianti selezionate per collegarle al prodotto
      const selectedVariantIds: string[] = [];
      Object.entries(selectedVariants).forEach(([fieldId, variantCode]) => {
        const options = realVariantOptions[fieldId] || [];
        const option = options.find(opt => opt.code === variantCode);
        if (option && option.id) {
          selectedVariantIds.push(option.id);
        }
      });
      
      console.log('🔗 Selected variant IDs to link:', selectedVariantIds);
      
      // Prepara i dati del prodotto usando campi Airtable esistenti
      const productData = {
        Codice_Matrice: generatedCode,
        Nome_Prodotto: productName.trim(),
        Descrizione: productDescription.trim(),
        Categoria: selectedStructure.name === 'Materasso' ? 'Materassi' : 
                  selectedStructure.name === 'Rete' ? 'Basi' : 'Altro',
        Prezzo_Listino_Attuale: pricing.totalPrice,
        Costo_Attuale: pricing.totalCost,
        Margine_Standard: marginPercentage / 100, // Airtable salva come decimale (0.30 = 30%)
        Attivo: true,
        In_Evidenza: false,
        // Salva configurazione strutturata nel campo URL_Certificazioni (come JSON)
        URL_Certificazioni: configurationJson,
        // Collega le varianti selezionate al prodotto
        Product_Variants: selectedVariantIds.length > 0 ? selectedVariantIds : undefined
      };

      console.log('🚀 Creating structured product:', {
        ...productData,
        URL_Certificazioni: '[JSON CONFIG - ' + configurationJson.length + ' chars]' // Evita log troppo lunghi
      });
      console.log('📊 Product pricing summary:', {
        basePrice,
        baseCost, 
        totalPrice: pricing.totalPrice,
        totalCost: pricing.totalCost,
        marginPercentage: marginPercentage.toFixed(2) + '%',
        linkedVariants: selectedVariantIds.length
      });
      
      // Rimuovi toast precedenti e mostra loading
      toast.dismiss();
      const loadingToast = toast.loading('Creazione prodotto in corso...');

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Errore nella creazione del prodotto');
      }

      console.log('✅ Product created successfully:', result.product);
      console.log('✅ Linked variants count:', selectedVariantIds.length);
      
      // Rimuovi toast loading
      toast.dismiss(loadingToast);
      
      // Toast di successo con link al prodotto
      toast.success(
        `🎉 Prodotto strutturato creato con successo!\nCodice: ${result.product.Codice_Matrice}\nNome: ${result.product.Nome_Prodotto}\nVarianti collegate: ${selectedVariantIds.length}`,
        { 
          duration: 8000,
          action: {
            label: 'Vedi Prodotti',
            onClick: () => window.open('/products', '_blank')
          }
        }
      );

      // Reset configurazione dopo successo
      resetConfiguration();

    } catch (error: any) {
      console.error('❌ Error creating structured product:', error);
      
      // Rimuovi toast loading
      toast.dismiss();
      
      toast.error('Errore nella creazione: ' + (error.message || 'Errore sconosciuto'));
    }
  };

  if (!selectedStructure || loadingVariants || loadingStructures) {
    return (
      <AppLayoutCustom>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {loadingStructures ? 'Caricamento Strutture...' :
               loadingVariants ? 'Caricamento Varianti...' : 'Caricamento Configuratore...'}
            </h3>
            {(loadingStructures || loadingVariants) && (
              <p className="text-sm text-muted-foreground">
                {loadingStructures ? 'Caricamento delle strutture dal database in corso...' :
                 'Caricamento delle varianti dal database in corso...'}
              </p>
            )}
          </div>
        </div>
      </AppLayoutCustom>
    );
  }

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb 
          pageName="Configuratore Strutturato" 
          items={[
            { label: 'Prodotti', href: '/products' },
            { label: 'Configuratore Strutturato' }
          ]}
        />

        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                  Configuratore Prodotti Strutturati
                </h1>
                <p className="text-muted-foreground mt-1">
                  Configura prodotti con codice automatico generato dalle varianti
                </p>
              </div>
              
              <Button variant="outline" asChild>
                <Link href="/products">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Torna ai Prodotti
                </Link>
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              
              {/* Configuration Panel */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Structure Selection - Compatto e Moderno */}
                <Card className="border-dashed border-2 bg-gradient-to-br from-muted/30 to-muted/60">
                  <CardContent className="p-6">
                    {/* Header compatto con selezione struttura */}
                    <div className="space-y-4">
                      {/* Intestazione con icona e info */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
                            <Settings className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold">Configurazione Base</h3>
                            <p className="text-sm text-muted-foreground">Seleziona struttura e prezzi di partenza</p>
                          </div>
                        </div>
                        {/* Contatore campi struttura */}
                        {selectedStructure && (
                          <div className="text-right">
                            <Badge variant="outline" className="font-mono">
                              {selectedStructure.fields.length} campi
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Selezione struttura e pricing in layout compatto */}
                      <div className="grid gap-4 lg:grid-cols-3">
                        {/* Selezione struttura */}
                        <div className="lg:col-span-1 space-y-2">
                          <Label className="text-sm font-semibold flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            Struttura
                          </Label>
                          <Select
                            value={selectedStructure?.id || ''}
                            onValueChange={handleStructureChange}
                          >
                            <SelectTrigger className="h-[2.75rem] min-h-[2.75rem] max-h-[2.75rem] rounded-lg border font-medium">
                              <SelectValue placeholder="Scegli struttura..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-2">
                              {availableStructures.map((structure) => (
                                <SelectItem 
                                  key={structure.id} 
                                  value={structure.id}
                                  className="py-3 px-4 my-1 mx-1 rounded-lg"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                                    <span className="font-medium">{structure.name}</span>
                                    {structure.description && (
                                      <Badge variant="secondary" className="text-xs ml-2">
                                        {structure.fields?.length || 0} campi
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Pricing inline - 2 colonne compatte */}
                        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="base-price" className="text-sm font-semibold flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-muted-foreground" />
                              Prezzo Base
                            </Label>
                            <div className="relative">
                              <Input
                                id="base-price"
                                type="number"
                                min="0"
                                step="0.01"
                                value={basePrice}
                                onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                                placeholder="800.00"
                                className="h-[2.75rem] min-h-[2.75rem] max-h-[2.75rem] text-sm font-medium rounded-lg border pl-8"
                              />
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">€</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="base-cost" className="text-sm font-semibold flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-muted-foreground" />
                              Costo Base
                            </Label>
                            <div className="relative">
                              <Input
                                id="base-cost"
                                type="number"
                                min="0"
                                step="0.01"
                                value={baseCost}
                                onChange={(e) => setBaseCost(parseFloat(e.target.value) || 0)}
                                placeholder="400.00"
                                className="h-[2.75rem] min-h-[2.75rem] max-h-[2.75rem] text-sm font-medium rounded-lg border pl-8"
                              />
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">€</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Pricing Summary - Ultra compatto */}
                      {Object.keys(selectedVariants).length > 0 && (
                        <div className="rounded-xl bg-card border p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-primary"></div>
                              <Label className="text-sm font-semibold flex items-center gap-2">
                                <Lightbulb className="w-4 h-4 text-muted-foreground" />
                                Riepilogo Prezzi
                              </Label>
                            </div>
                            <Badge variant="outline" className="font-mono text-xs">
                              {Object.keys(selectedVariants).length} varianti
                            </Badge>
                          </div>
                          
                          {/* Lista varianti modificatori in layout compatto */}
                          <div className="space-y-1 mb-3">
                            {Object.entries(selectedVariants).map(([fieldId, variantCode]) => {
                              const variant = realVariantOptions[fieldId]?.find(
                                option => option.code === variantCode
                              );
                              if (!variant || variant.price_modifier === 0) return null;
                              
                              const field = selectedStructure.fields.find(f => f.id === fieldId);
                              
                              return (
                                <div key={fieldId} className="flex items-center justify-between text-sm py-1">
                                  <span className="text-muted-foreground font-medium">
                                    {field?.name}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">{variant.name}</span>
                                    <Badge 
                                      variant="secondary"
                                      className="text-xs font-mono px-2 py-0.5"
                                    >
                                      {variant.price_modifier >= 0 ? '+' : ''}€{variant.price_modifier}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                            
                          {/* Totali con margine in layout orizzontale */}
                          <div className="flex items-center justify-between pt-3 border-t">
                            <div className="flex items-center gap-4">
                              <div className="text-sm">
                                <span className="text-muted-foreground">Totale: </span>
                                <span className="font-bold text-lg">€{pricing.totalPrice.toFixed(2)}</span>
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">Margine: </span>
                                <Badge 
                                  variant="outline"
                                  className="font-bold"
                                >
                                  {pricing.margin.toFixed(1)}%
                                </Badge>
                              </div>
                            </div>
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
                    {/* Intestazione con informazioni struttura */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-muted/30 to-muted/60 rounded-xl border">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Code className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-base">{selectedStructure.name}</h4>
                            <p className="text-xs text-muted-foreground">Struttura di prodotto</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs font-mono px-3 py-1">
                          {selectedStructure.fields.length} campi • {selectedStructure.fields.reduce((sum, f) => sum + f.length, 0)} caratteri
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <span>Ordine dei campi: position 0 → {selectedStructure.fields.length-1} per generazione codice prodotto</span>
                      </div>
                    </div>
                    
                    {/* Layout a 2 colonne responsive e adaptive */}
                    <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
                      {selectedStructure.fields
                        .sort((a, b) => a.position - b.position)
                        .map((field) => {
                          const options = realVariantOptions[field.id] || [];
                          const selectedOption = options.find(
                            option => option.code === selectedVariants[field.id]
                          );
                          
                          // Verifica se questo campo è mancante e richiesto
                          const isFieldMissing = field.required && !selectedVariants[field.id];
                          
                          // Gestione intelligente opzione "Nessuno" per campi opzionali
                          const activeOptions = options.filter(option => option.active);
                          
                          let allOptions: VariantOption[];
                          if (!field.required) {
                            // Controlla se esistono già opzioni "Nessuno" 
                            const existingNoneOptions = activeOptions.filter(option => 
                              option.code === field.placeholder || 
                              option.name.toLowerCase().includes('nessun') ||
                              option.code.toLowerCase() === 'ne' || // Gestisce i codici "Ne" esistenti
                              option.code.toLowerCase() === 'none'
                            );
                            
                            if (existingNoneOptions.length === 0) {
                              // Aggiungi opzione "Nessuno" solo se non esiste già
                              allOptions = [
                                {
                                  id: 'none',
                                  code: field.placeholder, // Usa placeholder come codice (es. "##")
                                  name: `Nessun${field.name.toLowerCase().endsWith('a') ? 'a' : 'o'} ${field.name.toLowerCase()}`,
                                  active: true,
                                  price_modifier: 0,
                                  cost_modifier: 0
                                },
                                ...activeOptions
                              ];
                            } else {
                              // Correggi SEMPRE le opzioni "Nessuno" esistenti per usare il placeholder corretto
                              const correctedNoneOptions = existingNoneOptions.map(option => ({
                                ...option,
                                code: field.placeholder // Forza il placeholder corretto (## invece di Ne)
                              }));
                              
                              // Rimuovi le opzioni "Nessuno" originali e aggiungi quelle corrette all'inizio
                              const otherOptions = activeOptions.filter(opt => !existingNoneOptions.some(none => none.id === opt.id));
                              allOptions = [...correctedNoneOptions, ...otherOptions];
                            }
                          } else {
                            allOptions = activeOptions;
                          }
                          
                          return (
                            <div key={field.id} className={`group relative space-y-3 p-4 rounded-xl bg-card border transition-all duration-200 hover:shadow-md ${
                              isFieldMissing ? 'border-destructive/50 bg-destructive/5 shadow-sm' : 'border-border hover:border-border'
                            }`}>
                              {/* Position badge assoluto */}
                              <div className="absolute -top-2 -left-2 z-10">
                                <Badge 
                                  variant={isFieldMissing ? "destructive" : "secondary"} 
                                  className="text-xs font-mono px-2 py-1 shadow-sm"
                                >
                                  #{field.position}
                                </Badge>
                              </div>
                              
                              {/* Header compatto */}
                              <div className="flex items-center justify-between pt-1">
                                <div className="flex items-center gap-2">
                                  <h5 className="text-sm font-semibold flex items-center">
                                    {field.name}
                                    {field.required && (
                                      <span className="ml-1 text-red-500 font-bold text-base">*</span>
                                    )}
                                  </h5>
                                  {isFieldMissing && (
                                    <Badge variant="destructive" size="sm" className="text-xs px-2 py-0.5 animate-pulse">
                                      Richiesto
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-xs px-2 py-0.5 font-mono">
                                    {field.length} char
                                  </Badge>
                                </div>
                              </div>
                              
                              
                              {/* Select moderno */}
                              <Select
                                value={selectedVariants[field.id] || ''}
                                onValueChange={(value) => handleVariantSelection(field.id, value)}
                              >
                                <SelectTrigger className={`h-12 rounded-lg border-2 text-left font-medium ${
                                  isFieldMissing ? 'border-destructive bg-destructive/5' : ''
                                }`}>
                                  <SelectValue 
                                    placeholder={field.required ? `Seleziona ${field.name.toLowerCase()}` : `${field.name} (opzionale)`}
                                    className="font-medium"
                                  />
                                </SelectTrigger>
                                <SelectContent className="max-h-[320px] rounded-xl border-2">
                                  {allOptions.map((option) => {
                                    // Identifica se è un'opzione "Nessuno"
                                    const isNoneOption = option.code === field.placeholder || 
                                                         option.name.toLowerCase().includes('nessun') ||
                                                         option.id === 'none';
                                    
                                    return (
                                      <SelectItem 
                                        key={option.id} 
                                        value={option.code} 
                                        className={`py-3 px-4 my-1 mx-1 rounded-lg transition-colors ${
                                          isNoneOption ? 'bg-muted/50 border border-dashed' : ''
                                        }`}
                                      >
                                        <div className="flex items-center justify-between w-full">
                                          <div className="flex items-center gap-3">
                                            {isNoneOption ? (
                                              // Opzione "Nessuno" con icona
                                              <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-muted-foreground"></div>
                                                <span className="font-medium text-sm text-muted-foreground italic">
                                                  {option.name}
                                                </span>
                                              </div>
                                            ) : (
                                              // Opzioni normali con badge
                                              <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-primary"></div>
                                                <span className="font-medium text-sm">
                                                  {option.name}
                                                </span>
                                                <Badge variant="outline" className="text-xs px-2 py-0.5 font-mono">
                                                  {option.code}
                                                </Badge>
                                              </div>
                                            )}
                                          </div>
                                          
                                          {/* Modificatori prezzo a destra */}
                                          {!isNoneOption && (option.price_modifier !== 0 || option.cost_modifier !== 0) && (
                                            <div className="flex items-center gap-2 text-xs">
                                              {option.price_modifier !== 0 && (
                                                <Badge variant="secondary" className="px-2 py-1">
                                                  {option.price_modifier >= 0 ? '+' : ''}€{option.price_modifier}
                                                </Badge>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </SelectItem>
                                    );
                                  })}
                                </SelectContent>
                              </Select>
                              
                              {/* Feedback compatto per selezione corrente */}
                              {selectedOption && (selectedOption.price_modifier !== 0 || selectedOption.cost_modifier !== 0) && (
                                <div className="text-xs bg-muted/30 px-3 py-2 rounded-md flex items-center gap-2 border">
                                  <Check className="h-3 w-3" />
                                  <span className="font-medium">
                                    {selectedOption.price_modifier !== 0 && `€${selectedOption.price_modifier >= 0 ? '+' : ''}${selectedOption.price_modifier}`}
                                    {selectedOption.cost_modifier !== 0 && ` (costo: €${selectedOption.cost_modifier >= 0 ? '+' : ''}${selectedOption.cost_modifier})`}
                                  </span>
                                </div>
                              )}
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
                      {/* Codice principale - Molto più prominente */}
                      <div className="text-center">
                        <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                          <Code className="inline w-3 h-3 mr-1" />
                          Codice Generato
                        </Label>
                        <div className="bg-gradient-to-r from-muted/50 to-muted/70 p-4 rounded-lg border-2 border-dashed">
                          <div className="font-mono text-lg font-bold tracking-wide text-center select-all overflow-x-auto">
                            {generatedCode ? (
                              <span className="inline-block whitespace-nowrap px-2">{generatedCode.replace(/\s/g, '')}</span>
                            ) : (
                              <span className="text-muted-foreground text-sm font-normal">Configura i campi richiesti</span>
                            )}
                          </div>
                          {generatedCode && (
                            <div className="mt-3 flex justify-center">
                              <Button size="sm" variant="outline" onClick={copyCodeToClipboard}>
                                <Copy className="w-3 h-3 mr-1" />
                                Copia Codice
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Validation - Compatto */}
                      {validation.errors.length > 0 && (
                        <div className="bg-muted/30 border rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium mb-1">
                                Campi mancanti ({validation.errors.length})
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {validation.errors.map((error, index) => {
                                  const fieldName = error.replace("Required field '", "").replace("' is missing", "");
                                  return (
                                    <Badge key={index} variant="outline" className="text-xs py-0.5 px-2 text-red-600 border-red-200 bg-red-50 dark:text-red-400 dark:border-red-800/50 dark:bg-red-950/20">
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
                      <Button 
                        className="w-full"
                        disabled={!validation.valid}
                        onClick={createStructuredProduct}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Crea Prodotto Configurato
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={resetConfiguration}
                      >
                        Azzera Configurazione
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  );
}