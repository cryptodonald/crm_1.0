
export interface ActivityData {
  // === IDENTIFICATIVI ===
  id: string;                          // Airtable Record ID (string)
  ID: string;                          // Formula field (string) - Same as id
  createdTime: string;                 // Airtable timestamp (ISO string)
  
  // === INFORMAZIONI BASE ===
  Titolo: string;                      // Single line text - Activity title/name
  Descrizione?: string;                // Long text - Activity description
  Tipo: ActivityType;                  // Single select - Call, Email, Meeting, Task, etc.
  Stato: ActivityStatus;               // Single select - Programmata, In corso, Completata, Annullata
  Priorità: ActivityPriority;          // Single select - Bassa, Media, Alta, Urgente
  
  // === TIMING ===
  'Data creazione': string;            // Date field - When activity was created
  'Data programmata': string;          // DateTime field - When scheduled
  'Data inizio'?: string;              // DateTime field - When started
  'Data completamento'?: string;       // DateTime field - When completed
  Durata?: number;                     // Number field - Duration in minutes
  
  // === COLLEGAMENTI ===
  Lead?: string[];                     // Link to table - Array of lead IDs (recXXXXXXXXXXXXXX)
  'Nome Lead'?: string[];              // Lookup field - Lead names from linked records
  Assegnatario?: string[];             // Link to table - Array of user IDs
  'Nome Assegnatario'?: string[];      // Lookup field - User names from linked records
  
  // === RISULTATI ===
  Esito?: ActivityOutcome;             // Single select - Positivo, Negativo, Da ricontattare, etc.
  Note?: string;                       // Long text - Free form notes about the activity
  'Prossimi step'?: string;            // Long text - Next actions to take
  'Data prossimo follow-up'?: string;  // Date field - When to follow up next
  
  // === ALLEGATI ===
  Allegati?: AirtableAttachment[];     // Attachment field - Files related to activity
  'Link esterni'?: string;             // URL field - External links
}

// Enum types for select fields
export type ActivityType = 
  | 'Chiamata'
  | 'Email' 
  | 'Riunione'
  | 'Task'
  | 'Follow-up'
  | 'Demo'
  | 'Proposta'
  | 'Note';

export type ActivityStatus = 
  | 'Programmata'
  | 'In corso'
  | 'Completata' 
  | 'Annullata'
  | 'In ritardo';

export type ActivityPriority = 
  | 'Bassa'
  | 'Media'
  | 'Alta'
  | 'Urgente';

export type ActivityOutcome = 
  | 'Positivo'
  | 'Negativo'
  | 'Da ricontattare'
  | 'Non risponde'
  | 'Rimandato';
