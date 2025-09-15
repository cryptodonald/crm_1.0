#!/usr/bin/env node

/**
 * 🔍 Orders & Products Table Structure Analyzer
 * 
 * Analizza la struttura reale delle tabelle Airtable:
 * - orders (tbl5iiBlaGbj7uHMM) 
 * - products (tbloI7bXoN4sSvIbw)
 * 
 * Usa il sistema API Key Service per le credenziali.
 */

const fs = require('fs');
const path = require('path');

async function getAPIKeyService() {
  try {
    // Import ES module
    const module = await import('../src/lib/api-keys-service.ts');
    return module;
  } catch (error) {
    console.error('❌ Error importing API Key Service:', error.message);
    return null;
  }
}

async function fetchTableSchema(apiKey, baseId) {
  const url = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`;
  
  console.log(`🔍 Fetching schema for base: ${baseId}`);
  
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

async function fetchSampleRecords(apiKey, baseId, tableId, tableName, maxRecords = 5) {
  const url = `https://api.airtable.com/v0/${baseId}/${tableId}?maxRecords=${maxRecords}`;
  
  console.log(`📊 Fetching sample records from ${tableName} (${tableId})...`);
  
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
    console.error(`❌ Error fetching records from ${tableName}:`, error.message);
    return null;
  }
}

function analyzeTableStructure(table) {
  const analysis = {
    name: table.name,
    id: table.id,
    totalFields: table.fields?.length || 0,
    fields: {},
    fieldTypes: {},
    relationships: [],
    selectOptions: {}
  };

  if (table.fields) {
    table.fields.forEach(field => {
      analysis.fields[field.name] = {
        type: field.type,
        options: field.options || null
      };

      // Count field types
      analysis.fieldTypes[field.type] = (analysis.fieldTypes[field.type] || 0) + 1;

      // Track relationships
      if (field.type === 'multipleRecordLinks') {
        analysis.relationships.push({
          field: field.name,
          linkedTableId: field.options?.linkedTableId,
          isReversed: field.options?.isReversed || false
        });
      }

      // Track select options
      if (field.options?.choices) {
        analysis.selectOptions[field.name] = field.options.choices.map(c => c.name);
      }
    });
  }

  return analysis;
}

function analyzeSampleData(records, tableName) {
  if (!records || records.length === 0) {
    return { message: 'No sample data available' };
  }

  const analysis = {
    recordCount: records.length,
    fieldStats: {},
    sampleValues: {},
    dataQuality: {}
  };

  // Analyze each record
  records.forEach(record => {
    Object.keys(record.fields).forEach(fieldName => {
      const value = record.fields[fieldName];
      
      // Initialize field stats
      if (!analysis.fieldStats[fieldName]) {
        analysis.fieldStats[fieldName] = {
          populated: 0,
          empty: 0,
          types: new Set()
        };
      }

      // Count population
      if (value !== null && value !== undefined && value !== '') {
        analysis.fieldStats[fieldName].populated++;
        analysis.fieldStats[fieldName].types.add(typeof value);
        
        // Store sample values
        if (!analysis.sampleValues[fieldName]) {
          analysis.sampleValues[fieldName] = [];
        }
        if (analysis.sampleValues[fieldName].length < 3) {
          analysis.sampleValues[fieldName].push(value);
        }
      } else {
        analysis.fieldStats[fieldName].empty++;
      }
    });
  });

  // Convert Sets to Arrays
  Object.keys(analysis.fieldStats).forEach(fieldName => {
    analysis.fieldStats[fieldName].types = Array.from(analysis.fieldStats[fieldName].types);
    
    // Calculate data quality percentage
    const total = analysis.fieldStats[fieldName].populated + analysis.fieldStats[fieldName].empty;
    analysis.dataQuality[fieldName] = Math.round((analysis.fieldStats[fieldName].populated / total) * 100);
  });

  return analysis;
}

