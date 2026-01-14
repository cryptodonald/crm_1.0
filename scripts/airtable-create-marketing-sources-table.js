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
 * Questo script creerà la tabella Marketing Sources
 */

output.markdown('# 🚀 Creazione tabella Marketing Sources');

try {
    // Verifica se la tabella esiste già
    const existingTable = base.getTable('Marketing Sources');
    if (existingTable) {
        output.markdown('⚠️ La tabella "Marketing Sources" esiste già!');
    }
} catch (e) {
    // La tabella non esiste, creala
    output.markdown('📊 Creando la tabella...');
    
    const newTable = await base.createTableAsync('Marketing Sources', [
        {
            name: 'Name',
            type: 'singleLineText',
        },
        {
            name: 'Description',
            type: 'multilineText',
        },
        {
            name: 'Active',
            type: 'checkbox',
            options: {
                icon: 'check',
                color: 'greenBright',
            }
        },
        {
            name: 'Color',
            type: 'singleLineText',
        },
    ]);
    
    output.markdown('⚠️ Nota: Il campo Created Time è automatico in Airtable');
    
    output.markdown('✅ Tabella creata con successo!');
    
    // Aggiungi fonti iniziali
    output.markdown('📝 Aggiungendo fonti predefinite...');
    
    const sourcesTable = base.getTable('Marketing Sources');
    
    await sourcesTable.createRecordsAsync([
        {
            fields: {
                'Name': 'Meta',
                'Description': 'Facebook e Instagram Ads tramite Meta Business Suite',
                'Active': true,
                'Color': '#1877F2',
            }
        },
        {
            fields: {
                'Name': 'Instagram',
                'Description': 'Post organici e campagne Instagram dedicate',
                'Active': true,
                'Color': '#E4405F',
            }
        },
        {
            fields: {
                'Name': 'Google',
                'Description': 'Google Ads (Search, Display, Shopping)',
                'Active': true,
                'Color': '#4285F4',
            }
        },
        {
            fields: {
                'Name': 'Sito',
                'Description': 'Lead organici dal sito web',
                'Active': true,
                'Color': '#10B981',
            }
        },
        {
            fields: {
                'Name': 'Referral',
                'Description': 'Programma referral e passaparola',
                'Active': true,
                'Color': '#F59E0B',
            }
        },
        {
            fields: {
                'Name': 'Organico',
                'Description': 'Traffico organico e altre fonti',
                'Active': true,
                'Color': '#8B5CF6',
            }
        },
    ]);
    
    output.markdown('✅ Aggiunte 6 fonti predefinite');
    output.markdown('');
    output.markdown('🎉 **Setup completato!**');
    output.markdown('');
    output.markdown('**IMPORTANTE:** Ora devi aggiornare i campi "Fonte" nelle tabelle esistenti:');
    output.markdown('1. Vai nella tabella **Leads**');
    output.markdown('2. Modifica il campo "Provenienza" da Single Select a **Linked Record** → Marketing Sources');
    output.markdown('3. Ripeti per la tabella **Marketing Costs** campo "Fonte"');
    output.markdown('');
    output.markdown('Oppure esegui lo script di migrazione automatica (vedi documentazione).');
}
