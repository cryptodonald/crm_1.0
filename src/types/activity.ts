// Interfacce Activity basate sui 19 campi reali da Airtable
export interface ActivityData {
  // Campi identificativi
  id: string;                    // ID (formula RECORD_ID())
  createdTime: string;           // Creato il
  lastModifiedTime: string;      // Ultima modifica

  // Dati Principali
  titolo: string;                // Titolo (formula auto-generata)
  tipo: ActivityType;            // Tipo attività
  stato: ActivityStatus;         // Stato
  priorita: ActivityPriority;    // Priorità

  // Tempi e Durate
  data: string;                  // Data programmata (dateTime)
  durataStimata: number;         // Durata stimata (duration in secondi)

  // Obiettivi e Risultati
  obiettivo: ActivityObjective;  // Obiettivo
  esito?: ActivityOutcome;       // Esito (opzionale)

  // Collegamenti Relazionali
  idLead: string[];              // ID Lead (multipleRecordLinks)
  nomeLead: string[];            // Nome Lead (lookup)
  assegnatario?: string[];       // Assegnatario (multipleRecordLinks)
  nomeAssegnatario?: string[];   // Nome Assegnatario (lookup)

  // Follow-up
  prossimaAzione?: ActivityNextAction; // Prossima azione
  dataProssimaAzione?: string;   // Data prossima azione

  // Contenuti
  note?: string;                 // Note (multilineText)
  allegati?: ActivityAttachment[]; // Allegati
}

// Enums per i campi Select di Airtable
export enum ActivityType {
  CHIAMATA = 'Chiamata',
  WHATSAPP = 'WhatsApp', 
  EMAIL = 'Email',
  SMS = 'SMS',
  CONSULENZA = 'Consulenza',
  FOLLOWUP = 'Follow-up',
  ALTRO = 'Altro'
}

export enum ActivityStatus {
  DA_PIANIFICARE = 'Da Pianificare',
  PIANIFICATA = 'Pianificata',
  IN_CORSO = 'In corso',
  IN_ATTESA = 'In attesa',
  COMPLETATA = 'Completata', 
  ANNULLATA = 'Annullata',
  RIMANDATA = 'Rimandata'
}

export enum ActivityPriority {
  BASSA = 'Bassa',
  MEDIA = 'Media',
  ALTA = 'Alta',
  URGENTE = 'Urgente'
}

export enum ActivityObjective {
  PRIMO_CONTATTO = 'Primo contatto',
  QUALIFICAZIONE_LEAD = 'Qualificazione lead',
  PRESENTAZIONE_PRODOTTO = 'Presentazione prodotto',
  INVIO_PREVENTIVO = 'Invio preventivo',
  FOLLOWUP_PREVENTIVO = 'Follow-up preventivo',
  NEGOZIAZIONE = 'Negoziazione',
  CHIUSURA_ORDINE = 'Chiusura ordine',
  FISSARE_APPUNTAMENTO = 'Fissare appuntamento',
  CONFERMARE_APPUNTAMENTO = 'Confermare appuntamento',
  PROMEMORIA_APPUNTAMENTO = 'Promemoria appuntamento',
  CONSEGNA_PRODOTTO = 'Consegna prodotto',
  ASSISTENZA_TECNICA = 'Assistenza tecnica',
  CONTROLLO_SODDISFAZIONE = 'Controllo soddisfazione',
  UPSELL_CROSSSELL = 'Upsell Cross-sell',
  RICHIESTA_RECENSIONE = 'Richiesta recensione'
}

export enum ActivityOutcome {
  CONTATTO_RIUSCITO = 'Contatto riuscito',
  NESSUNA_RISPOSTA = 'Nessuna risposta',
  NUMERO_ERRATO = 'Numero errato',
  NON_DISPONIBILE = 'Non disponibile',
  NON_PRESENTATO = 'Non presentato',
  MOLTO_INTERESSATO = 'Molto interessato',
  INTERESSATO = 'Interessato',
  POCO_INTERESSATO = 'Poco interessato',
  NON_INTERESSATO = 'Non interessato',
  INFORMAZIONI_RACCOLTE = 'Informazioni raccolte',
  PREVENTIVO_RICHIESTO = 'Preventivo richiesto',
  PREVENTIVO_INVIATO = 'Preventivo inviato',
  APPUNTAMENTO_FISSATO = 'Appuntamento fissato',
  ORDINE_CONFERMATO = 'Ordine confermato',
  OPPORTUNITA_PERSA = 'Opportunità persa',
  SERVIZIO_COMPLETATO = 'Servizio completato',
  PROBLEMA_RISOLTO = 'Problema risolto',
  CLIENTE_SODDISFATTO = 'Cliente soddisfatto',
  RECENSIONE_OTTENUTA = 'Recensione ottenuta'
}

