import Airtable from 'airtable';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const apiKey = process.env.AIRTABLE_API_KEY;
const baseId = process.env.AIRTABLE_BASE_ID;
const tableId = process.env.AIRTABLE_LEADS_TABLE_ID || 'tblKIZ9CDjcQorONA';

if (!apiKey || !baseId) {
  console.error('❌ Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID');
  process.exit(1);
}

const airtable = new Airtable({ apiKey }).base(baseId);

async function inspectLeads() {
  console.log('🔍 Inspecting Leads table...\n');

  try {
    const records = await airtable(tableId)
      .select({ maxRecords: 3 })
      .firstPage();

    if (records.length === 0) {
      console.log('⚠️ No records found in Leads table');
      return;
    }

    console.log(`✅ Found ${records.length} sample records\n`);

    records.forEach((record, idx) => {
      console.log(`\n📄 Record ${idx + 1}:`);
      console.log(`ID: ${record.id}`);
      console.log('Fields:', JSON.stringify(record.fields, null, 2));
    });

    // Extract field names from first record
    const firstRecord = records[0];
    const fieldNames = Object.keys(firstRecord.fields);

    console.log('\n\n📋 Available Fields:');
    fieldNames.forEach((name) => {
      const value = firstRecord.fields[name];
      const type = Array.isArray(value) ? 'array' : typeof value;
      console.log(`  - ${name}: ${type}`);
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.statusCode) {
      console.error(`Status: ${error.statusCode}`);
    }
  }
}

inspectLeads();
