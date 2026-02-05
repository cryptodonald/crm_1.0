/**
 * Script per ispezionare lo schema Airtable usando Metadata API
 * 
 * Questa API espone tutto lo schema del database (tabelle, campi, relazioni)
 * senza dover inferire dai record
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ AIRTABLE_API_KEY e AIRTABLE_BASE_ID devono essere definiti');
  process.exit(1);
}

async function fetchBaseSchema() {
  console.log('🚀 Tentativo di accesso alla Metadata API...\n');
  console.log(`📊 Base ID: ${AIRTABLE_BASE_ID}\n`);

  // Metadata API endpoint
  const url = `https://api.airtable.com/v0/meta/bases/${AIRTABLE_BASE_ID}/tables`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Errore Metadata API: ${response.status}`);
      console.error(`📄 Response: ${errorText}\n`);
      
      if (response.status === 401 || response.status === 403) {
        console.log('ℹ️  Il token probabilmente non ha permessi per la Metadata API');
        console.log('ℹ️  Puoi abilitarla su: https://airtable.com/create/tokens');
        console.log('ℹ️  Permessi richiesti: schema.bases:read\n');
      }
      
      return null;
    }

    const data = await response.json();
    console.log('✅ Metadata API accessibile!\n');
    
    return data;
  } catch (error) {
    console.error('❌ Errore durante la chiamata:', error);
    return null;
  }
}

async function main() {
  const schema = await fetchBaseSchema();
  
  if (!schema) {
    console.log('❌ Impossibile accedere alla Metadata API');
    console.log('💡 Continueremo a usare il metodo inferenza dai record\n');
    return;
  }

  console.log(`📊 Trovate ${schema.tables?.length || 0} tabelle\n`);
  
  // Salva schema completo
  const outputDir = path.join(__dirname, '..', 'docs');
  fs.mkdirSync(outputDir, { recursive: true });
  
  const outputPath = path.join(outputDir, 'airtable-metadata-schema.json');
  fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2));
  console.log(`✅ Schema salvato in: ${outputPath}\n`);
  
  // Mostra sommario tabelle
  if (schema.tables) {
    console.log('📋 Tabelle trovate:\n');
    for (const table of schema.tables) {
      console.log(`   ${table.name} (${table.id})`);
      console.log(`      Campi: ${table.fields?.length || 0}`);
      if (table.fields && table.fields.length > 0) {
        table.fields.slice(0, 5).forEach((field: any) => {
          console.log(`         - ${field.name} (${field.type})`);
        });
        if (table.fields.length > 5) {
          console.log(`         ... +${table.fields.length - 5} altri campi`);
        }
      }
      console.log('');
    }
  }
}

main().catch(console.error);
