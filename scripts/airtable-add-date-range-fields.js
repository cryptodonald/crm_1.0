/**
 * Script Airtable: Aggiungi campi Data Inizio e Data Fine alla tabella "Spese Mensili"
 * 
 * ISTRUZIONI:
 * 1. Apri Airtable Base
 * 2. Clicca su "Extensions" in alto a destra
 * 3. Cerca "Scripting" e aprilo
 * 4. Copia questo codice
 * 5. Clicca "Run"
 */

// Ottieni riferimento alla tabella
const speseMensiliTable = base.getTable("Spese Mensili");

output.markdown(`# 📅 Aggiunta Campi Date alla Tabella "Spese Mensili"\n`);

// Verifica campi esistenti
const existingFields = speseMensiliTable.fields.map(f => f.name);
output.markdown(`## Campi Esistenti:\n${existingFields.map(f => `- ${f}`).join('\n')}`);

// Controlla se i campi esistono già
const needsDataInizio = !existingFields.includes("Data Inizio");
const needsDataFine = !existingFields.includes("Data Fine");

if (!needsDataInizio && !needsDataFine) {
    output.markdown(`\n✅ **I campi "Data Inizio" e "Data Fine" esistono già!**`);
} else {
    output.markdown(`\n## ⚠️ Azione Richiesta\n`);
    output.markdown(`**IMPORTANTE**: Airtable Scripting non permette la creazione di campi via API.\n`);
    output.markdown(`Devi aggiungere manualmente i seguenti campi:\n`);
    
    if (needsDataInizio) {
        output.markdown(`\n### 1. Campo "Data Inizio"`);
        output.markdown(`- Nome: \`Data Inizio\``);
        output.markdown(`- Tipo: **Date** (con opzione "Include time" disabilitata)`);
        output.markdown(`- Formato: Europeo (DD/MM/YYYY)`);
    }
    
    if (needsDataFine) {
        output.markdown(`\n### 2. Campo "Data Fine"`);
        output.markdown(`- Nome: \`Data Fine\``);
        output.markdown(`- Tipo: **Date** (con opzione "Include time" disabilitata)`);
        output.markdown(`- Formato: Europeo (DD/MM/YYYY)`);
    }
    
    output.markdown(`\n### 📝 Procedura Manuale:\n`);
    output.markdown(`1. Clicca sul pulsante **"+"** nella barra superiore della tabella`);
    output.markdown(`2. Scegli tipo campo: **Date**`);
    output.markdown(`3. Rinomina il campo con il nome indicato sopra`);
    output.markdown(`4. Nelle impostazioni del campo:`);
    output.markdown(`   - Disabilita "Include a time field"`);
    output.markdown(`   - Imposta formato data: **European (D/M/YYYY)**`);
    output.markdown(`5. Ripeti per entrambi i campi`);
    
    output.markdown(`\n### 🔄 Migrazione Campo "Mese" (Opzionale)\n`);
    output.markdown(`Se hai già record esistenti con il campo "Mese", puoi:`);
    output.markdown(`1. **Mantenere** il campo "Mese" per compatibilità`);
    output.markdown(`2. **Oppure** migrare manualmente i dati:`);
    output.markdown(`   - Per ogni record, copia la data dal campo "Mese"`);
    output.markdown(`   - Imposta "Data Inizio" = primo giorno del mese`);
    output.markdown(`   - Imposta "Data Fine" = ultimo giorno del mese`);
    output.markdown(`   - Poi elimina il campo "Mese"`);
}

output.markdown(`\n---\n`);
output.markdown(`✅ **Fatto!** Una volta aggiunti i campi, il sistema CRM potrà registrare spese con range di date personalizzati.`);
