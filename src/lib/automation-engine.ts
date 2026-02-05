/**
 * Automation Engine
 * 
 * Sistema per eseguire automazioni configurate in Airtable.
 * Supporta trigger su eventi (Record Created/Updated/Deleted) con condizioni multiple (AND/OR).
 */

import { findRecords, updateRecord, automationsTable } from './airtable';
import type { AirtableAutomations, AirtableLead } from '@/types/airtable.generated';

type TriggerEvent = 'Record Created' | 'Record Updated' | 'Record Deleted';
type TriggerTable = 'Lead' | 'Activity' | 'Order' | 'Products' | 'User';
type TriggerOperator = 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty';
type ActionType = 'update_field' | 'create_activity' | 'send_notification';

interface AutomationContext {
  triggerTable: TriggerTable;
  triggerEvent: TriggerEvent;
  record: any; // Record che ha scatenato l'evento
  previousRecord?: any; // Record prima dell'update (solo per Record Updated)
}

/**
 * Carica tutte le automazioni attive per una specifica tabella e evento
 */
async function loadActiveAutomations(
  table: TriggerTable,
  event: TriggerEvent
): Promise<AirtableAutomations[]> {
  try {
    const automations = await findRecords<AirtableAutomations>('automations', {
      filterByFormula: `AND(
        {IsActive} = TRUE(),
        {TriggerTable} = '${table}',
        {TriggerEvent} = '${event}'
      )`,
    });

    return (automations || []) as unknown as AirtableAutomations[];
  } catch (error) {
    console.error('[AutomationEngine] Error loading automations:', error);
    return [];
  }
}

/**
 * Valuta una singola condizione
 */
function evaluateCondition(
  record: any,
  field: string | undefined,
  operator: TriggerOperator | undefined,
  value: string | undefined
): boolean {
  if (!field || !operator) return true; // Se manca campo/operatore, considera condizione vera

  const fieldValue = record.fields[field];
  
  switch (operator) {
    case 'equals':
      return String(fieldValue) === value;
    
    case 'not_equals':
      return String(fieldValue) !== value;
    
    case 'contains':
      // Supporta multipli valori separati da |
      if (!value) return false;
      const values = value.split('|').map(v => v.trim());
      return values.some(v => String(fieldValue).includes(v));
    
    case 'is_empty':
      return !fieldValue || fieldValue === '';
    
    case 'is_not_empty':
      return !!fieldValue && fieldValue !== '';
    
    default:
      console.warn(`[AutomationEngine] Unknown operator: ${operator}`);
      return false;
  }
}

/**
 * Valuta le condizioni dell'automazione (supporta AND/OR)
 */
function evaluateAutomationConditions(
  automation: AirtableAutomations,
  record: any
): boolean {
  const condition1 = evaluateCondition(
    record,
    automation.fields.TriggerField,
    automation.fields.TriggerOperator,
    automation.fields.TriggerValue
  );

  // Se non c'è seconda condizione, ritorna solo la prima
  if (!automation.fields.TriggerField2) {
    return condition1;
  }

  const condition2 = evaluateCondition(
    record,
    automation.fields.TriggerField2,
    automation.fields.TriggerOperator2,
    automation.fields.TriggerValue2
  );

  // Combina con logica AND/OR
  const logic = automation.fields.TriggerLogic || 'AND';
  return logic === 'AND' ? condition1 && condition2 : condition1 || condition2;
}

/**
 * Esegue l'azione dell'automazione
 */
