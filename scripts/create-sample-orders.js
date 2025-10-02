#!/usr/bin/env node

/**
 * Script per creare ordini di esempio con tutti i campi necessari
 * per testare le statistiche della dashboard
 */

const https = require('https');
const path = require('path');

function getCredentials() {
  require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
  return {
    apiKey: process.env.AIRTABLE_API_KEY,
    baseId: process.env.AIRTABLE_BASE_ID,
    ordersTableId: 'tblkqfCMabBpVD1fP', // ID della tabella Orders
    leadsTableId: 'tblKIZ9CDjcQorONA' // ID della tabella Leads
  };
}

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.error?.message || JSON.stringify(parsed)}`));
          }
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Ottieni alcuni lead ID per collegare gli ordini
async function getLeadsIds(apiKey, baseId, leadsTableId, count = 5) {
  console.log('🔍 Fetching lead IDs...');
  
  const response = await request({
    hostname: 'api.airtable.com',
    path: `/v0/${baseId}/${leadsTableId}?maxRecords=${count}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });
  
  const leadIds = response.records.map(record => record.id);
  console.log(`✅ Found ${leadIds.length} lead IDs:`, leadIds);
  
  return leadIds;
}

async function createSampleOrders(apiKey, baseId, ordersTableId, leadIds) {
  const sampleOrders = [
    {
      ID_Lead: [leadIds[0]],
      Data_Ordine: '2025-01-13',
      Stato_Ordine: 'Confermato',
      Stato_Pagamento: 'Pagamento_Parziale',
      Modalita_Pagamento: 'Bonifico',
      Totale_Lordo: 1200.00,
      Totale_Sconto: 120.00,
      Totale_Finale: 1080.00,
      Percentuale_Sconto: 10.0,
      Note_Cliente: 'Ordine materasso matrimoniale con topper',
      Note_Interne: 'Cliente preferenziale - sconto 10%'
    },
    {
      ID_Lead: [leadIds[1] || leadIds[0]],
      Data_Ordine: '2025-01-12', 
      Stato_Ordine: 'In_Produzione',
      Stato_Pagamento: 'Pagato',
      Modalita_Pagamento: 'Carta_Credito',
      Totale_Lordo: 850.00,
      Totale_Finale: 850.00,
      Note_Cliente: 'Materasso singolo memory foam',
      Note_Interne: 'Richiesta consegna urgente'
    },
    {
      ID_Lead: [leadIds[2] || leadIds[0]],
      Data_Ordine: '2025-01-11',
      Stato_Ordine: 'Spedito', 
      Stato_Pagamento: 'Pagato',
      Modalita_Pagamento: 'Bonifico',
      Totale_Lordo: 2200.00,
      Totale_Sconto: 330.00,
      Totale_Finale: 1870.00,
      Percentuale_Sconto: 15.0,
      Note_Cliente: 'Set completo letto matrimoniale con rete',
      Codice_Tracking: 'SDA123456789'
    },
    {
      ID_Lead: [leadIds[3] || leadIds[0]],
      Data_Ordine: '2025-01-10',
      Stato_Ordine: 'Consegnato',
      Stato_Pagamento: 'Pagato', 
      Modalita_Pagamento: 'Contanti',
      Totale_Lordo: 650.00,
      Totale_Finale: 650.00,
      Note_Cliente: 'Cuscino ergonomico cervicale'
    },
    {
      ID_Lead: [leadIds[4] || leadIds[0]],
      Data_Ordine: '2025-01-09',
      Stato_Ordine: 'Consegnato', 
      Stato_Pagamento: 'Pagato',
      Modalita_Pagamento: 'Finanziamento',
      Totale_Lordo: 1500.00,
      Totale_Finale: 1500.00,
      Note_Cliente: 'Materasso lattice con sistema motorizzato',
      Finanziamento_Richiesto: true,
      Numero_Rate: 12,
      Tasso_Interesse: 3.5
    },
    {
      ID_Lead: [leadIds[0]],
      Data_Ordine: '2025-01-08',
      Stato_Ordine: 'Bozza',
      Stato_Pagamento: 'Non_Pagato',
      Totale_Lordo: 420.00,
      Totale_Finale: 420.00,
      Note_Cliente: 'Preventivo topper singolo',
      Note_Interne: 'In attesa di conferma cliente'
    },
    {
      ID_Lead: [leadIds[1] || leadIds[0]], 
      Data_Ordine: '2025-01-07',
      Stato_Ordine: 'Annullato',
      Stato_Pagamento: 'Rimborsato',
      Modalita_Pagamento: 'Carta_Credito',
      Totale_Lordo: 750.00,
      Totale_Finale: 750.00,
      Note_Cliente: 'Materasso king size',
      Note_Interne: 'Cliente ha cambiato idea - rimborso effettuato'
    }
  ];

  console.log(`\n📝 Creating ${sampleOrders.length} sample orders...`);

  const createdOrders = [];
  
  for (let i = 0; i < sampleOrders.length; i++) {
    const orderData = sampleOrders[i];
    
    try {
      console.log(`\n${i + 1}. Creating order: ${orderData.Note_Ordine}`);
      console.log(`   Stato: ${orderData.Stato_Ordine}, Pagamento: ${orderData.Stato_Pagamento}`);
      console.log(`   Totale: €${orderData.Totale_Finale}`);
      
      const response = await request({
        hostname: 'api.airtable.com',
        path: `/v0/${baseId}/${ordersTableId}`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }, {
        fields: orderData
      });
      
      createdOrders.push(response);
      console.log(`   ✅ Created order: ${response.id}`);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`   ❌ Error creating order ${i + 1}:`, error.message);
    }
  }
  
  return createdOrders;
}

