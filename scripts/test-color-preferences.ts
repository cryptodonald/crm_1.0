/**
 * Test script per il sistema Color Preferences
 * 
 * Verifica:
 * - Connessione tabella Airtable
 * - Caricamento colori default
 * - Fallback gerarchico
 * - Cache Redis
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Carica .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import {
  getColorPreferences,
  getColor,
  saveColorPreference,
  deleteColorPreference,
  getAllUserPreferences,
  type EntityType,
} from '../src/lib/color-preferences.js';

async function runTests() {
  console.log('🧪 Test Sistema Color Preferences\n');

  // ============================================
  // TEST 1: Carica colori default sistema
  // ============================================
  console.log('📝 TEST 1: Caricamento colori default LeadStato');
  try {
    const leadStati = await getColorPreferences('LeadStato');
    console.log('✅ Colori caricati:', Object.keys(leadStati).length);
    console.log('   Esempio - Nuovo:', leadStati['Nuovo']);
    console.log('   Esempio - Cliente:', leadStati['Cliente']);
  } catch (error: any) {
    console.error('❌ Errore:', error.message);
    return;
  }

  // ============================================
  // TEST 2: Carica singolo colore
  // ============================================
  console.log('\n📝 TEST 2: Caricamento singolo colore');
  try {
    const nuovoColor = await getColor('LeadStato', 'Nuovo');
    console.log('✅ Colore "Nuovo":', nuovoColor);
    
    const inesistenteColor = await getColor('LeadStato', 'Inesistente');
    console.log('✅ Colore "Inesistente" (fallback):', inesistenteColor);
  } catch (error: any) {
    console.error('❌ Errore:', error.message);
  }

  // ============================================
  // TEST 3: Carica tutti i tipi
  // ============================================
  console.log('\n📝 TEST 3: Caricamento tutti i tipi di entità');
  const entityTypes: EntityType[] = [
    'LeadStato',
    'LeadFonte',
    'OrderStatus',
    'ActivityType',
  ];

  for (const type of entityTypes) {
    try {
      const colors = await getColorPreferences(type);
      console.log(`✅ ${type}: ${Object.keys(colors).length} colori`);
    } catch (error: any) {
      console.error(`❌ ${type}: ${error.message}`);
    }
  }

  // ============================================
  // TEST 4: Salva preferenza personalizzata (simulato)
  // ============================================
  console.log('\n📝 TEST 4: Test salvataggio preferenza utente');
  console.log('ℹ️  Nota: Questo test richiede un userId valido');
  console.log('   Per testare il salvataggio, esegui manualmente:');
  console.log('   await saveColorPreference("LeadStato", "Nuovo", "bg-red-500", "recXXXX")');

  // ============================================
  // TEST 5: Verifica cache (se Redis disponibile)
  // ============================================
  console.log('\n📝 TEST 5: Test cache Redis');
  try {
    const start1 = Date.now();
    await getColorPreferences('LeadStato');
    const time1 = Date.now() - start1;

    const start2 = Date.now();
    await getColorPreferences('LeadStato');
    const time2 = Date.now() - start2;

    console.log(`✅ Prima chiamata (Airtable): ${time1}ms`);
    console.log(`✅ Seconda chiamata (Cache): ${time2}ms`);
    
    if (time2 < time1) {
      console.log('✅ Cache funzionante! Speedup:', Math.round(time1 / time2), 'x');
    } else {
      console.log('⚠️  Redis potrebbe non essere disponibile');
    }
  } catch (error: any) {
    console.error('❌ Errore:', error.message);
  }

  // ============================================
  // TEST 6: Verifica struttura dati Airtable
  // ============================================
  console.log('\n📝 TEST 6: Verifica struttura dati Airtable');
  try {
    const leadFonti = await getColorPreferences('LeadFonte');
    const expectedFonti = ['Instagram', 'Facebook', 'Sito Web', 'Passaparola', 'Google', 'LinkedIn'];
    
    const foundFonti = expectedFonti.filter(fonte => leadFonti[fonte]);
    console.log(`✅ Fonti trovate: ${foundFonti.length}/${expectedFonti.length}`);
    
    if (foundFonti.length < expectedFonti.length) {
      const missing = expectedFonti.filter(f => !leadFonti[f]);
      console.log('⚠️  Fonti mancanti:', missing.join(', '));
    }
  } catch (error: any) {
    console.error('❌ Errore:', error.message);
  }

  // ============================================
  // RIEPILOGO
  // ============================================
  console.log('\n' + '='.repeat(50));
  console.log('✅ Test completati!');
  console.log('='.repeat(50));
  console.log('\n💡 Prossimi passi:');
  console.log('   1. Implementa API routes /api/color-preferences');
  console.log('   2. Crea hook useColorPreferences()');
  console.log('   3. Migra getLeadStatusColor() al nuovo sistema');
  console.log('   4. Crea UI pannello impostazioni colori');
}

// Esegui test
runTests().catch(console.error);
