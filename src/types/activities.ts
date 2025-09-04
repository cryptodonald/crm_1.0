// Activity types based on real Airtable Activity table schema
// Generated from REAL Airtable metadata analysis

export interface ActivityData {
  // === IDENTIFICATIVI ===
  id: string;                           // Airtable Record ID (string)
  ID: string;                           // Formula field (string) - Same as id
  createdTime: string;                  // Airtable timestamp (ISO string)
  
  // === INFORMAZIONI BASE ===
  Titolo: string;                       // Formula: Tipo + " - " + Nome Lead
  Tipo: ActivityType;                   // Single select - Chiamata, Email, WhatsApp, etc.
  
  // === TIMING ===
  Data: string;                         // DateTime field - When scheduled (main date field)
  'Durata stimata': number;             // Duration field (in minutes)
  'Creato il ': string;                 // Created time (auto-generated)
  'Ultima modifica': string;            // Last modified time (auto-generated)
  
  // === CATEGORIZZAZIONE ===
  Stato: ActivityStatus;                // Da Pianificare, Pianificata, In corso, etc.
  Obiettivo: ActivityObjective;         // Primo contatto, Qualificazione lead, etc.
  Priorità: ActivityPriority;           // Bassa, Media, Alta, Urgente
  
  // === COLLEGAMENTI ===
  'ID Lead'?: string[];                 // Link to Leads table (multipleRecordLinks)
  'Nome Lead'?: string[];               // Lookup field - Lead names from linked records
  Assegnatario?: string[];              // Link to Users table (multipleRecordLinks) 
  'Nome Assegnatario'?: string[];       // Lookup field - User names from linked records
  
  // === RISULTATI ===
  Esito?: ActivityOutcome;              // Contatto riuscito, Nessuna risposta, etc.
  Note?: string;                        // Long text - Free form notes
  'Prossima azione'?: NextActionType;   // Chiamata, WhatsApp, Email, etc.
  'Data prossima azione'?: string;      // DateTime field - When to follow up next
  
  // === ALLEGATI ===
  Allegati?: AirtableAttachment[];      // Attachment field - Files related to activity
}

// Enum types for select fields based on real Airtable options
export type ActivityType = 
  | 'Chiamata'
  | 'WhatsApp'
  | 'Email'
  | 'SMS'
  | 'Consulenza'
  | 'Follow-up'
  | 'Altro';

export type ActivityStatus = 
  | 'Da Pianificare'
  | 'Pianificata'
  | 'In corso'
  | 'In attesa'
  | 'Completata'
  | 'Annullata'
  | 'Rimandata';

export type ActivityObjective = 
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

export type ActivityPriority = 
  | 'Bassa'
  | 'Media'
  | 'Alta'
  | 'Urgente';

export type ActivityOutcome = 
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

export type NextActionType = 
  | 'Chiamata'
  | 'WhatsApp'
  | 'Email'
  | 'SMS'
  | 'Consulenza'
  | 'Follow-up'
  | 'Nessuna';

// Type for Airtable attachments
export interface AirtableAttachment {
  id: string;
  url: string;
  filename: string;
  size: number;
  type: string;
  width?: number;
  height?: number;
  thumbnails?: {
    small: { url: string; width: number; height: number; };
    large: { url: string; width: number; height: number; };
    full: { url: string; width: number; height: number; };
  };
}

// Helper types for filtering and API responses
export interface ActivitiesApiResponse {
  records: ActivityData[];
  offset?: string;
}

export interface ActivityFilters {
  stato?: string | string[];
  tipo?: string | string[];
  obiettivo?: string | string[];
  priorita?: string | string[];
  dataInizio?: string;
  dataFine?: string;
  assegnatario?: string;
  search?: string;
}
