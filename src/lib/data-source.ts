/**
 * DUAL-READ LAYER: Postgres + Airtable
 * 
 * Feature flag USE_POSTGRES controlla la source:
 * - true: legge da Postgres (50x più veloce)
 * - false: legge da Airtable (fallback)
 * 
 * Fallback automatico: se Postgres fallisce → Airtable
 * Metriche: traccia performance e errori per monitoring
 */

import { Pool } from 'pg';
import Airtable from 'airtable';

// Feature flag (da environment variable)
const USE_POSTGRES = process.env.USE_POSTGRES === 'true';

// Postgres pool (singleton)
let pgPool: Pool | null = null;

function getPgPool(): Pool {
  if (!pgPool) {
    pgPool = new Pool({
      host: 'aws-1-us-east-1.pooler.supabase.com',
      database: 'postgres',
      user: 'postgres.occtinunulzhbjjvztcj',
      password: process.env.POSTGRES_PASSWORD!,
      port: 5432,
      ssl: {
        rejectUnauthorized: false
      },
      // Connection pool settings
      max: 20, // max connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pgPool;
}

// Airtable client (singleton)
const airtableBase = new Airtable({ 
  apiKey: process.env.AIRTABLE_API_KEY! 
}).base(process.env.AIRTABLE_BASE_ID!);

// Metriche per monitoring
interface Metrics {
  source: 'postgres' | 'airtable';
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
}

const metrics: Metrics[] = [];

function logMetric(metric: Metrics) {
  metrics.push(metric);
  
  // Log solo errori in console
  if (!metric.success) {
    console.error(`[DataSource] ${metric.operation} failed on ${metric.source}:`, metric.error);
  }
}

export function getMetrics() {
  return metrics;
}

export function clearMetrics() {
  metrics.length = 0;
}

/**
 * LEAD OPERATIONS
 */

export interface Lead {
  id: string; // UUID Postgres o airtable_id
  airtable_id: string;
  ID?: string;
  Nome?: string;
  Telefono?: string;
  Email?: string;
  Città?: string;
  Esigenza?: string;
  Stato?: string;
  Data?: string;
  Indirizzo?: string;
  CAP?: number;
  Gender?: string;
  // Relations (JSONB arrays)
  Fonte?: string[];
  Attività?: string[];
  Assegnatario?: string[];
  Orders?: string[];
  Notes?: string[];
  created_at?: string;
  updated_at?: string;
}

export async function getLeads(filters?: {
  stato?: string;
  limit?: number;
  offset?: number;
}): Promise<Lead[]> {
  const startTime = Date.now();
  
  if (USE_POSTGRES) {
    try {
      const pool = getPgPool();
      
      let query = 'SELECT * FROM leads';
      const params: any[] = [];
      const whereClauses: string[] = [];
      
      if (filters?.stato) {
        whereClauses.push(`"Stato" = $${params.length + 1}`);
        params.push(filters.stato);
      }
      
      if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
      }
      
      query += ' ORDER BY "Data" DESC';
      
      if (filters?.limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(filters.limit);
      }
      
      if (filters?.offset) {
        query += ` OFFSET $${params.length + 1}`;
        params.push(filters.offset);
      }
      
      const result = await pool.query(query, params);
      
      const leads = result.rows.map(row => ({
        ...row,
        id: row.id,
        // Parse JSONB relations back to arrays
        Fonte: row.Fonte ? JSON.parse(row.Fonte) : undefined,
        Attività: row.Attività ? JSON.parse(row.Attività) : undefined,
        Assegnatario: row.Assegnatario ? JSON.parse(row.Assegnatario) : undefined,
        Orders: row.Orders ? JSON.parse(row.Orders) : undefined,
        Notes: row.Notes ? JSON.parse(row.Notes) : undefined,
      }));
      
      logMetric({
        source: 'postgres',
        operation: 'getLeads',
        duration: Date.now() - startTime,
        success: true,
      });
      
      return leads;
      
    } catch (error: any) {
      logMetric({
        source: 'postgres',
        operation: 'getLeads',
        duration: Date.now() - startTime,
        success: false,
        error: error.message,
      });
      
      // FALLBACK ad Airtable
      console.warn('[DataSource] Postgres fallito, uso Airtable fallback');
    }
  }
  
  // Airtable fallback (o source primaria se USE_POSTGRES=false)
  const startTimeAt = Date.now();
  try {
    const records: any[] = [];
    const tableId = process.env.AIRTABLE_LEADS_TABLE_ID!;
    
    let selectOptions: any = { pageSize: 100 };
    
    if (filters?.stato) {
      selectOptions.filterByFormula = `{Stato} = '${filters.stato}'`;
    }
    
    await airtableBase(tableId)
      .select(selectOptions)
      .eachPage((pageRecords, fetchNextPage) => {
        records.push(...pageRecords);
        
        if (filters?.limit && records.length >= filters.limit) {
          return; // Stop pagination
        }
        
        fetchNextPage();
      });
    
    const leads = records
      .slice(filters?.offset || 0, filters?.limit ? (filters.offset || 0) + filters.limit : undefined)
      .map(record => ({
        id: record.id,
        airtable_id: record.id,
        ...record.fields,
      }));
    
    logMetric({
      source: 'airtable',
      operation: 'getLeads',
      duration: Date.now() - startTimeAt,
      success: true,
    });
    
    return leads;
    
  } catch (error: any) {
    logMetric({
      source: 'airtable',
      operation: 'getLeads',
      duration: Date.now() - startTimeAt,
      success: false,
      error: error.message,
    });
    
    throw error;
  }
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const startTime = Date.now();
  
  if (USE_POSTGRES) {
    try {
      const pool = getPgPool();
      
      // Cerca per UUID o airtable_id
      const result = await pool.query(
        `SELECT * FROM leads WHERE id = $1 OR airtable_id = $2 LIMIT 1`,
        [id, id]
      );
      
      if (result.rows.length === 0) {
        logMetric({
          source: 'postgres',
          operation: 'getLeadById',
          duration: Date.now() - startTime,
          success: true,
        });
        return null;
      }
      
      const row = result.rows[0];
      const lead = {
        ...row,
        id: row.id,
        Fonte: row.Fonte ? JSON.parse(row.Fonte) : undefined,
        Attività: row.Attività ? JSON.parse(row.Attività) : undefined,
        Assegnatario: row.Assegnatario ? JSON.parse(row.Assegnatario) : undefined,
        Orders: row.Orders ? JSON.parse(row.Orders) : undefined,
        Notes: row.Notes ? JSON.parse(row.Notes) : undefined,
      };
      
      logMetric({
        source: 'postgres',
        operation: 'getLeadById',
        duration: Date.now() - startTime,
        success: true,
      });
      
      return lead;
      
    } catch (error: any) {
      logMetric({
        source: 'postgres',
        operation: 'getLeadById',
        duration: Date.now() - startTime,
        success: false,
        error: error.message,
      });
      
      console.warn('[DataSource] Postgres fallito, uso Airtable fallback');
    }
  }
  
  // Airtable fallback
  const startTimeAt = Date.now();
  try {
    const tableId = process.env.AIRTABLE_LEADS_TABLE_ID!;
    const record = await airtableBase(tableId).find(id);
    
    const lead = {
      id: record.id,
      airtable_id: record.id,
      ...record.fields,
    };
    
    logMetric({
      source: 'airtable',
      operation: 'getLeadById',
      duration: Date.now() - startTimeAt,
      success: true,
    });
    
    return lead;
    
  } catch (error: any) {
    if (error.statusCode === 404) {
      logMetric({
        source: 'airtable',
        operation: 'getLeadById',
        duration: Date.now() - startTimeAt,
        success: true,
      });
      return null;
    }
    
    logMetric({
      source: 'airtable',
      operation: 'getLeadById',
      duration: Date.now() - startTimeAt,
      success: false,
      error: error.message,
    });
    
    throw error;
  }
}

/**
 * ACTIVITY OPERATIONS
 */

export interface Activity {
  id: string;
  airtable_id: string;
  ID?: string;
  Tipo?: string;
  Titolo?: string;
  Note?: string;
  Data?: string;
  Stato?: string;
  Priorità?: string;
  Esito?: string;
  'ID Lead'?: string[];
  Assegnatario?: string[];
  created_at?: string;
  updated_at?: string;
}

export async function getActivities(filters?: {
  leadId?: string;
  limit?: number;
}): Promise<Activity[]> {
  const startTime = Date.now();
  
  if (USE_POSTGRES) {
    try {
      const pool = getPgPool();
      
      let query = 'SELECT * FROM activities';
      const params: any[] = [];
      
      if (filters?.leadId) {
        // JSONB contains check
        query += ` WHERE "ID Lead" @> $1`;
        params.push(JSON.stringify([filters.leadId]));
      }
      
      query += ' ORDER BY "Data" DESC';
      
      if (filters?.limit) {
        query += ` LIMIT $${params.length + 1}`;
        params.push(filters.limit);
      }
      
      const result = await pool.query(query, params);
      
      const activities = result.rows.map(row => ({
        ...row,
        id: row.id,
        'ID Lead': row['ID Lead'] ? JSON.parse(row['ID Lead']) : undefined,
        Assegnatario: row.Assegnatario ? JSON.parse(row.Assegnatario) : undefined,
      }));
      
      logMetric({
        source: 'postgres',
        operation: 'getActivities',
        duration: Date.now() - startTime,
        success: true,
      });
      
      return activities;
      
    } catch (error: any) {
      logMetric({
        source: 'postgres',
        operation: 'getActivities',
        duration: Date.now() - startTime,
        success: false,
        error: error.message,
      });
      
      console.warn('[DataSource] Postgres fallito, uso Airtable fallback');
    }
  }
  
  // Airtable fallback
  const startTimeAt = Date.now();
  try {
    const records: any[] = [];
    const tableId = process.env.AIRTABLE_ACTIVITIES_TABLE_ID!;
    
    let selectOptions: any = { pageSize: 100 };
    
    if (filters?.leadId) {
      selectOptions.filterByFormula = `FIND('${filters.leadId}', ARRAYJOIN({ID Lead}))`;
    }
    
    await airtableBase(tableId)
      .select(selectOptions)
      .eachPage((pageRecords, fetchNextPage) => {
        records.push(...pageRecords);
        
        if (filters?.limit && records.length >= filters.limit) {
          return;
        }
        
        fetchNextPage();
      });
    
    const activities = records
      .slice(0, filters?.limit)
      .map(record => ({
        id: record.id,
        airtable_id: record.id,
        ...record.fields,
      }));
    
    logMetric({
      source: 'airtable',
      operation: 'getActivities',
      duration: Date.now() - startTimeAt,
      success: true,
    });
    
    return activities;
    
  } catch (error: any) {
    logMetric({
      source: 'airtable',
      operation: 'getActivities',
      duration: Date.now() - startTimeAt,
      success: false,
      error: error.message,
    });
    
    throw error;
  }
}

/**
 * HEALTH CHECK
 */
export async function healthCheck(): Promise<{
  postgres: { healthy: boolean; latency?: number; error?: string };
  airtable: { healthy: boolean; latency?: number; error?: string };
}> {
  // Test Postgres
  let pgHealth = { healthy: false, latency: 0, error: '' };
  try {
    const start = Date.now();
    const pool = getPgPool();
    await pool.query('SELECT 1');
    pgHealth = { healthy: true, latency: Date.now() - start };
  } catch (error: any) {
    pgHealth = { healthy: false, error: error.message };
  }
  
  // Test Airtable
  let atHealth = { healthy: false, latency: 0, error: '' };
  try {
    const start = Date.now();
    const tableId = process.env.AIRTABLE_LEADS_TABLE_ID!;
    await airtableBase(tableId).select({ maxRecords: 1 }).firstPage();
    atHealth = { healthy: true, latency: Date.now() - start };
  } catch (error: any) {
    atHealth = { healthy: false, error: error.message };
  }
  
  return {
    postgres: pgHealth,
    airtable: atHealth,
  };
}
