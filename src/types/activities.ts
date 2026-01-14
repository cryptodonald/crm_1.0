// Types per la gestione delle attività basati sui metadata reali Airtable
import { z } from 'zod';

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
  
  // === FLAG OTTIMISTICI (runtime only, non persistiti) ===
  _isOptimistic?: boolean;            // Attività creata ottimisticamente (in attesa conferma server)
  _isLoading?: boolean;               // Operazione in corso
  _tempId?: string;                   // ID temporaneo per replace con ID reale
  _shouldRemove?: boolean;            // Rimuovi attività (operazione fallita)
  _isMainActivity?: boolean;          // Flag per attività principale (creata dall'utente)
  _isNextActivity?: boolean;          // Flag per prossima attività (creata automaticamente)
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

// Tipi per eventi ottimistici
export interface OptimisticActivityEvent {
  // Per attività create ottimisticamente
  id?: string;
  _isOptimistic?: boolean;
  _isLoading?: boolean;
  _tempId?: string;
  _shouldRemove?: boolean;
  _isMainActivity?: boolean;     // Flag per attività principale (creata dall'utente)
  _isNextActivity?: boolean;     // Flag per prossima attività (creata automaticamente)
}

export interface OptimisticLeadStateEvent {
  type: 'lead-state-change' | 'lead-state-confirmed' | 'lead-state-rollback';
  leadId: string;
  newState?: string;
  oldState?: string;
  _isOptimistic?: boolean;
  _isLoading?: boolean;
  _shouldRollback?: boolean;
  error?: any;
}

export type OptimisticEvent = OptimisticActivityEvent | OptimisticLeadStateEvent;

// Form data per creare/aggiornare attività
export interface ActivityFormData {
  // === INFORMAZIONI BASE ===
  Tipo: ActivityTipo;
  Stato?: ActivityStato;
  Obiettivo?: ActivityObiettivo;
  Priorità?: ActivityPriorita;
  
  // === TIMING ===
  Data?: string;
  'Durata stimata'?: string;
  
  // === COLLEGAMENTI ===
  'ID Lead'?: string[];
  Assegnatario?: string[];
  
  // === CONTENUTO ===
  Note?: string;
  
  // === RISULTATI E FOLLOW-UP ===
  Esito?: ActivityEsito;
  'Prossima azione'?: ActivityProssimaAzione;
  'Data prossima azione'?: string;
  'Obiettivo prossima azione'?: ActivityObiettivo; // Obiettivo per la prossima attività
  
  // === ALLEGATI ===
  allegati?: AirtableAttachment[];
}

// Configurazione colori per stati (design system come NewLead)
export const ACTIVITY_STATO_COLORS: Record<ActivityStato, string> = {
  'Da Pianificare': 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
  'Pianificata': 'bg-blue-200 text-blue-800 hover:bg-blue-300 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700', 
  'In corso': 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300 dark:bg-yellow-800 dark:text-yellow-200 dark:hover:bg-yellow-700',
  'In attesa': 'bg-orange-200 text-orange-800 hover:bg-orange-300 dark:bg-orange-800 dark:text-orange-200 dark:hover:bg-orange-700',
  'Completata': 'bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700',
  'Annullata': 'bg-red-200 text-red-800 hover:bg-red-300 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700',
  'Rimandata': 'bg-purple-200 text-purple-800 hover:bg-purple-300 dark:bg-purple-800 dark:text-purple-200 dark:hover:bg-purple-700',
};

// Configurazione colori per priorità (design system come NewLead)
export const ACTIVITY_PRIORITA_COLORS: Record<ActivityPriorita, string> = {
  'Bassa': 'bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700',
  'Media': 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300 dark:bg-yellow-800 dark:text-yellow-200 dark:hover:bg-yellow-700',
  'Alta': 'bg-orange-200 text-orange-800 hover:bg-orange-300 dark:bg-orange-800 dark:text-orange-200 dark:hover:bg-orange-700',
  'Urgente': 'bg-red-200 text-red-800 hover:bg-red-300 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700',
};

