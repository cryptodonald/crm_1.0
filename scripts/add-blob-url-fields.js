#!/usr/bin/env node

/**
 * Script per aggiungere campi URL blob alle tabelle Orders esistenti
 * Come per avatar, usiamo Vercel Blob + campi URL invece di attachment nativi
 */

const https = require('https');
const path = require('path');

function getCredentials() {
  require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
  return {
    apiKey: process.env.AIRTABLE_API_KEY,
    baseId: process.env.AIRTABLE_BASE_ID
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
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(parsed, null, 2)}`));
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

async function addBlobUrlFields() {
  const { apiKey, baseId } = getCredentials();

  // Definizione dei campi URL blob da aggiungere per ogni tabella
  const blobFields = {
    // Products - URL per immagini e documenti prodotto
    'tblEFvr3aT2jQdYUL': [
      { name: 'URL_Immagine_Principale', type: 'url' },
      { name: 'URL_Immagini_Galleria', type: 'multilineText' }, // JSON array di URL
      { name: 'URL_Scheda_Tecnica', type: 'url' },
      { name: 'URL_Certificazioni', type: 'multilineText' }, // JSON array di URL
      { name: 'URL_Video_Prodotto', type: 'url' }
    ],
    
    // Orders - URL per documenti ordine
    'tblkqfCMabBpVD1fP': [
      { name: 'URL_Contratto', type: 'url' },
      { name: 'URL_Documenti_Cliente', type: 'multilineText' }, // JSON array
      { name: 'URL_Preventivo', type: 'url' },
      { name: 'URL_Documenti_Spedizione', type: 'multilineText' }, // JSON array
      { name: 'URL_Foto_Consegna', type: 'multilineText' } // JSON array
    ],
    
    // Order_Items - URL per configurazioni e rendering
    'tblxzhMCa5UJOMZqC': [
      { name: 'URL_Rendering_3D', type: 'url' },
      { name: 'URL_Configurazione_Visual', type: 'url' },
      { name: 'URL_Schemi_Misure', type: 'multilineText' }, // JSON array
      { name: 'URL_Anteprima_Prodotto', type: 'url' }
    ],
    
    // Payment_Transactions - URL per ricevute e documenti
    'tbl2bzbSxMDch72CY': [
      { name: 'URL_Ricevuta', type: 'url' },
      { name: 'URL_Screenshot_Gateway', type: 'url' },
      { name: 'URL_Documento_Rimborso', type: 'url' },
      { name: 'URL_Bonifico_Prova', type: 'url' }
    ],

    // Commission_Payments - URL per documenti commissioni
    'tblbn6gRCwpmYICdZ': [
      { name: 'URL_Ricevuta_Commissione', type: 'url' },
      { name: 'URL_Documento_Pagamento', type: 'url' }
    ]
  };

  console.log('🛠️  Aggiungendo campi URL blob alle tabelle Orders...\n');

  const tableNames = {
    'tblEFvr3aT2jQdYUL': 'Products',
    'tblkqfCMabBpVD1fP': 'Orders', 
    'tblxzhMCa5UJOMZqC': 'Order_Items',
    'tbl2bzbSxMDch72CY': 'Payment_Transactions',
    'tblbn6gRCwpmYICdZ': 'Commission_Payments'
  };

  for (const [tableId, fields] of Object.entries(blobFields)) {
    console.log(`📎 Aggiornamento ${tableNames[tableId]} (${tableId})...`);
    
    for (const field of fields) {
      try {
        const response = await request({
          hostname: 'api.airtable.com',
          path: `/v0/meta/bases/${baseId}/tables/${tableId}/fields`,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }, field);
        
        console.log(`  ✅ Aggiunto: ${field.name} (${field.type})`);
        
        // Pausa per evitare rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`  ❌ Errore per ${field.name}:`, error.message);
      }
    }
    
    console.log('');
  }
  
  console.log('🎉 Campi URL blob aggiunti con successo!');
  console.log('\n📋 UTILIZZO:');
  console.log('• URL singoli: per documenti/immagini principali');
  console.log('• multilineText: per JSON array di più URL');
  console.log('• Compatibile con Vercel Blob come avatar');
  console.log('\n🔗 Esempio JSON per campi multipli:');
  console.log(`[
  "https://blob.vercel.com/doc1.pdf",
  "https://blob.vercel.com/doc2.pdf"
]`);
}

addBlobUrlFields();