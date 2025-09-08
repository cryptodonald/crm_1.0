// Types per la gestione delle attività basati sui metadata reali Airtable

export type ActivityTipo = 
  | 'Chiamata'
  | 'WhatsApp'
  | 'Email'
  | 'SMS'
  | 'Consulenza'
  | 'Follow-up'
  | 'Altro';

export type ActivityStato = 
  | 'Da Pianificare'
  | 'Pianificata'
  | 'In corso'
  | 'In attesa'
  | 'Completata'
  | 'Annullata'
  | 'Rimandata';

export type ActivityPriorita = 
  | 'Bassa'
  | 'Media'
  | 'Alta'
  | 'Urgente';

export type ActivityObiettivo = 
  | 'Primo contatto'
  | 'Qualificazione lead'
  | 'Presentazione prodotto'
  | 'Invio preventivo'
  | 'Follow-up preventivo'
  | 'Negoziazione'
  | 'Chiusura ordine'
  | 'Fissare appuntamento'
  | 'Confermare appuntamento'
  | 'Promemoria appuntamento'
  | 'Consegna prodotto'
  | 'Assistenza tecnica'
  | 'Controllo soddisfazione'
  | 'Upsell Cross-sell'
  | 'Richiesta recensione';

export type ActivityEsito = 
  | 'Contatto riuscito'
  | 'Nessuna risposta'
  | 'Numero errato'
  | 'Non disponibile'
  | 'Non presentato'
  | 'Molto interessato'
  | 'Interessato'
  | 'Poco interessato'
  | 'Non interessato'
  | 'Informazioni raccolte'
  | 'Preventivo richiesto'
  | 'Preventivo inviato'
  | 'Appuntamento fissato'
  | 'Ordine confermato'
  | 'Opportunità persa'
  | 'Servizio completato'
  | 'Problema risolto'
  | 'Cliente soddisfatto'
  | 'Recensione ottenuta';

export type ActivityProssimaAzione = 
  | 'Chiamata'
  | 'WhatsApp'
  | 'Email'
  | 'SMS'
  | 'Consulenza'
  | 'Follow-up'
  | 'Nessuna';

export interface ActivityData {
  // === IDENTIFICATIVI ===
  id: string;                          // Airtable Record ID
  ID: string;                          // Campo formula (RECORD_ID())
  createdTime: string;                 // Airtable timestamp
  
  // === INFORMAZIONI BASE ===
  Titolo: string;                      // Formula: Tipo + " - " + Nome Lead
  Tipo: ActivityTipo;                  // Tipo di attività
  Stato: ActivityStato;                // Stato dell'attività
  Obiettivo?: ActivityObiettivo;       // Obiettivo dell'attività
  Priorità?: ActivityPriorita;         // Priorità dell'attività
  
  // === TIMING ===
  Data?: string;                       // Data e ora programmata
  'Durata stimata'?: string;          // Durata in formato h:mm
  'Creato il '?: string;              // Data di creazione (auto)
  'Ultima modifica'?: string;         // Ultima modifica (auto)
  
  // === COLLEGAMENTI ===
  'ID Lead'?: string[];               // Link alla tabella leads
  'Nome Lead'?: string[];             // Lookup dal lead
  Assegnatario?: string[];            // Link alla tabella users
  'Nome Assegnatario'?: string[];     // Lookup dall'utente
  
  // === RISULTATI E FOLLOW-UP ===
  Note?: string;                      // Note testuali
  Esito?: ActivityEsito;             // Esito dell'attività
  'Prossima azione'?: ActivityProssimaAzione; // Prossima azione da intraprendere  
  'Data prossima azione'?: string;    // Data per la prossima azione
  
  // === ALLEGATI ===
  Allegati?: AirtableAttachment[];    // File allegati
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

// Form data per creare/aggiornare attività
export interface ActivityFormData {
  Tipo: ActivityTipo;
  Obiettivo?: ActivityObiettivo;
  Data?: string;
  'Durata stimata'?: string;
  Priorità?: ActivityPriorita;
  Note?: string;
  'ID Lead'?: string[];
  Assegnatario?: string[];
}

// Configurazione colori per stati
export const ACTIVITY_STATO_COLORS: Record<ActivityStato, string> = {
  'Da Pianificare': 'bg-gray-100 text-gray-800',
  'Pianificata': 'bg-blue-100 text-blue-800', 
  'In corso': 'bg-yellow-100 text-yellow-800',
  'In attesa': 'bg-orange-100 text-orange-800',
  'Completata': 'bg-green-100 text-green-800',
  'Annullata': 'bg-red-100 text-red-800',
  'Rimandata': 'bg-purple-100 text-purple-800',
};

// Configurazione colori per tipi
export const ACTIVITY_TIPO_COLORS: Record<ActivityTipo, string> = {
  'Chiamata': 'bg-blue-500',
  'WhatsApp': 'bg-green-500',
  'Email': 'bg-purple-500',
  'SMS': 'bg-indigo-500',
  'Consulenza': 'bg-orange-500',
  'Follow-up': 'bg-yellow-500',
  'Altro': 'bg-gray-500',
};

// Configurazione icone per tipi
export const ACTIVITY_TIPO_ICONS: Record<ActivityTipo, string> = {
  'Chiamata': '📞',
  'WhatsApp': '💬',
  'Email': '📧',
  'SMS': '💬',
  'Consulenza': '👥',
  'Follow-up': '🔄',
  'Altro': '📋',
};

// Mapping per Kanban
export const KANBAN_COLUMNS = {
  'to-do': {
    id: 'to-do',
    title: 'Da fare',
    states: ['Da Pianificare', 'Pianificata'] as ActivityStato[],
    defaultState: 'Da Pianificare' as ActivityStato, // Stato di default per drag & drop
    color: 'bg-blue-50 border-blue-200',
  },
  'in-progress': {
    id: 'in-progress', 
    title: 'In corso',
    states: ['In corso', 'In attesa', 'Rimandata'] as ActivityStato[],
    defaultState: 'In corso' as ActivityStato, // Stato di default per drag & drop
    color: 'bg-yellow-50 border-yellow-200',
  },
  'done': {
    id: 'done',
    title: 'Completate', 
    states: ['Completata', 'Annullata'] as ActivityStato[],
    defaultState: 'Completata' as ActivityStato, // Stato di default per drag & drop
    color: 'bg-green-50 border-green-200',
  },
} as const;

export type KanbanColumnId = keyof typeof KANBAN_COLUMNS;

// Utility per determinare la colonna Kanban da uno stato
export function getKanbanColumnFromState(stato: ActivityStato): KanbanColumnId {
  for (const [columnId, column] of Object.entries(KANBAN_COLUMNS)) {
    if (column.states.includes(stato)) {
      return columnId as KanbanColumnId;
    }
  }
  // Default per stati non mappati (Annullata, Rimandata)
  return 'to-do';
}

// Valori di default per il form
export const DEFAULT_ACTIVITY_DATA: ActivityFormData = {
  Tipo: 'Chiamata',
  Obiettivo: undefined,
  Data: undefined,
  'Durata stimata': undefined,
  Priorità: 'Media',
  Note: undefined,
  'ID Lead': undefined,
  Assegnatario: undefined,
};

// Validazione
export const ACTIVITY_VALIDATION_RULES = {
  Tipo: { required: true },
  Data: { required: false },
  Note: { maxLength: 1000 },
} as const;
