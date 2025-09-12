const fs = require('fs');

// Crea un endpoint temporaneo per accedere ai metadata di Airtable
async function createTempActivityEndpoint() {
  const tempEndpointCode = `
import { NextRequest, NextResponse } from 'next/server';
import { getAirtableKey } from '@/lib/api-keys-service';

const AIRTABLE_BASE_ID = 'app359c17lK0Ta8Ws';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const tableId = searchParams.get('tableId');
    const recordId = searchParams.get('recordId');
    
    const apiKey = await getAirtableKey();
    if (!apiKey) {
      return NextResponse.json({ error: 'No API key' }, { status: 500 });
    }

    if (action === 'schema') {
      // Get base schema
      const response = await fetch(\`https://api.airtable.com/v0/meta/bases/\${AIRTABLE_BASE_ID}/tables\`, {
        headers: {
          'Authorization': \`Bearer \${apiKey}\`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        return NextResponse.json({ error: \`Schema error: \${response.status}\` }, { status: response.status });
      }
      
      const data = await response.json();
      return NextResponse.json(data);
    }
    
    if (action === 'record' && tableId && recordId) {
      // Get specific record
      const response = await fetch(\`https://api.airtable.com/v0/\${AIRTABLE_BASE_ID}/\${tableId}/\${recordId}\`, {
        headers: {
          'Authorization': \`Bearer \${apiKey}\`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        return NextResponse.json({ error: \`Record error: \${response.status}\` }, { status: response.status });
      }
      
      const data = await response.json();
      return NextResponse.json(data);
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Temp endpoint error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
`;

  // Scrive l'endpoint temporaneo
  fs.writeFileSync('src/app/api/temp-activity-meta/route.ts', tempEndpointCode);
  console.log('✅ Created temporary endpoint: /api/temp-activity-meta');
}

