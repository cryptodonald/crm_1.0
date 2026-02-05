/**
 * Sistema centralizzato di gestione colori per badge e select Airtable
 * 
 * IMPORTANTE:
 * - Per tabelle con campo "Color" (es. Marketing Sources), usa il colore dal database
 * - Per campi select senza colore nel DB, usa questa config
 * 
 * I colori qui definiti sono FALLBACK e possono essere sovrascritti da:
 * 1. Color Preferences (sistema configurabile dall'utente)
 * 2. Colori dal database (se presenti)
 * 3. Questi default hardcoded
 * 
 * DEPRECATO: Usa invece `useColor` hook da '@/hooks/use-color-preferences'
 * per ottenere colori configurabili dall'utente.
 */

/**
 * Palette colori Tailwind standardizzata per badge
 */
export const BADGE_COLORS = {
  // Status colors
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  pink: 'bg-pink-100 text-pink-700 border-pink-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  teal: 'bg-teal-100 text-teal-700 border-teal-200',
  
  // Solid colors (per fonti/sources)
  blueSolid: 'bg-blue-500 text-white',
  greenSolid: 'bg-green-500 text-white',
  redSolid: 'bg-red-500 text-white',
  purpleSolid: 'bg-purple-500 text-white',
  orangeSolid: 'bg-orange-500 text-white',
  pinkSolid: 'bg-pink-500 text-white',
  indigoSolid: 'bg-indigo-500 text-white',
  tealSolid: 'bg-teal-500 text-white',
} as const;

/**
 * Config colori per campo Stato dei Leads
 * Derivato dallo schema Airtable ma con colori customizzabili
 */
export const LEAD_STATUS_COLORS: Record<string, keyof typeof BADGE_COLORS> = {
  'Nuovo': 'blue',
  'Contattato': 'yellow',
  'Qualificato': 'purple',
  'In Negoziazione': 'orange',
  'Cliente': 'green',
  'Perso': 'gray',
  'Sospeso': 'red',
};

/**
 * Config colori per Marketing Sources (FALLBACK se manca Color nel DB)
 * Questi sono sovrascritti se Marketing Sources ha campo Color popolato
 */
export const DEFAULT_SOURCE_COLORS: Record<string, string> = {
  'Sito': '#10B981',      // green
  'Google': '#4285F4',    // blue
  'Instagram': '#E4405F', // pink/red
  'Facebook': '#1877F2',  // blue
  'Meta': '#0668E1',      // blue
  'Organico': '#8B5CF6',  // purple
  'Referral': '#F59E0B',  // orange
};

/**
 * Converti colore esadecimale in classi Tailwind per badge solid
 */
export function hexToTailwindBadge(hex: string | undefined): string {
  if (!hex) return BADGE_COLORS.blueSolid;
  
  // Mappa approssimativa hex -> Tailwind
  const normalized = hex.toLowerCase();
  
  if (normalized.includes('10b981') || normalized.includes('059669')) {
    return BADGE_COLORS.greenSolid;
  }
  if (normalized.includes('4285f4') || normalized.includes('3b82f6')) {
    return BADGE_COLORS.blueSolid;
  }
  if (normalized.includes('e4405f') || normalized.includes('ec4899')) {
    return BADGE_COLORS.pinkSolid;
  }
  if (normalized.includes('8b5cf6') || normalized.includes('a855f7')) {
    return BADGE_COLORS.purpleSolid;
  }
  if (normalized.includes('f59e0b') || normalized.includes('f97316')) {
    return BADGE_COLORS.orangeSolid;
  }
  if (normalized.includes('ef4444') || normalized.includes('dc2626')) {
    return BADGE_COLORS.redSolid;
  }
  if (normalized.includes('14b8a6') || normalized.includes('0d9488')) {
    return BADGE_COLORS.tealSolid;
  }
  if (normalized.includes('6366f1') || normalized.includes('4f46e5')) {
    return BADGE_COLORS.indigoSolid;
  }
  
  // Default
  return BADGE_COLORS.blueSolid;
}

/**
 * Ottieni classe colore per badge Stato
 * 
 * @deprecated Usa invece `useColor('LeadStato', status)` per supportare color preferences
 * Questa funzione è mantenuta solo per compatibilità legacy.
 */
export function getLeadStatusColor(status: string): string {
  const colorKey = LEAD_STATUS_COLORS[status] || 'gray';
  return BADGE_COLORS[colorKey];
}

/**
 * Ottieni colore per Marketing Source
 * Priorità: 1) Color dal DB, 2) Config default, 3) Fallback
 * 
 * @deprecated Usa invece `useColor('LeadFonte', sourceName)` per supportare color preferences
 * Questa funzione è mantenuta solo per compatibilità legacy.
 */
export function getSourceColor(
  sourceName: string,
  sourceColorFromDB?: string
): string {
  // 1. Usa colore dal DB se presente
  if (sourceColorFromDB) {
    return hexToTailwindBadge(sourceColorFromDB);
  }
  
  // 2. Usa config default
  const defaultHex = DEFAULT_SOURCE_COLORS[sourceName];
  if (defaultHex) {
    return hexToTailwindBadge(defaultHex);
  }
  
  // 3. Fallback
  return BADGE_COLORS.blueSolid;
}

/**
 * Genera mappa colori dinamica da opzioni select Airtable
 * Utile per generare colori automatici per qualsiasi campo select
 */
export function generateColorMapForSelectField(
  options: Array<{ id: string; name: string }>,
  baseColors: Array<keyof typeof BADGE_COLORS> = ['blue', 'green', 'purple', 'orange', 'yellow', 'pink', 'indigo', 'teal']
): Record<string, string> {
  const colorMap: Record<string, string> = {};
  
  options.forEach((option, index) => {
    const colorKey = baseColors[index % baseColors.length];
    colorMap[option.name] = BADGE_COLORS[colorKey];
  });
  
  return colorMap;
}