// Configurazione colori per obiettivi (design system come NewLead)
export const ACTIVITY_OBIETTIVO_COLORS: Record<ActivityObiettivo, string> = {
  'Primo contatto': 'bg-blue-200 text-blue-800 hover:bg-blue-300 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700',
  'Qualificazione lead': 'bg-purple-200 text-purple-800 hover:bg-purple-300 dark:bg-purple-800 dark:text-purple-200 dark:hover:bg-purple-700',
  'Presentazione prodotto': 'bg-teal-200 text-teal-800 hover:bg-teal-300 dark:bg-teal-800 dark:text-teal-200 dark:hover:bg-teal-700',
  'Invio preventivo': 'bg-indigo-200 text-indigo-800 hover:bg-indigo-300 dark:bg-indigo-800 dark:text-indigo-200 dark:hover:bg-indigo-700',
  'Follow-up preventivo': 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300 dark:bg-yellow-800 dark:text-yellow-200 dark:hover:bg-yellow-700',
  'Negoziazione': 'bg-orange-200 text-orange-800 hover:bg-orange-300 dark:bg-orange-800 dark:text-orange-200 dark:hover:bg-orange-700',
  'Chiusura ordine': 'bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700',
  'Fissare appuntamento': 'bg-cyan-200 text-cyan-800 hover:bg-cyan-300 dark:bg-cyan-800 dark:text-cyan-200 dark:hover:bg-cyan-700',
  'Confermare appuntamento': 'bg-lime-200 text-lime-800 hover:bg-lime-300 dark:bg-lime-800 dark:text-lime-200 dark:hover:bg-lime-700',
  'Promemoria appuntamento': 'bg-amber-200 text-amber-800 hover:bg-amber-300 dark:bg-amber-800 dark:text-amber-200 dark:hover:bg-amber-700',
  'Consegna prodotto': 'bg-emerald-200 text-emerald-800 hover:bg-emerald-300 dark:bg-emerald-800 dark:text-emerald-200 dark:hover:bg-emerald-700',
  'Assistenza tecnica': 'bg-sky-200 text-sky-800 hover:bg-sky-300 dark:bg-sky-800 dark:text-sky-200 dark:hover:bg-sky-700',
  'Controllo soddisfazione': 'bg-pink-200 text-pink-800 hover:bg-pink-300 dark:bg-pink-800 dark:text-pink-200 dark:hover:bg-pink-700',
  'Upsell Cross-sell': 'bg-violet-200 text-violet-800 hover:bg-violet-300 dark:bg-violet-800 dark:text-violet-200 dark:hover:bg-violet-700',
  'Richiesta recensione': 'bg-rose-200 text-rose-800 hover:bg-rose-300 dark:bg-rose-800 dark:text-rose-200 dark:hover:bg-rose-700',
};

// Configurazione colori per esiti (design system come NewLead) 
export const ACTIVITY_ESITO_COLORS: Record<ActivityEsito, string> = {
  'Contatto riuscito': 'bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700',
  'Nessuna risposta': 'bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700',
  'Numero errato': 'bg-red-200 text-red-800 hover:bg-red-300 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700',
  'Non disponibile': 'bg-orange-200 text-orange-800 hover:bg-orange-300 dark:bg-orange-800 dark:text-orange-200 dark:hover:bg-orange-700',
  'Non presentato': 'bg-red-200 text-red-800 hover:bg-red-300 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700',
  'Molto interessato': 'bg-emerald-200 text-emerald-800 hover:bg-emerald-300 dark:bg-emerald-800 dark:text-emerald-200 dark:hover:bg-emerald-700',
  'Interessato': 'bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700',
  'Poco interessato': 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300 dark:bg-yellow-800 dark:text-yellow-200 dark:hover:bg-yellow-700',
  'Non interessato': 'bg-red-200 text-red-800 hover:bg-red-300 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700',
  'Informazioni raccolte': 'bg-blue-200 text-blue-800 hover:bg-blue-300 dark:bg-blue-800 dark:text-blue-200 dark:hover:bg-blue-700',
  'Preventivo richiesto': 'bg-indigo-200 text-indigo-800 hover:bg-indigo-300 dark:bg-indigo-800 dark:text-indigo-200 dark:hover:bg-indigo-700',
  'Preventivo inviato': 'bg-purple-200 text-purple-800 hover:bg-purple-300 dark:bg-purple-800 dark:text-purple-200 dark:hover:bg-purple-700',
  'Appuntamento fissato': 'bg-cyan-200 text-cyan-800 hover:bg-cyan-300 dark:bg-cyan-800 dark:text-cyan-200 dark:hover:bg-cyan-700',
  'Ordine confermato': 'bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700',
  'Opportunità persa': 'bg-red-200 text-red-800 hover:bg-red-300 dark:bg-red-800 dark:text-red-200 dark:hover:bg-red-700',
  'Servizio completato': 'bg-teal-200 text-teal-800 hover:bg-teal-300 dark:bg-teal-800 dark:text-teal-200 dark:hover:bg-teal-700',
  'Problema risolto': 'bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-800 dark:text-green-200 dark:hover:bg-green-700',
  'Cliente soddisfatto': 'bg-emerald-200 text-emerald-800 hover:bg-emerald-300 dark:bg-emerald-800 dark:text-emerald-200 dark:hover:bg-emerald-700',
  'Recensione ottenuta': 'bg-pink-200 text-pink-800 hover:bg-pink-300 dark:bg-pink-800 dark:text-pink-200 dark:hover:bg-pink-700',
};