async function main() {
  console.log('🛍️  Creating Sample Orders');
  console.log('==========================\n');

  const { apiKey, baseId, ordersTableId, leadsTableId } = getCredentials();
  
  if (!apiKey || !baseId) {
    throw new Error('❌ Missing credentials in .env.local');
  }

  console.log(`✅ Credentials OK - Base: ${baseId.substring(0, 8)}...`);

  // Get some lead IDs to link orders to
  const leadIds = await getLeadsIds(apiKey, baseId, leadsTableId, 5);
  
  if (leadIds.length === 0) {
    throw new Error('❌ No leads found to link orders to. Create some leads first.');
  }

  // Create sample orders
  const createdOrders = await createSampleOrders(apiKey, baseId, ordersTableId, leadIds);
  
  console.log('\n🎉 SAMPLE ORDERS CREATED!');
  console.log(`\n📊 Summary:`);
  console.log(`✅ Successfully created: ${createdOrders.length} orders`);
  
  // Show breakdown by status
  const byStatus = {};
  const byPayment = {};
  let totalValue = 0;
  
  createdOrders.forEach(order => {
    const stato = order.fields.Stato_Ordine || 'Unknown';
    const pagamento = order.fields.Stato_Pagamento || 'Unknown'; 
    const totale = order.fields.Totale_Finale || 0;
    
    byStatus[stato] = (byStatus[stato] || 0) + 1;
    byPayment[pagamento] = (byPayment[pagamento] || 0) + 1;
    totalValue += totale;
  });
  
  console.log('\n📈 Breakdown by Status:');
  Object.entries(byStatus).forEach(([status, count]) => {
    console.log(`   ${status}: ${count} orders`);
  });
  
  console.log('\n💳 Breakdown by Payment Status:');
  Object.entries(byPayment).forEach(([payment, count]) => {
    console.log(`   ${payment}: ${count} orders`);
  });
  
  console.log(`\n💰 Total Order Value: €${totalValue.toFixed(2)}`);
  console.log(`💰 Average Order Value: €${(totalValue / createdOrders.length).toFixed(2)}`);
  
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Refresh your orders dashboard to see the new data');
  console.log('2. The OrdersStats component should now show meaningful numbers');
  console.log('3. Test the orders page at http://localhost:3000/orders');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };