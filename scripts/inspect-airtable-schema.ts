/**
 * Script per ispezionare lo schema completo del database Airtable
 * 
 * Esegui con: npx tsx scripts/inspect-airtable-schema.ts
 */

import Airtable from 'airtable';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Carica .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Configurazione
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('❌ Errore: AIRTABLE_API_KEY e AIRTABLE_BASE_ID devono essere definiti in .env.local');
  process.exit(1);
}

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

// Tabelle da ispezionare
const TABLES = {
  Leads: process.env.AIRTABLE_LEADS_TABLE_ID || 'tblKIZ9CDjcQorONA',
  Activities: process.env.AIRTABLE_ACTIVITIES_TABLE_ID || 'tblbcuRXKrWvne0Wy',
  Orders: process.env.AIRTABLE_ORDERS_TABLE_ID || 'tblkqfCMabBpVD1fP',
  Products: process.env.AIRTABLE_PRODUCTS_TABLE_ID || 'tblEFvr3aT2jQdYUL',
  Users: process.env.AIRTABLE_USERS_TABLE_ID || 'tbl141xF7ZQskCqGh',
  Marketing_Sources: process.env.AIRTABLE_MARKETING_SOURCES_TABLE_ID || 'tblXyEscyPcP8TMLG',
};

interface FieldInfo {
  name: string;
  type: string;
  sampleValue?: any;
  linkedTable?: string;
}

interface TableSchema {
  tableName: string;
  tableId: string;
  recordCount: number;
  fields: FieldInfo[];
  sampleRecords: any[];
}

async function inspectTable(tableName: string, tableId: string): Promise<TableSchema> {
  console.log(`\n🔍 Ispezionando tabella: ${tableName} (${tableId})`);
  
  try {
    const records = await base(tableId).select({ maxRecords: 5 }).all();
    
    console.log(`   ✅ Trovati ${records.length} record`);
    
    // Analizza campi dal primo record
    const fields: FieldInfo[] = [];
    if (records.length > 0) {
      const firstRecord = records[0].fields;
      for (const [fieldName, value] of Object.entries(firstRecord)) {
        const fieldInfo: FieldInfo = {
          name: fieldName,
          type: getFieldType(value),
          sampleValue: truncateSample(value),
        };
        
        // Se è un array, potrebbe essere un linked record
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string' && value[0].startsWith('rec')) {
          fieldInfo.linkedTable = 'Unknown (linked record)';
        }
        
        fields.push(fieldInfo);
      }
    }
    
    return {
      tableName,
      tableId,
      recordCount: records.length,
      fields,
      sampleRecords: records.map(r => ({
        id: r.id,
        fields: r.fields,
      })),
    };
  } catch (error: any) {
    console.error(`   ❌ Errore ispezionando ${tableName}:`, error.message);
    return {
      tableName,
      tableId,
      recordCount: 0,
      fields: [],
      sampleRecords: [],
    };
  }
}

function getFieldType(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'array (empty)';
    const firstType = typeof value[0];
    if (firstType === 'string' && value[0].startsWith('rec')) {
      return 'array<linked_record>';
    }
    return `array<${firstType}>`;
  }
  if (typeof value === 'object') return 'object';
  return typeof value;
}

function truncateSample(value: any): any {
  if (typeof value === 'string' && value.length > 50) {
    return value.slice(0, 50) + '...';
  }
  if (Array.isArray(value) && value.length > 3) {
    return [...value.slice(0, 3), `... +${value.length - 3} more`];
  }
  return value;
}

async function main() {
  console.log('🚀 Inizio ispezione schema Airtable\n');
  console.log(`📊 Base ID: ${AIRTABLE_BASE_ID}`);
  
  const schemas: TableSchema[] = [];
  
  for (const [tableName, tableId] of Object.entries(TABLES)) {
    const schema = await inspectTable(tableName, tableId);
    schemas.push(schema);
  }
  
  // Genera report markdown
  const markdown = generateMarkdownReport(schemas);
  
  // Salva report
  const outputPath = path.join(__dirname, '..', 'docs', 'AIRTABLE_SCHEMA.md');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, markdown, 'utf-8');
  
  console.log(`\n✅ Schema salvato in: ${outputPath}`);
  
  // Salva anche JSON completo
  const jsonPath = path.join(__dirname, '..', 'docs', 'airtable-schema.json');
  fs.writeFileSync(jsonPath, JSON.stringify(schemas, null, 2), 'utf-8');
  console.log(`✅ JSON salvato in: ${jsonPath}`);
}

function generateMarkdownReport(schemas: TableSchema[]): string {
  let md = '# Airtable Database Schema\n\n';
  md += `**Last Updated**: ${new Date().toISOString()}\n\n`;
  md += `**Base ID**: ${AIRTABLE_BASE_ID}\n\n`;
  md += '---\n\n';
  
  md += '## Table of Contents\n\n';
  for (const schema of schemas) {
    md += `- [${schema.tableName}](#${schema.tableName.toLowerCase().replace(/_/g, '-')})\n`;
  }
  md += '\n---\n\n';
  
  for (const schema of schemas) {
    md += `## ${schema.tableName}\n\n`;
    md += `**Table ID**: \`${schema.tableId}\`\n\n`;
    md += `**Record Count** (sample): ${schema.recordCount}\n\n`;
    
    if (schema.fields.length > 0) {
      md += '### Fields\n\n';
      md += '| Field Name | Type | Sample Value | Notes |\n';
      md += '|------------|------|--------------|-------|\n';
      
      for (const field of schema.fields) {
        const sampleStr = JSON.stringify(field.sampleValue).slice(0, 100);
        const notes = field.linkedTable || '-';
        md += `| ${field.name} | ${field.type} | ${sampleStr} | ${notes} |\n`;
      }
      
      md += '\n';
    }
    
    if (schema.sampleRecords.length > 0) {
      md += '### Sample Record\n\n';
      md += '```json\n';
      md += JSON.stringify(schema.sampleRecords[0], null, 2);
      md += '\n```\n\n';
    }
    
    md += '---\n\n';
  }
  
  return md;
}

main().catch(console.error);