// Configurazione colori per tipi (mantenuta per compatibilità)
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
  Stato: 'Da Pianificare',
  Obiettivo: undefined,
  Priorità: 'Media',
  Data: undefined,
  'Durata stimata': undefined,
  'ID Lead': undefined,
  Assegnatario: undefined,
  Note: undefined,
  Esito: undefined,
  'Prossima azione': undefined,
  'Data prossima azione': undefined,
  'Obiettivo prossima azione': undefined,
  allegati: undefined,
};

// Validazione
export const ACTIVITY_VALIDATION_RULES = {
  Tipo: { required: true },
  Data: { required: false },
  Note: { maxLength: 1000 },
} as const;

// Schema Zod per validazione form attività
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

const attachmentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  url: z.string().url(),
  size: z.number().positive().max(MAX_FILE_SIZE, `File troppo grande (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`),
  contentType: z.string().refine(
    (type) => ALLOWED_FILE_TYPES.includes(type),
    'Tipo file non supportato'
  ),
  uploadedAt: z.string().datetime().optional(),
}).strict();

export const ActivityFormSchema = z.object({
  // Campi obbligatori
  Tipo: z.enum([
    'Chiamata',
    'WhatsApp', 
    'Email',
    'SMS',
    'Consulenza',
    'Follow-up',
    'Altro',
  ], {
    required_error: 'Il tipo di attività è obbligatorio',
    invalid_type_error: 'Tipo di attività non valido',
  }),

  // Campi opzionali
  Stato: z.enum([
    'Da Pianificare',
    'Pianificata',
    'In corso',
    'In attesa',
    'Completata',
    'Annullata',
    'Rimandata',
  ]).optional(),

  Obiettivo: z.enum([
    'Primo contatto',
    'Qualificazione lead',
    'Presentazione prodotto',
    'Invio preventivo',
    'Follow-up preventivo',
    'Negoziazione',
    'Chiusura ordine',
    'Fissare appuntamento',
    'Confermare appuntamento',
    'Promemoria appuntamento',
    'Consegna prodotto',
    'Assistenza tecnica',
    'Controllo soddisfazione',
    'Upsell Cross-sell',
    'Richiesta recensione',
  ]).optional(),

  Priorità: z.enum([
    'Bassa',
    'Media',
    'Alta',
    'Urgente',
  ]).optional(),

  // Date e timing
  Data: z.string().datetime().optional(),
  'Durata stimata': z.string().regex(/^\d+:[0-5]\d$/, 'Formato durata non valido (usa h:mm)').optional(),
  'Data prossima azione': z.string().datetime().optional(),

  // Collegamenti
  'ID Lead': z.array(z.string()).optional(),
  Assegnatario: z.array(z.string()).optional(),

  // Contenuto
  Note: z.string().max(1000, 'Le note non possono superare i 1000 caratteri').optional(),

  // Risultati
  Esito: z.enum([
    'Contatto riuscito',
    'Nessuna risposta',
    'Numero errato',
    'Non disponibile',
    'Non presentato',
    'Molto interessato',
    'Interessato',
    'Poco interessato',
    'Non interessato',
    'Informazioni raccolte',
    'Preventivo richiesto',
    'Preventivo inviato',
    'Appuntamento fissato',
    'Ordine confermato',
    'Opportunità persa',
    'Servizio completato',
    'Problema risolto',
    'Cliente soddisfatto',
    'Recensione ottenuta',
  ]).optional(),

  'Prossima azione': z.enum([
    'Chiamata',
    'WhatsApp',
    'Email',
    'SMS',
    'Consulenza',
    'Follow-up',
    'Nessuna',
  ]).optional(),

  'Obiettivo prossima azione': z.enum([
    'Primo contatto',
    'Qualificazione lead',
    'Presentazione prodotto',
    'Invio preventivo',
    'Follow-up preventivo',
    'Negoziazione',
    'Chiusura ordine',
    'Fissare appuntamento',
    'Confermare appuntamento',
    'Promemoria appuntamento',
    'Consegna prodotto',
    'Assistenza tecnica',
    'Controllo soddisfazione',
    'Upsell Cross-sell',
    'Richiesta recensione',
  ]).optional(),

  // Allegati
  allegati: z.array(attachmentSchema)
    .max(MAX_FILES, `Massimo ${MAX_FILES} allegati consentiti`)
    .optional()
    .default([]),
}); // Rimosso .strict() temporaneamente per debug
