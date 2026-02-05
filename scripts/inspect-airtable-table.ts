/**
 * Generic Airtable Schema Inspector
 * 
 * Inspects any Airtable table to see its actual schema and field names.
 * 
 * Usage:
 *   NODE_OPTIONS='--require dotenv/config' DOTENV_CONFIG_PATH=.env.local npx tsx scripts/inspect-airtable-table.ts <table_name>
 * 
 * Examples:
 *   npx tsx scripts/inspect-airtable-table.ts users
 *   npx tsx scripts/inspect-airtable-table.ts leads
 *   npx tsx scripts/inspect-airtable-table.ts activities
 *   npx tsx scripts/inspect-airtable-table.ts products
 *   npx tsx scripts/inspect-airtable-table.ts orders
 * 
 * Output:
 * - Lists all records (max 5)
 * - Shows all field names and their types
 * - Displays sample data
 * - Useful for updating TypeScript types to match Airtable schema
 */

// IMPORTANT: Load dotenv BEFORE any other imports
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

// Now import modules that depend on environment variables
import { findRecords } from '../src/lib/airtable';

const VALID_TABLES = ['users', 'leads', 'activities', 'products', 'orders', 'automations'] as const;
type TableName = typeof VALID_TABLES[number];

async function inspectTable(tableName: TableName) {
  console.log(`🔍 Inspecting Airtable table: ${tableName}\n`);
  
  const tableIdEnvMap: Record<TableName, string> = {
    users: 'AIRTABLE_USERS_TABLE_ID',
    leads: 'AIRTABLE_LEADS_TABLE_ID',
    activities: 'AIRTABLE_ACTIVITIES_TABLE_ID',
    products: 'AIRTABLE_PRODUCTS_TABLE_ID',
    orders: 'AIRTABLE_ORDERS_TABLE_ID',
    automations: 'AIRTABLE_AUTOMATIONS_TABLE_ID',
  };

  const envVar = tableIdEnvMap[tableName];
  const tableId = process.env[envVar];
  
  console.log(`Environment Variable: ${envVar}`);
  console.log(`Table ID: ${tableId || 'NOT SET'}`);
  console.log('');

  if (!tableId) {
    console.error(`❌ ${envVar} not set in .env.local`);
    process.exit(1);
  }

  try {
    const records = await findRecords<any>(tableName, {
      maxRecords: 5,
    });

    if (!records || records.length === 0) {
      console.log(`❌ No records found in ${tableName} table`);
      return;
    }

    console.log(`✅ Found ${records.length} record(s)\n`);
    console.log('='.repeat(80));

    records.forEach((record, index) => {
      console.log(`\n📄 Record ${index + 1}`);
      console.log(`   ID: ${record.id}`);
      console.log(`   Created: ${(record as any).createdTime || 'N/A'}`);
      console.log(`\n   Fields:`);
      
      const fields = record.fields;
      const fieldNames = Object.keys(fields);
      
      fieldNames.forEach(fieldName => {
        const value = fields[fieldName];
        const type = Array.isArray(value) ? 'array' : typeof value;
        const displayValue = Array.isArray(value) 
          ? `[${value.length} items]` 
          : JSON.stringify(value);
        
        console.log(`     - ${fieldName} (${type}): ${displayValue.substring(0, 100)}${displayValue.length > 100 ? '...' : ''}`);
      });
      
      console.log('\n   Raw JSON:');
      console.log('   ' + JSON.stringify(fields, null, 2).replace(/\n/g, '\n   '));
      console.log('\n' + '-'.repeat(80));
    });

    console.log('\n\n📋 Summary of Field Names:');
    if (records[0]) {
      const fieldNames = Object.keys(records[0].fields);
      fieldNames.forEach((name, i) => {
        console.log(`   ${i + 1}. ${name}`);
      });
    }

    console.log('\n\n💡 Next Steps:');
    console.log('   1. Copy the field names above');
    console.log('   2. Update src/types/airtable.ts with correct field names');
    console.log('   3. Update API routes to use correct field names');
    console.log('   4. Run type check: npx tsc --noEmit');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.statusCode === 404) {
      console.error('\n💡 Table not found. Check:');
      console.error(`   - ${envVar} in .env.local`);
      console.error('   - Table exists in Airtable base');
    }
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const tableName = args[0] as TableName;

if (!tableName || !VALID_TABLES.includes(tableName)) {
  console.log('Usage: npx tsx scripts/inspect-airtable-table.ts <table_name>');
  console.log('');
  console.log('Valid table names:');
  VALID_TABLES.forEach(t => console.log(`  - ${t}`));
  process.exit(1);
}

inspectTable(tableName);
