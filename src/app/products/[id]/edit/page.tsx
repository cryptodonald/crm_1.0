'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { AppLayoutCustom } from '@/components/layout/app-layout-custom';
import { PageBreadcrumb } from '@/components/layout/page-breadcrumb';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useProducts } from '@/hooks/use-products';
import { UpdateProductForm, PRODUCT_CATEGORIES, BASE_PROVVIGIONALE_OPTIONS } from '@/types/products';
import { ProductType, PREDEFINED_STRUCTURES } from '@/types/product-structures';
import { useProductStructures } from '@/hooks/use-product-structures';
import {
  Package,
  Save,
  ArrowLeft,
  AlertTriangle,
  Settings,
  Info,
  X,
  Upload,
  FileText,
  TrendingUp,
  RefreshCw,
  Image,
  FileImage,
  FileCheck,
  Shield,
  Plus,
  CheckCircle,
  Circle,
  AlertCircle,
  Paperclip,
  Tag,
  Hash,
  Euro,
  Calculator,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { IntegratedConfigurator } from '@/components/products/integrated-configurator';
import { PricingCalculatorSimple } from '@/components/products/pricing-calculator';
import { SmartFileUpload } from '@/components/products/smart-file-upload';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// File upload constants
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

// Extended form type
interface ExtendedUpdateProductForm extends UpdateProductForm {
  product_type: ProductType;
  structure_id?: string;
  URL_Certificazioni?: string;
}

interface FileWithPreview extends File {
  preview?: string;
  id: string;
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
    description: 'Verifica finale e salvataggio modifiche',
    icon: CheckCircle
  }
];

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { loading: productsLoading, updateProduct, fetchSingleProduct } = useProducts();
  
  console.log('🎨 [EDIT] Component mounted/re-rendered:', {
    productId,
    params,
    productsLoading
  });
  const { structures, loading: structuresLoading, error: structuresError } = useProductStructures();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfigurator, setShowConfigurator] = useState(false);
  const [productNotFound, setProductNotFound] = useState(false);
  const [originalProduct, setOriginalProduct] = useState<any>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [fileUploadType, setFileUploadType] = useState<'foto' | 'schede' | 'manuali' | 'certificazioni' | ''>('');
  const [uploadedFiles, setUploadedFiles] = useState<{
    foto?: string[];
    schede?: string[];
    manuali?: string[];
    certificazioni?: string[];
  }>({});
  const [dragActive, setDragActive] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [provvigioneOpen, setProvvigioneOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('product');
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [sectionsWithErrors, setSectionsWithErrors] = useState<Set<string>>(new Set());
  const [categories, setCategories] = useState<any[]>([]);
  
  const [formData, setFormData] = useState<any>({
    Codice: '',
    Nome: '',
    Descrizione: '',
    ID_Categoria: 1,
    Prezzo_Listino: undefined,
    Prezzo_Acquisto: undefined,
    Sconto_Massimo: undefined,
    Prezzo_2: undefined,
    Prezzo_3: undefined,
    Percentuale_Provvigione_Standard: undefined,
    Base_Provvigionale: 'Prezzo_Vendita',
    Attivo: true,
    In_Evidenza: false,
    product_type: 'semplice',
    structure_id: undefined,
  });

  // Helper functions for structured products
  const isStructuredProduct = (product?: any): boolean => {
    if (!product) return false;
    
    // Metodo 1: Controlla se la descrizione contiene configurazione JSON
    if (product.Descrizione && 
        (product.Descrizione.includes('"configurazione"') || product.Descrizione.includes('"Configurazione"'))) {
      return true;
    }
    
    // Metodo 2: Controlla il codice matrice (prodotti strutturati hanno codici lunghi e complessi)
    if (product.Codice_Matrice && product.Codice_Matrice.length >= 15) {
      return true;
    }
    
    // Metodo 3: Controlla il nome prodotto per parole chiave del configuratore
    if (product.Nome_Prodotto) {
      const structuredKeywords = ['Larghezza', 'Lunghezza', 'Taglia', 'Topper', 'Cover', 'medium', 'hard', 'cm'];
      const keywordMatches = structuredKeywords.filter(keyword => 
        product.Nome_Prodotto.includes(keyword)
      ).length;
      
      // Se ha almeno 3 parole chiave del configuratore, è probabilmente strutturato
      if (keywordMatches >= 3) {
        return true;
      }
    }
    
    // Metodo 4: Nome molto lungo (i nomi generati automaticamente sono lunghi)
    if (product.Nome_Prodotto && product.Nome_Prodotto.length > 80) {
      return true;
    }
    
    return false;
  };

  const extractConfigurationJSON = (product?: any): any => {
    if (!product || !isStructuredProduct(product)) return null;
    
    // Prova prima dal nuovo campo Metadata
    if (product.Metadata) {
      try {
        const parsedMetadata = JSON.parse(product.Metadata);
        if (parsedMetadata.configurazione && parsedMetadata.tipo === 'prodotto_strutturato') {
          console.log('✅ [EDIT] Found configuration in Metadata:', parsedMetadata.configurazione);
          return parsedMetadata.configurazione;
        }
      } catch (error) {
        console.warn('Could not parse Metadata JSON:', error);
      }
    }
    
    // Fallback: prova dalla Descrizione (formato legacy)
    if (product.Descrizione) {
      try {
        // Prova prima con il formato legacy completo
        const parsedDescription = JSON.parse(product.Descrizione);
        if (parsedDescription.configurazione && parsedDescription.tipo === 'prodotto_strutturato') {
          console.log('✅ [EDIT] Found legacy format configuration in Description:', parsedDescription.configurazione);
          return parsedDescription.configurazione;
        }
        
        // Fallback: prova con il formato vecchissimo (solo configurazione)
        if (parsedDescription.structure_name || parsedDescription.selected_variants) {
          console.log('✅ [EDIT] Found old format configuration:', parsedDescription);
          return parsedDescription;
        }
      } catch (error) {
        // Se il JSON parsing fallisce, prova con regex per il formato vecchio
        try {
          const jsonMatch = product.Descrizione.match(/\{[\s\S]*"configurazione"[\s\S]*\}/i);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            console.log('✅ [EDIT] Found regex-extracted configuration:', parsed);
            return parsed;
          }
        } catch (regexError) {
          console.warn('Could not extract configuration JSON:', error, regexError);
        }
      }
    }
    
    // Se non c'è configurazione JSON ma è strutturato, restituisce un oggetto vuoto
    if (isStructuredProduct(product)) {
      console.log('⚠️ [EDIT] Structured product without configuration JSON');
      return {
        structure_name: null,
        selected_variants: {},
        note: 'Prodotto strutturato legacy - configurazione non disponibile'
      };
    }
    
    return null;
  };

  // Load existing product data
  useEffect(() => {
    const loadProduct = async () => {
      if (!productId) return;
      
      console.log('🔄 [EDIT] Loading single product:', productId);
      setDataLoaded(false);
      setOriginalProduct(null);
      setProductNotFound(false);
      
      try {
        const product = await fetchSingleProduct(productId);
        
        if (product) {
          console.log('✅ [EDIT] Product loaded successfully:', product);
          setOriginalProduct(product);
          const productType = isStructuredProduct(product) ? 'strutturato' : 'semplice';
          
          console.log('🔍 [EDIT] Product type detection:', {
            productType,
            codiceLength: product.Codice_Matrice?.length,
            nomeLength: product.Nome_Prodotto?.length,
            hasDescription: !!product.Descrizione,
            nome: product.Nome_Prodotto
          });
          
          const formDataToSet = {
            Codice: product.Codice_Matrice || '', // Mappa da Codice_Matrice a Codice per essere coerente con il form
            Nome: product.Nome_Prodotto || '', // Mappa da Nome_Prodotto a Nome
            Descrizione: product.Descrizione || '',
            ID_Categoria: categories.find(c => c.Nome === product.Categoria)?.ID_Categoria || 1, // Mappa da Categoria a ID_Categoria
            Prezzo_Listino: product.Prezzo_Listino_Attuale !== undefined && product.Prezzo_Listino_Attuale !== null ? product.Prezzo_Listino_Attuale : undefined,
            Prezzo_Acquisto: product.Costo_Attuale !== undefined && product.Costo_Attuale !== null ? product.Costo_Attuale : undefined,
            Sconto_Massimo: product.Sconto_Massimo,
            Prezzo_2: product.Prezzo_2,
            Prezzo_3: product.Prezzo_3,
            Percentuale_Provvigione_Standard: product.Percentuale_Provvigione_Standard !== undefined && product.Percentuale_Provvigione_Standard !== null ? product.Percentuale_Provvigione_Standard : undefined,
            Base_Provvigionale: product.Base_Provvigionale || 'Prezzo_Vendita',
            Attivo: product.Attivo ?? true,
            In_Evidenza: product.In_Evidenza ?? false,
            URL_Immagine_Principale: product.URL_Immagine_Principale || '',
            URL_Scheda_Tecnica: product.URL_Scheda_Tecnica || '',
            URL_Certificazioni: product.URL_Certificazioni || '',
            product_type: productType,
            structure_id: productType === 'strutturato' ? (
              extractConfigurationJSON(product)?.structure_name || undefined
            ) : undefined,
          };
          
          console.log('📝 [EDIT] Setting form data:', formDataToSet);
          setFormData(formDataToSet);
          setDataLoaded(true);
        } else {
          console.log('❌ [EDIT] Product not found');
          setProductNotFound(true);
          setDataLoaded(true);
        }
      } catch (error) {
        console.error('❌ [EDIT] Error loading product:', error);
        setProductNotFound(true);
        setDataLoaded(true);
      }
    };
    
    loadProduct();
  }, [productId, fetchSingleProduct]);

  // Get current product info for breadcrumb
  const productName = originalProduct?.Nome_Prodotto || 'Prodotto';

  // Carica categorie
  useEffect(() => {
    const loadCategories = async () => {
      // Simuliamo le categorie - in reale andrebbero caricate da API
      setCategories([
        { ID_Categoria: 1, Nome: 'Materassi' },
        { ID_Categoria: 2, Nome: 'Reti' },
        { ID_Categoria: 3, Nome: 'Cuscini' },
        { ID_Categoria: 4, Nome: 'Accessori' },
      ]);
    };
    loadCategories();
  }, []);

  // Funzioni per gestione step intelligente
  const validateSection = (sectionId: string): boolean => {
    const sectionErrors: Record<string, string> = {};
    
    switch (sectionId) {
      case 'product':
        // Validazione categoria
        if (!formData.ID_Categoria) sectionErrors.categoria = 'Categoria richiesta';
        
        // Validazione struttura per prodotti strutturati
        if (formData.product_type === 'strutturato' && !formData.structure_id) {
          sectionErrors.structure_id = 'Struttura richiesta per prodotti strutturati';
        }
        
        // Validazione codice e nome per prodotti semplici
        if (formData.product_type === 'semplice') {
          if (!formData.Codice?.trim()) sectionErrors.Codice = 'Codice obbligatorio';
          if (!formData.Nome?.trim()) sectionErrors.Nome = 'Nome obbligatorio';
        }
        break;
        
      case 'pricing':
        if (formData.Prezzo_Listino !== undefined && formData.Prezzo_Listino < 0) {
          sectionErrors.Prezzo_Listino = 'Prezzo non può essere negativo';
        }
        if (formData.Prezzo_Acquisto !== undefined && formData.Prezzo_Acquisto < 0) {
          sectionErrors.Prezzo_Acquisto = 'Costo non può essere negativo';
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
        const hasBasicInfo = !!formData.ID_Categoria && 
                           (formData.product_type !== 'strutturato' || !!formData.structure_id);
        const hasIdentification = formData.product_type === 'strutturato' || 
                                 (!!(formData.Codice?.trim()) && !!(formData.Nome?.trim()));
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

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate code only for simple products
    if (formData.product_type === 'semplice') {
      if (!formData.Codice?.trim()) {
        newErrors.Codice = 'Il codice è obbligatorio per prodotti semplici';
      } else if (formData.Codice.length < 2) {
        newErrors.Codice = 'Il codice deve essere di almeno 2 caratteri';
      }
    }

    // Validate name only for simple products
    if (formData.product_type === 'semplice') {
      if (!formData.Nome?.trim()) {
        newErrors.Nome = 'Il nome del prodotto è obbligatorio';
      } else if (formData.Nome.length < 2) {
        newErrors.Nome = 'Il nome deve essere di almeno 2 caratteri';
      }
    }
    // For structured products, name will be auto-generated in configurator
    // so we don't validate it here, but we need to validate structure_id
    if (formData.product_type === 'strutturato') {
      if (!formData.structure_id) {
        newErrors.structure_id = 'Seleziona una struttura per il prodotto strutturato';
      }
    }


    if (formData.Prezzo_Listino !== undefined && formData.Prezzo_Listino < 0) {
      newErrors.Prezzo_Listino = 'Il prezzo non può essere negativo';
    }

    if (formData.Prezzo_Acquisto !== undefined && formData.Prezzo_Acquisto < 0) {
      newErrors.Prezzo_Acquisto = 'Il costo non può essere negativo';
    }

    // Margine is auto-calculated, no manual validation needed

    if (formData.Percentuale_Provvigione_Standard !== undefined && (formData.Percentuale_Provvigione_Standard < 0 || formData.Percentuale_Provvigione_Standard > 50)) {
      newErrors.Percentuale_Provvigione_Standard = 'La provvigione deve essere tra 0 e 50%';
    }

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
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };

      // Auto-calculate margin when cost or selling price changes
      if (field === 'Prezzo_Acquisto' || field === 'Prezzo_Listino') {
        const costo = field === 'Prezzo_Acquisto' ? value : prev.Prezzo_Acquisto;
        const prezzo = field === 'Prezzo_Listino' ? value : prev.Prezzo_Listino;
        // Il margine non viene salvato nel formData, viene solo calcolato per la visualizzazione
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

    // If switching to structured product type, clear codice
    if (field === 'product_type' && value === 'strutturato') {
      setFormData(prev => ({
        ...prev,
        Codice: '',
        structure_id: undefined
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
        // Per prodotti strutturati, andiamo al configuratore
        setShowConfigurator(true);
        toast.success('Dati base preparati! Ora configura le varianti per completare l\'aggiornamento.');
      } else {
        // Per prodotti semplici, aggiorniamo direttamente
        const updateData: UpdateProductForm = {
          Codice_Matrice: formData.Codice_Matrice,
          Nome_Prodotto: formData.Nome_Prodotto,
          Descrizione: formData.Descrizione,
          Categoria: formData.Categoria as any,
          Prezzo_Listino_Attuale: formData.Prezzo_Listino_Attuale,
          Costo_Attuale: formData.Costo_Attuale,
          Margine_Standard: formData.Margine_Standard ? formData.Margine_Standard / 100 : undefined,
          Percentuale_Provvigione_Standard: formData.Percentuale_Provvigione_Standard,
          Base_Provvigionale: formData.Base_Provvigionale as any,
          Attivo: formData.Attivo,
          In_Evidenza: formData.In_Evidenza,
          URL_Immagine_Principale: formData.URL_Immagine_Principale,
          URL_Scheda_Tecnica: formData.URL_Scheda_Tecnica,
          URL_Certificazioni: formData.URL_Certificazioni,
        };
        
        const success = await updateProduct(productId, updateData);
        
        if (success) {
          toast.success('Prodotto aggiornato con successo!');
          router.push('/products');
        } else {
          throw new Error('Errore durante l\'aggiornamento del prodotto');
        }
      }
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento del prodotto');
    } finally {
      setLoading(false);
    }
  };

  // Handle configurator completion
  const handleConfiguratorComplete = async (generatedCode: string, generatedName: string, variantConfiguration: any) => {
    setLoading(true);
    
    try {
      // Aggiorniamo il prodotto con i dati del configuratore
      const updateData: UpdateProductForm = {
        Codice_Matrice: generatedCode,
        Nome_Prodotto: generatedName,
        // Descrizione generata dal configuratore (leggibile)
        Descrizione: variantConfiguration.generated_description || formData.Descrizione,
        Categoria: formData.Categoria as any,
        Prezzo_Listino_Attuale: variantConfiguration.final_pricing?.totalPrice || formData.Prezzo_Listino_Attuale,
        Costo_Attuale: variantConfiguration.final_pricing?.totalCost || formData.Costo_Attuale,
        Margine_Standard: variantConfiguration.final_pricing?.margin ? variantConfiguration.final_pricing.margin / 100 : undefined,
        Percentuale_Provvigione_Standard: formData.Percentuale_Provvigione_Standard,
        Base_Provvigionale: formData.Base_Provvigionale as any,
        Attivo: formData.Attivo,
        In_Evidenza: formData.In_Evidenza,
        URL_Immagine_Principale: formData.URL_Immagine_Principale,
        URL_Scheda_Tecnica: formData.URL_Scheda_Tecnica,
        URL_Certificazioni: formData.URL_Certificazioni,
        // Salviamo la configurazione JSON nel campo Metadata
        Metadata: JSON.stringify({
          configurazione: variantConfiguration,
          descrizione_utente: formData.Descrizione || '',
          aggiornato_il: new Date().toISOString(),
          tipo: 'prodotto_strutturato'
        }, null, 2),
      };
      
      const success = await updateProduct(productId, updateData);
      
      if (success) {
        toast.success(`Prodotto strutturato aggiornato! Codice: ${generatedCode}`);
        router.push('/products');
      } else {
        throw new Error('Errore durante l\'aggiornamento del prodotto strutturato');
      }
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento del prodotto strutturato');
    } finally {
      setLoading(false);
    }
  };

  // Handle back to form from configurator
  const handleBackToForm = () => {
    setShowConfigurator(false);
  };

  // Helper functions for file upload
  const getFileUploadLabel = (type: string) => {
    switch (type) {
      case 'foto': return 'Foto Prodotto';
      case 'schede': return 'Schede Tecniche';
      case 'manuali': return 'Manuali';
      case 'certificazioni': return 'Certificazioni';
      default: return 'File';
    }
  };

  const getFileUploadDescription = (type: string) => {
    switch (type) {
      case 'foto': return 'Immagine principale del prodotto';
      case 'schede': return 'Documenti tecnici del prodotto';
      case 'manuali': return 'Manuali d\'uso e installazione';
      case 'certificazioni': return 'Certificazioni e documenti ufficiali';
      default: return 'Seleziona un file da caricare';
    }
  };

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File troppo grande (max ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB)`;
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${file.name}: Tipo file non supportato`;
    }
    
    return null;
  };

  const uploadFileToBlob = async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', 'products'); // Specifica la categoria per i prodotti
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }
    
    const result = await response.json();
    return result.attachment;
  };

  const processFiles = useCallback(async (fileList: FileList | File[], type: string) => {
    if (!type) return;
    
    const errors: string[] = [];
    
    // First validate all files
    Array.from(fileList).forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      }
    });
    
    if (errors.length > 0) {
      setUploadErrors(errors);
      return;
    }
    
    // Start upload process
    setUploading(true);
    setUploadErrors([]);
    
    const uploadedUrls: string[] = [];
    const uploadErrors: string[] = [];
    
    for (const file of Array.from(fileList)) {
      try {
        console.log(`[Upload] Uploading ${file.name} for ${type}...`);
        const attachment = await uploadFileToBlob(file);
        uploadedUrls.push(attachment.url);
        console.log(`[Upload] Uploaded ${file.name} successfully`);
      } catch (error) {
        console.error(`[Upload] Failed to upload ${file.name}:`, error);
        uploadErrors.push(`${file.name}: ${error instanceof Error ? error.message : 'Upload failed'}`);
      }
    }
    
    if (uploadErrors.length > 0) {
      setUploadErrors(uploadErrors);
    }
    
    // Update uploaded files for the current type
    if (uploadedUrls.length > 0) {
      setUploadedFiles(prev => ({
        ...prev,
        [type]: [...(prev[type as keyof typeof prev] || []), ...uploadedUrls]
      }));
    }
    
    setUploading(false);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && fileUploadType) {
      await processFiles(e.dataTransfer.files, fileUploadType);
    }
  }, [processFiles, fileUploadType]);

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && fileUploadType) {
      await processFiles(e.target.files, fileUploadType);
    }
    // Reset input per permettere di selezionare di nuovo lo stesso file
    e.target.value = '';
  }, [processFiles, fileUploadType]);

  const removeUploadedFile = useCallback((type: string) => {
    setUploadedFiles(prev => ({
      ...prev,
      [type]: undefined
    }));
  }, []);

  // Loading state (either products loading or data not loaded yet)
  if (productsLoading || !dataLoaded) {
    return (
      <AppLayoutCustom>
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <PageBreadcrumb 
            pageName="Modifica Prodotto" 
            items={[
              { label: 'Prodotti', href: '/products' },
              { label: 'Modifica Prodotto' }
            ]}
          />
          <div className="px-4 lg:px-6 space-y-4">
            <div className="h-8 bg-muted animate-pulse rounded" />
            <div className="grid gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
                    <div className="h-10 bg-muted animate-pulse rounded" />
                    <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
                    <div className="h-10 bg-muted animate-pulse rounded" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AppLayoutCustom>
    );
  }

  // Product not found
  if (productNotFound) {
    return (
      <AppLayoutCustom>
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <PageBreadcrumb 
            pageName="Prodotto non trovato" 
            items={[
              { label: 'Prodotti', href: '/products' },
              { label: 'Modifica Prodotto' }
            ]}
          />
          <div className="px-4 lg:px-6">
            <Alert className="max-w-2xl">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Il prodotto richiesto non è stato trovato.</span>
                <Button variant="outline" asChild>
                  <Link href="/products">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Torna ai Prodotti
                  </Link>
                </Button>
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
          pageName={showConfigurator ? "Configuratore Prodotto" : "Modifica Prodotto"} 
          items={[
            { label: 'Prodotti', href: '/products' },
            { label: showConfigurator ? 'Configuratore Prodotto' : 'Modifica Prodotto' }
          ]}
        />

        <div className="px-4 lg:px-6">
          <div className="flex flex-col gap-6">
            {/* Rendering condizionale basato sullo step */}
            {!showConfigurator ? (
              <>
                {/* Header moderno in stile structure-variants */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <h1 className="text-2xl font-bold tracking-tight">Modifica Prodotto</h1>
                    </div>
                    <p className="text-muted-foreground">
                      Aggiorna le informazioni del prodotto {formData.product_type === 'semplice' ? 'semplice' : 'strutturato con varianti'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push('/products')}
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
                                    value={formData.ID_Categoria?.toString()}
                                    onValueChange={(value) => handleInputChange('ID_Categoria', parseInt(value))}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Seleziona categoria" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {categories.map((cat) => (
                                        <SelectItem key={cat.ID_Categoria} value={cat.ID_Categoria.toString()}>
                                          {cat.Nome}
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
                                      value={formData.structure_id}
                                      onValueChange={(value) => handleInputChange('structure_id', value)}
                                    >
                                      <SelectTrigger className={cn('w-full', errors.structure_id ? 'border-red-500' : '')}>
                                        <SelectValue placeholder="Seleziona una struttura" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {structures.map((str) => (
                                          <SelectItem key={str.id || str.name} value={str.name}>
                                            <Settings className="mr-2 h-4 w-4" />
                                            {str.name}
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
                                        value={formData.Codice || ''}
                                        onChange={(e) => handleInputChange('Codice', e.target.value)}
                                        placeholder="es. MAT001"
                                        className={errors.Codice ? 'border-red-500' : ''}
                                      />
                                      {errors.Codice && (
                                        <p className="text-sm text-red-600 flex items-center">
                                          <AlertTriangle className="h-4 w-4 mr-1" />
                                          {errors.Codice}
                                        </p>
                                      )}
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <Label htmlFor="nome">Nome Prodotto *</Label>
                                      <Input
                                        id="nome"
                                        value={formData.Nome || ''}
                                        onChange={(e) => handleInputChange('Nome', e.target.value)}
                                        placeholder="es. Materasso Memory Foam Premium"
                                        className={errors.Nome ? 'border-red-500' : ''}
                                      />
                                      {errors.Nome && (
                                        <p className="text-sm text-red-600 flex items-center">
                                          <AlertTriangle className="h-4 w-4 mr-1" />
                                          {errors.Nome}
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
                                      value={formData.Descrizione || ''}
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
                                prezzo={formData.Prezzo_Listino}
                                costo={formData.Prezzo_Acquisto}
                                margine={calculateMargin(formData.Prezzo_Acquisto, formData.Prezzo_Listino)}
                                onPriceChange={(price) => handleInputChange('Prezzo_Listino', price)}
                                onCostChange={(cost) => handleInputChange('Prezzo_Acquisto', cost)}
                                errors={{
                                  prezzo: errors.Prezzo_Listino,
                                  costo: errors.Prezzo_Acquisto,
                                }}
                              />

                              {/* Prezzi aggiuntivi e provvigioni */}
                              <div className="space-y-6">
                                <div className="flex items-center space-x-2 pb-2 border-b border-muted">
                                  <Euro className="h-4 w-4 text-muted-foreground" />
                                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Prezzi Aggiuntivi</h4>
                                </div>
                                
                                <div className="grid gap-4 sm:grid-cols-3">
                                  <div className="space-y-2">
                                    <Label htmlFor="prezzo-2">Prezzo 2 (€)</Label>
                                    <Input
                                      id="prezzo-2"
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder="0.00"
                                      value={formData.Prezzo_2 || ''}
                                      onChange={(e) => handleInputChange('Prezzo_2', e.target.value ? parseFloat(e.target.value) : undefined)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="prezzo-3">Prezzo 3 (€)</Label>
                                    <Input
                                      id="prezzo-3"
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder="0.00"
                                      value={formData.Prezzo_3 || ''}
                                      onChange={(e) => handleInputChange('Prezzo_3', e.target.value ? parseFloat(e.target.value) : undefined)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor="sconto">Sconto Massimo (%)</Label>
                                    <Input
                                      id="sconto"
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.1"
                                      placeholder="0.0"
                                      value={formData.Sconto_Massimo || ''}
                                      onChange={(e) => handleInputChange('Sconto_Massimo', e.target.value ? parseFloat(e.target.value) : undefined)}
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Provvigioni */}
                              <div className="space-y-6">
                                <div className="flex items-center space-x-2 pb-2 border-b border-muted">
                                  <Calculator className="h-4 w-4 text-muted-foreground" />
                                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Provvigioni</h4>
                                </div>
                                
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <div className="space-y-2">
                                    <Label htmlFor="provvigione">Percentuale (%)</Label>
                                    <Input
                                      id="provvigione"
                                      type="number"
                                      min="0"
                                      max="50"
                                      step="0.1"
                                      placeholder="0.0"
                                      value={formData.Percentuale_Provvigione_Standard || ''}
                                      onChange={(e) => handleInputChange('Percentuale_Provvigione_Standard', e.target.value ? parseFloat(e.target.value) : undefined)}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Base di Calcolo</Label>
                                    <Select
                                      value={formData.Base_Provvigionale}
                                      onValueChange={(value) => handleInputChange('Base_Provvigionale', value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Seleziona base" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {BASE_PROVVIGIONALE_OPTIONS.map((option) => (
                                          <SelectItem key={option} value={option}>
                                            {option.replace('_', ' ')}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>
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
                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Riepilogo Modifiche</h4>
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
                                      <p className="text-sm font-medium">
                                        {categories.find(cat => cat.ID_Categoria === formData.ID_Categoria)?.Nome || 'Non selezionata'}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Nome prodotto */}
                                  {formData.Nome && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">NOME</p>
                                      <p className="text-sm font-medium">{formData.Nome}</p>
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
                                  {(formData.Prezzo_Listino || formData.Prezzo_Acquisto) && (
                                    <div className="grid gap-4 sm:grid-cols-4 p-3 bg-muted/30 rounded-lg">
                                      <div className="text-center">
                                        <p className="text-xs text-muted-foreground mb-1">Prezzo Vendita</p>
                                        <p className="font-semibold">€{formData.Prezzo_Listino?.toFixed(2) || '0.00'}</p>
                                      </div>
                                      <div className="text-center">
                                        <p className="text-xs text-muted-foreground mb-1">Costo Base</p>
                                        <p className="font-semibold">€{formData.Prezzo_Acquisto?.toFixed(2) || '0.00'}</p>
                                      </div>
                                      <div className="text-center">
                                        <p className="text-xs text-muted-foreground mb-1">Costo + Tasse</p>
                                        <p className="font-semibold">€{((formData.Prezzo_Acquisto || 0) * 1.17).toFixed(2)}</p>
                                      </div>
                                      <div className="text-center">
                                        <p className="text-xs text-muted-foreground mb-1">Profitto Netto</p>
                                        <p className={cn('font-semibold', 
                                          ((formData.Prezzo_Listino || 0) - ((formData.Prezzo_Acquisto || 0) * 1.17)) >= 0 
                                            ? 'text-green-600' 
                                            : 'text-red-600'
                                        )}>
                                          €{((formData.Prezzo_Listino || 0) - ((formData.Prezzo_Acquisto || 0) * 1.17)).toFixed(2)}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Stati */}
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
                                  
                                  {/* Alert per prodotti strutturati */}
                                  {formData.product_type === 'strutturato' && (
                                    <Alert>
                                      <Info className="h-4 w-4" />
                                      <AlertDescription className="text-sm">
                                        Le modifiche al configuratore possono generare nuovi codici e nomi.
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
                                        Aggiornamento...
                                      </>
                                    ) : formData.product_type === 'strutturato' ? (
                                      <>
                                        <Settings className="mr-2 h-4 w-4" />
                                        Apri Configuratore
                                      </>
                                    ) : (
                                      <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Salva Modifiche
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
                productData={{
                  ...formData,
                  structure_id: formData.structure_id,
                  ...(originalProduct && isStructuredProduct(originalProduct) ? {
                    existing_configuration: extractConfigurationJSON(originalProduct)
                  } : {})
                }}
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