async function executeAction(
  automation: AirtableAutomations,
  context: AutomationContext
): Promise<boolean> {
  const { ActionType, ActionTargetTable, ActionTargetField, ActionValue } = automation.fields;

  try {
    switch (ActionType) {
      case 'update_field': {
        if (!ActionTargetTable || !ActionTargetField || !ActionValue) {
          console.warn('[AutomationEngine] Missing action parameters');
          return false;
        }

        // Determina quale record aggiornare
        let targetRecordId: string | undefined;

        if (ActionTargetTable === context.triggerTable) {
          // Aggiorna lo stesso record che ha triggato l'evento
          targetRecordId = context.record.id;
        } else if (ActionTargetTable === 'Lead' && context.triggerTable === 'Activity') {
          // Activity → Lead: usa il campo ID_Lead
          const leadLinks = context.record.fields['ID Lead'];
          targetRecordId = Array.isArray(leadLinks) ? leadLinks[0] : undefined;
        } else if (ActionTargetTable === 'Lead' && context.triggerTable === 'Order') {
          // Order → Lead: usa il campo ID_Lead
          const leadLinks = context.record.fields['ID_Lead'];
          targetRecordId = Array.isArray(leadLinks) ? leadLinks[0] : undefined;
        } else {
          console.warn(`[AutomationEngine] Unsupported target: ${context.triggerTable} -> ${ActionTargetTable}`);
          return false;
        }

        if (!targetRecordId) {
          console.warn('[AutomationEngine] Target record ID not found');
          return false;
        }

        // Esegui l'update
        const tableMap: Record<string, keyof typeof import('./airtable').tables> = {
          Lead: 'leads',
          Activity: 'activities',
          Order: 'orders',
          User: 'users',
        };

        const tableName = tableMap[ActionTargetTable];
        if (!tableName) {
          console.warn(`[AutomationEngine] Unknown table: ${ActionTargetTable}`);
          return false;
        }

        await updateRecord(tableName as keyof typeof import('./airtable').tables, targetRecordId, {
          [ActionTargetField]: ActionValue,
        });

        console.log(`[AutomationEngine] ✅ Updated ${ActionTargetTable}.${ActionTargetField} = ${ActionValue} for record ${targetRecordId}`);
        return true;
      }

      case 'create_activity':
        // TODO: Implementare in futuro
        console.warn('[AutomationEngine] create_activity not yet implemented');
        return false;

      case 'send_notification':
        // TODO: Implementare in futuro
        console.warn('[AutomationEngine] send_notification not yet implemented');
        return false;

      default:
        console.warn(`[AutomationEngine] Unknown action type: ${ActionType}`);
        return false;
    }
  } catch (error) {
    console.error('[AutomationEngine] Error executing action:', error);
    return false;
  }
}

/**
 * Registra l'esecuzione dell'automazione (incrementa counter, aggiorna timestamp)
 */
async function logExecution(automation: AirtableAutomations): Promise<void> {
  try {
    if (!automationsTable) {
      console.warn('[AutomationEngine] Automations table not configured');
      return;
    }
    
    const currentCount = automation.fields.ExecutionCount || 0;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    await automationsTable.update(automation.id, {
      ExecutionCount: currentCount + 1,
      LastExecuted: today,
    });
  } catch (error) {
    console.error('[AutomationEngine] Error logging execution:', error);
  }
}

/**
 * Esegue tutte le automazioni applicabili per un dato contesto
 * 
 * @param context - Contesto evento (tabella, evento, record)
 * @returns Numero di automazioni eseguite con successo
 */
export async function executeAutomations(context: AutomationContext): Promise<number> {
  console.log(`[AutomationEngine] 🔍 Checking automations for ${context.triggerTable}.${context.triggerEvent}`);

  // Carica automazioni attive
  const automations = await loadActiveAutomations(context.triggerTable, context.triggerEvent);
  
  if (automations.length === 0) {
    console.log('[AutomationEngine] No active automations found');
    return 0;
  }

  console.log(`[AutomationEngine] Found ${automations.length} active automation(s)`);

  let executedCount = 0;

  // Esegui ogni automazione che matcha le condizioni
  for (const automation of automations) {
    const matches = evaluateAutomationConditions(automation, context.record);

    if (matches) {
      console.log(`[AutomationEngine] ✓ Automation matched: ${automation.fields.Name}`);
      
      const success = await executeAction(automation, context);
      
      if (success) {
        executedCount++;
        await logExecution(automation);
      }
    } else {
      console.log(`[AutomationEngine] ✗ Automation conditions not met: ${automation.fields.Name}`);
    }
  }

  console.log(`[AutomationEngine] ✨ Executed ${executedCount}/${automations.length} automation(s)`);
  return executedCount;
}

/**
 * Helper per triggare automazioni dopo creazione record
 */
export async function triggerOnCreate(
  table: TriggerTable,
  record: any
): Promise<number> {
  return executeAutomations({
    triggerTable: table,
    triggerEvent: 'Record Created',
    record,
  });
}

/**
 * Helper per triggare automazioni dopo update record
 */
export async function triggerOnUpdate(
  table: TriggerTable,
  record: any,
  previousRecord?: any
): Promise<number> {
  return executeAutomations({
    triggerTable: table,
    triggerEvent: 'Record Updated',
    record,
    previousRecord,
  });
}

/**
 * Helper per triggare automazioni dopo delete record
 */
export async function triggerOnDelete(
  table: TriggerTable,
  record: any
): Promise<number> {
  return executeAutomations({
    triggerTable: table,
    triggerEvent: 'Record Deleted',
    record,
  });
}