export enum ActivityNextAction {
  CHIAMATA = 'Chiamata',
  WHATSAPP = 'WhatsApp',
  EMAIL = 'Email', 
  SMS = 'SMS',
  CONSULENZA = 'Consulenza',
  FOLLOWUP = 'Follow-up',
  NESSUNA = 'Nessuna'
}

// Interfacce per allegati
export interface ActivityAttachment {
  id: string;
  url: string;
  filename: string;
  type: string;
  size: number;
  thumbnails?: {
    small?: { url: string; width: number; height: number; };
    large?: { url: string; width: number; height: number; };
  };
}

// Interfacce per filtri
export interface ActivityFilters {
  search?: string;
  stato?: ActivityStatus[];
  priorita?: ActivityPriority[];
  tipo?: ActivityType[];
  obiettivo?: ActivityObjective[];
  dateRange?: {
    start: string;
    end: string;
  };
  quickFilter?: 'oggi' | 'settimana' | 'scadute' | 'completate';
}

// Interfacce per statistiche
export interface ActivityStats {
  totali: number;
  completate: number;
  inCorso: number;
  scadute: number;
  pianificate: number;
  tassoCompletamento: number;
  tempoMedioCompletamento: number; // in ore
  distribuzionePerTipo: Record<ActivityType, number>;
  distribuzionePerPriorita: Record<ActivityPriority, number>;
  trendSettimanale: {
    data: string;
    completate: number;
    create: number;
  }[];
}

// Interfacce per form
export interface ActivityFormData {
  titolo?: string;  // Calcolato automaticamente, ma override possibile
  tipo: ActivityType;
  stato: ActivityStatus;
  priorita: ActivityPriority;
  data: string;
  durataStimata?: number;
  obiettivo: ActivityObjective;
  esito?: ActivityOutcome;
  idLead: string;
  assegnatario?: string;
  prossimaAzione?: ActivityNextAction;
  dataProssimaAzione?: string;
  note?: string;
  allegati?: File[];
}

// Configurazioni per badges e colori
export const ActivityTypeConfig = {
  'Chiamata': { color: 'bg-blue-100 text-blue-800', icon: '📞' },
  'WhatsApp': { color: 'bg-green-100 text-green-800', icon: '💬' },
  'Email': { color: 'bg-purple-100 text-purple-800', icon: '📧' },
  'SMS': { color: 'bg-orange-100 text-orange-800', icon: '📱' },
  'Consulenza': { color: 'bg-indigo-100 text-indigo-800', icon: '🎯' },
  'Follow-up': { color: 'bg-yellow-100 text-yellow-800', icon: '🔄' },
  'Altro': { color: 'bg-gray-100 text-gray-800', icon: '📝' }
};

export const ActivityStatusConfig = {
  'Da Pianificare': { color: 'bg-gray-100 text-gray-800', icon: '⏳' },
  'Pianificata': { color: 'bg-blue-100 text-blue-800', icon: '📅' },
  'In corso': { color: 'bg-yellow-100 text-yellow-800', icon: '⚡' },
  'In attesa': { color: 'bg-orange-100 text-orange-800', icon: '⏸️' },
  'Completata': { color: 'bg-green-100 text-green-800', icon: '✅' },
  'Annullata': { color: 'bg-red-100 text-red-800', icon: '❌' },
  'Rimandata': { color: 'bg-purple-100 text-purple-800', icon: '⏭️' }
};

export const ActivityPriorityConfig = {
  'Bassa': { color: 'bg-gray-100 text-gray-800', icon: '🔹' },
  'Media': { color: 'bg-yellow-100 text-yellow-800', icon: '🔶' },
  'Alta': { color: 'bg-orange-100 text-orange-800', icon: '🔸' },
  'Urgente': { color: 'bg-red-100 text-red-800', icon: '🔺' }
};

// Utility function per colori data Activity
export const getActivityDateColor = (date: string, stato: string): string => {
  const completedStates = [
    'Completata', 
    'Annullata', 
    'Rimandata'
  ];
  
  if (completedStates.includes(stato)) {
    return 'text-gray-900'; // ⚫ NERO
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const activityDate = new Date(date);
  activityDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.floor((today.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'text-green-600'; // 🟢 VERDE (oggi)
  if (diffDays >= 1 && diffDays <= 2) return 'text-orange-600'; // 🟠 ARANCIONE (1-2 giorni scadenza)
  if (diffDays > 2) return 'text-red-600'; // 🔴 ROSSO (>2 giorni scadenza)
  
  return 'text-gray-900'; // Default nero per date future
};

// Utility per formattare durata
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};
