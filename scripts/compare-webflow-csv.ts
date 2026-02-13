#!/usr/bin/env tsx
/**
 * Compare Webflow CSV (pre-parsed to JSON) with CRM DB (Postgres)
 * Usage:
 *   dotenv -e .env.vercel -- tsx scripts/compare-webflow-csv.ts tmp/webflow.json tmp/webflow-missing.csv
 */

import fs from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';
import dotenv from 'dotenv';
// Load env from local .env.vercel if present (fallback to process.env)
dotenv.config({ path: '.env.vercel' });

function normalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  let s = String(raw).trim();
  s = s.replace(/[^\d+]/g, '');
  if (s.startsWith('0039')) s = '+39' + s.slice(4);
  if (!s.startsWith('+')) {
    if (s.startsWith('39')) s = '+' + s;
    else if (/^[03]/.test(s)) s = '+39' + s;
  }
  return s || null;
}

function lower(s?: string | null): string | null {
  if (!s) return null;
  const t = s.trim();
  return t ? t.toLowerCase() : null;
}

interface WebflowItem {
  date?: string;
  ip?: string;
  scelta?: string;
  motivo?: string;
  motorizzato?: string;
  topper?: string;
  city?: string;
  nome?: string;
  cognome?: string;
  telefono_raw?: string;
  email_raw?: string;
  note?: string;
  email_lower?: string | null;
  phone_norm?: string | null;
  name_full?: string;
}

function readJson(file: string): WebflowItem[] {
  const j = fs.readFileSync(file, 'utf8');
  return JSON.parse(j);
}

async function fetchCrmKeys(): Promise<{ names: Set<string>; phones: Set<string> }>{
  let url = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
  if (!url) throw new Error('POSTGRES_URL not set');
  try {
    const u = new URL(url);
    u.searchParams.delete('sslmode');
    url = u.toString();
  } catch {}
  const pool = new Pool({ connectionString: url, max: 2, ssl: { rejectUnauthorized: false } });
  try {
    const res = await pool.query(
      `select lower(nullif(trim(name,''),'')) as name,
              replace(replace(replace(replace(coalesce(phone,''),' ',''),'-',''),'(',''),')','') as phone
         from leads`
    );
    const names = new Set<string>();
    const phones = new Set<string>();
    for (const row of res.rows) {
      const n = row.name as string | null;
      const p = normalizePhone(row.phone as string | null);
      if (n) names.add(n);
      if (p) phones.add(p);
    }
    return { names, phones };
  } finally {
    await pool.end();
  }
}

function toCsvLine(values: Array<string | null | undefined>): string {
  return values
    .map((v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    })
    .join(',');
}

async function main() {
  const [,, inputJson, outputCsv] = process.argv;
  if (!inputJson || !outputCsv) {
    console.error('Usage: tsx scripts/compare-webflow-csv.ts <input.json> <output.csv>');
    process.exit(1);
  }

  const items = readJson(path.resolve(inputJson));
  const { names, phones } = await fetchCrmKeys();

  const missing: WebflowItem[] = [];
  let matched = 0;

  for (const it of items) {
const nameLower = lower(((it.nome || '') + ' ' + (it.cognome || '')).trim());
const name = nameLower ? nameLower.replace(/\s+/g, ' ').trim() : '';
    const phone = normalizePhone(it.telefono_raw);
    const exists = (phone && phones.has(phone)) || (!!name && names.has(name));
    if (!exists) missing.push(it); else matched++;
  }

  // Write CSV of missing rows
  const header = [
    'Date','Nome','Cognome','Telefono','Email','City','Scelta','Motivo','Motorizzato','Topper','Note'
  ];
  const lines = [header.join(',')];
  for (const m of missing) {
    lines.push(
      toCsvLine([
        m.date,
        m.nome,
        m.cognome,
        normalizePhone(m.telefono_raw),
        lower(m.email_raw),
        m.city,
        m.scelta,
        m.motivo,
        m.motorizzato,
        m.topper,
        m.note,
      ])
    );
  }
  fs.writeFileSync(path.resolve(outputCsv), lines.join('\n'));

  console.log(`Webflow rows: ${items.length}`);
  console.log(`In CRM (by phone OR name): ${matched}`);
  console.log(`Missing: ${missing.length}`);
  console.log(`Saved missing CSV → ${outputCsv}`);

  // Print full list as requested
  console.log('\nElenco NON sincronizzati (phone & name non presenti):');
  for (const m of missing) {
    const line = `- ${m.nome || ''} ${m.cognome || ''} | ${normalizePhone(m.telefono_raw) || ''} | ${lower(m.email_raw) || ''} | ${m.city || ''}`;
    console.log(line);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
