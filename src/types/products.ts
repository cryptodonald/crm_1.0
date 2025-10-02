// Types for Products Management

// Base Product interface (matches Airtable structure)
export interface Product {
  id: string;
  createdTime: string;
  fields: {
    Codice_Matrice: string;
    Nome_Prodotto: string;
    Descrizione?: string;
    Categoria?: ProductCategory;
    Prezzo_Listino_Attuale?: number;
    Costo_Attuale?: number;
    Margine_Standard?: number;
    Percentuale_Provvigione_Standard?: number;
    Base_Provvigionale?: BaseProvvigionale;
    Attivo?: boolean;
    In_Evidenza?: boolean;
    URL_Immagine_Principale?: string;
    URL_Scheda_Tecnica?: string;
    URL_Certificazioni?: string;
    Data_Creazione?: string;
    Data_Ultima_Modifica?: string;
    // Campi attachment per file upload
    Foto_Prodotto?: Array<{url: string, filename: string}>;
    Schede_Tecniche?: Array<{url: string, filename: string}>;
    Manuali?: Array<{url: string, filename: string}>;
    Certificazioni?: Array<{url: string, filename: string}>;
    // Collegamenti alle varianti (sono recuperati tramite chiamate separate)
    Product_Variants?: string[];
  };
}

// Flattened product (easier to work with in components)
export interface FlatProduct {
  id: string;
  createdTime: string;
  Codice_Matrice: string;
  Nome_Prodotto: string;
  Descrizione?: string;
  Categoria?: ProductCategory;
  Prezzo_Listino_Attuale?: number;
  Costo_Attuale?: number;
  Margine_Standard?: number;
  Percentuale_Provvigione_Standard?: number;
  Base_Provvigionale?: BaseProvvigionale;
  Attivo?: boolean;
  In_Evidenza?: boolean;
  URL_Immagine_Principale?: string;
  URL_Scheda_Tecnica?: string;
  URL_Certificazioni?: string;
  Data_Creazione?: string;
  Data_Ultima_Modifica?: string;
  // Campi attachment per file upload
  Foto_Prodotto?: Array<{url: string, filename: string}>;
  Schede_Tecniche?: Array<{url: string, filename: string}>;
  Manuali?: Array<{url: string, filename: string}>;
  Certificazioni?: Array<{url: string, filename: string}>;
  // Collegamenti alle varianti
  variants?: ProductVariant[];
}

// Product Categories (from Airtable metadata)
export type ProductCategory = 
  | 'Materassi'
  | 'Reti'
  | 'Cuscini'  // Updated from 'Guanciali' to match Airtable
  | 'Letti'    // Added from Airtable metadata
  | 'Accessori'
  | 'Altro';
  
// Tipo di variante prodotto
export type VariantType = 
  | 'Dimensione'
  | 'Taglia'
  | 'Topper'
  | 'Cover'
  | 'Accessorio';
  
// Posizione della variante
export type VariantPosition = 
  | 'Sinistra'
  | 'Destra'
  | 'Entrambi'
  | 'Nessuna';

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Materassi',
  'Reti', 
  'Cuscini',   // Updated to match Airtable
  'Letti',     // Added from Airtable
  'Accessori',
  'Altro'
];

export const VARIANT_TYPES: VariantType[] = [
  'Dimensione',
  'Taglia',
  'Topper',
  'Cover',
  'Accessorio'
];

export const VARIANT_POSITIONS: VariantPosition[] = [
  'Sinistra',
  'Destra',
  'Entrambi',
  'Nessuna'
];

// Base Provvigionale options
export type BaseProvvigionale = 'Prezzo_Vendita' | 'Margine';

export const BASE_PROVVIGIONALE_OPTIONS: BaseProvvigionale[] = [
  'Prezzo_Vendita',
  'Margine'
];

// Interface for Product Variant (matches Airtable structure)
export interface ProductVariant {
  id: string;
  createdTime: string;
  fields: {
    Nome_Variante: string;
    ID_Prodotto?: string[];
    Tipo_Variante?: VariantType;
    Codice_Variante?: string;
    Prezzo_Aggiuntivo_Attuale?: number;
    Costo_Aggiuntivo_Attuale?: number;
    Posizione?: VariantPosition;
    Obbligatorio?: boolean;
    Attivo?: boolean;
  };
}

// Flattened variant (easier to work with in components)
export interface FlatProductVariant {
  id: string;
  createdTime: string;
  Nome_Variante: string;
  ID_Prodotto?: string[];
  Tipo_Variante?: VariantType;
  Codice_Variante?: string;
  Prezzo_Aggiuntivo_Attuale?: number;
  Costo_Aggiuntivo_Attuale?: number;
  Posizione?: VariantPosition;
  Obbligatorio?: boolean;
  Attivo?: boolean;
}

// Form data types for variant
export interface CreateProductVariantForm {
  Nome_Variante: string;
  ID_Prodotto: string[];
  Tipo_Variante: VariantType;
  Codice_Variante: string;
  Prezzo_Aggiuntivo_Attuale?: number;
  Costo_Aggiuntivo_Attuale?: number;
  Posizione: VariantPosition;
  Obbligatorio: boolean;
  Attivo: boolean;
}

export interface UpdateProductVariantForm {
  Nome_Variante: string;
  ID_Prodotto: string[];
  Tipo_Variante: VariantType;
  Codice_Variante: string;
  Prezzo_Aggiuntivo_Attuale?: number;
  Costo_Aggiuntivo_Attuale?: number;
  Posizione: VariantPosition;
  Obbligatorio: boolean;
  Attivo: boolean;
}

// File upload interface
export interface FileInfo {
  url: string;
  filename: string;
  size: number;
  type: string;
}

