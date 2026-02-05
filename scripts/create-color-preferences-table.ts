/**
 * Script per creare la tabella UserColorPreferences su Airtable
 * 
 * IMPORTANTE: Questo script crea la struttura della tabella per salvare
 * le preferenze colore personalizzate degli utenti per badge e UI.
 * 
 * Uso:
 *   npx ts-node scripts/create-color-preferences-table.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Carica variabili d'ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_BASE_ID) {
  console.error('❌ Errore: AIRTABLE_BASE_ID deve essere definito in .env.local');
  process.exit(1);
}

console.log('🎨 Creazione tabella UserColorPreferences su Airtable...\n');

console.log('📋 ISTRUZIONI MANUALI:\n');
console.log('⚠️  ATTENZIONE: Airtable non permette la creazione di tabelle via API.');
console.log('    Devi creare la tabella manualmente seguendo questi passi:\n');

console.log('1️⃣  Vai su https://airtable.com e apri la base:', AIRTABLE_BASE_ID);
console.log('');

console.log('2️⃣  Clicca sul pulsante "+" per aggiungere una nuova tabella');
console.log('    Nome tabella: "UserColorPreferences"');
console.log('');

console.log('3️⃣  Crea i seguenti campi nella tabella UserColorPreferences:\n');

const fields = [
  {
    name: 'User',
    type: 'Link to another record',
    options: 'Link alla tabella Users (Many-to-One)',
    required: true,
  },
  {
    name: 'EntityType',
    type: 'Single select',
    options: 'Tipo entità: LeadStato, LeadFonte, OrderStatus, ActivityType, ProductCategory',
    required: true,
  },
  {
    name: 'EntityValue',
    type: 'Single line text',
    options: 'Valore specifico (es: "Nuovo", "Instagram", "Confermato")',
    required: true,
  },
  {
    name: 'ColorClass',
    type: 'Single line text',
    options: 'Classe Tailwind o hex (es: "bg-blue-500 text-white" o "#3B82F6")',
    required: true,
  },
  {
    name: 'IsDefault',
    type: 'Checkbox',
    options: 'Indica se è il colore di default del sistema (read-only per utenti)',
    required: false,
  },
  {
    name: 'CreatedAt',
    type: 'Created time',
    options: 'Timestamp automatico creazione',
    required: false,
  },
  {
    name: 'UpdatedAt',
    type: 'Last modified time',
    options: 'Timestamp automatico ultima modifica',
    required: false,
  },
];

console.log('┌─────────────────────────────────────────────────────────────────────────┐');
fields.forEach((field, index) => {
  const nameCol = `${index + 1}. ${field.name}`.padEnd(30);
  const typeCol = field.type.padEnd(28);
  console.log(`│ ${nameCol} │ ${typeCol} │`);
  console.log(`│    ${field.options.padEnd(68)} │`);
  if (field.required) {
    console.log(`│    ⚠️  Campo obbligatorio ${' '.padEnd(45)} │`);
  }
  console.log(`├─────────────────────────────────────────────────────────────────────────┤`);
});
console.log('└─────────────────────────────────────────────────────────────────────────┘\n');

console.log('4️⃣  Configurazione campo "EntityType" (Single Select):\n');
console.log('    a) Clicca su "Customize field type" per il campo EntityType');
console.log('    b) Aggiungi queste opzioni:\n');
console.log('       • LeadStato          - Stati del lead (Nuovo, Attivo, Cliente...)');
console.log('       • LeadFonte          - Fonti marketing (Instagram, Facebook...)');
console.log('       • OrderStatus        - Stati ordini (Bozza, Confermato...)');
console.log('       • ActivityType       - Tipi attività (Chiamata, Email...)');
console.log('       • ProductCategory    - Categorie prodotti');
console.log('');

console.log('5️⃣  Indici consigliati per performance:\n');
console.log('    a) Vai a "Extensions" → "Data" → "Indexes"');
console.log('    b) Crea indice composito su: User + EntityType + EntityValue');
console.log('    c) Questo garantisce lookup veloci e previene duplicati');
console.log('');

console.log('6️⃣  Seed dei colori di default:\n');
console.log('    Dopo aver creato la tabella, aggiungi questi record di default');
console.log('    (con IsDefault = true e User vuoto per renderli globali):\n');

const defaultColors = [
  // Stati Lead
  { EntityType: 'LeadStato', EntityValue: 'Nuovo', ColorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  { EntityType: 'LeadStato', EntityValue: 'Attivo', ColorClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  { EntityType: 'LeadStato', EntityValue: 'Qualificato', ColorClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' },
  { EntityType: 'LeadStato', EntityValue: 'Cliente', ColorClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300' },
  { EntityType: 'LeadStato', EntityValue: 'Chiuso', ColorClass: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
  { EntityType: 'LeadStato', EntityValue: 'Sospeso', ColorClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
  
  // Fonti Lead (esempi)
  { EntityType: 'LeadFonte', EntityValue: 'Instagram', ColorClass: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300' },
  { EntityType: 'LeadFonte', EntityValue: 'Facebook', ColorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  { EntityType: 'LeadFonte', EntityValue: 'Sito Web', ColorClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300' },
  { EntityType: 'LeadFonte', EntityValue: 'Passaparola', ColorClass: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
  
  // Stati Ordine
  { EntityType: 'OrderStatus', EntityValue: 'Bozza', ColorClass: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
  { EntityType: 'OrderStatus', EntityValue: 'Confermato', ColorClass: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
  { EntityType: 'OrderStatus', EntityValue: 'Spedito', ColorClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
  { EntityType: 'OrderStatus', EntityValue: 'Consegnato', ColorClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300' },
  { EntityType: 'OrderStatus', EntityValue: 'Annullato', ColorClass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
];

console.log('    ┌─────────────────────────────────────────────────────────────────┐');
defaultColors.forEach((color, index) => {
  console.log(`    │ ${(index + 1 + '.').padEnd(4)} ${color.EntityType.padEnd(18)} │ ${color.EntityValue.padEnd(15)} │`);
  console.log(`    │      ${color.ColorClass.padEnd(58)} │`);
  if ((index + 1) % 6 === 0 && index < defaultColors.length - 1) {
    console.log(`    ├─────────────────────────────────────────────────────────────────┤`);
  }
});
console.log('    └─────────────────────────────────────────────────────────────────┘\n');

console.log('7️⃣  Copia l\'ID della tabella UserColorPreferences:\n');
console.log('    a) Clicca sui "..." della tabella UserColorPreferences');
console.log('    b) Seleziona "Copy table ID"');
console.log('    c) Aggiungi in .env.local:');
console.log('       AIRTABLE_COLOR_PREFERENCES_TABLE_ID=tblXXXXXXXXXXXXXX');
console.log('');

console.log('8️⃣  Aggiorna il file src/env.ts:\n');
console.log('    Aggiungi questa riga dopo gli altri table IDs:');
console.log('    AIRTABLE_COLOR_PREFERENCES_TABLE_ID: z.string().min(1, \'AIRTABLE_COLOR_PREFERENCES_TABLE_ID is required\'),');
console.log('');

console.log('9️⃣  Verifica la configurazione con:');
console.log('    npx ts-node scripts/test-color-preferences.ts');
console.log('');

console.log('📚 ARCHITETTURA SISTEMA COLORI:\n');
console.log('   ┌─────────────────────────────────────────────────┐');
console.log('   │ UserColorPreferences                            │');
console.log('   ├─────────────────────────────────────────────────┤');
console.log('   │ • Fallback hierarchy:                           │');
console.log('   │   1. User-specific preference (User = X)        │');
console.log('   │   2. System default (IsDefault = true)          │');
console.log('   │   3. Hardcoded fallback in code                 │');
console.log('   │                                                 │');
console.log('   │ • Cache strategy:                               │');
console.log('   │   - User preferences cached in Redis (5 min)    │');
console.log('   │   - System defaults cached (1 hour)             │');
console.log('   │                                                 │');
console.log('   │ • UI:                                           │');
console.log('   │   - Pannello Impostazioni → Colori              │');
console.log('   │   - Live preview dei badge                      │');
console.log('   │   - Reset a default per singolo valore          │');
console.log('   └─────────────────────────────────────────────────┘');
console.log('');

console.log('✅ Una volta completati questi passi, il sistema colori personalizzati sarà pronto!');
console.log('');
console.log('💡 Next steps:');
console.log('   1. Crea hook useColorPreferences() per caricare preferenze utente');
console.log('   2. Crea API routes per CRUD preferenze');
console.log('   3. Crea UI pannello impostazioni colori');
console.log('   4. Migra codice esistente (getLeadStatusColor, getSourceColor) al nuovo sistema');
console.log('');

// Genera script di test
import * as fs from 'fs';

const testScript = `/**
 * Script di test per verificare la tabella UserColorPreferences
 */

