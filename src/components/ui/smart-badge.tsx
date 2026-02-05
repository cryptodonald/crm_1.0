'use client';

import { useColor } from '@/hooks/use-color-preferences';
import type { EntityType } from '@/lib/color-preferences';
import { Badge } from '@/components/ui/badge';
import { getLeadStatusColor, getSourceColor } from '@/lib/airtable-colors';

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
