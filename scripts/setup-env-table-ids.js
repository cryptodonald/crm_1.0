#!/usr/bin/env node

/**
 * Script to automatically fetch Airtable Table IDs and add them to .env.local
 */

const fs = require('fs');
const path = require('path');

async function getAirtableSchema() {
  // Read current .env.local
  const envPath = path.join(__dirname, '..', '.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Extract API key and Base ID
  const apiKeyMatch = envContent.match(/AIRTABLE_API_KEY=(.+)/);
  const baseIdMatch = envContent.match(/AIRTABLE_BASE_ID=(.+)/);
  
  if (!apiKeyMatch || !baseIdMatch) {
    console.error('❌ AIRTABLE_API_KEY o AIRTABLE_BASE_ID non trovati in .env.local');
    process.exit(1);
  }
  
  const apiKey = apiKeyMatch[1].trim();
  const baseId = baseIdMatch[1].trim();
  
  console.log(`🔍 Fetching schema for base: ${baseId}...`);
  
  // Fetch schema from Airtable Meta API
  const response = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    }
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ Airtable API error ${response.status}:`, error);
    process.exit(1);
  }
  
  const data = await response.json();
  return data.tables;
}

async function updateEnvFile(tables) {
  const envPath = path.join(__dirname, '..', '.env.local');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Mapping table names to env var names (REAL names from Airtable)
  const tableMapping = {
    'User': 'AIRTABLE_USERS_TABLE_ID',
    'Users': 'AIRTABLE_USERS_TABLE_ID',
    'Utenti': 'AIRTABLE_USERS_TABLE_ID',
    'Lead': 'AIRTABLE_LEADS_TABLE_ID',
    'Leads': 'AIRTABLE_LEADS_TABLE_ID',
    'Activity': 'AIRTABLE_ACTIVITIES_TABLE_ID',
    'Activities': 'AIRTABLE_ACTIVITIES_TABLE_ID',
    'Attività': 'AIRTABLE_ACTIVITIES_TABLE_ID',
    'Order': 'AIRTABLE_ORDERS_TABLE_ID',
    'Orders': 'AIRTABLE_ORDERS_TABLE_ID',
    'Ordini': 'AIRTABLE_ORDERS_TABLE_ID',
    'Product': 'AIRTABLE_PRODUCTS_TABLE_ID',
    'Products': 'AIRTABLE_PRODUCTS_TABLE_ID',
    'Prodotti': 'AIRTABLE_PRODUCTS_TABLE_ID',
    'Automation': 'AIRTABLE_AUTOMATIONS_TABLE_ID',
    'Automations': 'AIRTABLE_AUTOMATIONS_TABLE_ID',
    'Automazioni': 'AIRTABLE_AUTOMATIONS_TABLE_ID',
  };
  
  console.log('\n📋 Tabelle trovate:');
  const updates = [];
  
  for (const table of tables) {
    console.log(`  - ${table.name} (${table.id})`);
    
    // Find matching env var
    const envVarName = tableMapping[table.name];
    if (envVarName) {
      updates.push({ name: envVarName, value: table.id, tableName: table.name });
    }
  }
  
  console.log('\n✅ Aggiornamento .env.local:');
  
  // Remove old table ID entries if present
  envContent = envContent.split('\n').filter(line => {
    return !line.startsWith('AIRTABLE_') || 
           !line.includes('_TABLE_ID=') ||
           line.includes('_BASE_ID='); // Keep BASE_ID
  }).join('\n');
  
  // Add new table IDs
  const tableIdsSection = '\n# Airtable Table IDs (auto-detected)\n' + 
    updates.map(u => `${u.name}=${u.value} # ${u.tableName}`).join('\n') + '\n';
  
  envContent += tableIdsSection;
  
  // Write back
  fs.writeFileSync(envPath, envContent);
  
  updates.forEach(u => {
    console.log(`  ✅ ${u.name}=${u.value} # ${u.tableName}`);
  });
  
  console.log('\n🎉 .env.local aggiornato con successo!');
  console.log('\n📝 Ora devi aggiungere le stesse variabili su Vercel:');
  console.log('   https://vercel.com/doctorbed/crm-1-0/settings/environment-variables\n');
  
  updates.forEach(u => {
    console.log(`Name: ${u.name}`);
    console.log(`Value: ${u.value}`);
    console.log(`Environments: Production, Preview, Development\n`);
  });
}

// Main
(async () => {
  try {
    console.log('🚀 Airtable Table IDs Setup Script\n');
    const tables = await getAirtableSchema();
    await updateEnvFile(tables);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
