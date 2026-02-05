/**
 * Script di test per verificare la tabella Notes
 */

import Airtable from 'airtable';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_NOTES_TABLE_ID = process.env.AIRTABLE_NOTES_TABLE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_NOTES_TABLE_ID) {
  console.error('❌ Variabili mancanti in .env.local');
  process.exit(1);
}

const airtable = new Airtable({ apiKey: AIRTABLE_API_KEY });
const base = airtable.base(AIRTABLE_BASE_ID);
const notesTable = base(AIRTABLE_NOTES_TABLE_ID);

async function testNotesTable() {
  console.log('🧪 Test connessione tabella Notes...\n');
  
  try {
    // Fetch primi 3 record per test
    const records = await notesTable.select({
      maxRecords: 3,
    }).firstPage();
    
    console.log(`✅ Tabella Notes connessa! (${records.length} record trovati)\n`);
    
    if (records.length > 0) {
      console.log('📝 Esempio record:\n');
      const note = records[0];
      console.log('ID:', note.id);
      console.log('Fields:', JSON.stringify(note.fields, null, 2));
    } else {
      console.log('ℹ️  Tabella vuota (normale per una tabella nuova)');
      console.log('\n💡 Puoi creare una nota di test dalla UI del CRM');
    }
    
    console.log('\n✅ Test completato con successo!');
  } catch (error: any) {
    console.error('❌ Errore:', error.message);
    console.log('\n💡 Verifica che AIRTABLE_NOTES_TABLE_ID sia corretto in .env.local');
  }
}

testNotesTable();
