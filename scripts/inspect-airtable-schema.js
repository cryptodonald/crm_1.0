/**
 * Script per ispezionare la struttura delle tabelle Airtable
 * Usa l'API metadata di Airtable per ottenere informazioni precise sui campi
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables
try {
  require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
} catch (error) {
  console.log('⚠️ dotenv not available, using system environment variables');
}

// Configuration
const BASE_ID = process.env.AIRTABLE_BASE_ID || 'app359c17lK0Ta8Ws';
const API_KEY = process.env.AIRTABLE_API_KEY || process.env.AIRTABLE_KEY;

if (!API_KEY) {
  console.error('❌ AIRTABLE_API_KEY non trovata nelle variabili ambiente');
  console.log('💡 Controlla il file .env.local o esegui: export AIRTABLE_API_KEY="your_api_key"');
  console.log('📝 Available env keys:', Object.keys(process.env).filter(k => k.includes('AIRTABLE')));
  process.exit(1);
}

// Function to make HTTP requests
function makeRequest(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Error parsing JSON: ${error.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Function to get base schema
async function getBaseSchema() {
  console.log('🔍 Fetching base schema...');
  
  const url = `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`;
  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json'
  };
  
  try {
    const schema = await makeRequest(url, headers);
    return schema;
  } catch (error) {
    console.error('❌ Error fetching base schema:', error.message);
    throw error;
  }
}

// Function to find table by name (case insensitive)
function findTable(tables, searchName) {
  return tables.find(table => 
    table.name.toLowerCase().includes(searchName.toLowerCase())
  );
}

// Function to analyze table structure
function analyzeTable(table) {
  console.log(`\n📋 Table: ${table.name} (ID: ${table.id})`);
  console.log(`   Description: ${table.description || 'No description'}`);
  console.log(`   Primary field: ${table.primaryFieldId}`);
  console.log(`   Fields count: ${table.fields.length}`);
  
  console.log('\n   📝 Fields:');
  table.fields.forEach((field, index) => {
    const isPrimary = field.id === table.primaryFieldId;
    const primaryMark = isPrimary ? ' (PRIMARY)' : '';
    
    console.log(`   ${index + 1}. ${field.name}${primaryMark}`);
    console.log(`      - Type: ${field.type}`);
    console.log(`      - ID: ${field.id}`);
    
    // Show additional field options based on type
    if (field.options) {
      if (field.type === 'singleSelect' && field.options.choices) {
        console.log(`      - Choices: ${field.options.choices.map(c => c.name).join(', ')}`);
      } else if (field.type === 'multipleSelects' && field.options.choices) {
        console.log(`      - Choices: ${field.options.choices.map(c => c.name).join(', ')}`);
      } else if (field.type === 'singleLineText' || field.type === 'multilineText') {
        // Text fields don't have relevant options usually
      } else if (field.type === 'number' && field.options.precision !== undefined) {
        console.log(`      - Precision: ${field.options.precision}`);
      } else if (field.type === 'currency') {
        console.log(`      - Symbol: ${field.options.symbol}`);
        console.log(`      - Precision: ${field.options.precision}`);
      } else if (field.type === 'date' && field.options.dateFormat) {
        console.log(`      - Format: ${field.options.dateFormat.name}`);
      } else if (field.type === 'multipleRecordLinks' && field.options.linkedTableId) {
        console.log(`      - Linked to table: ${field.options.linkedTableId}`);
      }
    }
    console.log('');
  });
}

// Function to generate TypeScript types
function generateTypeScriptTypes(tables) {
  let tsContent = `/**
 * Auto-generated Airtable types
 * Generated on: ${new Date().toISOString()}
 */

export interface AirtableBaseSchema {
`;

  tables.forEach(table => {
    const tableName = table.name.replace(/[^a-zA-Z0-9]/g, '_');
    
    tsContent += `\n  // Table: ${table.name}`;
    tsContent += `\n  ${tableName}: {`;
    tsContent += `\n    id: string; // Airtable record ID`;
    tsContent += `\n    createdTime: string; // ISO timestamp`;
    
    table.fields.forEach(field => {
      const fieldName = field.name;
      let fieldType = 'any';
      
      switch (field.type) {
        case 'singleLineText':
        case 'multilineText':
        case 'richText':
        case 'email':
        case 'url':
        case 'phoneNumber':
          fieldType = 'string';
          break;
        case 'number':
        case 'currency':
        case 'percent':
        case 'rating':
          fieldType = 'number';
          break;
        case 'checkbox':
          fieldType = 'boolean';
          break;
        case 'date':
        case 'dateTime':
          fieldType = 'string'; // ISO string
          break;
        case 'singleSelect':
          if (field.options && field.options.choices) {
            const choices = field.options.choices.map(c => `'${c.name}'`).join(' | ');
            fieldType = choices;
          } else {
            fieldType = 'string';
          }
          break;
        case 'multipleSelects':
          if (field.options && field.options.choices) {
            const choices = field.options.choices.map(c => `'${c.name}'`).join(' | ');
            fieldType = `Array<${choices}>`;
          } else {
            fieldType = 'string[]';
          }
          break;
        case 'multipleRecordLinks':
          fieldType = 'string[]'; // Array of record IDs
          break;
        case 'multipleAttachments':
          fieldType = 'Array<{ id: string; url: string; filename: string; size: number; type: string }>';
          break;
        case 'formula':
        case 'rollup':
        case 'count':
        case 'lookup':
          fieldType = 'any'; // Computed fields can vary
          break;
        default:
          fieldType = 'any';
      }
      
      tsContent += `\n    '${fieldName}'?: ${fieldType};`;
    });
    
    tsContent += `\n  };\n`;
  });

  tsContent += `}\n`;
  
  return tsContent;
}

// Main function
async function main() {
  console.log('🚀 Starting Airtable schema inspection...');
  console.log(`📍 Base ID: ${BASE_ID}`);
  
  try {
    // Get base schema
    const schema = await getBaseSchema();
    
    if (!schema.tables || schema.tables.length === 0) {
      throw new Error('No tables found in base');
    }
    
    console.log(`✅ Found ${schema.tables.length} tables in base`);
    
    // List all tables
    console.log('\n📚 Available tables:');
    schema.tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.name} (${table.fields.length} fields)`);
    });
    
    // Find orders and order_items tables
    const ordersTable = findTable(schema.tables, 'order');
    const orderItemsTable = findTable(schema.tables, 'order_item') || findTable(schema.tables, 'item');
    
    if (ordersTable) {
      analyzeTable(ordersTable);
    } else {
      console.log('\n⚠️ No "orders" table found');
    }
    
    if (orderItemsTable) {
      analyzeTable(orderItemsTable);
    } else {
      console.log('\n⚠️ No "order_items" table found');
    }
    
    // Show all tables if orders not found
    if (!ordersTable && !orderItemsTable) {
      console.log('\n🔍 Analyzing all tables to find order-related ones:');
      schema.tables.forEach(table => {
        analyzeTable(table);
      });
    }
    
    // Generate TypeScript types
    const tsTypes = generateTypeScriptTypes(schema.tables);
    const outputPath = path.join(__dirname, '../src/types/airtable-schema.ts');
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, tsTypes, 'utf8');
    console.log(`\n💾 Generated TypeScript types: ${outputPath}`);
    
    // Generate summary JSON
    const summaryPath = path.join(__dirname, 'airtable-schema-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(schema, null, 2), 'utf8');
    console.log(`💾 Generated schema summary: ${summaryPath}`);
    
    console.log('\n✅ Schema inspection completed!');
    
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});