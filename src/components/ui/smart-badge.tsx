'use client';

import { useColor } from '@/hooks/use-color-preferences';
import type { EntityType } from '@/lib/color-preferences';
import { Badge } from '@/components/ui/badge';

// Helper functions for legacy color fallback
function getLeadStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'Nuovo': 'bg-blue-100 text-blue-800 border-blue-200',
    'Contattato': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Qualificato': 'bg-purple-100 text-purple-800 border-purple-200',
    'In Negoziazione': 'bg-orange-100 text-orange-800 border-orange-200',
    'Cliente': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Sospeso': 'bg-amber-100 text-amber-800 border-amber-200',
    'Chiuso': 'bg-gray-100 text-gray-800 border-gray-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
}

function getSourceColor(source: string, dbColor?: string): string {
  if (dbColor) return dbColor;
  const colors: Record<string, string> = {
    'Instagram': 'bg-pink-100 text-pink-800 border-pink-200',
    'Meta': 'bg-blue-100 text-blue-800 border-blue-200',
    'Google': 'bg-red-100 text-red-800 border-red-200',
    'Sito': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'Passaparola': 'bg-purple-100 text-purple-800 border-purple-200',
  };
  return colors[source] || 'bg-gray-100 text-gray-800 border-gray-200';
}

interface SmartBadgeProps {
  /**
   * Tipo di entità (LeadStato, LeadFonte, etc.)
   */
  entityType: EntityType;
  
  /**
   * Valore da mostrare nel badge
   */
  value: string;
  
  /**
   * Classe CSS aggiuntiva
   */
  className?: string;
  
  /**
   * Colore legacy fallback (opzionale, per retrocompatibilità)
   */
  legacyColor?: string;
}

/**
 * Badge intelligente che usa Color Preferences con fallback legacy
 * 
 * Priorità colori:
 * 1. Color Preferences dell'utente
 * 2. System defaults da Color Preferences
 * 3. Hardcoded fallbacks da color-preferences.ts
 * 4. Legacy color (se fornito)
 * 
 * @example
 * // Stati Lead
 * <SmartBadge entityType="LeadStato" value="Nuovo" />
 * 
 * // Fonti Lead
 * <SmartBadge entityType="LeadFonte" value="Instagram" />
 * 
 * // Con legacy fallback
 * <SmartBadge 
 *   entityType="LeadStato" 
 *   value="Nuovo"
 *   legacyColor={getLeadStatusColor("Nuovo")}
 * />
 */
export function SmartBadge({ 
  entityType, 
  value, 
  className = '',
  legacyColor 
}: SmartBadgeProps) {
  // Usa hook per ottenere colore da color preferences
  const colorFromPrefs = useColor(entityType, value);
  
  // Fallback: usa colore legacy se color prefs non disponibile
  const finalColor = colorFromPrefs || legacyColor;
  
  return (
    <Badge className={finalColor ? `${finalColor} ${className}` : className}>
      {value}
    </Badge>
  );
}

/**
 * Shortcut per Lead Status badge
 */
export function LeadStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <SmartBadge
      entityType="LeadStato"
      value={status}
      className={className}
      legacyColor={getLeadStatusColor(status)}
    />
  );
}

/**
 * Shortcut per Lead Source badge
 */
export function LeadSourceBadge({ 
  source, 
  sourceColorFromDB, 
  className 
}: { 
  source: string; 
  sourceColorFromDB?: string;
  className?: string;
}) {
  return (
    <SmartBadge
      entityType="LeadFonte"
      value={source}
      className={className}
      legacyColor={getSourceColor(source, sourceColorFromDB)}
    />
  );
}

/**
 * Shortcut per Order Status badge
 */
export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <SmartBadge
      entityType="OrderStatus"
      value={status}
      className={className}
    />
  );
}

/**
 * Shortcut per Activity Type badge
 */
export function ActivityTypeBadge({ type, className }: { type: string; className?: string }) {
  return (
    <SmartBadge
      entityType="ActivityType"
      value={type}
      className={className}
    />
  );
}

/**
 * Shortcut per Activity Status badge
 */
export function ActivityStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <SmartBadge
      entityType="ActivityStatus"
      value={status}
      className={className}
    />
  );
}

/**
 * Shortcut per Task Type badge
 */
export function TaskTypeBadge({ type, className }: { type: string; className?: string }) {
  return (
    <SmartBadge
      entityType="TaskType"
      value={type}
      className={className}
    />
  );
}

/**
 * Shortcut per Task Priority badge
 */
export function TaskPriorityBadge({ priority, className }: { priority: string; className?: string }) {
  return (
    <SmartBadge
      entityType="TaskPriority"
      value={priority}
      className={className}
    />
  );
}

/**
 * Shortcut per Task Status badge
 */
export function TaskStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <SmartBadge
      entityType="TaskStatus"
      value={status}
      className={className}
    />
  );
}