import Airtable from 'airtable';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_COLOR_PREFERENCES_TABLE_ID = process.env.AIRTABLE_COLOR_PREFERENCES_TABLE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_COLOR_PREFERENCES_TABLE_ID) {
  console.error('❌ Variabili mancanti in .env.local');
  process.exit(1);
}

const airtable = new Airtable({ apiKey: AIRTABLE_API_KEY });
const base = airtable.base(AIRTABLE_BASE_ID);
const colorPrefsTable = base(AIRTABLE_COLOR_PREFERENCES_TABLE_ID);

async function testColorPreferencesTable() {
  console.log('🧪 Test connessione tabella UserColorPreferences...\\n');
  
  try {
    // Fetch primi 10 record per test
    const records = await colorPrefsTable.select({
      maxRecords: 10,
      filterByFormula: '{IsDefault} = 1', // Solo default
    }).firstPage();
    
    console.log(\`✅ Tabella UserColorPreferences connessa! (\${records.length} colori default trovati)\\n\`);
    
    if (records.length > 0) {
      console.log('🎨 Colori default caricati:\\n');
      records.forEach((record) => {
        const { EntityType, EntityValue, ColorClass } = record.fields;
        console.log(\`  • \${EntityType} → \${EntityValue}\`);
        console.log(\`    Color: \${ColorClass}\\n\`);
      });
    } else {
      console.log('⚠️  Nessun colore default trovato!');
      console.log('    Aggiungi i colori di default seguendo le istruzioni dello script.');
    }
    
    console.log('\\n✅ Test completato con successo!');
  } catch (error: any) {
    console.error('❌ Errore:', error.message);
    console.log('\\n💡 Verifica che AIRTABLE_COLOR_PREFERENCES_TABLE_ID sia corretto in .env.local');
  }
}

testColorPreferencesTable();
`;

const testScriptPath = path.resolve(__dirname, 'test-color-preferences.ts');
fs.writeFileSync(testScriptPath, testScript);

console.log(`📝 Script di test creato: ${testScriptPath}`);
console.log('');
