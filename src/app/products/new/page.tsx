'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useProductsList } from '@/hooks/use-products-list';
import { CreateProductForm, PRODUCT_CATEGORIES, FileInfo } from '@/types/products';
import { ProductType, PREDEFINED_STRUCTURES } from '@/types/product-structures';
import { useProductStructures } from '@/hooks/use-product-structures';
import {
  Package,
  Save,
  ArrowLeft,
  AlertTriangle,
  Settings,
  Info,
  RefreshCw,
  Plus,
  ChevronDown,
  ChevronRight,
  FileText,
  Image,
  Calculator,
  CheckCircle,
  Circle,
  AlertCircle,
  Paperclip,
  Tag,
  Hash,
  FileImage,
  Euro,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { IntegratedConfigurator } from '@/components/products/integrated-configurator';
import { PricingCalculatorSimple } from '@/components/products/pricing-calculator';
import { SmartFileUpload } from '@/components/products/smart-file-upload';
import { cn } from '@/lib/utils';

// FileInfo is now imported from @/types/products

// Extended form type
interface ExtendedCreateProductForm extends CreateProductForm {
  product_type: ProductType;
  structure_id?: string;
  URL_Certificazioni?: string;
}

// Sezioni della sidebar per la navigazione
interface NavigationSection {
  id: string;
  name: string;
  description: string;
  icon: any;
  required?: boolean;
}

const navigationSections: NavigationSection[] = [
  {
    id: 'product',
    name: 'Prodotto',
    description: 'Tipologia, identificazione, descrizione e stati',
    icon: Package,
    required: true
  },
  {
    id: 'pricing',
    name: 'Prezzo',
    description: 'Prezzo di vendita, costo e calcolo margine',
    icon: Euro
  },
  {
    id: 'media',
    name: 'File e Allegati',
    description: 'Foto, schede tecniche, manuali e certificazioni',
    icon: Paperclip
  },
  {
    id: 'summary',
    name: 'Riepilogo',
    description: 'Verifica finale e creazione prodotto',
    icon: CheckCircle
  }
];

export default function NewProductPage() {
  const router = useRouter();
  const { createProduct } = useProductsList();
  const { structures, loading: structuresLoading, error: structuresError } = useProductStructures();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState<'form' | 'configurator'>("form");
  const [savedProductId, setSavedProductId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('product');
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [sectionsWithErrors, setSectionsWithErrors] = useState<Set<string>>(new Set());
  const [uploadedFiles, setUploadedFiles] = useState<{
    foto?: FileInfo[];
    schede?: FileInfo[];
    manuali?: FileInfo[];
    certificazioni?: FileInfo[];
  }>({});
  const [uploading, setUploading] = useState(false);
  
  // Stati per sezioni collassabili
  const [configOpen, setConfigOpen] = useState(false);
  
  const [formData, setFormData] = useState<ExtendedCreateProductForm>({
    Codice_Matrice: '',
    Nome_Prodotto: '',
    Descrizione: '',
    Categoria: 'Materassi',
    Prezzo_Listino_Attuale: undefined,
    Costo_Attuale: undefined,
    Margine_Standard: undefined,
    Attivo: true,
    In_Evidenza: false,
    URL_Immagine_Principale: '',
    URL_Scheda_Tecnica: '',
    URL_Certificazioni: '',
    product_type: 'semplice',
    structure_id: undefined,
  });

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate code only for simple products
    if (formData.product_type === 'semplice') {
      if (!formData.Codice_Matrice.trim()) {
        newErrors.Codice_Matrice = 'Il codice matrice è obbligatorio per prodotti semplici';
      } else if (formData.Codice_Matrice.length < 2) {
        newErrors.Codice_Matrice = 'Il codice deve essere di almeno 2 caratteri';
      }
    }

    // Validate name only for simple products
    if (formData.product_type === 'semplice') {
      if (!formData.Nome_Prodotto.trim()) {
        newErrors.Nome_Prodotto = 'Il nome del prodotto è obbligatorio';
      } else if (formData.Nome_Prodotto.length < 2) {
        newErrors.Nome_Prodotto = 'Il nome deve essere di almeno 2 caratteri';
      }
    }
    // For structured products, name will be auto-generated in configurator
    // so we don't validate it here, but we need to validate structure_id
    if (formData.product_type === 'strutturato') {
      if (!formData.structure_id) {
        newErrors.structure_id = 'Seleziona una struttura per il prodotto strutturato';
      }
    }


    if (formData.Prezzo_Listino_Attuale !== undefined && formData.Prezzo_Listino_Attuale < 0) {
      newErrors.Prezzo_Listino_Attuale = 'Il prezzo non può essere negativo';
    }

    if (formData.Costo_Attuale !== undefined && formData.Costo_Attuale < 0) {
      newErrors.Costo_Attuale = 'Il costo non può essere negativo';
    }

    // Margine is auto-calculated, no manual validation needed

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Calculate margin automatically
  const calculateMargin = (costo: number | undefined, prezzo: number | undefined): number | undefined => {
    if (!costo || !prezzo || costo <= 0 || prezzo <= 0) return undefined;
    if (prezzo <= costo) return 0; // No margin if selling price is not higher than cost
    return Number((((prezzo - costo) / prezzo) * 100).toFixed(2));
  };

  // Handle input changes
  const handleInputChange = (field: keyof ExtendedCreateProductForm, value: any) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };

      // If switching product type, clear relevant fields
      if (field === 'product_type') {
        if (value === 'strutturato') {
          // Clear fields that will be auto-generated for structured products
          newData.Codice_Matrice = '';
          newData.Nome_Prodotto = '';
          newData.Descrizione = '';
          newData.structure_id = undefined;
        } else if (value === 'semplice') {
          // Clear structure_id when switching to simple product
          newData.structure_id = undefined;
        }
      }

      // Auto-calculate margin when cost or selling price changes
      if (field === 'Costo_Attuale' || field === 'Prezzo_Listino_Attuale') {
        const costo = field === 'Costo_Attuale' ? value : prev.Costo_Attuale;
        const prezzo = field === 'Prezzo_Listino_Attuale' ? value : prev.Prezzo_Listino_Attuale;
        newData.Margine_Standard = calculateMargin(costo, prezzo);
      }

      return newData;
    });

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Correggi gli errori nel form');
      return;
    }

    setLoading(true);

    try {
      if (formData.product_type === 'strutturato') {
        // Per prodotti strutturati, NON creiamo nulla, andiamo solo al configuratore
        setCurrentStep('configurator');
        toast.success('Dati base preparati! Ora configura le varianti per completare il prodotto.');
      } else {
        // Per prodotti semplici, creiamo direttamente
        const productDataWithFiles = {
          ...formData,
          // Assegna i file caricati ai campi Airtable attachment
          Foto_Prodotto: uploadedFiles.foto || [],
          Schede_Tecniche: uploadedFiles.schede || [],
          Manuali: uploadedFiles.manuali || [],
          Certificazioni: uploadedFiles.certificazioni || [],
        };
        
        const productResult = await createProduct(productDataWithFiles);
        
        if (productResult.success) {
          toast.success('Prodotto creato con successo!');
          router.push('/products');
        } else {
          throw new Error('Errore durante la creazione del prodotto');
        }
      }
    } catch (error) {
      toast.error('Errore durante la creazione del prodotto');
    } finally {
      setLoading(false);
    }
  };

  // Handle configurator completion
  const handleConfiguratorComplete = async (generatedCode: string, generatedName: string, variantConfiguration: any) => {
    setLoading(true);
    
    try {
      // Ora creiamo il prodotto completo con tutte le informazioni
      const completeProductData = {
        ...formData,
        // Dati generati dal configuratore
        Codice_Matrice: generatedCode,
        Nome_Prodotto: generatedName,
        // Descrizione generata dal configuratore (leggibile)
        Descrizione: variantConfiguration.generated_description || formData.Descrizione,
        // Prezzi finali dal configuratore (inclusi modificatori varianti)
        Prezzo_Listino_Attuale: variantConfiguration.final_pricing?.totalPrice || formData.Prezzo_Listino_Attuale,
        Costo_Attuale: variantConfiguration.final_pricing?.totalCost || formData.Costo_Attuale,
        Margine_Standard: variantConfiguration.final_pricing?.margin || formData.Margine_Standard,
        // File caricati nel form base
        Foto_Prodotto: uploadedFiles.foto || [],
        Schede_Tecniche: uploadedFiles.schede || [], // Nota: underscore invece di maiuscola
        Manuali: uploadedFiles.manuali || [],
        Certificazioni: uploadedFiles.certificazioni || [],
        // Salviamo la configurazione JSON nel campo Metadata
        Metadata: JSON.stringify({
          configurazione: variantConfiguration,
          descrizione_utente: formData.Descrizione || '',
          creato_il: new Date().toISOString(),
          tipo: 'prodotto_strutturato'
        }, null, 2),
      };
      
      const productResult = await createProduct(completeProductData);
      
      if (productResult.success) {
        toast.success(`Prodotto strutturato creato! Codice: ${generatedCode}`);
        router.push('/products');
      } else {
        throw new Error('Errore durante la creazione del prodotto completo');
      }
    } catch (error) {
      toast.error('Errore durante la creazione del prodotto');
    } finally {
      setLoading(false);
    }
  };

  // Handle back to form from configurator
  const handleBackToForm = () => {
    setCurrentStep('form');
    setSavedProductId(null);
  };

  // Funzioni per gestione step intelligente
  const validateSection = (sectionId: string): boolean => {
    const sectionErrors: Record<string, string> = {};
    
    switch (sectionId) {
      case 'product':
        // Validazione categoria
        if (!formData.Categoria) sectionErrors.categoria = 'Categoria richiesta';
        
        // Validazione struttura per prodotti strutturati
        if (formData.product_type === 'strutturato' && !formData.structure_id) {
          sectionErrors.structure_id = 'Struttura richiesta per prodotti strutturati';
        }
        
        // Validazione codice e nome per prodotti semplici
        if (formData.product_type === 'semplice') {
          if (!formData.Codice_Matrice.trim()) sectionErrors.Codice_Matrice = 'Codice obbligatorio';
          if (!formData.Nome_Prodotto.trim()) sectionErrors.Nome_Prodotto = 'Nome obbligatorio';
        }
        break;
        
      case 'pricing':
        if (formData.Prezzo_Listino_Attuale !== undefined && formData.Prezzo_Listino_Attuale < 0) {
          sectionErrors.Prezzo_Listino_Attuale = 'Prezzo non può essere negativo';
        }
        if (formData.Costo_Attuale !== undefined && formData.Costo_Attuale < 0) {
          sectionErrors.Costo_Attuale = 'Costo non può essere negativo';
        }
        break;
        
      case 'media':
        // Sezione opzionale - sempre valida
        break;
    }
    
    return Object.keys(sectionErrors).length === 0;
  };
  
  const checkSectionCompletion = (sectionId: string): boolean => {
    switch (sectionId) {
      case 'product':
        const hasBasicInfo = !!formData.Categoria && 
                           (formData.product_type !== 'strutturato' || !!formData.structure_id);
        const hasIdentification = formData.product_type === 'strutturato' || 
                                 (!!(formData.Codice_Matrice.trim()) && !!(formData.Nome_Prodotto.trim()));
        return hasBasicInfo && hasIdentification;
        
      case 'pricing':
      case 'media':
        return true; // Sezioni opzionali
        
      case 'summary':
        return validateForm();
        
      default:
        return false;
    }
  };
  
  const getSectionIcon = (sectionId: string) => {
    const isCompleted = completedSections.has(sectionId);
    const hasErrors = sectionsWithErrors.has(sectionId);
    
    if (hasErrors) return AlertCircle;
    if (isCompleted) return CheckCircle;
    return Circle;
  };
  
  const getSectionStatus = (sectionId: string) => {
    if (sectionsWithErrors.has(sectionId)) return 'error';
    if (completedSections.has(sectionId)) return 'completed';
    if (activeSection === sectionId) return 'active';
    return 'pending';
  };

  return (
    <AppLayoutCustom>
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <PageBreadcrumb 
          pageName={currentStep === 'form' ? "Nuovo Prodotto" : "Configuratore Prodotto"} 
          items={[
            { label: 'Prodotti', href: '/products' },
            { label: currentStep === 'form' ? 'Nuovo Prodotto' : 'Configuratore Prodotto' }
          ]}
        />

        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Rendering condizionale basato sullo step */}
            {currentStep === 'form' ? (
              <>
                {/* Header moderno in stile structure-variants */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <h1 className="text-2xl font-bold tracking-tight">Nuovo Prodotto</h1>
                    </div>
                    <p className="text-muted-foreground">
                      Crea un nuovo prodotto {formData.product_type === 'semplice' ? 'semplice' : 'strutturato con varianti'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.history.back()}
                      disabled={loading}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Prodotti
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      disabled={loading}
                      onClick={() => toast.info('Funzionalità disponibile prossimamente')}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Salva Draft
                    </Button>
                  </div>
                </div>

                {/* Layout principale con sidebar */}
                <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-8 lg:space-y-0">
                  {/* Sidebar Navigation */}
                  <aside className="lg:w-1/5 lg:flex-shrink-0">
                    <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
                      {navigationSections.map((section) => {
                        const Icon = section.icon;
                        const status = getSectionStatus(section.id);
                        
                        return (
                          <button
                            key={section.id}
                            type="button"
                            onClick={() => setActiveSection(section.id)}
                            className={`flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors ${
                              activeSection === section.id
                                ? 'bg-accent text-accent-foreground'
                                : status === 'error'
                                ? 'text-red-600 hover:text-red-700'
                                : status === 'completed'
                                ? 'text-green-600 hover:text-green-700'
                                : 'text-muted-foreground'
                            }`}
                          >
                            <Icon className="mr-2 h-4 w-4" />
                            <span className="hidden lg:block flex-1 text-left">{section.name}</span>
                          </button>
                        );
                      })}
                    </nav>
                  </aside>

                  {/* Content Area */}
                  <div className="flex-1 lg:w-4/5 min-w-0">
                    <div className="space-y-6">
                      <form onSubmit={handleSubmit}>
                        {/* Sezione: Prodotto (unificata con stile coerente) */}
                        {activeSection === 'product' && (
                          <Card>
                            <CardContent className="space-y-6 pt-6">
                              {/* Tipologia */}
                              <div className="space-y-6">
                                <div className="flex items-center space-x-2 pb-2 border-b border-muted">
                                  <Tag className="h-4 w-4 text-muted-foreground" />
                                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tipologia</h4>
                                </div>
                                
                                {/* Tipo Prodotto - tutta larghezza */}
                                <div className="space-y-2">
                                  <Label htmlFor="product-type">Tipo Prodotto *</Label>
                                  <Select
                                    value={formData.product_type}
                                    onValueChange={(value: ProductType) => handleInputChange('product_type', value)}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Seleziona tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="semplice">
                                        <div className="flex items-center">
                                          <Package className="mr-2 h-4 w-4" />
                                          <span className="font-medium">Prodotto Semplice</span>
                                        </div>
                                      </SelectItem>
                                      <SelectItem value="strutturato">
                                        <div className="flex items-center">
                                          <Settings className="mr-2 h-4 w-4" />
                                          <span className="font-medium">Prodotto Strutturato</span>
                                        </div>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {/* Categoria - tutta larghezza */}
                                <div className="space-y-2">
                                  <Label htmlFor="categoria">Categoria *</Label>
                                  <Select
                                    value={formData.Categoria}
                                    onValueChange={(value) => handleInputChange('Categoria', value)}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Seleziona categoria" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {PRODUCT_CATEGORIES.map((category) => (
                                        <SelectItem key={category} value={category}>
                                          {category}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                {/* Struttura per prodotti strutturati - tutta larghezza */}
                                {formData.product_type === 'strutturato' && (
                                  <div className="space-y-2">
                                    <Label htmlFor="structure-id">Struttura Prodotto *</Label>
                                    <Select
                                      value={formData.structure_id || ''}
                                      onValueChange={(value) => handleInputChange('structure_id', value)}
                                    >
                                      <SelectTrigger className={cn('w-full', errors.structure_id ? 'border-red-500' : '')}>
                                        <SelectValue placeholder="Seleziona una struttura" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {structuresLoading && (
                                          <SelectItem value="loading" disabled>
                                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                            Caricamento strutture...
                                          </SelectItem>
                                        )}
                                        {structuresError && (
                                          <SelectItem value="error" disabled>
                                            <AlertTriangle className="mr-2 h-4 w-4" />
                                            Errore nel caricamento
                                          </SelectItem>
                                        )}
                                        {!structuresLoading && !structuresError && structures.length === 0 && (
                                          <SelectItem value="empty" disabled>
                                            <Package className="mr-2 h-4 w-4" />
                                            Nessuna struttura disponibile
                                          </SelectItem>
                                        )}
                                        {!structuresLoading && !structuresError && structures.map((structure) => (
                                          <SelectItem key={structure.id} value={structure.name}>
                                            <Settings className="mr-2 h-4 w-4" />
                                            {structure.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    {errors.structure_id && (
                                      <p className="text-sm text-red-600 flex items-center">
                                        <AlertTriangle className="h-4 w-4 mr-1" />
                                        {errors.structure_id}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Identificazione */}
                              <div className="space-y-4">
                                <div className="flex items-center space-x-2 pb-2 border-b border-muted">
                                  <Hash className="h-4 w-4 text-muted-foreground" />
                                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Identificazione</h4>
                                </div>
                                
                                {formData.product_type === 'semplice' ? (
                                  <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                      <Label htmlFor="codice">Codice Matrice *</Label>
                                      <Input
                                        id="codice"
                                        value={formData.Codice_Matrice}
                                        onChange={(e) => handleInputChange('Codice_Matrice', e.target.value)}
                                        placeholder="es. MAT001"
                                        className={errors.Codice_Matrice ? 'border-red-500' : ''}
                                      />
                                      {errors.Codice_Matrice && (
                                        <p className="text-sm text-red-600 flex items-center">
                                          <AlertTriangle className="h-4 w-4 mr-1" />
                                          {errors.Codice_Matrice}
                                        </p>
                                      )}
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <Label htmlFor="nome">Nome Prodotto *</Label>
                                      <Input
                                        id="nome"
                                        value={formData.Nome_Prodotto}
                                        onChange={(e) => handleInputChange('Nome_Prodotto', e.target.value)}
                                        placeholder="es. Materasso Memory Foam Premium"
                                        className={errors.Nome_Prodotto ? 'border-red-500' : ''}
                                      />
                                      {errors.Nome_Prodotto && (
                                        <p className="text-sm text-red-600 flex items-center">
                                          <AlertTriangle className="h-4 w-4 mr-1" />
                                          {errors.Nome_Prodotto}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertDescription className="text-sm">
                                      <strong>Prodotto Strutturato:</strong> Codice matrice, nome prodotto e descrizione saranno generati automaticamente dal configuratore in base alla struttura e alle varianti selezionate.
                                    </AlertDescription>
                                  </Alert>
                                )}
                              </div>

                              {/* Descrizione - solo per prodotti semplici */}
                              {formData.product_type === 'semplice' && (
                                <div className="space-y-4">
                                  <div className="flex items-center space-x-2 pb-2 border-b border-muted">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Descrizione</h4>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <Label htmlFor="descrizione">Descrizione Prodotto</Label>
                                    <Textarea
                                      id="descrizione"
                                      value={formData.Descrizione}
                                      onChange={(e) => handleInputChange('Descrizione', e.target.value)}
                                      placeholder="Descrizione dettagliata del prodotto, caratteristiche principali, materiali utilizzati..."
                                      rows={4}
                                      className="resize-none"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Stati */}
                              <div className="space-y-4">
                                <div className="flex items-center space-x-2 pb-2 border-b border-muted">
                                  <Settings className="h-4 w-4 text-muted-foreground" />
                                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Stati</h4>
                                </div>
                                
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                                    <div className="space-y-0.5">
                                      <Label htmlFor="attivo" className="font-medium text-sm cursor-pointer">Prodotto Attivo</Label>
                                      <p className="text-xs text-muted-foreground">
                                        Disponibile per vendita e visibile nel catalogo
                                      </p>
                                    </div>
                                    <Switch
                                      id="attivo"
                                      checked={formData.Attivo}
                                      onCheckedChange={(checked) => handleInputChange('Attivo', checked)}
                                    />
                                  </div>

                                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                                    <div className="space-y-0.5">
                                      <Label htmlFor="evidenza" className="font-medium text-sm cursor-pointer">In Evidenza</Label>
                                      <p className="text-xs text-muted-foreground">
                                        Mostrato in homepage e sezioni speciali
                                      </p>
                                    </div>
                                    <Switch
                                      id="evidenza"
                                      checked={formData.In_Evidenza}
                                      onCheckedChange={(checked) => handleInputChange('In_Evidenza', checked)}
                                    />
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Sezione: Prezzo */}
                        {activeSection === 'pricing' && (
                          <Card>
                            <CardContent className="space-y-6 pt-6">
                              {/* Prezzi e Margine - Layout semplificato senza mini-header */}
                              <PricingCalculatorSimple
                                prezzo={formData.Prezzo_Listino_Attuale}
                                costo={formData.Costo_Attuale}
                                margine={formData.Margine_Standard}
                                onPriceChange={(price) => handleInputChange('Prezzo_Listino_Attuale', price)}
                                onCostChange={(cost) => handleInputChange('Costo_Attuale', cost)}
                                errors={{
                                  prezzo: errors.Prezzo_Listino_Attuale,
                                  costo: errors.Costo_Attuale,
                                }}
                              />

                            </CardContent>
                          </Card>
                        )}

                        {/* Sezione: File e Media */}
                        {activeSection === 'media' && (
                          <Card>
                            <CardContent className="space-y-6 pt-6">
                              {/* File e Allegati */}
                              <div className="space-y-6">
                                <div className="flex items-center space-x-2 pb-2 border-b border-muted">
                                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">File e Allegati</h4>
                                </div>
                                
                                <SmartFileUpload
                                  uploadedFiles={uploadedFiles}
                                  onFilesChange={setUploadedFiles}
                                  uploading={uploading}
                                  onUploadStart={() => setUploading(true)}
                                  onUploadComplete={() => setUploading(false)}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Sezione: Riepilogo */}
                        {activeSection === 'summary' && (
                          <div className="space-y-6">
                            <Card>
                              <CardContent className="space-y-6 pt-6">
                                {/* Riepilogo Prodotto */}
                                <div className="space-y-6">
                                  <div className="flex items-center space-x-2 pb-2 border-b border-muted">
                                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Riepilogo Prodotto</h4>
                                  </div>
                                  
                                  {/* Informazioni base */}
                                  <div className="grid gap-6 sm:grid-cols-2">
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">TIPO</p>
                                      <p className="text-sm font-medium">
                                        {formData.product_type === 'semplice' ? 'Semplice' : 'Strutturato'}
                                      </p>
                                      {formData.structure_id && (
                                        <p className="text-xs text-muted-foreground">{formData.structure_id}</p>
                                      )}
                                    </div>
                                    
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">CATEGORIA</p>
                                      <p className="text-sm font-medium">{formData.Categoria}</p>
                                    </div>
                                  </div>

                                  {/* Nome prodotto */}
                                  {formData.Nome_Prodotto && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">NOME</p>
                                      <p className="text-sm font-medium">{formData.Nome_Prodotto}</p>
                                    </div>
                                  )}

                                  {/* Descrizione */}
                                  {formData.Descrizione && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">DESCRIZIONE</p>
                                      <p className="text-sm text-muted-foreground">{formData.Descrizione}</p>
                                    </div>
                                  )}
                                  
                                  {/* Prezzi - layout come nella sezione prezzi (4 colonne) */}
                                  {(formData.Prezzo_Listino_Attuale || formData.Costo_Attuale) && (
                                    <div className="grid gap-4 sm:grid-cols-4 p-3 bg-muted/30 rounded-lg">
                                      <div className="text-center">
                                        <p className="text-xs text-muted-foreground mb-1">Prezzo Vendita</p>
                                        <p className="font-semibold">€{formData.Prezzo_Listino_Attuale?.toFixed(2) || '0.00'}</p>
                                      </div>
                                      <div className="text-center">
                                        <p className="text-xs text-muted-foreground mb-1">Costo Base</p>
                                        <p className="font-semibold">€{formData.Costo_Attuale?.toFixed(2) || '0.00'}</p>
                                      </div>
                                      <div className="text-center">
                                        <p className="text-xs text-muted-foreground mb-1">Costo + Tasse</p>
                                        <p className="font-semibold">€{((formData.Costo_Attuale || 0) * 1.17).toFixed(2)}</p>
                                      </div>
                                      <div className="text-center">
                                        <p className="text-xs text-muted-foreground mb-1">Profitto Netto</p>
                                        <p className={cn('font-semibold', 
                                          ((formData.Prezzo_Listino_Attuale || 0) - ((formData.Costo_Attuale || 0) * 1.17)) >= 0 
                                            ? 'text-green-600' 
                                            : 'text-red-600'
                                        )}>
                                          €{((formData.Prezzo_Listino_Attuale || 0) - ((formData.Costo_Attuale || 0) * 1.17)).toFixed(2)}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Stati */}
                                  {(formData.Attivo || formData.In_Evidenza || Object.values(uploadedFiles).flat().length > 0) && (
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium text-muted-foreground">STATI</p>
                                      <div className="flex flex-wrap gap-2">
                                        {formData.Attivo && (
                                          <div className="flex items-center px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
                                            Attivo
                                          </div>
                                        )}
                                        {formData.In_Evidenza && (
                                          <div className="flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />
                                            In Evidenza
                                          </div>
                                        )}
                                        {Object.values(uploadedFiles).flat().length > 0 && (
                                          <div className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                                            {Object.values(uploadedFiles).flat().length} file
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Alert per prodotti strutturati */}
                                  {formData.product_type === 'strutturato' && (
                                    <Alert>
                                      <Info className="h-4 w-4" />
                                      <AlertDescription className="text-sm">
                                        Nome e codice saranno generati dal configuratore dopo il salvataggio.
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="pt-6">
                                <div className="space-y-4">
                                  <Button type="submit" disabled={loading} size="lg" className="w-full">
                                    {loading ? (
                                      <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Creazione...
                                      </>
                                    ) : formData.product_type === 'strutturato' ? (
                                      <>
                                        <Settings className="mr-2 h-4 w-4" />
                                        Vai al Configuratore
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Crea Prodotto
                                      </>
                                    )}
                                  </Button>
                                  
                                  <Button type="button" variant="outline" className="w-full" asChild disabled={loading}>
                                    <Link href="/products">
                                      <ArrowLeft className="mr-2 h-4 w-4" />
                                      Annulla
                                    </Link>
                                  </Button>
                                  
                                  <p className="text-xs text-muted-foreground mt-4 text-center">
                                    * Campi obbligatori per il tipo di prodotto selezionato
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </form>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Configuratore Step */
              <IntegratedConfigurator
                productData={formData}
                uploadedFiles={uploadedFiles}
                onComplete={handleConfiguratorComplete}
                onBack={handleBackToForm}
                loading={loading}
              />
            )}
          </div>
        </div>
      </div>
    </AppLayoutCustom>
  );
}
