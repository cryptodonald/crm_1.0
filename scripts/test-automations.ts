/**
 * Test Script per Automazioni
 * 
 * Testa il funzionamento delle automazioni creando Activity e verificando
 * che lo stato del Lead venga aggiornato automaticamente.
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import { leadsTable, activitiesTable, findRecords } from '../src/lib/airtable';
import { triggerOnCreate } from '../src/lib/automation-engine';
import type { AirtableLead, AirtableActivity } from '../src/types/airtable.generated';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAutomations() {
  console.log('🧪 Test Automazioni CRM 2.0\n');

  try {
    // 1. Trova o crea un Lead di test
    console.log('📋 Step 1: Preparazione Lead di test...');
    let testLead: AirtableLead;
    
    const existingLeads = await findRecords<AirtableLead>('leads', {
      filterByFormula: `{Nome} = "Test Automazioni Lead"`,
      maxRecords: 1,
    });

    if (existingLeads && existingLeads.length > 0) {
      testLead = existingLeads[0];
      console.log(`✅ Lead di test trovato: ${testLead.id} (Stato attuale: ${testLead.fields.Stato})`);
      
      // Reset stato a Nuovo
      await leadsTable.update(testLead.id, { Stato: 'Nuovo' });
      console.log('🔄 Stato resettato a: Nuovo\n');
    } else {
      testLead = await leadsTable.create({
        Nome: 'Test Automazioni',
        Telefono: '+39 333 1234567',
        Email: 'test-automazioni@example.com',
        Stato: 'Nuovo',
        Esigenza: 'Test automazioni sistema',
      });
      console.log(`✅ Lead di test creato: ${testLead.id}\n`);
    }

    // 2. Test AUTO_CONTATTATO
    console.log('📞 Step 2: Test AUTO_CONTATTATO...');
    console.log('   Creo Activity tipo "Chiamata" con esito "Contatto riuscito"');
    
    const activity1 = await activitiesTable.create({
      'ID Lead': [testLead.id],
      'Tipo': 'Chiamata',
      'Data': new Date().toISOString(),
      'Esito': 'Contatto riuscito',
      'Note': 'Test automazione AUTO_CONTATTATO',
    });

    console.log(`   Activity creata: ${activity1.id}`);
    
    // Trigger automazioni manualmente (simula comportamento API)
    await triggerOnCreate('Activity', activity1);
    
    // Wait per dare tempo ad Airtable di aggiornarsi
    await sleep(2000);
    
    // Verifica stato Lead
    const lead1 = await leadsTable.find(testLead.id);
    console.log(`   Stato Lead dopo automazione: ${lead1.fields.Stato}`);
    
    if (lead1.fields.Stato === 'Contattato') {
      console.log('   ✅ TEST PASSED: Lead stato = Contattato\n');
    } else {
      console.log(`   ❌ TEST FAILED: Expected "Contattato", got "${lead1.fields.Stato}"\n`);
    }

    // 3. Test AUTO_QUALIFICATO
    console.log('🎯 Step 3: Test AUTO_QUALIFICATO...');
    console.log('   Creo Activity con esito "Molto interessato"');
    
    const activity2 = await activitiesTable.create({
      'ID Lead': [testLead.id],
      'Tipo': 'Email',
      'Data': new Date().toISOString(),
      'Esito': 'Molto interessato',
      'Note': 'Test automazione AUTO_QUALIFICATO',
    });

    console.log(`   Activity creata: ${activity2.id}`);
    await triggerOnCreate('Activity', activity2);
    await sleep(2000);
    
    const lead2 = await leadsTable.find(testLead.id);
    console.log(`   Stato Lead dopo automazione: ${lead2.fields.Stato}`);
    
    if (lead2.fields.Stato === 'Qualificato') {
      console.log('   ✅ TEST PASSED: Lead stato = Qualificato\n');
    } else {
      console.log(`   ❌ TEST FAILED: Expected "Qualificato", got "${lead2.fields.Stato}"\n`);
    }

    // 4. Test AUTO_IN_NEGOZIAZIONE
    console.log('🤝 Step 4: Test AUTO_IN_NEGOZIAZIONE...');
    console.log('   Creo Activity tipo "Consulenza" e la marco come "Completata"');
    
    const activity3 = await activitiesTable.create({
      'ID Lead': [testLead.id],
      'Tipo': 'Consulenza',
      'Data': new Date().toISOString(),
      'Stato': 'Pianificata',
      'Note': 'Test automazione AUTO_IN_NEGOZIAZIONE',
    });

    console.log(`   Activity creata: ${activity3.id}`);
    
    // Update a Completata (trigger onUpdate)
    const { triggerOnUpdate } = await import('../src/lib/automation-engine');
    const previousActivity = activity3;
    const updatedActivity = await activitiesTable.update(activity3.id, {
      'Stato': 'Completata',
    });
    
    console.log('   Activity aggiornata a: Completata');
    await triggerOnUpdate('Activity', updatedActivity, previousActivity);
    await sleep(2000);
    
    const lead3 = await leadsTable.find(testLead.id);
    console.log(`   Stato Lead dopo automazione: ${lead3.fields.Stato}`);
    
    if (lead3.fields.Stato === 'In Negoziazione') {
      console.log('   ✅ TEST PASSED: Lead stato = In Negoziazione\n');
    } else {
      console.log(`   ❌ TEST FAILED: Expected "In Negoziazione", got "${lead3.fields.Stato}"\n`);
    }

    // 5. Verifica contatori esecuzioni
    console.log('📊 Step 5: Verifica contatori esecuzioni automazioni...');
    const automations = await findRecords('automations', {
      filterByFormula: `{IsActive} = TRUE()`,
    });

    console.log('   Automazioni eseguite:');
    for (const auto of automations || []) {
      const count = auto.fields.ExecutionCount || 0;
      const lastExec = auto.fields.LastExecuted || 'Mai';
      console.log(`   - ${auto.fields.Name}: ${count} volte (ultima: ${lastExec})`);
    }

    console.log('\n✨ Test completato!');
    console.log('\n💡 Nota: Controlla anche la tabella Automations in Airtable per vedere ExecutionCount aggiornato.');

  } catch (error: any) {
    console.error('\n❌ Errore durante il test:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testAutomations();
