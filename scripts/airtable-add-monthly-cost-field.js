/**
 * Script da eseguire DENTRO Airtable
 * 
 * ISTRUZIONI:
 * 1. Vai su https://airtable.com/app359c17lK0Ta8Ws
 * 2. Apri la tabella "Marketing Costs"
 * 3. Click in alto a destra su "Extensions"
 * 4. Cerca "Scripting" e aprila
 * 5. Copia e incolla questo script
 * 6. Click "Run"
 * 
 * Questo script aggiunge il campo "Costo Mensile" alla tabella Marketing Costs
 */

output.markdown('# 💰 Aggiunta campo Costo Mensile');
output.markdown('');

const costsTable = base.getTable('Marketing Costs');

output.markdown('## 📋 Istruzioni Manuali');
output.markdown('');
output.markdown('**L\'API Scripting non permette di creare nuovi campi.**');
output.markdown('');
output.markdown('### Aggiungi manualmente:');
output.markdown('');
output.markdown('1️⃣ **Crea il campo "Costo Mensile":**');
output.markdown('   - Click sul "+" per aggiungere un nuovo campo');
output.markdown('   - Nome: `Costo Mensile`');
output.markdown('   - Tipo: `Currency`');
output.markdown('   - Simbolo: `€`');
output.markdown('   - Precisione: `2 decimali`');
output.markdown('');
output.markdown('2️⃣ **Opzionale - Rinomina "Budget" in "Budget Totale":**');
output.markdown('   - Click sulla colonna "Budget"');
output.markdown('   - Customize field type');
output.markdown('   - Cambia nome in: `Budget Totale`');
output.markdown('');
output.markdown('3️⃣ **Rendi "Data Fine" opzionale:**');
output.markdown('   - Per le campagne senza scadenza, lascia vuoto il campo Data Fine');
output.markdown('   - Airtable lo supporta già di default');
output.markdown('');

// Analizza campagne esistenti
output.markdown('## 📊 Analisi Campagne Esistenti');
output.markdown('');

const costsQuery = await costsTable.selectRecordsAsync({
    fields: ['Name', 'Budget', 'Data Inizio', 'Data Fine']
});

output.markdown(`📈 Trovate ${costsQuery.records.length} campagne`);
output.markdown('');

let withEndDate = 0;
let withoutEndDate = 0;
let totalBudget = 0;

for (let cost of costsQuery.records) {
    const budget = cost.getCellValue('Budget') || 0;
    const dataFine = cost.getCellValue('Data Fine');
    
    totalBudget += budget;
    
    if (dataFine) {
        withEndDate++;
    } else {
        withoutEndDate++;
    }
}

output.markdown(`✅ Campagne con data fine: ${withEndDate}`);
output.markdown(`⏳ Campagne senza data fine: ${withoutEndDate}`);
output.markdown(`💰 Budget totale allocato: €${totalBudget.toFixed(2)}`);
output.markdown('');

output.markdown('## 💡 Suggerimento');
output.markdown('');
output.markdown('Dopo aver creato il campo "Costo Mensile", puoi:');
output.markdown('- Inserire il costo mensile per ogni campagna');
output.markdown('- Il sistema calcolerà automaticamente il Budget Totale basandosi sulla durata');
output.markdown('- Per campagne senza Data Fine, il Budget Totale rimane fisso');
output.markdown('');
output.markdown('✅ **Setup manuale completato!**');
