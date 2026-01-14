/**
 * Script da eseguire DENTRO Airtable
 * 
 * ISTRUZIONI:
 * 1. Vai su https://airtable.com/app359c17lK0Ta8Ws
 * 2. Click in alto a destra su "Extensions"
 * 3. Cerca "Scripting" e aprila
 * 4. Copia e incolla questo script
 * 5. Click "Run"
 * 
 * Questo script:
 * - Rinomina "Provenienza" in "Fonte" nella tabella Leads
 * - Crea mapping tra valori esistenti e Marketing Sources
 * - Aggiorna tutti i record per usare i link corretti
 */

output.markdown('# 🔄 Migrazione Provenienza → Fonte');
output.markdown('');

// Ottieni le tabelle
const leadsTable = base.getTable('Lead');
const sourcesTable = base.getTable('Marketing Sources');
const costsTable = base.getTable('Marketing Costs');

output.markdown('## 📊 Step 1: Analisi dati esistenti');

// Carica tutte le fonti da Marketing Sources
const sourcesQuery = await sourcesTable.selectRecordsAsync();
const sourcesMap = {};

output.markdown(`✅ Trovate ${sourcesQuery.records.length} fonti in Marketing Sources:`);
for (let source of sourcesQuery.records) {
    const name = source.getCellValue('Name');
    sourcesMap[name] = source.id;
    output.markdown(`   - ${name} (ID: ${source.id})`);
}

output.markdown('');
output.markdown('## 🔍 Step 2: Analisi campo Provenienza in Lead');

// Analizza i valori attuali di Provenienza
const leadsQuery = await leadsTable.selectRecordsAsync({
    fields: ['Nome', 'Provenienza']
});

const provenienzaValues = {};
let totalLeads = 0;
let leadsWithProvenienza = 0;

for (let lead of leadsQuery.records) {
    totalLeads++;
    const provenienza = lead.getCellValue('Provenienza');
    if (provenienza) {
        leadsWithProvenienza++;
        provenienzaValues[provenienza] = (provenienzaValues[provenienza] || 0) + 1;
    }
}

output.markdown(`📈 Totale lead: ${totalLeads}`);
output.markdown(`📈 Lead con Provenienza: ${leadsWithProvenienza}`);
output.markdown('');
output.markdown('Distribuzione Provenienza:');
for (let [value, count] of Object.entries(provenienzaValues)) {
    const matched = sourcesMap[value] ? '✅' : '⚠️';
    output.markdown(`   ${matched} ${value}: ${count} lead`);
}

output.markdown('');
output.markdown('## ⚠️ IMPORTANTE: Istruzioni manuali');
output.markdown('');
output.markdown('**Questo script NON può modificare il tipo di campo automaticamente.**');
output.markdown('');
output.markdown('### 📝 Passi da seguire MANUALMENTE:');
output.markdown('');
output.markdown('1️⃣ **Rinomina il campo:**');
output.markdown('   - Click sulla colonna "Provenienza" nella tabella Lead');
output.markdown('   - Click su "Customize field type"');
output.markdown('   - Cambia "Field name" da "Provenienza" a "Fonte"');
output.markdown('   - Click "Save"');
output.markdown('');
output.markdown('2️⃣ **Converti in Linked Record:**');
output.markdown('   - Click di nuovo sulla colonna "Fonte"');
output.markdown('   - Click su "Customize field type"');
output.markdown('   - Cambia tipo da "Single select" a "Link to another record"');
output.markdown('   - Seleziona la tabella: "Marketing Sources"');
output.markdown('   - Quando chiede come gestire i valori esistenti, scegli:');
output.markdown('     "Try to match existing values by Name field"');
output.markdown('   - Click "Save"');
output.markdown('');
output.markdown('3️⃣ **Verifica il mapping:**');
output.markdown('   - Airtable collegherà automaticamente i valori esistenti');
output.markdown('   - Verifica che tutti i lead abbiano la fonte corretta');
output.markdown('');
output.markdown('4️⃣ **Ripeti per Marketing Costs (se necessario):**');
output.markdown('   - Apri la tabella "Marketing Costs"');
output.markdown('   - Se il campo "Fonte" è Single select, convertilo in Linked Record');
output.markdown('   - Collega a "Marketing Sources"');
output.markdown('');

// Genera report di compatibilità
output.markdown('## 📊 Report Compatibilità');
output.markdown('');

const unmatchedValues = [];
for (let value in provenienzaValues) {
    if (!sourcesMap[value]) {
        unmatchedValues.push(value);
    }
}

if (unmatchedValues.length > 0) {
    output.markdown('⚠️ **Attenzione:** I seguenti valori NON hanno corrispondenza in Marketing Sources:');
    for (let value of unmatchedValues) {
        output.markdown(`   - "${value}" (usato in ${provenienzaValues[value]} lead)`);
    }
    output.markdown('');
    output.markdown('💡 **Soluzione:** Prima di convertire il campo, aggiungi queste fonti in Marketing Sources');
    output.markdown('   oppure modifica manualmente i lead per usare fonti esistenti.');
} else {
    output.markdown('✅ Tutti i valori di Provenienza hanno corrispondenza in Marketing Sources!');
    output.markdown('✅ Puoi procedere con la conversione in sicurezza.');
}

output.markdown('');
output.markdown('## 🎯 Riepilogo');
output.markdown('');
output.markdown(`- ${totalLeads} lead totali`);
output.markdown(`- ${leadsWithProvenienza} lead con Provenienza impostata`);
output.markdown(`- ${Object.keys(provenienzaValues).length} valori unici di Provenienza`);
output.markdown(`- ${sourcesQuery.records.length} fonti in Marketing Sources`);
output.markdown(`- ${unmatchedValues.length} valori non corrispondenti`);
output.markdown('');
output.markdown('---');
output.markdown('');
output.markdown('✅ **Analisi completata!** Segui i passi manuali qui sopra per completare la migrazione.');
