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
 * Questo script crea la tabella "Spese Mensili" per tracciare
 * quanto spendi ogni mese per ogni campagna marketing
 */

output.markdown('# 💰 Creazione tabella Spese Mensili');
output.markdown('');

try {
    // Verifica se la tabella esiste già
    const existingTable = base.getTable('Spese Mensili');
    if (existingTable) {
        output.markdown('⚠️ La tabella "Spese Mensili" esiste già!');
    }
} catch (e) {
    // La tabella non esiste, creala
    output.markdown('📊 Creando la tabella...');
    
    const newTable = await base.createTableAsync('Spese Mensili', [
        {
            name: 'Nome',
            type: 'singleLineText',
        },
        {
            name: 'Campagna',
            type: 'multipleRecordLinks',
            options: {
                linkedTableId: base.getTable('Marketing Costs').id,
            }
        },
        {
            name: 'Mese',
            type: 'date',
            options: {
                dateFormat: {
                    name: 'local',
                    format: 'l',
                }
            }
        },
        {
            name: 'Importo Speso',
            type: 'currency',
            options: {
                precision: 2,
                symbol: '€',
            }
        },
        {
            name: 'Note',
            type: 'multilineText',
        },
    ]);
    
    output.markdown('✅ Tabella creata con successo!');
    output.markdown('');
    
    // Aggiungi record di esempio
    output.markdown('📝 Aggiungendo record di esempio...');
    
    const speseMensiliTable = base.getTable('Spese Mensili');
    const costsTable = base.getTable('Marketing Costs');
    
    // Prendi la prima campagna Meta per l'esempio
    const costsQuery = await costsTable.selectRecordsAsync({
        fields: ['Name', 'Fonte']
    });
    
    const metaCampaign = costsQuery.records.find(r => 
        r.getCellValue('Fonte') === 'Meta' || 
        (r.getCellValue('Name') || '').toLowerCase().includes('meta')
    );
    
    if (metaCampaign) {
        await speseMensiliTable.createRecordsAsync([
            {
                fields: {
                    'Nome': 'Novembre 2024',
                    'Campagna': [{ id: metaCampaign.id }],
                    'Mese': '2024-11-01',
                    'Importo Speso': 1300,
                    'Note': 'Spesa effettiva novembre - campagna acquisizione',
                }
            },
            {
                fields: {
                    'Nome': 'Dicembre 2024',
                    'Campagna': [{ id: metaCampaign.id }],
                    'Mese': '2024-12-01',
                    'Importo Speso': 2500,
                    'Note': 'Spesa effettiva dicembre - aumentato budget per Natale',
                }
            },
        ]);
        
        output.markdown('✅ Aggiunti 2 record di esempio');
    }
    
    output.markdown('');
    output.markdown('🎉 **Setup completato!**');
    output.markdown('');
    output.markdown('## 📝 Come usare la tabella Spese Mensili:');
    output.markdown('');
    output.markdown('1. **Registra la spesa effettiva ogni mese:**');
    output.markdown('   - Seleziona la campagna dalla tabella Marketing Costs');
    output.markdown('   - Indica il mese (es: 11/2024 per Novembre 2024)');
    output.markdown('   - Inserisci l\'importo effettivo speso');
    output.markdown('');
    output.markdown('2. **Esempio pratico:**');
    output.markdown('   - Campagna: "Meta Ads - Q4 2024"');
    output.markdown('   - Novembre: €1,300');
    output.markdown('   - Dicembre: €2,500');
    output.markdown('   - Gennaio: €1,800');
    output.markdown('');
    output.markdown('3. **Vantaggi:**');
    output.markdown('   - Traccia il costo effettivo mese per mese');
    output.markdown('   - Confronta budget previsto vs spesa reale');
    output.markdown('   - Analizza trend di spesa nel tempo');
    output.markdown('   - Calcola ROI mensile accurato');
}
