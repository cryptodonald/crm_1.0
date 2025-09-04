const fs = require('fs');
const dotenv = require('dotenv');

// Carica le variabili d'ambiente
dotenv.config({ path: '.env.local' });

const AIRTABLE_BASE_ID = 'app359c17lK0Ta8Ws';

// Provo diversi possibili ID per la tabella Activity
const POSSIBLE_ACTIVITY_TABLE_IDS = [
  'tblActivity', 
  'tblActivities',
  'tblACTIVITY',
  'tblTasks',
  'tblTask',
  'tblEvents',
  'tblEvent'
];

// Import the KV service (server-side only)
const path = require('path');
const { createRequire } = require('module');
const require2 = createRequire(import.meta.url || __filename);

async function getAirtableConfig() {
  try {
    console.log('🔄 Getting Airtable config via KV service...');
    
    // Dynamically import the ES module
    const { apiKeyService } = await import('../src/lib/api-keys-service.js');
    
    // Get both the API key and table IDs
    const [apiKey, baseId, activitiesTableId] = await Promise.all([
      apiKeyService.getAirtableKey(),
      apiKeyService.getAirtableBaseId(), 
      apiKeyService.getAirtableActivitiesTableId()
    ]);
    
    console.log('✅ Found Airtable configuration via KV service');
    console.log(`  • API Key: ${apiKey ? 'Found' : 'Missing'}`);
    console.log(`  • Base ID: ${baseId || 'Using default'}`);
    console.log(`  • Activities Table ID: ${activitiesTableId || 'Will search'}`);
    
    return {
      apiKey,
      baseId: baseId || AIRTABLE_BASE_ID,
      activitiesTableId
    };
  } catch (error) {
    console.error('Error getting Airtable config from KV:', error.message);
    console.log('⚠️  Falling back to environment variables...');
    
    // Fallback to environment variables
    const apiKey = process.env.AIRTABLE_API_KEY;
    if (apiKey) {
      console.log('✅ Found fallback AIRTABLE_API_KEY in environment');
      return {
        apiKey,
        baseId: AIRTABLE_BASE_ID,
        activitiesTableId: null
      };
    }
    
    return null;
  }
}

async function fetchTableSchema(apiKey, tableId) {
  const url = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`;
  
  console.log(`🔍 Fetching schema for base: ${AIRTABLE_BASE_ID}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ Error fetching schema:`, error.message);
    return null;
  }
}

async function fetchSampleRecords(apiKey, tableId, maxRecords = 5) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableId}?maxRecords=${maxRecords}`;
  
  console.log(`📊 Fetching sample records from table: ${tableId}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${await response.text()}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ Error fetching records from ${tableId}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🔍 Starting Activity table metadata analysis...\n');

  const apiKey = await getAirtableKey();
  if (!apiKey) {
    console.log('❌ Cannot proceed without Airtable API key');
    return;
  }

  // Fetch base schema first to get all tables
  const baseSchema = await fetchTableSchema(apiKey);
  if (!baseSchema) {
    console.log('❌ Could not fetch base schema');
    return;
  }

  console.log('✅ Base schema fetched successfully');
  console.log(`📊 Found ${baseSchema.tables?.length || 0} tables in base\\n`);

  // List all tables
  console.log('📋 Available tables:');
  baseSchema.tables?.forEach((table, index) => {
    console.log(`  ${index + 1}. ${table.name} (ID: ${table.id})`);
  });
  console.log();

  // Find Activity/Task related tables
  const activityTables = baseSchema.tables?.filter(table => {
    const nameToCheck = table.name.toLowerCase();
    return nameToCheck.includes('activity') || 
           nameToCheck.includes('activities') ||
           nameToCheck.includes('task') ||
           nameToCheck.includes('tasks') ||
           nameToCheck.includes('event') ||
           nameToCheck.includes('events');
  });

  if (activityTables && activityTables.length > 0) {
    console.log('🎯 Found potential Activity tables:');
    
    const analysis = {
      timestamp: new Date().toISOString(),
      baseId: AIRTABLE_BASE_ID,
      tables: []
    };

    for (const table of activityTables) {
      console.log(`\\n🔍 Analyzing table: ${table.name} (${table.id})`);
      
      const tableInfo = {
        name: table.name,
        id: table.id,
        fields: table.fields || [],
        sampleRecords: null,
        fieldAnalysis: {}
      };

      // Analyze fields
      console.log(`  📝 Fields (${table.fields?.length || 0}):`);
      table.fields?.forEach((field, index) => {
        console.log(`    ${index + 1}. ${field.name} (${field.type})`);
        
        // Store field analysis
        tableInfo.fieldAnalysis[field.name] = {
          type: field.type,
          options: field.options || null
        };
        
        // Show options for select fields
        if (field.options?.choices) {
          console.log(`       Options: ${field.options.choices.map(c => c.name).join(', ')}`);
        }
      });

      // Fetch sample records
      console.log('  📊 Fetching sample records...');
      const sampleData = await fetchSampleRecords(apiKey, table.id, 3);
      if (sampleData) {
        tableInfo.sampleRecords = sampleData.records;
        console.log(`  ✅ Retrieved ${sampleData.records?.length || 0} sample records`);
        
        // Show sample field values
        if (sampleData.records && sampleData.records.length > 0) {
          const firstRecord = sampleData.records[0];
          console.log('  📋 Sample field values:');
          Object.keys(firstRecord.fields).forEach(fieldName => {
            const value = firstRecord.fields[fieldName];
            const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            console.log(`    ${fieldName}: ${displayValue.substring(0, 50)}${displayValue.length > 50 ? '...' : ''}`);
          });
        }
      }

      analysis.tables.push(tableInfo);
    }

    // Save analysis to file
    const outputFile = 'activity-metadata-analysis.json';
    fs.writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
    console.log(`\\n💾 Analysis saved to: ${outputFile}`);

  } else {
    console.log('❌ No Activity-related tables found');
    console.log('📋 Available tables:');
    baseSchema.tables?.forEach(table => {
      console.log(`  - ${table.name} (${table.id})`);
    });
  }
}

main().catch(console.error);
