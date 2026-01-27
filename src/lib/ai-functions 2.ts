/**
 * AI Functions - Function calling definitions for GPT-5.2
 * Defines available tools that the AI can call to query/modify the database
 */

import { getAirtableKey, getAirtableBaseId } from './api-keys-service';
import { TABLE_NAME_TO_ID } from './airtable-schema-generated';

// Function definitions for OpenAI function calling
export const AI_FUNCTIONS = [
  {
    type: 'function',
    function: {
      name: 'query_leads',
      description: 'Query leads dal database con filtri opzionali. Restituisce dati reali.',
      parameters: {
        type: 'object',
        properties: {
          filters: {
            type: 'object',
            properties: {
              stato: {
                type: 'string',
                description: 'Filtra per stato del lead (es: "In Negoziazione", "Qualificato", "Nuovo", "Cliente")',
              },
              nome: {
                type: 'string',
                description: 'Filtra per nome/cognome del lead',
              },
              assegnatario: {
                type: 'string',
                description: 'Filtra per assegnatario',
              },
            },
          },
          count_only: {
            type: 'boolean',
            description: 'Se true, restituisce solo il conteggio',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_activities',
      description: 'Query attività dal database con filtri opzionali. Ottieni attività di oggi, di un lead specifico, etc.',
      parameters: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            description: 'Data in formato YYYY-MM-DD. Usa "today" per oggi.',
          },
          lead_id: {
            type: 'string',
            description: 'ID del lead per filtrare le sue attività',
          },
          stato: {
            type: 'string',
            description: 'Stato dell\'attività (es: "Pianificata", "Completata")',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_activity',
      description: 'Crea una nuova attività nel database',
      parameters: {
        type: 'object',
        properties: {
          tipo: {
            type: 'string',
            description: 'Tipo di attività (Chiamata, Email, WhatsApp, Appuntamento, Follow-up)',
          },
          data: {
            type: 'string',
            description: 'Data e ora in formato ISO o "today HH:MM"',
          },
          lead_id: {
            type: 'string',
            description: 'ID del lead associato (opzionale)',
          },
          lead_name: {
            type: 'string',
            description: 'Nome del lead se non si ha l\'ID (verrà cercato)',
          },
          stato: {
            type: 'string',
            description: 'Stato: Pianificata, In corso, Completata, Annullata',
          },
          esito: {
            type: 'string',
            description: 'Esito della chiamata/contatto (se completata)',
          },
          note: {
            type: 'string',
            description: 'Note aggiuntive',
          },
        },
        required: ['tipo', 'data'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_lead_by_name',
      description: 'Cerca un lead per nome/cognome. Restituisce l\'ID e i dettagli.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nome o cognome del lead da cercare',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_lead_by_phone',
      description: 'Cerca un lead per numero di telefono. Restituisce l\'ID e i dettagli del lead.',
      parameters: {
        type: 'object',
        properties: {
          phone: {
            type: 'string',
            description: 'Numero di telefono da cercare (con o senza prefisso +39)',
          },
        },
        required: ['phone'],
      },
    },
  },
];

/**
 * Execute function calls from GPT
 */
export async function executeFunctionCall(
  functionName: string,
  args: Record<string, any>
): Promise<any> {
  console.log(`🔧 [AI Functions] Executing: ${functionName}`, args);

  const apiKey = await getAirtableKey();
  const baseId = await getAirtableBaseId();

  if (!apiKey || !baseId) {
    throw new Error('Missing Airtable credentials');
  }

  switch (functionName) {
    case 'query_leads':
      return await queryLeads(apiKey, baseId, args);
    case 'query_activities':
      return await queryActivities(apiKey, baseId, args);
    case 'create_activity':
      return await createActivity(apiKey, baseId, args);
    case 'search_lead_by_name':
      return await searchLeadByName(apiKey, baseId, args);
    case 'search_lead_by_phone':
      return await searchLeadByPhone(apiKey, baseId, args);
    default:
      throw new Error(`Unknown function: ${functionName}`);
  }
}

async function queryLeads(apiKey: string, baseId: string, args: any) {
  const tableId = TABLE_NAME_TO_ID['lead'];
  let filterFormula = '';

  // Build Airtable filter
  const filters = [];
  if (args.filters?.stato) {
    filters.push(`{Stato} = "${args.filters.stato}"`);
  }
  if (args.filters?.nome) {
    const searchName = args.filters.nome;
    const searchLower = searchName.toLowerCase();
    // Lead table has only Nome field, no Cognome
    filters.push(`OR(FIND("${searchLower}", LOWER({Nome})), FIND("${searchName}", {Nome}))`);
  }

  if (filters.length > 0) {
    filterFormula = filters.length === 1 ? filters[0] : `AND(${filters.join(', ')})`;
  }

  const url = `https://api.airtable.com/v0/${baseId}/${tableId}${filterFormula ? `?filterByFormula=${encodeURIComponent(filterFormula)}` : ''}`;
  
  console.log('🔍 [queryLeads] Filter formula:', filterFormula);
  console.log('🔍 [queryLeads] URL:', url);

  // Fetch ALL records with pagination
  let allRecords: any[] = [];
  let offset: string | undefined = undefined;
  
  do {
    const paginatedUrl = offset 
      ? `${url}${url.includes('?') ? '&' : '?'}offset=${offset}`
      : url;
    
    const response = await fetch(paginatedUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('❌ [queryLeads] Airtable error:', data.error);
      break;
    }
    
    allRecords = allRecords.concat(data.records || []);
    offset = data.offset;
    
    console.log(`🔍 [queryLeads] Fetched ${data.records?.length || 0} records, total: ${allRecords.length}${offset ? ', continuing...' : ''}`);
  } while (offset);
  
  console.log('✅ [queryLeads] Total records found:', allRecords.length);
  const records = allRecords;

  if (args.count_only) {
    return { count: records.length, message: `Hai ${records.length} lead${args.filters?.stato ? ` in stato "${args.filters.stato}"` : ''}` };
  }

  return {
    count: records.length,
    records: records.slice(0, 10).map((r: any) => ({
      id: r.id,
      nome: r.fields.Nome,
      cognome: r.fields.Cognome,
      stato: r.fields.Stato,
      telefono: r.fields.Telefono,
    })),
  };
}

async function queryActivities(apiKey: string, baseId: string, args: any) {
  const tableId = TABLE_NAME_TO_ID['activity'];
  
  const filters = [];
  if (args.date === 'today') {
    const today = new Date().toISOString().split('T')[0];
    filters.push(`IS_SAME({Data}, "${today}", "day")`);
  }

  const filterFormula = filters.length > 0 ? filters.join(', ') : '';
  const url = `https://api.airtable.com/v0/${baseId}/${tableId}${filterFormula ? `?filterByFormula=${encodeURIComponent(filterFormula)}` : ''}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  const data = await response.json();
  const records = data.records || [];

  return {
    count: records.length,
    activities: records.map((r: any) => ({
      titolo: r.fields.Titolo || r.fields.Tipo,
      tipo: r.fields.Tipo,
      stato: r.fields.Stato,
      lead: r.fields['Nome Lead'],
      data: r.fields.Data,
    })),
  };
}

async function createActivity(apiKey: string, baseId: string, args: any) {
  const tableId = TABLE_NAME_TO_ID['activity'];

  // Parse date
  let dataISO = args.data;
  if (args.data.startsWith('today')) {
    const time = args.data.split(' ')[1] || '12:00';
    const today = new Date().toISOString().split('T')[0];
    dataISO = `${today}T${time}:00.000Z`;
  }

  const fields: any = {
    Tipo: args.tipo,
    Data: dataISO,
    Stato: args.stato || 'Pianificata',
    Tenant_ID: 'tenant_doctorbed',
  };

  if (args.esito) fields.Esito = args.esito;
  if (args.note) fields.Note = args.note;
  if (args.lead_id) fields['ID Lead'] = [args.lead_id];

  const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  const result = await response.json();
  return { success: true, activity_id: result.id, message: `Attività "${args.tipo}" creata con successo` };
}

async function searchLeadByName(apiKey: string, baseId: string, args: any) {
  const tableId = TABLE_NAME_TO_ID['lead'];
  const searchName = args.name;
  const searchLower = searchName.toLowerCase();
  // Lead table has only Nome field, no Cognome  
  const filterFormula = `OR(FIND("${searchLower}", LOWER({Nome})), FIND("${searchName}", {Nome}))`;

  const url = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula=${encodeURIComponent(filterFormula)}`;

  // Fetch ALL records with pagination
  let allRecords: any[] = [];
  let offset: string | undefined = undefined;
  
  do {
    const paginatedUrl = offset ? `${url}&offset=${offset}` : url;
    
    const response = await fetch(paginatedUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const data = await response.json();
    
    if (data.error) break;
    
    allRecords = allRecords.concat(data.records || []);
    offset = data.offset;
  } while (offset);
  
  const records = allRecords;

  if (records.length === 0) {
    return { found: false, message: `Nessun lead trovato con nome "${args.name}"` };
  }

  return {
    found: true,
    count: records.length,
    leads: records.map((r: any) => ({
      id: r.id,
      nome: r.fields.Nome,
      telefono: r.fields.Telefono,
      stato: r.fields.Stato,
    })),
  };
}

async function searchLeadByPhone(apiKey: string, baseId: string, args: any) {
  const tableId = TABLE_NAME_TO_ID['lead'];
  
  // Normalize phone number - remove spaces, dashes, parentheses, +
  const normalizePhone = (phone: string) => {
    return phone.replace(/[\s\-\(\)\+]/g, '');
  };
  
  const searchPhone = normalizePhone(args.phone);
  
  // Get last 9-10 digits (Italian mobile numbers)
  const lastDigits = searchPhone.slice(-10);
  
  // Search for the phone number in any format
  // We search for the digits appearing in the Telefono field
  const filterFormula = `FIND("${lastDigits}", SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE({Telefono}, " ", ""), "-", ""), "(", ""), ")", ""))`;
  
  
  console.log('📞 [searchLeadByPhone] Searching phone:', searchPhone);
  console.log('📞 [searchLeadByPhone] Filter:', filterFormula);
  
  const url = `https://api.airtable.com/v0/${baseId}/${tableId}?filterByFormula=${encodeURIComponent(filterFormula)}`;

  // Fetch ALL records with pagination
  let allRecords: any[] = [];
  let offset: string | undefined = undefined;
  
  do {
    const paginatedUrl = offset ? `${url}&offset=${offset}` : url;
    
    const response = await fetch(paginatedUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const data = await response.json();
    
    if (data.error) {
      console.error('❌ [searchLeadByPhone] Error:', data.error);
      break;
    }
    
    allRecords = allRecords.concat(data.records || []);
    offset = data.offset;
  } while (offset);
  
  const records = allRecords;
  
  console.log('📞 [searchLeadByPhone] Records found:', records.length);

  if (records.length === 0) {
    return { found: false, message: `Nessun lead trovato con telefono "${args.phone}"` };
  }

  return {
    found: true,
    count: records.length,
    leads: records.map((r: any) => ({
      id: r.id,
      nome: r.fields.Nome,
      telefono: r.fields.Telefono,
      email: r.fields.Email,
      stato: r.fields.Stato,
      citta: r.fields['Città'],
    })),
  };
}
