/**
 * Default Badge Colors
 * 
 * Colori predefiniti per tutti i badge nel CRM.
 * Questi sono i colori di default che vengono usati se l'utente
 * non ha personalizzato i colori in /colors.
 */

import type { EntityType } from './color-preferences';

export type BadgeColorMap = Record<string, string>;

/**
 * Lead Status - Stati Lead
 */
export const DEFAULT_LEAD_STATUS_COLORS: BadgeColorMap = {
  'Nuovo': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'Attivo': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Contattato': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  'Qualificato': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  'In Negoziazione': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  'Cliente': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  'Chiuso': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  'Sospeso': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

/**
 * Lead Sources - Fonti Lead
 */
export const DEFAULT_LEAD_SOURCE_COLORS: BadgeColorMap = {
  'Meta': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'Instagram': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  'Google': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  'Sito': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  'Referral': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  'Organico': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Diretto': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  'Altro': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

/**
 * Order Status - Stati Ordine
 */
export const DEFAULT_ORDER_STATUS_COLORS: BadgeColorMap = {
  'Bozza': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  'Confermato': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'In Lavorazione': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'Spedito': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  'Consegnato': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  'Annullato': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

/**
 * Activity Type - Tipi Attività
 */
export const DEFAULT_ACTIVITY_TYPE_COLORS: BadgeColorMap = {
  'Chiamata': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'Messaggistica': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Email': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  'Consulenza': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  'Follow-up': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  'Altro': 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
};

/**
 * Activity Status - Stati Attività
 */
export const DEFAULT_ACTIVITY_STATUS_COLORS: BadgeColorMap = {
  'Da fare': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  'In corso': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'Completata': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Annullata': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

/**
 * Activity Priority - Priorità Attività
 */
export const DEFAULT_ACTIVITY_PRIORITY_COLORS: BadgeColorMap = {
  'Bassa': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  'Media': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'Alta': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  'Urgente': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  
  // Legacy values
  'low': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  'medium': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'high': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};

/**
 * Activity Obiettivo
 */
export const DEFAULT_ACTIVITY_OBIETTIVO_COLORS: BadgeColorMap = {
  'Primo contatto': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'Qualificazione': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  'Appuntamento': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  'Presentazione': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  'Preventivo': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  'Chiusura ordine': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Assistenza': 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300',
  'Feedback': 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300',
  'Recensione': 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300',
  'Altro': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

/**
 * Activity Esito
 */
export const DEFAULT_ACTIVITY_ESITO_COLORS: BadgeColorMap = {
  'Non risponde': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  'Da ricontattare': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  'Qualificato': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  'Appuntamento fissato': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  'Preventivo inviato': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  'Ordine confermato': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  'Non interessato': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  'Opportunit\u00e0 persa': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  'Problema risolto': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Feedback raccolto': 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300',
  'Recensione ottenuta': 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300',
  'Altro': 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
};

/**
 * Activity Prossima Azione
 */
export const DEFAULT_ACTIVITY_PROSSIMA_AZIONE_COLORS: BadgeColorMap = {
  'Chiamata': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'Messaggistica': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Email': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  'Consulenza': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  'Follow-up': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  'Altro': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

/**
 * Task Type
 */
export const DEFAULT_TASK_TYPE_COLORS: BadgeColorMap = {
  'call': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'email': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  'whatsapp': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'followup': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  'meeting': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  'other': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

/**
 * Task Priority
 */
export const DEFAULT_TASK_PRIORITY_COLORS: BadgeColorMap = {
  'low': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  'medium': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  'high': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
};

/**
 * Task Status
 */
export const DEFAULT_TASK_STATUS_COLORS: BadgeColorMap = {
  'todo': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  'in_progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  'done': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
};

/**
 * Get default colors for entity type
 */
export function getDefaultColors(entityType: EntityType): BadgeColorMap {
  switch (entityType) {
    case 'LeadStato':
      return DEFAULT_LEAD_STATUS_COLORS;
    case 'LeadFonte':
      return DEFAULT_LEAD_SOURCE_COLORS;
    case 'OrderStatus':
      return DEFAULT_ORDER_STATUS_COLORS;
    case 'ActivityType':
      return DEFAULT_ACTIVITY_TYPE_COLORS;
    case 'ActivityStatus':
      return DEFAULT_ACTIVITY_STATUS_COLORS;
    case 'ActivityObiettivo':
      return DEFAULT_ACTIVITY_OBIETTIVO_COLORS;
    case 'ActivityPriorita':
      return DEFAULT_ACTIVITY_PRIORITY_COLORS;
    case 'ActivityEsito':
      return DEFAULT_ACTIVITY_ESITO_COLORS;
    case 'ActivityProssimaAzione':
      return DEFAULT_ACTIVITY_PROSSIMA_AZIONE_COLORS;
    case 'TaskType':
      return DEFAULT_TASK_TYPE_COLORS;
    case 'TaskPriority':
      return DEFAULT_TASK_PRIORITY_COLORS;
    case 'TaskStatus':
      return DEFAULT_TASK_STATUS_COLORS;
    default:
      return {};
  }
}

/**
 * Get color for specific entity value with fallback
 */
export function getDefaultColorForValue(
  entityType: EntityType,
  value: string
): string {
  const defaultColors = getDefaultColors(entityType);
  return defaultColors[value] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
}
