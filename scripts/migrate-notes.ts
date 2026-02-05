/**
 * Script di migrazione: Leads.Note → Notes table
 * 
 * Questo script:
 * 1. Legge tutti i lead con campo "Note" compilato
 * 2. Crea una riga nella tabella Notes per ogni lead
 * 3. Collega la nota al lead
 * 4. Assegna Type = "Riflessione" e User = "Matteo Eusebi"
 * 5. NON cancella il vecchio campo (da fare manualmente dopo)
 */

import Airtable from 'airtable';
import dotenv from 'dotenv';
import path from 'path';

// Carica variabili d'ambiente da .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Configurazione
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const AIRTABLE_LEADS_TABLE_ID = process.env.AIRTABLE_LEADS_TABLE_ID!;
const AIRTABLE_USERS_TABLE_ID = process.env.AIRTABLE_USERS_TABLE_ID!;
const AIRTABLE_NOTES_TABLE_ID = process.env.AIRTABLE_NOTES_TABLE_ID!;

const MATTEO_EMAIL = 'matteo@materassidoctorbed.com'; // Email di Matteo Eusebi
const DEFAULT_TYPE = 'Riflessione';

// Inizializza Airtable
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

interface Lead {
  id: string;
  fields: {
    Nome?: string;
    Cognome?: string;
    Note?: string;
  };
}

interface User {
  id: string;
  fields: {
    Email?: string;
    Nome?: string;
  };
}

async function findMatteoUser(): Promise<string> {
  console.log('🔍 Cerco utente Matteo Eusebi...');
  
  const users = await base(AIRTABLE_USERS_TABLE_ID)
    .select({
      filterByFormula: `{Email} = '${MATTEO_EMAIL}'`,
      maxRecords: 1,
    })
    .all();

  if (users.length === 0) {
    throw new Error(`❌ Utente con email ${MATTEO_EMAIL} non trovato!`);
  }

  const user = users[0] as unknown as User;
  console.log(`✅ Trovato: ${user.fields.Nome} (${user.id})`);
  return user.id;
}

async function getLeadsWithNotes(): Promise<Lead[]> {
  console.log('📋 Recupero lead con campo Note compilato...');
  
  const leads = await base(AIRTABLE_LEADS_TABLE_ID)
    .select({
      filterByFormula: `AND({Note} != '', {Note} != BLANK())`,
    })
    .all();

  console.log(`✅ Trovati ${leads.length} lead con note`);
  return leads as unknown as Lead[];
}

async function migrateNotes(matteoUserId: string, leads: Lead[]) {
  console.log(`\n🚀 Inizio migrazione di ${leads.length} note...\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const lead of leads) {
    const noteContent = lead.fields.Note?.trim();
    if (!noteContent) {
      console.log(`⏭️  Lead ${lead.id}: Note vuota, skip`);
      continue;
    }

    const leadName = `${lead.fields.Nome || ''} ${lead.fields.Cognome || ''}`.trim() || lead.id;

    try {
      // Crea la nota nella tabella Notes
      await base(AIRTABLE_NOTES_TABLE_ID).create({
        Lead: [lead.id],
        User: [matteoUserId],
        Content: noteContent,
        Type: DEFAULT_TYPE,
        Pinned: false,
      });

      successCount++;
      console.log(`✅ [${successCount}/${leads.length}] Migrata nota per: ${leadName}`);
    } catch (error) {
      errorCount++;
      console.error(`❌ [${errorCount}] Errore per lead ${leadName}:`, error);
    }

    // Pausa per evitare rate limiting (5 req/sec max)
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  console.log(`\n📊 Migrazione completata:`);
  console.log(`   ✅ Successo: ${successCount}`);
  console.log(`   ❌ Errori: ${errorCount}`);
  console.log(`   📝 Totale: ${leads.length}`);

  if (successCount === leads.length) {
    console.log(`\n🎉 Tutte le note sono state migrate con successo!`);
    console.log(`\n⚠️  PROSSIMI PASSI:`);
    console.log(`   1. Verifica su Airtable che le note siano collegate correttamente`);
    console.log(`   2. Cancella manualmente il vecchio campo "Note" dalla tabella Leads`);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Migrazione Note: Leads.Note → Notes table');
  console.log('═══════════════════════════════════════════════\n');

  // Validazione environment variables
  if (!AIRTABLE_API_KEY) {
    throw new Error('❌ AIRTABLE_API_KEY non configurata!');
  }
  if (!AIRTABLE_BASE_ID) {
    throw new Error('❌ AIRTABLE_BASE_ID non configurata!');
  }
  if (!AIRTABLE_LEADS_TABLE_ID) {
    throw new Error('❌ AIRTABLE_LEADS_TABLE_ID non configurata!');
  }
  if (!AIRTABLE_USERS_TABLE_ID) {
    throw new Error('❌ AIRTABLE_USERS_TABLE_ID non configurata!');
  }
  if (!AIRTABLE_NOTES_TABLE_ID) {
    throw new Error('❌ AIRTABLE_NOTES_TABLE_ID non configurata! Aggiungi la variabile in .env.local');
  }

  try {
    // 1. Trova l'utente Matteo
    const matteoUserId = await findMatteoUser();

    // 2. Recupera tutti i lead con note
    const leads = await getLeadsWithNotes();

    if (leads.length === 0) {
      console.log('ℹ️  Nessun lead con note da migrare.');
      return;
    }

    // 3. Conferma prima di procedere
    console.log(`\n⚠️  ATTENZIONE:`);
    console.log(`   - Verranno create ${leads.length} nuove righe nella tabella Notes`);
    console.log(`   - Autore: Matteo Eusebi (${matteoUserId})`);
    console.log(`   - Type: ${DEFAULT_TYPE}`);
    console.log(`   - Il vecchio campo "Note" NON verrà cancellato\n`);

    // 4. Esegui migrazione
    await migrateNotes(matteoUserId, leads);

  } catch (error) {
    console.error('\n❌ Errore durante la migrazione:', error);
    process.exit(1);
  }
}

main();