async function main() {
  console.log('🔍 Starting Orders & Products table analysis...\n');

  // Get API Key Service
  const apiKeyService = await getAPIKeyService();
  if (!apiKeyService) {
    console.log('❌ Cannot proceed without API Key Service');
    return;
  }

  try {
    // Get credentials
    console.log('🔑 Getting credentials from KV database...');
    const [apiKey, baseId, ordersTableId, productsTableId] = await Promise.all([
      apiKeyService.getAirtableKey(),
      apiKeyService.getAirtableBaseId(), 
      apiKeyService.getAirtableOrdersTableId(),
      apiKeyService.getAirtableProductsTableId()
    ]);

    // Validate credentials
    if (!apiKey) {
      console.log('❌ Missing Airtable API key');
      return;
    }
    if (!baseId) {
      console.log('❌ Missing Airtable base ID');
      return;
    }

    console.log('✅ Credentials found:');
    console.log(`  • API Key: ${apiKey ? 'Present' : 'Missing'}`);
    console.log(`  • Base ID: ${baseId || 'Missing'}`);
    console.log(`  • Orders Table ID: ${ordersTableId || 'Missing'}`);
    console.log(`  • Products Table ID: ${productsTableId || 'Missing'}`);
    console.log();

    // Fetch base schema
    const baseSchema = await fetchTableSchema(apiKey, baseId);
    if (!baseSchema) {
      console.log('❌ Could not fetch base schema');
      return;
    }

    console.log('✅ Base schema fetched successfully');
    console.log(`📊 Found ${baseSchema.tables?.length || 0} tables in base\n`);

    // Find orders and products tables
    const ordersTable = baseSchema.tables?.find(t => t.id === ordersTableId || t.name.toLowerCase().includes('order'));
    const productsTable = baseSchema.tables?.find(t => t.id === productsTableId || t.name.toLowerCase().includes('product'));

    if (!ordersTable && !productsTable) {
      console.log('❌ Neither orders nor products table found');
      console.log('📋 Available tables:');
      baseSchema.tables?.forEach(table => {
        console.log(`  - ${table.name} (${table.id})`);
      });
      return;
    }

    const analysis = {
      timestamp: new Date().toISOString(),
      baseId,
      tables: {}
    };

    // Analyze Orders table
    if (ordersTable) {
      console.log(`🎯 Analyzing ORDERS table: ${ordersTable.name} (${ordersTable.id})`);
      
      const ordersStructure = analyzeTableStructure(ordersTable);
      console.log(`  📝 Fields: ${ordersStructure.totalFields}`);
      console.log(`  🔗 Relationships: ${ordersStructure.relationships.length}`);
      
      // Show field details
      console.log('  📋 Field details:');
      Object.entries(ordersStructure.fields).forEach(([name, info]) => {
        console.log(`    ${name}: ${info.type}`);
        if (info.options?.choices) {
          console.log(`      Options: ${info.options.choices.map(c => c.name).join(', ')}`);
        }
      });

      // Fetch sample data
      const ordersSampleData = await fetchSampleRecords(apiKey, baseId, ordersTable.id, 'Orders', 5);
      let ordersDataAnalysis = null;
      if (ordersSampleData) {
        ordersDataAnalysis = analyzeSampleData(ordersSampleData.records, 'Orders');
        console.log(`  📊 Sample records analyzed: ${ordersDataAnalysis.recordCount}`);
        
        // Show sample values
        console.log('  💡 Sample field values:');
        Object.entries(ordersDataAnalysis.sampleValues).forEach(([field, values]) => {
          const quality = ordersDataAnalysis.dataQuality[field];
          console.log(`    ${field} (${quality}% populated): ${JSON.stringify(values[0])}`);
        });
      }

      analysis.tables.orders = {
        structure: ordersStructure,
        sampleData: ordersDataAnalysis,
        rawRecords: ordersSampleData?.records?.slice(0, 2) // First 2 for inspection
      };

      console.log();
    }

    // Analyze Products table  
    if (productsTable) {
      console.log(`🎯 Analyzing PRODUCTS table: ${productsTable.name} (${productsTable.id})`);
      
      const productsStructure = analyzeTableStructure(productsTable);
      console.log(`  📝 Fields: ${productsStructure.totalFields}`);
      console.log(`  🔗 Relationships: ${productsStructure.relationships.length}`);
      
      // Show field details
      console.log('  📋 Field details:');
      Object.entries(productsStructure.fields).forEach(([name, info]) => {
        console.log(`    ${name}: ${info.type}`);
        if (info.options?.choices) {
          console.log(`      Options: ${info.options.choices.map(c => c.name).join(', ')}`);
        }
      });

      // Fetch sample data
      const productsSampleData = await fetchSampleRecords(apiKey, baseId, productsTable.id, 'Products', 5);
      let productsDataAnalysis = null;
      if (productsSampleData) {
        productsDataAnalysis = analyzeSampleData(productsSampleData.records, 'Products');
        console.log(`  📊 Sample records analyzed: ${productsDataAnalysis.recordCount}`);
        
        // Show sample values
        console.log('  💡 Sample field values:');
        Object.entries(productsDataAnalysis.sampleValues).forEach(([field, values]) => {
          const quality = productsDataAnalysis.dataQuality[field];
          console.log(`    ${field} (${quality}% populated): ${JSON.stringify(values[0])}`);
        });
      }

      analysis.tables.products = {
        structure: productsStructure,
        sampleData: productsDataAnalysis,
        rawRecords: productsSampleData?.records?.slice(0, 2) // First 2 for inspection
      };

      console.log();
    }

    // Analyze relationships between orders and products
    if (ordersTable && productsTable) {
      console.log('🔗 Analyzing Orders-Products relationships...');
      
      const ordersToProducts = ordersTable.fields?.find(f => 
        f.type === 'multipleRecordLinks' && 
        f.options?.linkedTableId === productsTable.id
      );
      
      const productsToOrders = productsTable.fields?.find(f => 
        f.type === 'multipleRecordLinks' && 
        f.options?.linkedTableId === ordersTable.id
      );

      if (ordersToProducts || productsToOrders) {
        console.log('  ✅ Found relationship links:');
        if (ordersToProducts) {
          console.log(`    Orders → Products: ${ordersToProducts.name} (${ordersToProducts.type})`);
        }
        if (productsToOrders) {
          console.log(`    Products → Orders: ${productsToOrders.name} (${productsToOrders.type})`);
        }
        
        analysis.relationships = {
          ordersToProducts: ordersToProducts ? ordersToProducts.name : null,
          productsToOrders: productsToOrders ? productsToOrders.name : null
        };
      } else {
        console.log('  ⚠️ No direct relationship found between orders and products tables');
        analysis.relationships = { message: 'No direct links found' };
      }
    }

    // Save analysis to file
    const outputFile = path.join(__dirname, 'orders-products-analysis.json');
    fs.writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
    console.log(`💾 Full analysis saved to: ${outputFile}`);

    // Summary
    console.log('\n📋 SUMMARY:');
    if (analysis.tables.orders) {
      const orders = analysis.tables.orders;
      console.log(`  📦 Orders: ${orders.structure.totalFields} fields, ${orders.sampleData?.recordCount || 0} sample records`);
    }
    if (analysis.tables.products) {
      const products = analysis.tables.products;
      console.log(`  🏷️ Products: ${products.structure.totalFields} fields, ${products.sampleData?.recordCount || 0} sample records`);
    }
    if (analysis.relationships) {
      console.log(`  🔗 Relationships: ${analysis.relationships.message || 'Links detected'}`);
    }

  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
    console.error('Stack:', error.stack);
  }
}

main().catch(console.error);