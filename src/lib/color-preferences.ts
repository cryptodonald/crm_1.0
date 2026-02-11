/**
 * Stub per Color Preferences - mantiene funzionalità esistente
 * Tabella user_preferences ancora presente in database
 */

export type EntityType =
  | 'LeadStato'
  | 'LeadFonte'
  | 'OrderStatus'
  | 'ActivityType'
  | 'ActivityStatus'
  | 'ActivityObiettivo'
  | 'ActivityPriorita'
  | 'ActivityEsito'
  | 'ActivityProssimaAzione'
  | 'TaskType'
  | 'TaskPriority'
  | 'TaskStatus';

/**
 * Mapping tra EntityType (codice) e entity_type (database)
 * 
 * Database usa snake_case: 'lead_status', 'activity_type'
 * Codice usa CamelCase: 'LeadStato', 'ActivityType'
 */
export const ENTITY_TYPE_TO_DB: Record<EntityType, string> = {
  LeadStato: 'lead_status',
  LeadFonte: 'source',
  OrderStatus: 'order_status',
  ActivityType: 'activity_type',
  ActivityStatus: 'activity_status',
  ActivityObiettivo: 'activity_obiettivo',
  ActivityPriorita: 'activity_priority',
  ActivityEsito: 'activity_esito',
  ActivityProssimaAzione: 'activity_prossima_azione',
  TaskType: 'task_type',
  TaskPriority: 'task_priority',
  TaskStatus: 'task_status',
};

/**
 * Mapping inverso: database → codice
 */
export const DB_TO_ENTITY_TYPE: Record<string, EntityType> = {
  'lead_status': 'LeadStato',
  'source': 'LeadFonte',
  'order_status': 'OrderStatus',
  'activity_type': 'ActivityType',
  'activity_status': 'ActivityStatus',
  'activity_obiettivo': 'ActivityObiettivo',
  'activity_priority': 'ActivityPriorita',
  'activity_esito': 'ActivityEsito',
  'activity_prossima_azione': 'ActivityProssimaAzione',
  'task_type': 'TaskType',
  'task_priority': 'TaskPriority',
  'task_status': 'TaskStatus',
};

/**
 * Funzioni helper per colori legacy (fallback)
 */

// Lead Status Colors (legacy fallback)
function getLeadStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'Nuovo': 'bg-blue-100 text-blue-800',
    'Contattato': 'bg-yellow-100 text-yellow-800',
    'Qualificato': 'bg-purple-100 text-purple-800',
    'In Negoziazione': 'bg-orange-100 text-orange-800',
    'Cliente': 'bg-emerald-100 text-emerald-800',
    'Sospeso': 'bg-red-100 text-red-800',
    'Chiuso': 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

// Source Colors (legacy fallback)
function getSourceColor(source: string, dbColor?: string): string {
  if (dbColor) return dbColor;
  
  const colors: Record<string, string> = {
    'Meta': 'bg-blue-100 text-blue-800',
    'Instagram': 'bg-pink-100 text-pink-800',
    'Google': 'bg-orange-100 text-orange-800',
    'Referral': 'bg-purple-100 text-purple-800',
    'Diretto': 'bg-green-100 text-green-800',
    'Altro': 'bg-gray-100 text-gray-800',
  };
  return colors[source] || 'bg-gray-100 text-gray-800';
}

export { getLeadStatusColor, getSourceColor };

// Extended EntityTypes per settings page
export type ExtendedEntityType = EntityType 
  | 'ActivityObiettivo'
  | 'ActivityPriorita'
  | 'ActivityEsito'
  | 'ActivityProssimaAzione';
