// Types per la gestione dei leads basati sui metadata Airtable

export type LeadProvenienza =
  | 'Meta'
  | 'Instagram'
  | 'Google'
  | 'Sito'
  | 'Referral'
  | 'Organico';

export type LeadStato =
  | 'Nuovo'
  | 'Contattato'        // Rinominato da 'Attivo' per chiarezza
  | 'Qualificato'
  | 'In Negoziazione'   // 🆕 NUOVO: appuntamenti, preventivi, trattative attive
  | 'Cliente'
  | 'Sospeso'
  | 'Perso';            // Rinominato da 'Chiuso' per chiarezza (stato negativo)

export interface LeadData {
  id: string;
  ID: string; // Campo formula da Airtable
  Data: string; // Data creazione lead
  Nome: string;
  Telefono?: string;
  Email?: string;
  Indirizzo?: string;
  CAP?: number;
  Città?: string;
  Esigenza?: string;
  Stato: LeadStato;
  Provenienza: LeadProvenienza;
  Note?: string;
  Allegati?: AirtableAttachment[];
  Conversations?: string;
  Avatar?: string; // Avatar personalizzato del lead

  // Relazioni (IDs delle tabelle collegate)
  Referenza?: string[];
  'Nome referenza'?: string[]; // Campo lookup
  Assegnatario?: string[]; // Link alla tabella users
  Ordini?: string[]; // Link alla tabella ordini
  Attività?: string[]; // Link alla tabella attività
  'From field: Referenza'?: string[];

  // Metadati Airtable
  createdTime: string;
}

export interface AirtableAttachment {
  id: string;
  url: string;
  filename: string;
  size: number;
  type: string;
  thumbnails?: {
    small: { url: string; width: number; height: number };
    large: { url: string; width: number; height: number };
  };
}

export interface UserData {
  id: string;
  nome: string;
  email: string;
  ruolo: string;
  avatar?: string;
  telefono?: string;
}

export interface LeadListResponse {
  records: {
    id: string;
    fields: LeadData;
    createdTime: string;
  }[];
  offset?: string;
}

export interface LeadsStats {
  totale: number;
  nuoviUltimi7Giorni: number;
  contattatiEntro48h: number;
  tassoQualificazione: number; // % da Nuovo a Qualificato
  tassoConversione: number; // % da Nuovo a Cliente
  byStato: Record<LeadStato, number>;
  byProvenienza: Record<LeadProvenienza, number>;
  tendenza: {
    periodo: string;
    nuoviLeads: number;
    conversioni: number;
    variazione: number; // % rispetto al periodo precedente
  };
}

export interface LeadsFilters {
  provenienza?: LeadProvenienza[];
  stato?: LeadStato[];
  dataInizio?: string;
  dataFine?: string;
  città?: string;
  assegnatario?: string[];
  conNote?: boolean;
  conAllegati?: boolean;
  search?: string;
  leadIds?: string[]; // Filtra per lista di lead IDs (e.g., duplicates)
}

export interface LeadsTableColumn {
  key: string;
  label: string;
  visible: boolean;
  sortable: boolean;
  width?: string;
}

// Configurazione colori per stati e provenienze
export const LEAD_STATO_COLORS: Record<LeadStato, string> = {
  Nuovo: 'bg-slate-100 text-slate-800',
  Contattato: 'bg-blue-100 text-blue-800',           // Rinominato da 'Attivo'
  Qualificato: 'bg-amber-100 text-amber-800',
  'In Negoziazione': 'bg-purple-100 text-purple-800', // 🆕 NUOVO: Viola per fase calda
  Cliente: 'bg-green-100 text-green-800',
  Sospeso: 'bg-gray-100 text-gray-800',
  Perso: 'bg-red-100 text-red-800',                  // Rinominato da 'Chiuso'
};

export const LEAD_PROVENIENZA_COLORS: Record<LeadProvenienza, string> = {
  Meta: 'bg-blue-500',
  Instagram: 'bg-pink-500',
  Google: 'bg-red-500',
  Sito: 'bg-green-500',
  Referral: 'bg-yellow-500',
  Organico: 'bg-gray-500',
};

export const LEAD_PROVENIENZA_ICONS: Record<LeadProvenienza, string> = {
  Meta: '👥', // Facebook/Meta
  Instagram: '📷', // Instagram
  Google: '🔍', // Ricerca Google
  Sito: '🌐', // Sito web
  Referral: '🤝', // Passaparola
  Organico: '🌱', // Traffico organico
};

export interface LeadFormData {
  Nome: string;
  Telefono?: string;
  Email?: string;
  Indirizzo?: string;
  CAP?: number;
  Città?: string;
  Esigenza?: string;
  Stato: LeadStato;
  Provenienza: LeadProvenienza;
  Note?: string;
  Referenza?: string[];
  Assegnatario?: string[];
  Avatar?: string; // Avatar personalizzato
  Allegati?: AirtableAttachment[]; // Allegati caricati
}

// Validation
export const LEAD_VALIDATION_RULES = {
  Nome: { required: true, minLength: 2, maxLength: 100 },
  Email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  Telefono: { pattern: /^[+]?[\d\s\-()]{8,}$/ },
  CAP: { min: 10000, max: 99999 },
  Esigenza: { maxLength: 500 },
  Note: { maxLength: 1000 },
} as const;

// Default values
export const DEFAULT_LEAD_DATA: LeadFormData = {
  Nome: '',
  Telefono: '',
  Email: '',
  Indirizzo: '',
  CAP: undefined,
  Città: '',
  Esigenza: '',
  Stato: 'Nuovo', // Default rimane 'Nuovo'
  Provenienza: 'Sito',
  Note: '',
  Referenza: [],
  Assegnatario: [],
  Avatar: '',
  Allegati: [],
};

// Query options per ordinamento
export interface LeadsSortOption {
  field: keyof LeadData;
  direction: 'asc' | 'desc';
  label: string;
}

export const LEADS_SORT_OPTIONS: LeadsSortOption[] = [
  { field: 'Data', direction: 'desc', label: 'Data creazione (Recenti)' },
  { field: 'Data', direction: 'asc', label: 'Data creazione (Meno recenti)' },
  { field: 'Nome', direction: 'asc', label: 'Nome (A-Z)' },
  { field: 'Nome', direction: 'desc', label: 'Nome (Z-A)' },
  { field: 'Stato', direction: 'asc', label: 'Stato' },
  { field: 'Provenienza', direction: 'asc', label: 'Provenienza' },
  { field: 'Città', direction: 'asc', label: 'Città (A-Z)' },
];