async function getRealActivityFields() {
  try {
    console.log('🔍 Getting REAL Activity table fields from Airtable...\n');
    
    // Step 1: Get base schema to find Activity table
    console.log('1️⃣ Fetching base schema...');
    const schemaResponse = await fetch('http://localhost:3000/api/temp-activity-meta?action=schema');
    
    if (!schemaResponse.ok) {
      throw new Error(`Schema request failed: ${schemaResponse.status}`);
    }
    
    const schema = await schemaResponse.json();
    console.log(\`   Found \${schema.tables?.length || 0} tables in base\`);
    
    // Find Activity table
    const activityTable = schema.tables?.find(table => {
      const name = table.name.toLowerCase();
      return name.includes('activity') || name.includes('activities') || 
             name.includes('task') || name.includes('tasks') ||
             name.includes('attività');
    });
    
    if (!activityTable) {
      console.log('\n📋 Available tables:');
      schema.tables?.forEach((table, index) => {
        console.log(\`   \${index + 1}. \${table.name} (ID: \${table.id})\`);
      });
      throw new Error('No Activity table found');
    }
    
    console.log(\`✅ Found Activity table: "\${activityTable.name}" (ID: \${activityTable.id})\n\`);
    
    // Step 2: Analyze fields
    console.log('2️⃣ Analyzing Activity table fields:\n');
    
    const fields = activityTable.fields || [];
    console.log(\`📋 REAL ACTIVITY TABLE FIELDS (\${fields.length} total):\n\`);
    
    fields.forEach((field, index) => {
      console.log(\`\${index + 1}. \${field.name}\`);
      console.log(\`   Type: \${field.type}\`);
      
      // Show options for select fields
      if (field.options) {
        if (field.options.choices) {
          console.log(\`   Options: \${field.options.choices.map(c => c.name).join(', ')}\`);
        }
        if (field.options.linkedTableId) {
          console.log(\`   Linked to table: \${field.options.linkedTableId}\`);
        }
        if (field.options.result) {
          console.log(\`   Result type: \${field.options.result.type}\`);
        }
      }
      console.log();
    });
    
    // Step 3: Get sample record to see actual data
    console.log('3️⃣ Fetching sample Activity record...\n');
    
    // Use one of the known activity IDs
    const activityIds = [
      'recWl3c8uUWDN5Bcf', 'reckqPSDIIycADvbj', 'recEEmjHUlOg4d9t8',
      'recx4z5SNWurNKMtq', 'recQXzqPx5JQ3Vy6G', 'recVoGqK596pqT34u'
    ];
    
    let sampleRecord = null;
    
    for (const activityId of activityIds) {
      try {
        console.log(\`   Trying to fetch: \${activityId}\`);
        const recordResponse = await fetch(\`http://localhost:3000/api/temp-activity-meta?action=record&tableId=\${activityTable.id}&recordId=\${activityId}\`);
        
        if (recordResponse.ok) {
          sampleRecord = await recordResponse.json();
          console.log(\`   ✅ SUCCESS! Retrieved record: \${activityId}\n\`);
          break;
        } else {
          console.log(\`   ❌ Failed: \${recordResponse.status}\`);
        }
      } catch (error) {
        console.log(\`   ❌ Error: \${error.message}\`);
      }
    }
    
    if (sampleRecord) {
      console.log('📊 SAMPLE ACTIVITY RECORD DATA:\n');
      console.log(\`ID: \${sampleRecord.id}\`);
      console.log(\`Created: \${sampleRecord.createdTime}\`);
      console.log('Fields:');
      
      Object.entries(sampleRecord.fields).forEach(([fieldName, value]) => {
        const displayValue = typeof value === 'object' && value !== null 
          ? JSON.stringify(value).substring(0, 100) + (JSON.stringify(value).length > 100 ? '...' : '')
          : String(value);
        console.log(\`   \${fieldName}: \${displayValue}\`);
      });
      console.log();
    }
    
    // Save complete analysis
    const analysis = {
      timestamp: new Date().toISOString(),
      method: 'Direct Airtable API access',
      activityTable: {
        name: activityTable.name,
        id: activityTable.id,
        description: activityTable.description || null
      },
      fields: fields.map(field => ({
        name: field.name,
        type: field.type,
        id: field.id,
        description: field.description || null,
        options: field.options || null
      })),
      sampleRecord: sampleRecord || null
    };
    
    fs.writeFileSync('real-activity-fields-analysis.json', JSON.stringify(analysis, null, 2));
    console.log('💾 Complete analysis saved to: real-activity-fields-analysis.json\n');
    
    return analysis;
    
  } catch (error) {
    console.error('Error getting real activity fields:', error.message);
    return null;
  }
}

async function cleanup() {
  try {
    // Remove temporary endpoint
    fs.unlinkSync('src/app/api/temp-activity-meta/route.ts');
    fs.rmdirSync('src/app/api/temp-activity-meta');
    console.log('🧹 Cleaned up temporary endpoint');
  } catch (error) {
    console.log('⚠️ Could not cleanup temporary files:', error.message);
  }
}

async function main() {
  console.log('🚀 Getting REAL Activity table structure from Airtable...\n');
  
  try {
    // Create temp endpoint
    await createTempActivityEndpoint();
    
    // Wait a moment for server to pick up new endpoint
    console.log('⏳ Waiting for server to register endpoint...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get real fields
    const analysis = await getRealActivityFields();
    
    if (analysis) {
      console.log('✅ Successfully retrieved real Activity table structure!');
      console.log('\n📝 SUMMARY:');
      console.log(\`• Table name: \${analysis.activityTable.name}\`);
      console.log(\`• Table ID: \${analysis.activityTable.id}\`);
      console.log(\`• Total fields: \${analysis.fields.length}\`);
      console.log(\`• Sample record: \${analysis.sampleRecord ? 'Retrieved' : 'Not found'}\`);
      console.log('\n📂 Check real-activity-fields-analysis.json for complete details');
    } else {
      console.log('❌ Failed to retrieve Activity table structure');
    }
    
  } finally {
    // Always cleanup
    await cleanup();
  }
}

main().catch(console.error);
