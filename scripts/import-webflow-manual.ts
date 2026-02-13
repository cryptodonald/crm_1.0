#!/usr/bin/env tsx
/**
 * Import a curated list of Webflow leads into CRM (Postgres)
 * - Dedup rule: if phone OR full name (case-insensitive) already exists → skip
 * - Source: Sito (fixed source_id)
 * - Status: Nuovo
 *
 * Usage:
 *   tsx scripts/import-webflow-manual.ts
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.vercel' });

const SITO_SOURCE_ID = 'bb9111b7-d513-4388-8b3c-4bc86967828b';

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(?:^|[\s'])\S/g, (ch) => ch.toUpperCase());
}

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

// ──────────────────────────────────────────────────────────────────────────────
// Input list (ONLY the requested leads)
// name | phone | email | city
// ──────────────────────────────────────────────────────────────────────────────
const INPUT: Array<{ name: string; phone: string; email: string; city: string }> = [
  { name: 'Aurora Mondani', phone: '+393337140766', email: 'jei.guidi2001@gmail.com', city: 'Ravenna' },
  { name: 'Jennifer Guidi', phone: '+393337140766', email: 'guidi.jennifer2001@gmail.com', city: 'Ravenna' },
  { name: 'Chiara Vulpinari', phone: '+393489686120', email: 'vulpinaric@gmail.com', city: 'Longiano' },
  { name: 'Mirco Brolli', phone: '+393315777930', email: 'mircobrolli@libero.it', city: 'Verucchio' },
  { name: 'Noemi De Biagi', phone: '+393317681693', email: 'ndebiagi@gmail.com', city: 'San Marino' },
  { name: 'Veronica Casadei', phone: '+393334400781', email: 'veri.1997@icloud.com', city: 'San Marino' },
  { name: 'Angelo', phone: '+393349881087', email: 'palillo89@hotmail.it', city: 'Pesaro' },
  { name: 'Silvia Toma', phone: '+393396985001', email: 'silvia.toma81@gmail.com', city: 'Santarcangelo di Romagna' },
  { name: 'Cristina Migani', phone: '+393397168578', email: 'migani74@gmail.com', city: 'San Marino' },
  { name: 'Andrea', phone: '+393386738379', email: 'andreazafferani@alice.sm', city: 'San Marino' },
  { name: 'Franco Palladino', phone: '+393406832732', email: 'fislex@gmail.com', city: 'FRATTAMAGGIORE (80027)' },
  { name: 'Ersilia De Ioanna', phone: '+393391724643', email: 'ersilia.deioanna@gmail.com', city: 'Giulianova' },
];

function buildPool(): Pool {
  let url = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
  if (!url) throw new Error('POSTGRES_URL not set');
  try {
    const u = new URL(url);
    u.searchParams.delete('sslmode');
    url = u.toString();
  } catch {}
  return new Pool({ connectionString: url, max: 2, ssl: { rejectUnauthorized: false } });
}

async function fetchExisting(pool: Pool) {
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
}

async function insertLead(pool: Pool, lead: { name: string; phone: string | null; email: string | null; city: string | null }) {
  const sql = `
    INSERT INTO leads (name, phone, email, city, source_id, status, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, 'Nuovo', NOW(), NOW())
    RETURNING id
  `;
  const { rows } = await pool.query(sql, [lead.name, lead.phone, lead.email, lead.city, SITO_SOURCE_ID]);
  return rows[0]?.id as string;
}

async function main() {
  const pool = buildPool();
  try {
    const { names, phones } = await fetchExisting(pool);

    const results: Array<{ name: string; phone: string | null; email: string | null; city: string | null; status: 'created'|'skipped-duplicate' }>=[];

    for (const raw of INPUT) {
      const name = toTitleCase(raw.name);
      const phone = normalizePhone(raw.phone);
      const email = lower(raw.email);
      const city = toTitleCase(raw.city);

      const nameKey = lower(name) || '';
      const exists = (phone && phones.has(phone)) || (nameKey && names.has(nameKey));

      if (exists) {
        results.push({ name, phone, email, city, status: 'skipped-duplicate' });
        continue;
      }

      const id = await insertLead(pool, { name, phone, email, city });
      // Track to avoid re-insert within batch
      if (phone) phones.add(phone);
      if (nameKey) names.add(nameKey);
      results.push({ name, phone, email, city, status: 'created' });
      console.log(`Created lead ${id} — ${name}`);
    }

    const created = results.filter(r => r.status==='created').length;
    const skipped = results.length - created;
    console.log(`\nDone. Created: ${created}, Skipped (duplicates): ${skipped}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
