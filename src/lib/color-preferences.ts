/**
 * Color Preferences System
 * 
 * Gestisce le preferenze colore personalizzate per badge e UI elements.
 * Fallback hierarchy: User preference → System default → Hardcoded fallback
 */

import Airtable from 'airtable';
import { env } from '@/env';
import { redis } from '@/lib/cache';

// ============================================
// Types
// ============================================

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
  | 'ProductCategory'
  | 'TaskType'
  | 'TaskPriority'
  | 'TaskStatus';

export interface ColorPreference {
  id: string;
  entityType: EntityType;
  entityValue: string;
  colorClass: string;
  isDefault: boolean;
  userId?: string;
}

// ============================================
// Hardcoded Fallbacks
// ============================================

const HARDCODED_COLORS: Record<EntityType, Record<string, string>> = {
  LeadStato: {
    'Nuovo': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    'Attivo': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'Qualificato': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    'Cliente': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    'Chiuso': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    'Sospeso': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  },
  LeadFonte: {
    'Instagram': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    'Facebook': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    'Sito Web': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    'Passaparola': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    'Google': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    'LinkedIn': 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300',
  },
  OrderStatus: {
    'Bozza': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    'Confermato': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'In Lavorazione': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    'Spedito': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    'Consegnato': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    'Annullato': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  },
  ActivityType: {
    'Chiamata': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    'Email': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    'WhatsApp': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'Incontro': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    'Consulenza': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    'Follow-up': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    'SMS': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
    'Altro': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  },
  ActivityStatus: {
    'Da Pianificare': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    'Pianificata': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    'In corso': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    'In attesa': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    'Completata': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'Annullata': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    'Rimandata': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  },
  ActivityObiettivo: {
    'Primo contatto': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    'Qualificazione lead': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    'Presentazione prodotto': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    'Invio preventivo': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
    'Follow-up preventivo': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
    'Negoziazione': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    'Chiusura ordine': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'Fissare appuntamento': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    'Confermare appuntamento': 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300',
    'Promemoria appuntamento': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    'Consegna prodotto': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    'Assistenza tecnica': 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300',
    'Controllo soddisfazione': 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300',
    'Upsell Cross-sell': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    'Richiesta recensione': 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300',
  },
  ActivityPriorita: {
    'Bassa': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    'Media': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    'Alta': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    'Urgente': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  },
  ActivityEsito: {
    'Contatto riuscito': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'Nessuna risposta': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    'Molto interessato': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
    'Interessato': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'Poco interessato': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    'Non interessato': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    'Preventivo richiesto': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    'Preventivo inviato': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
    'Appuntamento fissato': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    'Ordine confermato': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  ActivityProssimaAzione: {
    'Richiamare': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    'Inviare email': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    'Inviare WhatsApp': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'Fissare appuntamento': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
    'Preparare preventivo': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
    'Follow-up': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    'Chiudere contratto': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'Nessuna azione': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  },
  ProductCategory: {
    // Aggiungi categorie prodotti se necessario
  },
  TaskType: {
    'call': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    'email': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    'whatsapp': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'followup': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    'meeting': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    'other': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  },
  TaskPriority: {
    'low': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    'medium': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    'high': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  },
  TaskStatus: {
    'todo': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    'in_progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    'done': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
};

// ============================================
// Cache Keys
// ============================================

const CACHE_TTL = {
  USER_PREFS: 60 * 5, // 5 minuti
  SYSTEM_DEFAULTS: 60 * 60, // 1 ora
};

function getCacheKey(entityType: EntityType, userId?: string): string {
  if (userId) {
    return `color-prefs:user:${userId}:${entityType}`;
  }
  return `color-prefs:system:${entityType}`;
}

// ============================================
// Airtable Client
// ============================================

const airtable = new Airtable({ apiKey: env.AIRTABLE_API_KEY });
const base = airtable.base(env.AIRTABLE_BASE_ID);
const colorPrefsTable = base(env.AIRTABLE_COLOR_PREFERENCES_TABLE_ID);

// ============================================
// Core Functions
// ============================================

/**
 * Recupera le preferenze colore per un tipo di entità
 * con fallback gerarchico: user → system default → hardcoded
 */
export async function getColorPreferences(
  entityType: EntityType,
  userId?: string
): Promise<Record<string, string>> {
  // 1. Prova cache
  const cacheKey = getCacheKey(entityType, userId);
  const cached = await redis?.get(cacheKey);
  if (cached && typeof cached === 'string') {
    return JSON.parse(cached);
  }

  // 2. Carica da Airtable
  const prefs = await loadColorPreferencesFromAirtable(entityType, userId);
  
  // 3. Applica fallback gerarchico
  const colors = applyFallbackHierarchy(entityType, prefs, userId);

  // 4. Cache result
  if (redis) {
    const ttl = userId ? CACHE_TTL.USER_PREFS : CACHE_TTL.SYSTEM_DEFAULTS;
    await redis.setex(cacheKey, ttl, JSON.stringify(colors));
  }

  return colors;
}

/**
 * Recupera il colore per un singolo valore
 */
export async function getColor(
  entityType: EntityType,
  entityValue: string,
  userId?: string
): Promise<string> {
  const prefs = await getColorPreferences(entityType, userId);
  return prefs[entityValue] || getHardcodedFallback(entityType, entityValue);
}

/**
 * Salva una preferenza colore personalizzata
 */
export async function saveColorPreference(
  entityType: EntityType,
  entityValue: string,
  colorClass: string,
  userId: string
): Promise<void> {
  // Verifica se esiste già
  const existing = await colorPrefsTable
    .select({
      filterByFormula: `AND(
        {EntityType} = '${entityType}',
        {EntityValue} = '${entityValue}',
        {User} = '${userId}'
      )`,
      maxRecords: 1,
    })
    .firstPage();

  if (existing.length > 0) {
    // Aggiorna esistente
    await colorPrefsTable.update(existing[0].id, {
      ColorClass: colorClass,
    });
  } else {
    // Crea nuovo
    await colorPrefsTable.create({
      EntityType: entityType,
      EntityValue: entityValue,
      ColorClass: colorClass,
      IsDefault: false,
      User: [userId],
    });
  }

  // Invalida cache
  await invalidateCache(entityType, userId);
}

/**
 * Elimina una preferenza personalizzata (reset a default)
 */
export async function deleteColorPreference(
  entityType: EntityType,
  entityValue: string,
  userId: string
): Promise<void> {
  const existing = await colorPrefsTable
    .select({
      filterByFormula: `AND(
        {EntityType} = '${entityType}',
        {EntityValue} = '${entityValue}',
        {User} = '${userId}'
      )`,
      maxRecords: 1,
    })
    .firstPage();

  if (existing.length > 0) {
    await colorPrefsTable.destroy(existing[0].id);
  }

  // Invalida cache
  await invalidateCache(entityType, userId);
}

// ============================================
// Helper Functions
// ============================================

async function loadColorPreferencesFromAirtable(
  entityType: EntityType,
  userId?: string
): Promise<ColorPreference[]> {
  let formula: string;

  if (userId) {
    // Carica sia preferenze utente che system defaults
    formula = `AND(
      {EntityType} = '${entityType}',
      OR(
        {User} = '${userId}',
        {IsDefault} = 1
      )
    )`;
  } else {
    // Solo system defaults
    formula = `AND(
      {EntityType} = '${entityType}',
      {IsDefault} = 1
    )`;
  }

  const records = await colorPrefsTable
    .select({
      filterByFormula: formula,
    })
    .all();

  return records.map((record) => {
    const userField = record.get('User');
    return {
      id: record.id,
      entityType: record.get('EntityType') as EntityType,
      entityValue: record.get('EntityValue') as string,
      colorClass: record.get('ColorClass') as string,
      isDefault: record.get('IsDefault') === true,
      userId: Array.isArray(userField) && userField.length > 0 ? (userField[0] as string) : undefined,
    };
  });
}

function applyFallbackHierarchy(
  entityType: EntityType,
  prefs: ColorPreference[],
  userId?: string
): Record<string, string> {
  const result: Record<string, string> = {};

  // 1. Applica hardcoded fallbacks
  const hardcoded = HARDCODED_COLORS[entityType] || {};
  Object.assign(result, hardcoded);

  // 2. Sovrascrivi con system defaults
  const systemDefaults = prefs.filter((p) => p.isDefault && !p.userId);
  for (const pref of systemDefaults) {
    result[pref.entityValue] = pref.colorClass;
  }

  // 3. Sovrascrivi con user preferences (se presenti)
  if (userId) {
    const userPrefs = prefs.filter((p) => p.userId === userId);
    for (const pref of userPrefs) {
      result[pref.entityValue] = pref.colorClass;
    }
  }

  return result;
}

function getHardcodedFallback(
  entityType: EntityType,
  entityValue: string
): string {
  const typeColors = HARDCODED_COLORS[entityType] || {};
  return (
    typeColors[entityValue] ||
    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
  );
}

async function invalidateCache(
  entityType: EntityType,
  userId?: string
): Promise<void> {
  if (!redis) return;

  const keys = [];

  if (userId) {
    // Invalida cache utente
    keys.push(getCacheKey(entityType, userId));
  }

  // Invalida anche system defaults (potrebbero esserci dipendenze)
  keys.push(getCacheKey(entityType));

  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

// ============================================
// Bulk Operations
// ============================================

/**
 * Recupera tutte le preferenze di un utente (tutti i tipi)
 */
export async function getAllUserPreferences(
  userId: string
): Promise<ColorPreference[]> {
  const records = await colorPrefsTable
    .select({
      filterByFormula: `{User} = '${userId}'`,
    })
    .all();

  return records.map((record) => {
    const userField = record.get('User');
    return {
      id: record.id,
      entityType: record.get('EntityType') as EntityType,
      entityValue: record.get('EntityValue') as string,
      colorClass: record.get('ColorClass') as string,
      isDefault: record.get('IsDefault') === true,
      userId: Array.isArray(userField) && userField.length > 0 ? (userField[0] as string) : undefined,
    };
  });
}

/**
 * Reset di tutte le preferenze di un utente
 */
export async function resetAllUserPreferences(userId: string): Promise<void> {
  const userPrefs = await getAllUserPreferences(userId);

  if (userPrefs.length > 0) {
    const ids = userPrefs.map((p) => p.id);
    // Airtable max 10 delete per batch
    for (let i = 0; i < ids.length; i += 10) {
      const chunk = ids.slice(i, i + 10);
      await colorPrefsTable.destroy(chunk);
    }
  }

  // Invalida tutte le cache utente
  if (redis) {
    const keys = Object.keys(HARDCODED_COLORS).map((type) =>
      getCacheKey(type as EntityType, userId)
    );
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
