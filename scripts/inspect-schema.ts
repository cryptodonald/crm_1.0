/**
 * Ispeziona schema Postgres per capire nomi colonne esatti
 */

import pkg from 'pg';
const { Pool } = pkg;
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const pool = new Pool({
  host: 'aws-1-us-east-1.pooler.supabase.com',
  database: 'postgres',
  user: 'postgres.occtinunulzhbjjvztcj',
  password: process.env.POSTGRES_PASSWORD!,
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

async function inspectSchema() {
  console.log('🔍 Ispezionando schema Postgres...\n');
  
  const tables = ['leads', 'activities', 'products', 'orders'];
  
  for (const table of tables) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📋 Tabella: ${table}`);
    console.log('='.repeat(60));
    
    // Query colonne
    const result = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' 
        AND table_name = $1
      ORDER BY ordinal_position
    `, [table]);
    
    console.log(`\n📊 Colonne (${result.rows.length}):\n`);
    
    result.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  "${col.column_name}" (${col.data_type}) ${nullable}`);
    });
    
    // Esempio record
    console.log('\n📄 Primo record:\n');
    try {
      const sample = await pool.query(`SELECT * FROM ${table} LIMIT 1`);
      if (sample.rows.length > 0) {
        const record = sample.rows[0];
        Object.keys(record).slice(0, 10).forEach(key => {
          const value = record[key];
          const preview = typeof value === 'string' && value.length > 50 
            ? value.slice(0, 50) + '...' 
            : value;
          console.log(`  ${key}: ${JSON.stringify(preview)}`);
        });
      } else {
        console.log('  (nessun record trovato)');
      }
    } catch (err: any) {
      console.log(`  ❌ Errore: ${err.message}`);
    }
  }
  
  await pool.end();
  console.log('\n✅ Ispezione completata!\n');
}

inspectSchema().catch(err => {
  console.error('❌ Errore fatale:', err);
  process.exit(1);
});
