/**
 * Postgres Client (Neon Serverless)
 * 
 * Rimpiazza @vercel/postgres deprecato con @neondatabase/serverless
 * 
 * Features:
 * - Connection pooling automatico
 * - Edge-ready (funziona su Vercel Edge)
 * - Type-safe queries
 */

import { neon, neonConfig } from '@neondatabase/serverless';
import { env } from '@/env';

// Configura Neon per Vercel Edge (opzionale)
neonConfig.fetchConnectionCache = true;

/**
 * Query SQL function
 * 
 * Usage:
 * const result = await sql`SELECT * FROM leads WHERE id = ${leadId}`;
 */
export const sql = neon(env.POSTGRES_URL || '');

/**
 * Helper: Execute query with error handling
 */
export async function query<T = any>(
  queryString: string,
  params: any[] = []
): Promise<T[]> {
  try {
    // Neon client supports template strings natively
    const result = await sql(queryString, params);
    return result as T[];
  } catch (error: any) {
    console.error('[Postgres] Query error:', error.message);
    throw new Error(`Database query failed: ${error.message}`);
  }
}

/**
 * Helper: Execute single row query
 */
export async function querySingle<T = any>(
  queryString: string,
  params: any[] = []
): Promise<T | null> {
  const results = await query<T>(queryString, params);
  return results[0] || null;
}

/**
 * Health check
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('[Postgres] Connection check failed:', error);
    return false;
  }
}
