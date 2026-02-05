/**
 * Script per creare la tabella Notes su Airtable
 * 
 * IMPORTANTE: Questo script crea la struttura della tabella Notes
 * per gestire la cronologia delle note interne sui leads.
 * 
 * Uso:
 *   npx ts-node scripts/create-notes-table.ts
 */

import Airtable from 'airtable';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carica variabili d'ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ Errore: AIRTABLE_API_KEY e AIRTABLE_BASE_ID devono essere definiti in .env.local');
  process.exit(1);
}

console.log('🚀 Creazione tabella Notes su Airtable...\n');

console.log('📋 ISTRUZIONI MANUALI:\n');
console.log('⚠️  ATTENZIONE: Airtable non permette la creazione di tabelle via API.');
console.log('    Devi creare la tabella manualmente seguendo questi passi:\n');

console.log('1️⃣  Vai su https://airtable.com e apri la base:', AIRTABLE_BASE_ID);
console.log('');

console.log('2️⃣  Clicca sul pulsante "+" per aggiungere una nuova tabella');
console.log('    Nome tabella: "Notes"');
console.log('');

console.log('3️⃣  Crea i seguenti campi nella tabella Notes:\n');

const fields = [
  {
    name: 'Lead',
    type: 'Link to another record',
    options: 'Link alla tabella Leads (Many-to-One)',
    required: true,
  },
  {
    name: 'User',
    type: 'Link to another record',
    options: 'Link alla tabella Users (Many-to-One)',
    required: true,
  },
  {
    name: 'Content',
    type: 'Long text',
    options: 'Contenuto della nota (supporta markdown)',
    required: true,
  },
  {
    name: 'Type',
    type: 'Single select',
    options: 'Valori: Riflessione, Promemoria, Follow-up, Info Cliente',
    required: true,
  },
  {
    name: 'Pinned',
    type: 'Checkbox',
    options: 'Nota fissata (sempre visibile)',
    required: false,
  },
  {
    name: 'CreatedAt',
    type: 'Created time',
    options: 'Timestamp automatico',
    required: false,
  },
];

console.log('┌─────────────────────────────────────────────────────────────────┐');
fields.forEach((field, index) => {
  console.log(`│ ${index + 1}. ${field.name.padEnd(20)} │ ${field.type.padEnd(24)} │`);
  console.log(`│    ${field.options.padEnd(56)} │`);
  if (field.required) {
    console.log(`│    ⚠️  Campo obbligatorio                                        │`);
  }
  console.log(`├─────────────────────────────────────────────────────────────────┤`);
});
console.log('└─────────────────────────────────────────────────────────────────┘\n');

console.log('4️⃣  Configurazione campo "Type" (Single Select):\n');
console.log('    a) Clicca su "Customize field type" per il campo Type');
console.log('    b) Aggiungi queste opzioni con i rispettivi colori:\n');
console.log('       • Riflessione      (💭) - Colore: Grigio');
console.log('       • Promemoria       (⏰) - Colore: Giallo');
console.log('       • Follow-up        (📌) - Colore: Arancione');
console.log('       • Info Cliente     (ℹ️)  - Colore: Blu');
console.log('');

console.log('5️⃣  Dopo aver creato la tabella, aggiorna il campo Notes in Leads:\n');
console.log('    a) Vai alla tabella "Leads"');
console.log('    b) Aggiungi un nuovo campo "Notes"');
console.log('    c) Tipo: "Link to another record"');
console.log('    d) Collega alla tabella "Notes"');
console.log('    e) Tipo relazione: One Lead → Many Notes');
console.log('');

console.log('6️⃣  Copia l\'ID della tabella Notes:\n');
console.log('    a) Clicca sui "..." della tabella Notes');
console.log('    b) Seleziona "Copy table ID"');
console.log('    c) Aggiungi in .env.local:');
console.log('       AIRTABLE_NOTES_TABLE_ID=tblXXXXXXXXXXXXXX');
console.log('');

console.log('7️⃣  Verifica la configurazione con:');
console.log('    npx ts-node scripts/test-notes-table.ts');
console.log('');

console.log('📚 STRUTTURA FINALE:\n');
console.log('   Leads (1) ────┐');
console.log('                 │');
console.log('                 ├──→ Notes (N) → Content, Type, Pinned, CreatedAt');
console.log('                 │               → User (chi ha scritto)');
console.log('                 │');
console.log('                 └──→ Activities (N) → Type, Date, Notes, Outcome');
console.log('                                      → User (chi ha fatto)');
console.log('');

console.log('✅ Una volta completati questi passi, il sistema Note sarà pronto!');
console.log('');
console.log('💡 Tip: Le note saranno visibili nella timeline unificata del lead,');
console.log('   mescolate con le attività in ordine cronologico.');
console.log('');

// Crea anche uno script di test per verificare la connessione
const testScript = `/**
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
  console.log('🧪 Test connessione tabella Notes...\\n');
  
  try {
    // Fetch primi 3 record per test
    const records = await notesTable.select({
      maxRecords: 3,
    }).firstPage();
    
    console.log(\`✅ Tabella Notes connessa! (\${records.length} record trovati)\\n\`);
    
    if (records.length > 0) {
      console.log('📝 Esempio record:\\n');
      const note = records[0];
      console.log('ID:', note.id);
      console.log('Fields:', JSON.stringify(note.fields, null, 2));
    } else {
      console.log('ℹ️  Tabella vuota (normale per una tabella nuova)');
      console.log('\\n💡 Puoi creare una nota di test dalla UI del CRM');
    }
    
    console.log('\\n✅ Test completato con successo!');
  } catch (error: any) {
    console.error('❌ Errore:', error.message);
    console.log('\\n💡 Verifica che AIRTABLE_NOTES_TABLE_ID sia corretto in .env.local');
  }
}

testNotesTable();
`;

// Salva lo script di test
import * as fs from 'fs';
const testScriptPath = path.resolve(__dirname, 'test-notes-table.ts');
fs.writeFileSync(testScriptPath, testScript);

console.log(`📝 Script di test creato: ${testScriptPath}`);
console.log('');
