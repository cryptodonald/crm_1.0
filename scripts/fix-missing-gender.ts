/**
 * Script one-time per sistemare Gender mancante sui lead esistenti
 * Usa la stessa logica AI del webhook
 */

import Airtable from 'airtable';
import { inferGenderBatch } from '../src/lib/infer-gender';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY! }).base(
  process.env.AIRTABLE_BASE_ID!
);

interface Lead {
  id: string;
  fields: {
    Nome?: string;
    Cognome?: string;
    Gender?: string;
  };
}

async function getLeadsWithoutGender(): Promise<Lead[]> {
  console.log('🔍 Cerco lead senza Gender...');

  const leads = await base(process.env.AIRTABLE_LEADS_TABLE_ID!)
    .select({
      filterByFormula: `OR({Gender} = '', {Gender} = BLANK())`,
    })
    .all();

  console.log(`✅ Trovati ${leads.length} lead senza Gender`);
  return leads as unknown as Lead[];
}

async function fixMissingGenders(leads: Lead[]) {
  console.log(`\n🚀 Inizio fix di ${leads.length} lead...\n`);

  // 1. Raggruppa lead per nome (per batch processing efficiente)
  const nomiUniciMap = new Map<string, Lead[]>();
  
  for (const lead of leads) {
    const nome = lead.fields.Nome?.trim();
    if (!nome) {
      console.log(`⚠️ Lead ${lead.id}: Nome mancante, skip`);
      continue;
    }

    if (!nomiUniciMap.has(nome)) {
      nomiUniciMap.set(nome, []);
    }
    nomiUniciMap.get(nome)!.push(lead);
  }

  const nomiUnici = Array.from(nomiUniciMap.keys());
  console.log(`📊 ${nomiUnici.length} nomi unici da processare\n`);

  // 2. Inferisci gender per tutti i nomi unici (batch)
  console.log('🤖 Chiamo AI per inferire i gender...');
  const genderResults = await inferGenderBatch(nomiUnici, { maxConcurrent: 5 });
  console.log('✅ AI completata\n');

  // 3. Aggiorna lead su Airtable
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const [nome, leadsConStessoNome] of nomiUniciMap.entries()) {
    const result = genderResults.get(nome);

    if (!result?.gender) {
      console.log(
        `⏭️  Nome "${nome}": impossibile inferire gender (${result?.reasoning || 'unknown'}), skip ${leadsConStessoNome.length} lead`
      );
      skipCount += leadsConStessoNome.length;
      continue;
    }

    console.log(
      `📝 Nome "${nome}" → Gender: ${result.gender} (confidence: ${result.confidence})`
    );

    // Aggiorna tutti i lead con questo nome
    for (const lead of leadsConStessoNome) {
      try {
        await base(process.env.AIRTABLE_LEADS_TABLE_ID!).update(lead.id, {
          Gender: result.gender,
        });

        successCount++;
        const leadName = `${lead.fields.Nome || ''} ${lead.fields.Cognome || ''}`.trim();
        console.log(`   ✅ [${successCount}] Aggiornato: ${leadName} (${lead.id})`);
      } catch (updateError) {
        errorCount++;
        console.error(`   ❌ Errore aggiornando lead ${lead.id}:`, updateError);
      }

      // Pausa per evitare rate limiting (5 req/sec max)
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  console.log(`\n📊 Fix completato:`);
  console.log(`   ✅ Aggiornati: ${successCount}`);
  console.log(`   ⏭️  Skipped: ${skipCount}`);
  console.log(`   ❌ Errori: ${errorCount}`);
  console.log(`   📝 Totale: ${leads.length}`);

  if (successCount > 0) {
    console.log(`\n🎉 ${successCount} lead hanno ora il campo Gender corretto!`);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Fix Gender Mancante - Lead Esistenti');
  console.log('═══════════════════════════════════════════════\n');

  // Validazione environment variables
  if (!process.env.AIRTABLE_API_KEY) {
    throw new Error('❌ AIRTABLE_API_KEY non configurata!');
  }
  if (!process.env.AIRTABLE_BASE_ID) {
    throw new Error('❌ AIRTABLE_BASE_ID non configurata!');
  }
  if (!process.env.AIRTABLE_LEADS_TABLE_ID) {
    throw new Error('❌ AIRTABLE_LEADS_TABLE_ID non configurata!');
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('❌ OPENAI_API_KEY non configurata!');
  }

  try {
    // 1. Recupera lead senza Gender
    const leads = await getLeadsWithoutGender();

    if (leads.length === 0) {
      console.log('ℹ️  Nessun lead senza Gender. Tutto OK!');
      return;
    }

    // 2. Conferma prima di procedere
    console.log(`\n⚠️  ATTENZIONE:`);
    console.log(`   - Verranno aggiornati fino a ${leads.length} lead`);
    console.log(`   - Verranno usati crediti OpenAI per inferire i gender`);
    console.log(`   - L'operazione potrebbe richiedere alcuni minuti\n`);

    // 3. Esegui fix
    await fixMissingGenders(leads);
  } catch (error) {
    console.error('\n❌ Errore durante il fix:', error);
    process.exit(1);
  }
}

main();
