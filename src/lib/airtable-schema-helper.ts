/**
 * Utility per consultare lo schema Airtable a runtime
 * 
 * Usa il JSON generato da scripts/generate-airtable-types.ts
 * per ottenere informazioni sui campi, opzioni select, ecc.
 */

import schema from './airtable-schema.json';

export type TableName = keyof typeof schema.tables;
export type FieldName<T extends TableName> = keyof typeof schema.tables[T]['fields'];

/**
 * Ottieni informazioni su un campo
 */
export function getFieldInfo<T extends TableName>(
  tableName: T,
  fieldName: string
): { id: string; type: string; options?: any } | null {
  const table = (schema.tables as any)[tableName];
  if (!table) return null;
  
  const field = table.fields[fieldName];
  if (!field) return null;
  
  return field as any;
}

/**
 * Ottieni tutte le opzioni di un campo select
 */
export function getSelectOptions<T extends TableName>(
  tableName: T,
  fieldName: string
): Array<{ id: string; name: string }> | null {
  const field = getFieldInfo(tableName, fieldName);
  if (!field || !field.options?.choices) return null;
  
  return field.options.choices;
}

/**
 * Ottieni l'ID di una tabella
 */
export function getTableId(tableName: TableName): string | null {
  const table = (schema.tables as any)[tableName];
  return table?.id || null;
}

/**
 * Ottieni tutte le tabelle disponibili
 */
export function getAllTables(): string[] {
  return Object.keys(schema.tables);
}

/**
 * Ottieni tutti i campi di una tabella
 */
export function getTableFields<T extends TableName>(
  tableName: T
): Record<string, { id: string; type: string; options?: any }> | null {
  const table = (schema.tables as any)[tableName];
  return table?.fields as any || null;
}

/**
 * Controlla se un valore è valido per un campo select
 */
export function isValidSelectValue<T extends TableName>(
  tableName: T,
  fieldName: string,
  value: string
): boolean {
  const options = getSelectOptions(tableName, fieldName);
  if (!options) return false;
  
  return options.some(opt => opt.name === value);
}

/**
 * Ottieni l'ID linked table per un campo multipleRecordLinks
 */
export function getLinkedTableId<T extends TableName>(
  tableName: T,
  fieldName: string
): string | null {
  const field = getFieldInfo(tableName, fieldName);
  if (!field || field.type !== 'multipleRecordLinks') return null;
  
  return field.options?.linkedTableId || null;
}

/**
 * Timestamp generazione schema
 */
export function getSchemaGeneratedAt(): string {
  return schema.generatedAt;
}

/**
 * Base ID corrente
 */
export function getBaseId(): string {
  return schema.baseId;
}
