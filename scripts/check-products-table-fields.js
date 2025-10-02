#!/usr/bin/env node

/**
 * Script per verificare i campi disponibili nella tabella Products
 */

const https = require('https');
const path = require('path');

function getCredentials() {
  require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
  return {
    apiKey: process.env.AIRTABLE_API_KEY,
    baseId: process.env.AIRTABLE_BASE_ID
  };
}

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.error?.message || JSON.stringify(parsed)}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function getTableSchema(apiKey, baseId) {
  console.log('🔍 Getting table schema...');
  
  const response = await request({
    hostname: 'api.airtable.com',
    path: `/v0/meta/bases/${baseId}/tables`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  return response.tables;
}

async function getSampleRecords(apiKey, baseId, tableId) {
  console.log('📄 Getting sample records...');
  
  try {
    const response = await request({
      hostname: 'api.airtable.com',
      path: `/v0/${baseId}/${tableId}?maxRecords=3`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.records || [];
  } catch (error) {
    console.log('⚠️  Could not fetch sample records:', error.message);
    return [];
  }
}

async function main() {
  console.log('📋 Checking Products Table Schema');
  console.log('==================================\n');

  const { apiKey, baseId } = getCredentials();
  
  if (!apiKey || !baseId) {
    throw new Error('❌ Missing credentials in .env.local');
  }

  console.log(`✅ Credentials OK - Base: ${baseId.substring(0, 8)}...`);

  const tables = await getTableSchema(apiKey, baseId);
  
  const productsTable = tables.find(table => table.name === 'Products');
  
  if (!productsTable) {
    console.error('\n❌ Products table not found!');
    console.log('\n📋 Available tables:');
    tables.forEach(table => {
      console.log(`   ${table.name} (${table.id})`);
    });
    return;
  }
  
  console.log(`\n🎯 Products Table (${productsTable.id}):`);
  console.log(`📝 Primary field: ${productsTable.primaryFieldId}`);
  console.log(`🔧 Fields (${productsTable.fields.length}):\n`);
  
  productsTable.fields.forEach((field, index) => {
    console.log(`${index + 1}. ${field.name} (${field.id})`);
    console.log(`   Type: ${field.type}`);
    if (field.options) {
      if (field.type === 'singleSelect' || field.type === 'multipleSelects') {
        console.log(`   Options: ${field.options.choices?.map(c => c.name).join(', ')}`);
      } else if (field.type === 'currency') {
        console.log(`   Currency: ${field.options.symbol}, Precision: ${field.options.precision}`);
      } else {
        console.log(`   Options: ${JSON.stringify(field.options).substring(0, 60)}...`);
      }
    }
    console.log('');
  });
  
  // Get sample records
  const sampleRecords = await getSampleRecords(apiKey, baseId, productsTable.id);
  
  if (sampleRecords.length > 0) {
    console.log(`\n📄 Sample Records (${sampleRecords.length}):`);
    sampleRecords.forEach((record, index) => {
      console.log(`\n${index + 1}. Record ${record.id}:`);
      Object.entries(record.fields || {}).forEach(([fieldName, value]) => {
        const truncatedValue = typeof value === 'string' && value.length > 50 
          ? value.substring(0, 50) + '...'
          : JSON.stringify(value);
        console.log(`   ${fieldName}: ${truncatedValue}`);
      });
    });
  } else {
    console.log('\n📄 No sample records found');
  }
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Use this field structure to create TypeScript types');
  console.log('2. Create API endpoints for products CRUD operations');
  console.log('3. Build UI components based on these fields');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };