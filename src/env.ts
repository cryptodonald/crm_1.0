/**
 * Central environment access module.
 * All required secrets are validated at import/initialization.
 * Do NOT export secrets to client-side (no NEXT_PUBLIC secrets here).
 */

type RequiredKeys =
  | 'AIRTABLE_API_KEY'
  | 'AIRTABLE_BASE_ID'
  | 'NEXTAUTH_SECRET'
  | 'JWT_SECRET'
  | 'VERCEL_BLOB_READ_WRITE_TOKEN'
  | 'DATABASE_URL'
  | 'GOOGLE_PLACES_API_KEY'
  | 'GITHUB_TOKEN'
  | 'GITHUB_WEBHOOK_SECRET'
  | 'OPENAI_API_KEY'
  | 'ENCRYPTION_MASTER_KEY'
  | 'GOOGLE_OAUTH_CLIENT_ID'
  | 'GOOGLE_OAUTH_CLIENT_SECRET';

const requiredKeys: RequiredKeys[] = [
  'AIRTABLE_API_KEY',
  'AIRTABLE_BASE_ID',
  'NEXTAUTH_SECRET',
  'JWT_SECRET',
  'VERCEL_BLOB_READ_WRITE_TOKEN',
  'DATABASE_URL',
  'GOOGLE_PLACES_API_KEY',
  'GITHUB_TOKEN',
  'GITHUB_WEBHOOK_SECRET',
  'OPENAI_API_KEY',
  'ENCRYPTION_MASTER_KEY',
  'GOOGLE_OAUTH_CLIENT_ID',
  'GOOGLE_OAUTH_CLIENT_SECRET',
];

function mask(value: string | undefined): string {
  if (!value) return '';
  if (value.length <= 8) return '*'.repeat(4);
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

const missing: string[] = [];
const envValues: Record<string, string | undefined> = {};

for (const key of requiredKeys) {
  const v = process.env[key];
  envValues[key] = v;
  if (!v) missing.push(key);
}

if (missing.length > 0) {
  // Fail fast and do not print secret values
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}. Set them in Vercel or your environment and restart.`
  );
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  AIRTABLE_API_KEY: envValues['AIRTABLE_API_KEY']!,
  AIRTABLE_BASE_ID: envValues['AIRTABLE_BASE_ID']!,
  VERCEL_BLOB_READ_WRITE_TOKEN: envValues['VERCEL_BLOB_READ_WRITE_TOKEN']!,
  NEXTAUTH_SECRET: envValues['NEXTAUTH_SECRET']!,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || '',
  JWT_SECRET: envValues['JWT_SECRET']!,
  DATABASE_URL: envValues['DATABASE_URL']!,
  GOOGLE_PLACES_API_KEY: envValues['GOOGLE_PLACES_API_KEY']!,
  GOOGLE_OAUTH_CLIENT_ID: envValues['GOOGLE_OAUTH_CLIENT_ID']!,
  GOOGLE_OAUTH_CLIENT_SECRET: envValues['GOOGLE_OAUTH_CLIENT_SECRET']!,
  GITHUB_TOKEN: envValues['GITHUB_TOKEN']!,
  GITHUB_WEBHOOK_SECRET: envValues['GITHUB_WEBHOOK_SECRET']!,
  OPENAI_API_KEY: envValues['OPENAI_API_KEY']!,
  ENCRYPTION_MASTER_KEY: envValues['ENCRYPTION_MASTER_KEY']!,
};

export function getEnvVar(name: string, defaultValue?: string): string {
  const v = process.env[name];
  if (v !== undefined) return v;
  if (defaultValue !== undefined) return defaultValue;
  throw new Error(`Missing environment variable: ${name}`);
}

export default env;
