/**
 * Script di migrazione: Rileva gender per tutti i lead esistenti
 * 
 * Usa l'AI (OpenRouter) per rilevare il gender basato sul nome di ogni lead
 * e aggiorna il campo Gender su Airtable.
 * 
 * PREREQUISITI:
 * 1. Campo "Gender" deve esistere su Airtable (Single Select: male, female, unknown)
 * 2. OPENROUTER_API_KEY configurata in .env.local
 * 
 * USAGE:
 * npm run migrate:gender
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
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !OPENROUTER_API_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   AIRTABLE_API_KEY:', AIRTABLE_API_KEY ? '✓' : '✗');
  console.error('   AIRTABLE_BASE_ID:', AIRTABLE_BASE_ID ? '✓' : '✗');
  console.error('   OPENROUTER_API_KEY:', OPENROUTER_API_KEY ? '✓' : '✗');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

type Gender = 'male' | 'female' | 'unknown';

interface LeadRecord {
  id: string;
  Nome?: string;
  Gender?: Gender;
}

/**
 * Rileva gender usando OpenRouter AI
 */
async function detectGenderWithAI(nome: string): Promise<Gender> {
  try {
    const prompt = `Determina il genere della persona con questo nome: "${nome}".

Rispondi SOLO con una delle seguenti parole:
- "male" se è un nome maschile
- "female" se è un nome femminile  
- "unknown" se non riesci a determinarlo con certezza

Risposta (solo male/female/unknown):`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'https://crm.doctorbed.it',
        'X-Title': 'Doctorbed CRM - Gender Migration',
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI Error] ${response.status}: ${errorText}`);
      return 'unknown';
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content?.trim().toLowerCase();

    if (aiResponse === 'male') return 'male';
    if (aiResponse === 'female') return 'female';
    return 'unknown';
  } catch (error) {
    console.error('[AI Error]', error);
    return 'unknown';
  }
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
async function migrateLeadGenders() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const limitArg = args.find(arg => arg.startsWith('--limit'));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;

  console.log('\n🚀 Lead Gender Migration Script');
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
      fields: ['Nome', 'Gender'],
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
            Gender: record.get('Gender') as Gender | undefined,
          });
        });
        fetchNextPage();
      });
  } catch (error: any) {
    console.error('❌ Error fetching leads:', error.message);
    process.exit(1);
  }

  console.log(`✅ Fetched ${leads.length} leads\n`);

  // Step 2: Filter leads that need gender detection
  const leadsToProcess = leads.filter(lead => {
    // Skip if no name
    if (!lead.Nome || lead.Nome.trim().length === 0) return false;
    // Skip if gender already set
    if (lead.Gender && lead.Gender !== 'unknown') return false;
    return true;
  });

  console.log(`📊 Statistics:`);
  console.log(`   Total leads: ${leads.length}`);
  console.log(`   Already have gender: ${leads.filter(l => l.Gender && l.Gender !== 'unknown').length}`);
  console.log(`   No name: ${leads.filter(l => !l.Nome || l.Nome.trim().length === 0).length}`);
  console.log(`   To process: ${leadsToProcess.length}`);
  console.log('');

  if (leadsToProcess.length === 0) {
    console.log('✅ Nothing to do! All leads already have gender.');
    process.exit(0);
  }

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
  const stats = { male: 0, female: 0, unknown: 0 };

  for (const lead of leadsToProcess) {
    processed++;
    const progress = `[${processed}/${leadsToProcess.length}]`;

    console.log(`${progress} Processing: ${lead.Nome}`);

    try {
      // Detect gender with AI
      const gender = await detectGenderWithAI(lead.Nome!);
      stats[gender]++;

      console.log(`   → Detected: ${gender}`);

      // Update Airtable (if not dry run)
      if (!isDryRun) {
        await base(AIRTABLE_LEADS_TABLE_ID).update(lead.id, {
          Gender: gender,
        });
        updated++;
        console.log(`   ✅ Updated in Airtable`);
      } else {
        console.log(`   🔍 Would update to: ${gender} (dry run)`);
      }

      // Rate limiting: 500ms delay between API calls
      await delay(500);
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
  console.log('');
  console.log('Gender Distribution:');
  console.log(`   Male: ${stats.male}`);
  console.log(`   Female: ${stats.female}`);
  console.log(`   Unknown: ${stats.unknown}`);
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
migrateLeadGenders().catch((error) => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});
