// Types for Structured Products System
export type ProductType = 'semplice' | 'strutturato';

// Structure field configuration
export interface StructureField {
  id: string;
  name: string;
  position: number;
  length: number;
  placeholder: string; // e.g., "##" for empty fields
  required: boolean;
  description?: string;
}

// Variant option for a specific field
export interface VariantOption {
  id: string;
  code: string; // The code that goes in the product code (e.g., "M3", "160", "T4")
  name: string; // Human readable name (e.g., "Modello Comfort", "Larghezza 160cm", "Topper Memory")
  description?: string;
  price_modifier?: number; // Price adjustment for this option
  cost_modifier?: number; // Cost adjustment for this option
  active: boolean;
  posizione?: number; // Display order for variants within the same field (1, 2, 3, etc.)
}

// Structure template definition
export interface ProductStructure {
  id: string;
  name: string; // e.g., "Materasso", "Rete"
  description?: string;
  fields: StructureField[];
  created_at: string;
  updated_at: string;
  active: boolean;
}

// Variant master data for each field
export interface StructureVariants {
  structure_id: string;
  field_id: string;
  variants: VariantOption[];
}

// Product configuration for structured products
export interface ProductConfiguration {
  product_id: string;
  structure_id: string;
  selected_variants: Record<string, string>; // field_id -> variant_code
  generated_code: string;
  total_price: number;
  total_cost: number;
  configuration_name?: string;
}

// Extended product type
export interface StructuredProduct extends FlatProduct {
  product_type: ProductType;
  structure_id?: string;
  prezzo_acquisto?: number; // Purchase price
  is_configurable: boolean;
  base_configurations?: ProductConfiguration[];
}

// Predefined structures
export const PREDEFINED_STRUCTURES: ProductStructure[] = [
  {
    id: 'struct_materasso',
    name: 'Materasso',
    description: 'Struttura per materassi con modello, dimensioni, taglie, topper e cover',
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    fields: [
      {
        id: 'modello',
        name: 'Modello',
        position: 0,
        length: 2,
        placeholder: '##',
        required: true,
        description: 'Modello del materasso (es. M3)'
      },
      {
        id: 'larghezza',
        name: 'Larghezza',
        position: 1,
        length: 3,
        placeholder: '###',
        required: true,
        description: 'Larghezza in cm (es. 160)'
      },
      {
        id: 'lunghezza',
        name: 'Lunghezza',
        position: 2,
        length: 3,
        placeholder: '###',
        required: true,
        description: 'Lunghezza in cm (es. 200)'
      },
      {
        id: 'taglia_sx',
        name: 'Taglia Sinistra',
        position: 3,
        length: 2,
        placeholder: '##',
        required: false,
        description: 'Taglia lato sinistro (opzionale)'
      },
      {
        id: 'taglia_dx',
        name: 'Taglia Destra', 
        position: 4,
        length: 2,
        placeholder: '##',
        required: false,
        description: 'Taglia lato destro (opzionale)'
      },
      {
        id: 'topper_sx',
        name: 'Topper Sinistro',
        position: 5,
        length: 2,
        placeholder: '##',
        required: false,
        description: 'Topper lato sinistro (opzionale)'
      },
      {
        id: 'topper_dx',
        name: 'Topper Destro',
        position: 6,
        length: 2,
        placeholder: '##',
        required: false,
        description: 'Topper lato destro (opzionale)'
      },
      {
        id: 'cover',
        name: 'Cover',
        position: 7,
        length: 2,
        placeholder: '##',
        required: false,
        description: 'Cover materasso (es. C4)'
      }
    ]
  },
  {
    id: 'struct_rete',
    name: 'Rete',
    description: 'Struttura per reti con modello, dimensioni, colori, piedini e motorizzazione',
    active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    fields: [
      {
        id: 'modello',
        name: 'Modello',
        position: 0,
        length: 2,
        placeholder: '##',
        required: true,
        description: 'Modello della rete (es. R3)'
      },
      {
        id: 'larghezza',
        name: 'Larghezza',
        position: 1,
        length: 3,
        placeholder: '###',
        required: true,
        description: 'Larghezza in cm (es. 160)'
      },
      {
        id: 'lunghezza',
        name: 'Lunghezza',
        position: 2,
        length: 3,
        placeholder: '###',
        required: true,
        description: 'Lunghezza in cm (es. 200)'
      },
      {
        id: 'colore_telaio',
        name: 'Colore Telaio',
        position: 3,
        length: 2,
        placeholder: '##',
        required: false,
        description: 'Colore del telaio (es. LW)'
      },
      {
        id: 'modello_piedino',
        name: 'Modello Piedino',
        position: 4,
        length: 2,
        placeholder: '##',
        required: false,
        description: 'Modello piedino (es. P1)'
      },
      {
        id: 'misura_piedino',
        name: 'Misura Piedino',
        position: 5,
        length: 2,
        placeholder: '##',
        required: false,
        description: 'Altezza piedino in cm (es. 30)'
      },
      {
        id: 'colore_piedino',
        name: 'Colore Piedino',
        position: 6,
        length: 2,
        placeholder: '##',
        required: false,
        description: 'Colore del piedino (es. LW)'
      },
      {
        id: 'motorizzazione',
        name: 'Motorizzazione',
        position: 7,
        length: 2,
        placeholder: '##',
        required: false,
        description: 'Tipo di motorizzazione (es. EC)'
      }
    ]
  }
];

// Utility functions
export const generateProductCode = (
  structure: ProductStructure,
  selectedVariants: Record<string, string>
): string => {
  return structure.fields
    .sort((a, b) => a.position - b.position)
    .map(field => {
      const selectedCode = selectedVariants[field.id];
      if (selectedCode) {
        // Se il codice selezionato è il placeholder (es. "##" per "Nessuno")
        if (selectedCode === field.placeholder) {
          return field.placeholder; // Ritorna il placeholder completo
        }
        // Altrimenti, riempi il codice alla lunghezza richiesta
        if (selectedCode.length < field.length) {
          return selectedCode.padEnd(field.length, selectedCode.charAt(selectedCode.length - 1) || '0');
        }
        return selectedCode.substring(0, field.length); // Taglia se troppo lungo
      }
      return field.placeholder; // Se non selezionato, usa placeholder
    })
    .join('');
};

export const parseProductCode = (
  code: string,
  structure: ProductStructure
): Record<string, string> => {
  const result: Record<string, string> = {};
  let position = 0;
  
  for (const field of structure.fields.sort((a, b) => a.position - b.position)) {
    const fieldValue = code.substr(position, field.length);
    if (fieldValue && fieldValue !== field.placeholder) {
      result[field.id] = fieldValue.trim();
    }
    position += field.length;
  }
  
  return result;
};

export const validateProductCode = (
  code: string,
  structure: ProductStructure
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check total length
  const expectedLength = structure.fields.reduce((sum, field) => sum + field.length, 0);
  if (code.length !== expectedLength) {
    errors.push(`Code length should be ${expectedLength} characters, got ${code.length}`);
  }
  
  // Check required fields
  const parsedCode = parseProductCode(code, structure);
  for (const field of structure.fields) {
    if (field.required && (!parsedCode[field.id] || parsedCode[field.id].trim() === '')) {
      errors.push(`Required field '${field.name}' is missing`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Re-export from products
export * from './products';