// Form data types
export interface CreateProductForm {
  Codice_Matrice: string;
  Nome_Prodotto: string;
  Descrizione: string;
  Categoria: ProductCategory;
  Prezzo_Listino_Attuale?: number;
  Costo_Attuale?: number;
  Margine_Standard?: number;
  Percentuale_Provvigione_Standard?: number;
  Base_Provvigionale: BaseProvvigionale;
  Attivo: boolean;
  In_Evidenza: boolean;
  URL_Immagine_Principale: string;
  URL_Scheda_Tecnica: string;
  URL_Certificazioni: string;
  // Campi attachment per file upload (updated to FileInfo[])
  Foto_Prodotto?: FileInfo[];
  Schede_Tecniche?: FileInfo[];
  Manuali?: FileInfo[];
  Certificazioni?: FileInfo[];
}

export interface UpdateProductForm {
  Codice_Matrice: string;
  Nome_Prodotto: string;
  Descrizione: string;
  Categoria: ProductCategory;
  Prezzo_Listino_Attuale?: number;
  Costo_Attuale?: number;
  Margine_Standard?: number;
  Percentuale_Provvigione_Standard?: number;
  Base_Provvigionale: BaseProvvigionale;
  Attivo: boolean;
  In_Evidenza: boolean;
  URL_Immagine_Principale: string;
  URL_Scheda_Tecnica: string;
  URL_Certificazioni: string;
  // Campi attachment per file upload (updated to FileInfo[])
  Foto_Prodotto?: FileInfo[];
  Schede_Tecniche?: FileInfo[];
  Manuali?: FileInfo[];
  Certificazioni?: FileInfo[];
}

// Filter types
export interface ProductFilters {
  categoria?: ProductCategory[];
  attivo?: boolean;
  in_evidenza?: boolean;
  prezzo_min?: number;
  prezzo_max?: number;
  search?: string;
}

// API Response types
export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductVariantsResponse {
  variants: ProductVariant[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductStatsResponse {
  totalProducts: number;
  activeProducts: number;
  featuredProducts: number;
  totalInventoryValue: number;
  averageMargin: number;
  categoryBreakdown: Record<ProductCategory, number>;
}

// Hook state types
export interface UseProductsListReturn {
  products: FlatProduct[];
  loading: boolean;
  error: string | null;
  stats: ProductStatsResponse | null;
  
  // CRUD operations
  createProduct: (data: CreateProductForm) => Promise<{ id: string; success: boolean } | { success: false }>;
  updateProduct: (id: string, data: UpdateProductForm) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  deleteProducts: (ids: string[]) => Promise<boolean>;
  
  // Filtering & Searching
  filters: ProductFilters;
  setFilters: (filters: ProductFilters) => void;
  clearFilters: () => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  
  // Utility functions
  refresh: () => Promise<void>;
  getProductById: (id: string) => FlatProduct | undefined;
}

// Hook per la gestione delle varianti di prodotto
export interface UseProductVariantsReturn {
  variants: FlatProductVariant[];
  loading: boolean;
  error: string | null;
  
  // CRUD operations
  createVariant: (data: CreateProductVariantForm) => Promise<boolean>;
  updateVariant: (id: string, data: UpdateProductVariantForm) => Promise<boolean>;
  deleteVariant: (id: string) => Promise<boolean>;
  deleteVariants: (ids: string[]) => Promise<boolean>;
  
  // Filtri
  variantsByProductId: (productId: string) => FlatProductVariant[];
  variantsByType: (type: VariantType) => FlatProductVariant[];
  activeVariants: () => FlatProductVariant[];
  
  // Utility functions
  refresh: () => Promise<void>;
  getVariantById: (id: string) => FlatProductVariant | undefined;
}

// Hook per il configuratore di prodotti
export interface UseProductConfiguratorReturn {
  product: FlatProduct | null;
  selectedVariants: FlatProductVariant[];
  loading?: boolean;
  
  // Operazioni di configurazione
  selectProduct: (productId: string) => Promise<void>;
  addVariant: (variantId: string) => void;
  removeVariant: (variantId: string) => void;
  clearVariants: () => void;
  
  // Calcoli
  totalPrice: number;
  totalCost: number;
  margine: number;
  
  // Utility functions
  generateOrderItem: () => OrderItemData;
  generateConfigurationJSON: () => string;
  setQuantity: (qty: number) => void;
  
  // Varianti raggruppate per tipo
  variantsByType: Record<VariantType, FlatProductVariant[]>;
}

// Tipo per Order Items
export interface OrderItemData {
  ID_Ordine: string[];
  ID_Prodotto: string[];
  Configurazione_Varianti: string[];
  Quantita: number;
  Prezzo_Unitario: number;
  Costo_Unitario: number;
  Sconto_Percentuale?: number;
  Sconto_Importo?: number;
  Prezzo_Finale_Unitario: number;
  Totale_Riga: number;
  Configurazione_JSON: string;
  Note_Configurazione?: string;
  Codice_Prodotto_Configurato: string;
  Nome_Prodotto_Personalizzato?: string;
}

// Validation schemas (can be used with zod later)
export interface ProductValidationRules {
  codice_matrice: {
    required: boolean;
    min_length: number;
    max_length: number;
  };
  nome_prodotto: {
    required: boolean;
    min_length: number;
    max_length: number;
  };
  prezzo_min: number;
  margine_max: number;
  provvigione_max: number;
}

export const PRODUCT_VALIDATION: ProductValidationRules = {
  codice_matrice: {
    required: true,
    min_length: 2,
    max_length: 50
  },
  nome_prodotto: {
    required: true,
    min_length: 2,
    max_length: 200
  },
  prezzo_min: 0,
  margine_max: 100,
  provvigione_max: 50
};