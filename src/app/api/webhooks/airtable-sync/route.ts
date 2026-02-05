import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

/**
 * WEBHOOK AIRTABLE → POSTGRES SYNC
 * 
 * Riceve notifiche da Airtable quando un record cambia e aggiorna Postgres.
 * 
 * Setup Airtable:
 * 1. Vai su https://airtable.com/create/webhook
 * 2. URL: https://crm.doctorbed.app/api/webhooks/airtable-sync
 * 3. Secret: AIRTABLE_WEBHOOK_SECRET (in .env)
 * 4. Eventi: record.created, record.updated, record.deleted
 * 5. Tabelle: tutte (Lead, Activity, Notes, etc.)
 * 
 * Payload Airtable:
 * {
 *   "event": "record.created" | "record.updated" | "record.deleted",
 *   "table": "Lead",
 *   "recordId": "recXXXXXXXXXXXXXX",
 *   "fields": { ... },
 *   "timestamp": "2026-02-05T16:30:00.000Z"
 * }
 */

// Postgres pool singleton
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
      max: 10,
    });
  }
  return pgPool;
}

// Mapping Airtable table names → Postgres table names
const TABLE_MAPPING: Record<string, string> = {
  'Lead': 'leads',
  'Activity': 'activities',
  'Notes': 'notes',
  'User': 'users',
  'Automations': 'automations',
  'Products': 'products',
  'Product_Variants': 'product_variants',
  'Product_Structures': 'product_structures',
  'Orders': 'orders',
  'Order_Items': 'order_items',
  'Product_Price_History': 'product_price_history',
  'Commission_Payments': 'commission_payments',
  'Payment_Transactions': 'payment_transactions',
  'Marketing Sources': 'marketing_sources',
  'Marketing Costs': 'marketing_costs',
  'Spese Mensili': 'spese_mensili',
  'AI_Conversations': 'ai_conversations',
  'Dev_Issues': 'dev_issues',
  'User_Tasks': 'user_tasks',
  'Notifications': 'notifications',
  'Dev_Issue_Comments': 'dev_issue_comments',
  'UserColorPreferences': 'user_color_preferences',
};

// Format value per Postgres
function formatValue(value: any): any {
  if (value === null || value === undefined) return null;
  
  // Array → JSONB
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  
  // Object → JSONB
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return value;
}

// Sync record created/updated
async function syncUpsert(pgTable: string, recordId: string, fields: Record<string, any>) {
  const pool = getPgPool();
  
  const fieldNames = Object.keys(fields);
  const columns = ['airtable_id', ...fieldNames.map(f => `"${f}"`)];
  const placeholders = columns.map((_, i) => `$${i + 1}`);
  
  const query = `
    INSERT INTO ${pgTable} (${columns.join(', ')})
    VALUES (${placeholders.join(', ')})
    ON CONFLICT (airtable_id) DO UPDATE SET
      ${fieldNames.map((f, i) => `"${f}" = $${i + 2}`).join(', ')},
      updated_at = NOW()
  `;
  
  const params = [
    recordId,
    ...fieldNames.map(f => formatValue(fields[f]))
  ];
  
  await pool.query(query, params);
}

// Sync record deleted
async function syncDelete(pgTable: string, recordId: string) {
  const pool = getPgPool();
  
  await pool.query(
    `DELETE FROM ${pgTable} WHERE airtable_id = $1`,
    [recordId]
  );
}

// Verify webhook signature (HMAC SHA256)
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  
  return signature === expectedSignature;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Verify signature
    const signature = request.headers.get('x-airtable-signature');
    const secret = process.env.AIRTABLE_WEBHOOK_SECRET;
    
    if (!secret) {
      console.error('[Webhook] AIRTABLE_WEBHOOK_SECRET non configurato');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }
    
    const rawBody = await request.text();
    
    if (signature && !verifySignature(rawBody, signature, secret)) {
      console.error('[Webhook] Signature verification failed');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
    // 2. Parse payload
    const payload = JSON.parse(rawBody);
    const { event, table, recordId, fields, timestamp } = payload;
    
    if (!event || !table || !recordId) {
      return NextResponse.json(
        { error: 'Missing required fields: event, table, recordId' },
        { status: 400 }
      );
    }
    
    // 3. Map table name
    const pgTable = TABLE_MAPPING[table];
    if (!pgTable) {
      console.warn(`[Webhook] Unknown table: ${table}`);
      return NextResponse.json(
        { error: `Unknown table: ${table}` },
        { status: 400 }
      );
    }
    
    // 4. Sync based on event type
    try {
      switch (event) {
        case 'record.created':
        case 'record.updated':
          await syncUpsert(pgTable, recordId, fields || {});
          console.log(`[Webhook] ${event} ${table}/${recordId} synced to ${pgTable}`);
          break;
          
        case 'record.deleted':
          await syncDelete(pgTable, recordId);
          console.log(`[Webhook] ${event} ${table}/${recordId} deleted from ${pgTable}`);
          break;
          
        default:
          console.warn(`[Webhook] Unknown event: ${event}`);
          return NextResponse.json(
            { error: `Unknown event: ${event}` },
            { status: 400 }
          );
      }
      
      // 5. Log sync in sync_log table
      const pool = getPgPool();
      await pool.query(
        `INSERT INTO sync_log (table_name, operation, records_processed, status, completed_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [pgTable, event, 1, 'completed']
      );
      
      const duration = Date.now() - startTime;
      
      return NextResponse.json({
        status: 'ok',
        event,
        table: pgTable,
        recordId,
        duration,
        timestamp: new Date().toISOString(),
      });
      
    } catch (error: any) {
      console.error(`[Webhook] Sync error:`, error);
      
      // Log failed sync
      const pool = getPgPool();
      await pool.query(
        `INSERT INTO sync_log (table_name, operation, records_failed, status, error_message, completed_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [pgTable, event, 1, 'failed', error.message]
      );
      
      return NextResponse.json(
        { 
          status: 'error',
          error: error.message,
          event,
          table: pgTable,
          recordId,
        },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('[Webhook] Fatal error:', error);
    
    return NextResponse.json(
      { 
        status: 'error',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

// GET per test (non usato da Airtable)
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Airtable Webhook Endpoint',
    endpoint: '/api/webhooks/airtable-sync',
    methods: ['POST'],
    setup: 'https://airtable.com/create/webhook',
    requiredHeaders: ['x-airtable-signature'],
    requiredEnv: ['AIRTABLE_WEBHOOK_SECRET', 'POSTGRES_PASSWORD'],
  });
}
