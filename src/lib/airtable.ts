import Airtable, { FieldSet, Records } from 'airtable';
import { env } from '@/env';

/**
 * Airtable Client with Retry Logic
 * 
 * This client handles:
 * - Automatic retries on rate limit errors (429)
 * - Exponential backoff
 * - Type-safe table access
 * - Error handling and logging
 */

// Initialize Airtable client
const airtableClient = new Airtable({
  apiKey: env.AIRTABLE_API_KEY,
});

const base = airtableClient.base(env.AIRTABLE_BASE_ID);

// Table references with type safety
export const tables = {
  leads: base(env.AIRTABLE_LEADS_TABLE_ID),
  activities: base(env.AIRTABLE_ACTIVITIES_TABLE_ID),
  users: base(env.AIRTABLE_USERS_TABLE_ID),
  products: base(env.AIRTABLE_PRODUCTS_TABLE_ID),
  orders: base(env.AIRTABLE_ORDERS_TABLE_ID),
  notes: base(env.AIRTABLE_NOTES_TABLE_ID),
  automations: env.AIRTABLE_AUTOMATIONS_TABLE_ID
    ? base(env.AIRTABLE_AUTOMATIONS_TABLE_ID)
    : null,
  // Developer & Task Management Tables
  devIssues: base(env.AIRTABLE_DEV_ISSUES_TABLE_ID),
  userTasks: base(env.AIRTABLE_USER_TASKS_TABLE_ID),
  notifications: base(env.AIRTABLE_NOTIFICATIONS_TABLE_ID),
  devIssueComments: base(env.AIRTABLE_DEV_ISSUE_COMMENTS_TABLE_ID),
} as const;

/**
 * Retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelayMs);
}

/**
 * Check if error is retryable
 */
function isRetryableError(error: any): boolean {
  // Retry on rate limit (429) or network errors
  if (error.statusCode === 429) return true;
  if (error.statusCode === 503) return true;
  if (error.code === 'ECONNRESET') return true;
  if (error.code === 'ETIMEDOUT') return true;
  return false;
}

/**
 * Wrapper for Airtable operations with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string = 'airtable-operation'
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Log error
      console.error(`[Airtable] ${operationName} failed (attempt ${attempt + 1}):`, {
        error: error.message,
        statusCode: error.statusCode,
        code: error.code,
      });

      // Check if we should retry
      if (attempt < RETRY_CONFIG.maxRetries && isRetryableError(error)) {
        const delay = getRetryDelay(attempt);
        console.log(`[Airtable] Retrying ${operationName} in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      // Max retries reached or non-retryable error
      break;
    }
  }

  // All retries failed
  throw new Error(
    `[Airtable] ${operationName} failed after ${RETRY_CONFIG.maxRetries} retries: ${lastError.message}`
  );
}

/**
 * Helper: Find records with retry logic
 */
export async function findRecords<T = any>(
  tableName: keyof typeof tables,
  options?: {
    filterByFormula?: string;
    maxRecords?: number;
    sort?: Array<{ field: string; direction?: 'asc' | 'desc' }>;
    view?: string;
  }
): Promise<Records<T & FieldSet>> {
  return withRetry(async () => {
    const table = tables[tableName];
    if (!table) throw new Error(`Table ${tableName} not configured`);

    return (await table.select(options || {}).all()) as unknown as Records<T & FieldSet>;
  }, `find-${tableName}`);
}

/**
 * Helper: Get single record by ID with retry logic
 */
export async function getRecord<T = any>(
  tableName: keyof typeof tables,
  recordId: string
): Promise<Airtable.Record<T & FieldSet>> {
  return withRetry(async () => {
    const table = tables[tableName];
    if (!table) throw new Error(`Table ${tableName} not configured`);

    return (await table.find(recordId)) as unknown as Airtable.Record<T & FieldSet>;
  }, `get-${tableName}-${recordId}`);
}

/**
 * Helper: Create record with retry logic
 */
