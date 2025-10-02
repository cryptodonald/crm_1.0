/**
 * Interfacce TypeScript per Sistema Products
 * Basate sulla struttura Airtable della tabella Products
 */

// ============================================================================
// BASE TYPES
// ============================================================================

export interface AirtableRecord<T = any> {
  id: string;
  createdTime: string;
  fields: T;
}

// ============================================================================
// PRODUCT TYPES
// ============================================================================

export type ProductCategory = 'Materassi' | 'Accessori' | 'Cuscini' | 'Basi' | 'Altro';
export type BaseProvvigionale = 'Prezzo_Vendita' | 'Margine';

export interface Product {
  id: string;
  createdTime: string;
  
  // Identificatori
  Codice_Matrice: string; // Primary field
  Nome_Prodotto: string;
  
  // Informazioni base
  Descrizione?: string;
  Categoria?: ProductCategory;
  
  // Prezzi e costi
  Prezzo_Listino_Attuale?: number;
  Costo_Attuale?: number;
  Margine_Standard?: number; // Percentuale
  
  // Provvigioni
  Percentuale_Provvigione_Standard?: number;
  Base_Provvigionale?: BaseProvvigionale;
  
  // Media e documenti (attachments)
  Foto_Prodotto?: Array<{
    id: string;
    url: string;
    filename: string;
    size?: number;
    type?: string;
    thumbnails?: {
      small: { url: string; width: number; height: number };
      large: { url: string; width: number; height: number };
      full: { url: string; width: number; height: number };
    };
  }>;
  Schede_Tecniche?: Array<{
    id: string;
    url: string;
    filename: string;
    size?: number;
    type?: string;
  }>;
  Manuali?: Array<{
    id: string;
    url: string;
    filename: string;
    size?: number;
    type?: string;
  }>;
  Certificazioni?: Array<{
    id: string;
    url: string;
    filename: string;
    size?: number;
    type?: string;
  }>;
  
  // URL diretti (blob storage)
  URL_Immagine_Principale?: string;
  URL_Immagini_Galleria?: string; // JSON array serializzato
  URL_Scheda_Tecnica?: string;
  URL_Certificazioni?: string; // JSON array serializzato
  URL_Video_Prodotto?: string;
  
  // Stati
  Attivo: boolean;
  In_Evidenza: boolean;
  
  // Relazioni con altre tabelle
  Product_Variants?: string[]; // IDs delle varianti
  Product_Price_History?: string[]; // IDs della cronologia prezzi
  Order_Items?: string[]; // IDs degli ordini che includono questo prodotto
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface ProductFormData {
  Codice_Matrice: string;
  Nome_Prodotto: string;
  Descrizione?: string;
  Categoria?: ProductCategory;
  Prezzo_Listino_Attuale?: number;
  Costo_Attuale?: number;
  Margine_Standard?: number;
  Percentuale_Provvigione_Standard?: number;
  Base_Provvigionale?: BaseProvvigionale;
  Attivo: boolean;
  In_Evidenza: boolean;
  URL_Immagine_Principale?: string;
  URL_Immagini_Galleria?: string;
  URL_Scheda_Tecnica?: string;
  URL_Certificazioni?: string;
  URL_Video_Prodotto?: string;
}

export interface CreateProductForm {
  Codice_Matrice: string;
  Nome_Prodotto: string;
  Descrizione?: string;
  Categoria?: ProductCategory;
  Prezzo_Listino_Attuale?: number;
  Costo_Attuale?: number;
  Margine_Standard?: number;
  Percentuale_Provvigione_Standard?: number;
  Base_Provvigionale?: BaseProvvigionale;
  Attivo?: boolean; // Default true
  In_Evidenza?: boolean; // Default false
  URL_Immagine_Principale?: string;
  URL_Scheda_Tecnica?: string;
  URL_Video_Prodotto?: string;
}

export interface UpdateProductForm extends Partial<CreateProductForm> {
  // Tutti i campi sono opzionali per gli update
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface ProductFilters {
  categoria?: ProductCategory[];
  attivo?: boolean;
  in_evidenza?: boolean;
  prezzo_min?: number;
  prezzo_max?: number;
  margine_min?: number;
  margine_max?: number;
  search?: string; // Per cercare in nome, codice, descrizione
}

export interface ProductSortOptions {
  field: 'Nome_Prodotto' | 'Codice_Matrice' | 'Prezzo_Listino_Attuale' | 'Categoria' | 'createdTime';
  direction: 'asc' | 'desc';
}

// ============================================================================
// STATISTICS TYPES
// ============================================================================

export interface ProductsStats {
  totale: number;
  attivi: number;
  inEvidenza: number;
  byCategoria: Record<ProductCategory, number>;
  prezzoMedio: number;
  prezzoTotaleInventario: number;
  margineMediaPonderata: number;
  senzaImmagini: number;
  creatiUltimi7Giorni: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ProductsListResponse {
  records: Product[];
  offset?: string;
  totalRecords?: number;
  fromCache?: boolean;
}

export interface CreateProductResponse {
  success: boolean;
  product: Product;
  _timing?: {
    total: number;
    cached: boolean;
  };
}

export interface UpdateProductResponse {
  success: boolean;
  product: Product;
  _timing?: {
    total: number;
  };
}

export interface DeleteProductsResponse {
  success: boolean;
  deleted: number;
  requested: number;
  deletedIds: string[];
  errors?: string[];
}

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================

export interface UseProductsListReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  stats: ProductsStats | null;
  refresh: () => Promise<void>;
  createProduct: (data: CreateProductForm) => Promise<boolean>;
  updateProduct: (productId: string, data: UpdateProductForm) => Promise<boolean>;
  deleteProduct: (productId: string) => Promise<boolean>;
  deleteMultipleProducts: (productIds: string[]) => Promise<number>;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type ProductTableField = keyof Product;

export interface ProductOption {
  label: string;
  value: string;
  category?: ProductCategory;
  prezzo?: number;
  attivo?: boolean;
}

// Per il form di upload di media
export interface ProductMediaUpload {
  type: 'image' | 'document' | 'video';
  file: File;
  categoria: 'foto' | 'scheda_tecnica' | 'manuale' | 'certificazione';
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  'Materassi',
  'Accessori', 
  'Cuscini',
  'Basi',
  'Altro'
];

export const BASE_PROVVIGIONALE_OPTIONS: BaseProvvigionale[] = [
  'Prezzo_Vendita',
  'Margine'
];

// Validatori per i campi
export const ProductValidation = {
  codiceLengthMin: 2,
  codiceLengthMax: 20,
  nomeLengthMin: 2,
  nomeLengthMax: 100,
  descrizioneLengthMax: 1000,
  prezzoMin: 0,
  prezzoMax: 100000,
  margineMin: 0,
  margineMax: 100,
  provvigioneMin: 0,
  provvigioneMax: 50,
} as const;

export { };