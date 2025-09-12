const fs = require('fs');

// Crea endpoint temporaneo semplificato
async function createTempEndpoint() {
  const code = `import { NextRequest, NextResponse } from 'next/server';
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
}`;

  fs.writeFileSync('src/app/api/temp-activity-meta/route.ts', code);
  console.log('✅ Created temporary endpoint');
}

async function getRealFields() {
  try {
    console.log('🔍 Getting REAL Activity fields from Airtable...\n');

    // Get schema
    console.log('1️⃣ Fetching base schema...');
    const schemaResponse = await fetch('http://localhost:3000/api/temp-activity-meta?action=schema');
    
    if (!schemaResponse.ok) {
      throw new Error(`Schema request failed: ${schemaResponse.status}`);
    }
    
    const schema = await schemaResponse.json();
    console.log(`   Found ${schema.tables?.length || 0} tables in base`);
    
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
        console.log(`   ${index + 1}. ${table.name} (ID: ${table.id})`);
      });
      throw new Error('No Activity table found');
    }
    
    console.log(`✅ Found Activity table: "${activityTable.name}" (ID: ${activityTable.id})\n`);
    
    // Analyze fields
    console.log('2️⃣ REAL Activity table fields:\n');
    
    const fields = activityTable.fields || [];
    console.log(`📋 ACTIVITY TABLE: ${activityTable.name} (${fields.length} fields)\n`);
    
    fields.forEach((field, index) => {
      console.log(`${index + 1}. ${field.name}`);
      console.log(`   Type: ${field.type}`);
      
      // Add detailed information based on field type
      if (field.options) {
        if (field.options.choices) {
          console.log(`   Options: ${field.options.choices.map(c => c.name).join(', ')}`);
        }
        if (field.options.linkedTableId) {
          console.log(`   Links to table: ${field.options.linkedTableId}`);
        }
        if (field.options.result) {
          console.log(`   Formula result: ${field.options.result.type}`);
        }
        if (field.options.dateFormat) {
          console.log(`   Date format: ${field.options.dateFormat.name}`);
        }
        if (field.options.timeFormat) {
          console.log(`   Time format: ${field.options.timeFormat.name}`);
        }
        if (field.options.precision) {
          console.log(`   Number precision: ${field.options.precision}`);
        }
      }
      
      // Add notes based on field purpose
      let notes = '';
      const fieldName = field.name.toLowerCase();
      if (fieldName.includes('id')) {
        notes = 'Note: Identifier field';
      } else if (fieldName.includes('data') || fieldName.includes('date')) {
        notes = 'Note: Date/time field for scheduling';
      } else if (fieldName.includes('stato') || fieldName.includes('status')) {
        notes = 'Note: Status tracking field';
      } else if (fieldName.includes('tipo') || fieldName.includes('type')) {
        notes = 'Note: Activity classification';
      } else if (fieldName.includes('priorit') || fieldName.includes('priority')) {
        notes = 'Note: Priority level indicator';
      } else if (fieldName.includes('lead') || fieldName.includes('contatto')) {
        notes = 'Note: Related contact/lead reference';
      } else if (fieldName.includes('note') || fieldName.includes('descrizione')) {
        notes = 'Note: Free text content field';
      } else if (fieldName.includes('esito') || fieldName.includes('outcome')) {
        notes = 'Note: Activity result/outcome';
      } else if (fieldName.includes('assegn') || fieldName.includes('assigned')) {
        notes = 'Note: User assignment field';
      }
      
      if (notes) {
        console.log(`   ${notes}`);
      }
      
      console.log();
    });
    
    // Get sample record
    console.log('3️⃣ Sample Activity record:\n');
    
    const activityIds = [
      'recWl3c8uUWDN5Bcf', 'reckqPSDIIycADvbj', 'recEEmjHUlOg4d9t8',
      'recx4z5SNWurNKMtq', 'recQXzqPx5JQ3Vy6G', 'recVoGqK596pqT34u'
    ];
    
    let sampleRecord = null;
    
    for (const activityId of activityIds) {
      try {
        console.log(`   Trying: ${activityId}`);
        const recordResponse = await fetch(`http://localhost:3000/api/temp-activity-meta?action=record&tableId=${activityTable.id}&recordId=${activityId}`);
        
        if (recordResponse.ok) {
          sampleRecord = await recordResponse.json();
          console.log(`   ✅ Retrieved: ${activityId}\n`);
          break;
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    if (sampleRecord) {
      console.log('📊 SAMPLE RECORD DATA:');
      console.log(`ID: ${sampleRecord.id}`);
      console.log(`Created: ${sampleRecord.createdTime}`);
      console.log('Fields:');
      
      Object.entries(sampleRecord.fields).forEach(([fieldName, value]) => {
        let displayValue = '';
        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            displayValue = `[${value.join(', ')}]`;
          } else {
            displayValue = JSON.stringify(value).substring(0, 100);
          }
        } else {
          displayValue = String(value || 'null');
        }
        console.log(`   ${fieldName}: ${displayValue}`);
      });
    }
    
    // Save analysis
    const analysis = {
      timestamp: new Date().toISOString(),
      method: 'Direct Airtable API metadata access',
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
    
    fs.writeFileSync('REAL-activity-fields.json', JSON.stringify(analysis, null, 2));
    console.log('\n💾 Complete analysis saved to: REAL-activity-fields.json');
    
    return analysis;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function cleanup() {
  try {
    fs.unlinkSync('src/app/api/temp-activity-meta/route.ts');
    fs.rmdirSync('src/app/api/temp-activity-meta');
    console.log('🧹 Cleaned up temporary files');
  } catch (error) {
    // Silent cleanup
  }
}

async function main() {
  console.log('🚀 Getting REAL Activity table structure...\n');
  
  try {
    await createTempEndpoint();
    
    // Wait for server
    console.log('⏳ Waiting for server...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const analysis = await getRealFields();
    
    if (analysis) {
      console.log('\n✅ SUCCESS!');
      console.log(`📋 Table: ${analysis.activityTable.name}`);
      console.log(`🔢 Fields: ${analysis.fields.length}`);
      console.log(`📄 Sample record: ${analysis.sampleRecord ? 'Retrieved' : 'Not found'}`);
    }
    
  } finally {
    await cleanup();
  }
}

main().catch(console.error);