export async function createRecord<T = any>(
  tableName: keyof typeof tables,
  fields: Partial<T & FieldSet>
): Promise<Airtable.Record<T & FieldSet>> {
  return withRetry(async () => {
    const table = tables[tableName];
    if (!table) throw new Error(`Table ${tableName} not configured`);

    return (await table.create(fields as any)) as unknown as Airtable.Record<T & FieldSet>;
  }, `create-${tableName}`);
}

/**
 * Helper: Update record with retry logic
 */
export async function updateRecord<T = any>(
  tableName: keyof typeof tables,
  recordId: string,
  fields: Partial<T & FieldSet>
): Promise<Airtable.Record<T & FieldSet>> {
  return withRetry(async () => {
    const table = tables[tableName];
    if (!table) throw new Error(`Table ${tableName} not configured`);

    return (await table.update(recordId, fields as any)) as unknown as Airtable.Record<T & FieldSet>;
  }, `update-${tableName}-${recordId}`);
}

/**
 * Helper: Delete record with retry logic
 */
export async function deleteRecord(
  tableName: keyof typeof tables,
  recordId: string
): Promise<{ id: string; deleted: boolean }> {
  return withRetry(async () => {
    const table = tables[tableName];
    if (!table) throw new Error(`Table ${tableName} not configured`);

    const deleted = await table.destroy(recordId);
    return { id: deleted.id, deleted: true };
  }, `delete-${tableName}-${recordId}`);
}

/**
 * Helper: Batch create records
 */
export async function batchCreateRecords<T extends FieldSet>(
  tableName: keyof typeof tables,
  records: Array<Partial<T>>
): Promise<Records<T>> {
  return withRetry(async () => {
    const table = tables[tableName];
    if (!table) throw new Error(`Table ${tableName} not configured`);

    // Airtable limits batch operations to 10 records at a time
    const BATCH_SIZE = 10;
    const results: Airtable.Record<T>[] = [];

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const created = (await table.create(batch as any)) as unknown as Records<T>;
      results.push(...created);
    }

    return results;
  }, `batch-create-${tableName}`);
}

/**
 * Helper: Batch update records
 */
export async function batchUpdateRecords<T extends FieldSet>(
  tableName: keyof typeof tables,
  updates: Array<{ id: string; fields: Partial<T> }>
): Promise<Records<T>> {
  return withRetry(async () => {
    const table = tables[tableName];
    if (!table) throw new Error(`Table ${tableName} not configured`);

    // Airtable limits batch operations to 10 records at a time
    const BATCH_SIZE = 10;
    const results: Airtable.Record<T>[] = [];

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      const updated = (await table.update(batch as any)) as unknown as Records<T>;
      results.push(...updated);
    }

    return results;
  }, `batch-update-${tableName}`);
}

/**
 * Helper: Batch delete records
 */
export async function batchDeleteRecords(
  tableName: keyof typeof tables,
  recordIds: string[]
): Promise<Array<{ id: string; deleted: boolean }>> {
  return withRetry(async () => {
    const table = tables[tableName];
    if (!table) throw new Error(`Table ${tableName} not configured`);

    // Airtable limits batch operations to 10 records at a time
    const BATCH_SIZE = 10;
    const results: Array<{ id: string; deleted: boolean }> = [];

    for (let i = 0; i < recordIds.length; i += BATCH_SIZE) {
      const batch = recordIds.slice(i, i + BATCH_SIZE);
      const deleted = await table.destroy(batch);
      results.push(...deleted.map((r) => ({ id: r.id, deleted: true })));
    }

    return results;
  }, `batch-delete-${tableName}`);
}

// Export base client for advanced use cases
export { base };
export default airtableClient;

// Export individual table references for convenience
export const leadsTable = tables.leads;
export const activitiesTable = tables.activities;
export const usersTable = tables.users;
export const productsTable = tables.products;
export const ordersTable = tables.orders;
export const notesTable = tables.notes;
export const automationsTable = tables.automations;
