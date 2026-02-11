import { z } from 'zod';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Activity, ActivityType, ActivityStatus } from './database';

// Types based on Postgres schema
export type ActivityTipo = ActivityType;
export type ActivityStato = ActivityStatus;
export type ActivityObiettivo = string; // Custom field (not in Postgres v1)
export type ActivityPriorita = string; // Custom field (not in Postgres v1)
export type ActivityEsito = string; // Custom field (not in Postgres v1)
export type ActivityProssimaAzione = string; // Custom field (not in Postgres v1)

// Schema Zod per validazione form (4 step modal)
export const ActivityFormSchema = z.object({
  // Step 1: Informazioni Base
  Tipo: z.string().min(1, 'Seleziona un tipo'),
  'ID Lead': z.array(z.string()).min(1, 'Seleziona almeno un lead'),
  Obiettivo: z.string().optional(),
  Priorità: z.string().optional(),
  
  // Step 2: Programmazione
  Data: z.string().optional(),
  'Durata stimata': z.string().optional(),
  Stato: z.string().min(1, 'Seleziona uno stato'),
  Assegnatario: z.array(z.string()).optional(),
  
  // Step 3: Risultati
  Note: z.string().optional(),
  Esito: z.string().optional(),
  'Prossima azione': z.string().optional(),
  'Data prossima azione': z.string().optional(),
  'Note prossima azione': z.string().optional(),
  
  // Step 4: Allegati (opzionale)
  Allegati: z.array(z.any()).optional(),
});

export type ActivityFormData = z.infer<typeof ActivityFormSchema>;

// Alias per compatibilità con CRM 1.0 + campi custom per UI/automazioni
export type ActivityData = ActivityFormData & {
  id?: string;
  ID?: string;
  createdTime?: string;
  leadId?: string; // Estratto da 'ID Lead' per convenienza
  Titolo?: string;
  // Flag per automazioni ottimistiche
  _isMainActivity?: boolean;
  _isOptimistic?: boolean;
  _isLoading?: boolean;
  _tempId?: string;
  _isNextActivity?: boolean;
  _shouldRemove?: boolean;
};

// Default data for new activity modal (valori italiani come nel form UI)
export const DEFAULT_ACTIVITY_DATA: Partial<ActivityFormData> = {
  Tipo: 'Chiamata',
  Stato: 'Da fare',
  Priorità: 'Media',
  'ID Lead': [],
  Assegnatario: [],
};

// Sistema colori dinamico usando Tailwind e Badge variant="outline"
// Stessi colori utilizzati nel sistema Note per consistenza UI

// Genera hash da stringa per assegnare colore consistente
function getColorFromString(str: string): string {
  const colors = [
    'bg-blue-100 text-blue-700 border-blue-200',
    'bg-purple-100 text-purple-700 border-purple-200',
    'bg-green-100 text-green-700 border-green-200',
    'bg-orange-100 text-orange-700 border-orange-200',
    'bg-pink-100 text-pink-700 border-pink-200',
    'bg-indigo-100 text-indigo-700 border-indigo-200',
    'bg-cyan-100 text-cyan-700 border-cyan-200',
    'bg-teal-100 text-teal-700 border-teal-200',
    'bg-amber-100 text-amber-700 border-amber-200',
    'bg-emerald-100 text-emerald-700 border-emerald-200',
    'bg-violet-100 text-violet-700 border-violet-200',
    'bg-rose-100 text-rose-700 border-rose-200',
    'bg-yellow-100 text-yellow-700 border-yellow-200',
    'bg-lime-100 text-lime-700 border-lime-200',
    'bg-sky-100 text-sky-700 border-sky-200',
  ];
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  
  return colors[Math.abs(hash) % colors.length];
}

// Helper per ottenere colore Badge
export function getActivityTipoColor(tipo?: string): string {
  if (!tipo) return 'bg-gray-100 text-gray-700 border-gray-200';
  return getColorFromString(tipo);
}

export function getActivityObiettivoColor(obiettivo?: string): string {
  if (!obiettivo) return 'bg-gray-100 text-gray-700 border-gray-200';
  return getColorFromString(obiettivo);
}

export function getActivityPrioritaColor(priorita?: string): string {
  // Priorità ha colori semantici fissi
  const priorityColors: Record<string, string> = {
    'Bassa': 'bg-gray-100 text-gray-700 border-gray-200',
    'Media': 'bg-blue-100 text-blue-700 border-blue-200',
    'Alta': 'bg-orange-100 text-orange-700 border-orange-200',
    'Urgente': 'bg-red-100 text-red-700 border-red-200',
  };
  return priorityColors[priorita || 'Media'] || 'bg-gray-100 text-gray-700 border-gray-200';
}

// Icone per tipi attività
export const ACTIVITY_TIPO_ICONS: Record<string, string> = {
  'Chiamata': '📞',
  'Messaggistica': '💬',
  'Email': '📧',
  'Consulenza': '👥',
  'Follow-up': '🔄',
  'Altro': '📋',
};

// Export color mappings per compatibility
export const ACTIVITY_OBIETTIVO_COLORS = getActivityObiettivoColor;
export const ACTIVITY_PRIORITA_COLORS = getActivityPrioritaColor;

// Helper per ottenere colore Esito
export function getActivityEsitoColor(esito?: string): string {
  if (!esito) return 'bg-gray-100 text-gray-700 border-gray-200';
  return getColorFromString(esito);
}

export const ACTIVITY_ESITO_COLORS = getActivityEsitoColor;

// Helper per ottenere colore Prossima Azione
export function getActivityProssimaAzioneColor(azione?: string): string {
  if (!azione) return 'bg-gray-100 text-gray-700 border-gray-200';
  return getColorFromString(azione);
}

export const ACTIVITY_PROSSIMA_AZIONE_COLORS = getActivityProssimaAzioneColor;

export function getActivityStatoColor(stato?: string): string {
  const statusColors: Record<string, string> = {
    'Da fare': 'bg-gray-100 text-gray-700 border-gray-200',
    'In corso': 'bg-blue-100 text-blue-700 border-blue-200',
    'Completata': 'bg-green-100 text-green-700 border-green-200',
    'Annullata': 'bg-red-100 text-red-700 border-red-200',
  };
  return statusColors[stato || ''] || 'bg-gray-100 text-gray-700 border-gray-200';
}

export const ACTIVITY_STATO_COLORS = getActivityStatoColor;
