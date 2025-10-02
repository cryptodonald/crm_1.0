#!/usr/bin/env node

/**
 * Script per verificare i campi disponibili nella tabella Orders
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

async function main() {
  console.log('📋 Checking Orders Table Schema');
  console.log('================================\n');

  const { apiKey, baseId } = getCredentials();
  
  if (!apiKey || !baseId) {
    throw new Error('❌ Missing credentials in .env.local');
  }

  console.log(`✅ Credentials OK - Base: ${baseId.substring(0, 8)}...`);

  const tables = await getTableSchema(apiKey, baseId);
  
  console.log(`\n📋 Found ${tables.length} tables in base:`);
  tables.forEach(table => {
    console.log(`   ${table.name} (${table.id})`);
  });
  
  const ordersTable = tables.find(table => table.name === 'Orders');
  
  if (!ordersTable) {
    console.error('\n❌ Orders table not found!');
    return;
  }
  
  console.log(`\n🎯 Orders Table (${ordersTable.id}):`);
  console.log(`📝 Primary field: ${ordersTable.primaryFieldId}`);
  console.log(`🔧 Fields (${ordersTable.fields.length}):\n`);
  
  ordersTable.fields.forEach((field, index) => {
    console.log(`${index + 1}. ${field.name} (${field.id})`);
    console.log(`   Type: ${field.type}`);
    if (field.options) {
      console.log(`   Options: ${JSON.stringify(field.options, null, 2).substring(0, 100)}...`);
    }
    console.log('');
  });
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };