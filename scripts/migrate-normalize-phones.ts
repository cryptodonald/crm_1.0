/**
 * Script di migrazione: Normalizza numeri di telefono
 * 
 * Trasforma numeri nel formato "(347) 414-4159" in "3474144159"
 * Rimuove: parentesi, trattini, spazi
 * 
 * USAGE:
 * npm run migrate:phones
 * 
 * OPTIONS:
 * --dry-run    Simula senza scrivere su Airtable
 * --limit N    Processa solo i primi N lead (per test)
 */

import Airtable from 'airtable';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_LEADS_TABLE_ID = process.env.AIRTABLE_LEADS_TABLE_ID || 'tblKIZ9CDjcQorONA';

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ Missing required environment variables:');
  console.error('   AIRTABLE_API_KEY:', AIRTABLE_API_KEY ? '✓' : '✗');
  console.error('   AIRTABLE_BASE_ID:', AIRTABLE_BASE_ID ? '✓' : '✗');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

interface LeadRecord {
  id: string;
  Nome?: string;
  Telefono?: string;
}

/**
 * Normalizza numero di telefono
 * Rimuove: parentesi, trattini, spazi, punti
 * Esempio: "(347) 414-4159" → "3474144159"
 */
function normalizePhone(phone: string): string {
  if (!phone) return phone;
  
  // Rimuovi tutti i caratteri non numerici (eccetto +)
  let normalized = phone.replace(/[^\d+]/g, '');
  
  // Se inizia con +39, rimuovilo (prefisso Italia)
  if (normalized.startsWith('+39')) {
    normalized = normalized.substring(3);
  }
  
  // Se inizia con 0039, rimuovilo
  if (normalized.startsWith('0039')) {
    normalized = normalized.substring(4);
  }
  
  return normalized;
}

/**
 * Verifica se il telefono ha bisogno di normalizzazione
 */
function needsNormalization(phone: string): boolean {
  if (!phone) return false;
  
  // Controlla se contiene caratteri da rimuovere
  const hasSpecialChars = /[\s\-().]/.test(phone);
  
  // Controlla se inizia con +39 o 0039
  const hasPrefix = phone.startsWith('+39') || phone.startsWith('0039');
  
  return hasSpecialChars || hasPrefix;
}

/**
 * Delay helper per rate limiting
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main migration function
 */
async function normalizePhones() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const limitArg = args.find(arg => arg.startsWith('--limit'));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;

  console.log('\n📞 Phone Normalization Migration Script');
  console.log('='.repeat(50));
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (no writes)' : '✍️  WRITE MODE'}`);
  console.log(`Limit: ${limit ? `${limit} leads` : 'All leads'}`);
  console.log('='.repeat(50));
  console.log('');

  // Step 1: Fetch all leads
  console.log('📥 Fetching leads from Airtable...');
  const leads: LeadRecord[] = [];
  
  try {
    const selectOptions: any = {
      fields: ['Nome', 'Telefono'],
    };
    
    if (limit) {
      selectOptions.maxRecords = limit;
    }
    
    await base(AIRTABLE_LEADS_TABLE_ID)
      .select(selectOptions)
      .eachPage((records, fetchNextPage) => {
        records.forEach((record) => {
          leads.push({
            id: record.id,
            Nome: record.get('Nome') as string | undefined,
            Telefono: record.get('Telefono') as string | undefined,
          });
        });
        fetchNextPage();
      });
  } catch (error: any) {
    console.error('❌ Error fetching leads:', error.message);
    process.exit(1);
  }

  console.log(`✅ Fetched ${leads.length} leads\n`);

  // Step 2: Filter leads that need normalization
  const leadsToProcess = leads.filter(lead => {
    // Skip if no phone
    if (!lead.Telefono) return false;
    // Check if needs normalization
    return needsNormalization(lead.Telefono);
  });

  console.log(`📊 Statistics:`);
  console.log(`   Total leads: ${leads.length}`);
  console.log(`   No phone: ${leads.filter(l => !l.Telefono).length}`);
  console.log(`   Already normalized: ${leads.length - leadsToProcess.length - leads.filter(l => !l.Telefono).length}`);
  console.log(`   To process: ${leadsToProcess.length}`);
  console.log('');

  if (leadsToProcess.length === 0) {
    console.log('✅ Nothing to do! All phones are already normalized.');
    process.exit(0);
  }

  // Show some examples
  console.log('📋 Examples of changes:');
  leadsToProcess.slice(0, 5).forEach(lead => {
    const normalized = normalizePhone(lead.Telefono!);
    console.log(`   "${lead.Telefono}" → "${normalized}"`);
  });
  console.log('');

  // Step 3: Confirm before proceeding
  if (!isDryRun) {
    console.log('⚠️  WRITE MODE: This will update Airtable records!');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to proceed...\n');
    await delay(5000);
  }

  // Step 4: Process each lead
  console.log('🔄 Processing leads...\n');
  
  let processed = 0;
  let updated = 0;
  let errors = 0;

  for (const lead of leadsToProcess) {
    processed++;
    const progress = `[${processed}/${leadsToProcess.length}]`;

    const originalPhone = lead.Telefono!;
    const normalizedPhone = normalizePhone(originalPhone);

    console.log(`${progress} ${lead.Nome || 'Lead senza nome'}`);
    console.log(`   Before: ${originalPhone}`);
    console.log(`   After:  ${normalizedPhone}`);

    try {
      // Update Airtable (if not dry run)
      if (!isDryRun) {
        await base(AIRTABLE_LEADS_TABLE_ID).update(lead.id, {
          Telefono: normalizedPhone,
        });
        updated++;
        console.log(`   ✅ Updated in Airtable`);
      } else {
        console.log(`   🔍 Would update (dry run)`);
      }

      // Rate limiting: 200ms delay between updates
      await delay(200);
    } catch (error: any) {
      errors++;
      console.error(`   ❌ Error: ${error.message}`);
    }

    console.log('');
  }

  // Step 5: Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(50));
  console.log(`Processed: ${processed} leads`);
  console.log(`Updated: ${updated} leads`);
  console.log(`Errors: ${errors}`);
  console.log('='.repeat(50));
  console.log('');

  if (isDryRun) {
    console.log('🔍 DRY RUN completed. No changes were made to Airtable.');
    console.log('   Run without --dry-run to apply changes.');
  } else {
    console.log('✅ Migration completed successfully!');
  }
}

// Run migration
normalizePhones().catch((error) => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});
