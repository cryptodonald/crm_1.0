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
 * Questo script creerà automaticamente la tabella Marketing Costs
 */

// Crea la tabella Marketing Costs
output.markdown('# 🚀 Creazione tabella Marketing Costs');

try {
    // Verifica se la tabella esiste già
    const existingTable = base.getTable('Marketing Costs');
    if (existingTable) {
        output.markdown('⚠️ La tabella "Marketing Costs" esiste già!');
    }
} catch (e) {
    // La tabella non esiste, creala
    output.markdown('📊 Creando la tabella...');
    
    const newTable = await base.createTableAsync('Marketing Costs', [
        {
            name: 'Name',
            type: 'singleLineText',
        },
        {
            name: 'Fonte',
            type: 'singleSelect',
            options: {
                choices: [
                    { name: 'Meta' },
                    { name: 'Instagram' },
                    { name: 'Google' },
                    { name: 'Sito' },
                    { name: 'Referral' },
                    { name: 'Organico' },
                ]
            }
        },
        {
            name: 'Budget',
            type: 'currency',
            options: {
                precision: 2,
                symbol: '€',
            }
        },
        {
            name: 'Data Inizio',
            type: 'date',
            options: {
                dateFormat: {
                    name: 'local',
                    format: 'l',
                }
            }
        },
        {
            name: 'Data Fine',
            type: 'date',
            options: {
                dateFormat: {
                    name: 'local',
                    format: 'l',
                }
            }
        },
        {
            name: 'Note',
            type: 'multilineText',
        },
    ]);
    
    output.markdown('✅ Tabella creata con successo!');
    
    // Aggiungi record di esempio
    output.markdown('📝 Aggiungendo record di esempio...');
    
    const marketingCostsTable = base.getTable('Marketing Costs');
    
    await marketingCostsTable.createRecordsAsync([
        {
            fields: {
                'Name': 'Meta Ads - Novembre 2024',
                'Fonte': { name: 'Meta' },
                'Budget': 1500,
                'Data Inizio': '2024-11-01',
                'Data Fine': '2024-11-30',
                'Note': 'Campagna Black Friday su Facebook e Instagram'
            }
        },
        {
            fields: {
                'Name': 'Google Ads - Novembre 2024',
                'Fonte': { name: 'Google' },
                'Budget': 1200,
                'Data Inizio': '2024-11-01',
                'Data Fine': '2024-11-30',
                'Note': 'Campagne Search e Display Network'
            }
        },
        {
            fields: {
                'Name': 'Instagram Influencer - Novembre',
                'Fonte': { name: 'Instagram' },
                'Budget': 800,
                'Data Inizio': '2024-11-01',
                'Data Fine': '2024-11-30',
                'Note': 'Collaborazione con micro-influencer'
            }
        },
        {
            fields: {
                'Name': 'Referral Program - Q4',
                'Fonte': { name: 'Referral' },
                'Budget': 0,
                'Data Inizio': '2024-10-01',
                'Data Fine': '2024-12-31',
                'Note': 'Programma passaparola clienti esistenti'
            }
        },
        {
            fields: {
                'Name': 'Meta Ads - Dicembre 2024',
                'Fonte': { name: 'Meta' },
                'Budget': 2000,
                'Data Inizio': '2024-12-01',
                'Data Fine': '2024-12-31',
                'Note': 'Campagne Natale con targeting lookalike'
            }
        },
        {
            fields: {
                'Name': 'Google Ads - Dicembre 2024',
                'Fonte': { name: 'Google' },
                'Budget': 1500,
                'Data Inizio': '2024-12-01',
                'Data Fine': '2024-12-31',
                'Note': 'Campagne Shopping per prodotti natalizi'
            }
        }
    ]);
    
    output.markdown('✅ Aggiunti 6 record di esempio');
    output.markdown('');
    output.markdown('🎉 **Setup completato!**');
    output.markdown('');
    output.markdown('Ora puoi:');
    output.markdown('- Visualizzare i dati nella tabella Marketing Costs');
    output.markdown('- Modificare/aggiungere campagne marketing');
    output.markdown('- Vedere le analytics nella dashboard del CRM');
}
