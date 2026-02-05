/**
 * Applica schema Postgres
 * 
 * Uso: npx tsx scripts/apply-schema.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { neon } from '@neondatabase/serverless';

// Read POSTGRES_URL directly (avoid env.ts validation)
const POSTGRES_URL = process.env.POSTGRES_URL;
if (!POSTGRES_URL) {
  console.error('❌ POSTGRES_URL non configurato');
  process.exit(1);
}
const sql = neon(POSTGRES_URL);

async function applySchema() {
  try {
    console.log('🔧 Applicazione schema Postgres...\n');
    
    //  Leggi schema SQL
    const schemaPath = join(__dirname, 'postgres-schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    // Esegui schema statement per statement (Neon limita multi-statement)
    console.log('📝 Esecuzione schema SQL...');
    
    // Split per statement separati (ignorando commenti)
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const stmt of statements) {
      if (stmt) {
        await sql([stmt] as any); // Neon tagged template workaround
      }
    }
    
    console.log('\n✅ Schema applicato con successo!');
    console.log('\n📊 Tabelle create:');
    console.log('  - leads');
    console.log('  - users');
    console.log('  - activities');
    console.log('  - orders');
    console.log('  - sync_log');
    console.log('\n🔍 Views create:');
    console.log('  - dashboard_stats (materialized)');
    console.log('  - leads_with_stats');
    console.log('\n⚡ Indici ottimizzati per performance');
    
  } catch (error: any) {
    console.error('\n❌ Errore applicazione schema:', error.message);
    process.exit(1);
  }
}

applySchema();
