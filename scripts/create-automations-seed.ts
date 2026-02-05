/**
 * Script per creare le automazioni seed in Airtable
 * 
 * Crea le 4 automazioni principali per gestione stati Lead:
 * 1. AUTO_CONTATTATO: Activity creata con contatto riuscito
 * 2. AUTO_QUALIFICATO: Activity con esito positivo
 * 3. AUTO_IN_NEGOZIAZIONE: Activity tipo Consulenza/Prova completata
 * 4. AUTO_CLIENTE: Order confermato
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

import Airtable from 'airtable';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_AUTOMATIONS_TABLE_ID = process.env.AIRTABLE_AUTOMATIONS_TABLE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_AUTOMATIONS_TABLE_ID) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

const automations = [
  // 1. AUTO_CONTATTATO
  {
    Name: 'AUTO_CONTATTATO - Lead diventa Contattato al primo contatto riuscito',
    Description: 'Quando viene creata una Activity di tipo Chiamata/Email/WhatsApp con esito "Contatto riuscito", il Lead passa a stato Contattato',
    Category: 'Gestione Lead',
    Priority: 'Media',
    IsActive: true,
    TriggerTable: 'Activity',
    TriggerEvent: 'Record Created',
    TriggerField: 'Tipo',
    TriggerOperator: 'contains',
    TriggerValue: 'Chiamata|Email|WhatsApp', // Engine dovrà splittare per |
    TriggerField2: 'Esito',
    TriggerOperator2: 'equals',
    TriggerValue2: 'Contatto riuscito',
    TriggerLogic: 'AND',
    ActionType: 'update_field',
    ActionTargetTable: 'Lead',
    ActionTargetField: 'Stato',
    ActionValue: 'Contattato',
  },
  
  // 2. AUTO_QUALIFICATO
  {
    Name: 'AUTO_QUALIFICATO - Lead qualificato con interesse',
    Description: 'Quando una Activity ha esito positivo (Molto interessato, Interessato, Appuntamento fissato, Informazioni raccolte), il Lead diventa Qualificato',
    Category: 'Gestione Lead',
    Priority: 'Media',
    IsActive: true,
    TriggerTable: 'Activity',
    TriggerEvent: 'Record Created',
    TriggerField: 'Esito',
    TriggerOperator: 'contains',
    TriggerValue: 'Molto interessato|Interessato|Appuntamento fissato|Informazioni raccolte',
    ActionType: 'update_field',
    ActionTargetTable: 'Lead',
    ActionTargetField: 'Stato',
    ActionValue: 'Qualificato',
  },
  
  // 3. AUTO_IN_NEGOZIAZIONE
  {
    Name: 'AUTO_IN_NEGOZIAZIONE - Lead in trattativa dopo consulenza',
    Description: 'Quando una Activity di tipo Consulenza/Prova/Appuntamento viene completata, il Lead passa in stato In Negoziazione',
    Category: 'Gestione Lead',
    Priority: 'Alta',
    IsActive: true,
    TriggerTable: 'Activity',
    TriggerEvent: 'Record Updated',
    TriggerField: 'Tipo',
    TriggerOperator: 'contains',
    TriggerValue: 'Consulenza|Prova|Appuntamento',
    TriggerField2: 'Stato',
    TriggerOperator2: 'equals',
    TriggerValue2: 'Completata',
    TriggerLogic: 'AND',
    ActionType: 'update_field',
    ActionTargetTable: 'Lead',
    ActionTargetField: 'Stato',
    ActionValue: 'In Negoziazione',
  },
  
  // 4. AUTO_CLIENTE
  {
    Name: 'AUTO_CLIENTE - Lead diventa Cliente con ordine',
    Description: 'Quando viene creato un Order con stato Confermato, il Lead collegato diventa Cliente',
    Category: 'Gestione Order',
    Priority: 'Critica',
    IsActive: true,
    TriggerTable: 'Order',
    TriggerEvent: 'Record Created',
    TriggerField: 'Stato',
    TriggerOperator: 'equals',
    TriggerValue: 'Confermato',
    ActionType: 'update_field',
    ActionTargetTable: 'Lead',
    ActionTargetField: 'Stato',
    ActionValue: 'Cliente',
  },
];

async function createAutomations() {
  console.log('🚀 Creazione automazioni seed in Airtable...\n');

  for (const automation of automations) {
    try {
      console.log(`📝 Creando: ${automation.Name}`);
      
      const record = await base(AIRTABLE_AUTOMATIONS_TABLE_ID!).create(automation);
      
      console.log(`✅ Creata automation ID: ${record.id}\n`);
    } catch (error: any) {
      console.error(`❌ Errore creando ${automation.Name}:`, error.message);
      console.error('   Dettagli:', error);
    }
  }

  console.log('\n✨ Processo completato!');
}

createAutomations().catch(console.error);
