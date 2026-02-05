import { z } from 'zod';

/**
 * Environment Variable Validation (CRITICAL-003)
 * 
 * This file validates ALL required environment variables at startup.
 * If any variable is missing or invalid, the app will fail to start.
 * 
 * Import this file early in your app (e.g., root layout) to ensure
 * fail-fast behavior.
 */

const envSchema = z.object({
  // ========================================
  // Node Environment
  // ========================================
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // ========================================
  // Airtable (REQUIRED)
  // ========================================
  AIRTABLE_API_KEY: z.string().min(1, 'AIRTABLE_API_KEY is required'),
  AIRTABLE_BASE_ID: z.string().min(1, 'AIRTABLE_BASE_ID is required'),
  
  // Airtable Table IDs
  AIRTABLE_LEADS_TABLE_ID: z.string().min(1, 'AIRTABLE_LEADS_TABLE_ID is required'),
  AIRTABLE_ACTIVITIES_TABLE_ID: z.string().min(1, 'AIRTABLE_ACTIVITIES_TABLE_ID is required'),
  AIRTABLE_USERS_TABLE_ID: z.string().min(1, 'AIRTABLE_USERS_TABLE_ID is required'),
  AIRTABLE_PRODUCTS_TABLE_ID: z.string().min(1, 'AIRTABLE_PRODUCTS_TABLE_ID is required'),
  AIRTABLE_ORDERS_TABLE_ID: z.string().min(1, 'AIRTABLE_ORDERS_TABLE_ID is required'),
  AIRTABLE_NOTES_TABLE_ID: z.string().min(1, 'AIRTABLE_NOTES_TABLE_ID is required'),
  AIRTABLE_AUTOMATIONS_TABLE_ID: z.string().optional(),
  AIRTABLE_COLOR_PREFERENCES_TABLE_ID: z.string().min(1, 'AIRTABLE_COLOR_PREFERENCES_TABLE_ID is required'),
  
  // Developer & Task Management Tables
  AIRTABLE_DEV_ISSUES_TABLE_ID: z.string().min(1, 'AIRTABLE_DEV_ISSUES_TABLE_ID is required'),
  AIRTABLE_USER_TASKS_TABLE_ID: z.string().min(1, 'AIRTABLE_USER_TASKS_TABLE_ID is required'),
  AIRTABLE_NOTIFICATIONS_TABLE_ID: z.string().min(1, 'AIRTABLE_NOTIFICATIONS_TABLE_ID is required'),
  AIRTABLE_DEV_ISSUE_COMMENTS_TABLE_ID: z.string().min(1, 'AIRTABLE_DEV_ISSUE_COMMENTS_TABLE_ID is required'),

  // ========================================
  // Authentication (REQUIRED)
  // ========================================
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL must be a valid URL'),

  // ========================================
  // Google OAuth (REQUIRED)
  // ========================================
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1, 'GOOGLE_OAUTH_CLIENT_ID is required'),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1, 'GOOGLE_OAUTH_CLIENT_SECRET is required'),

  // ========================================
  // Vercel Blob Storage (REQUIRED)
  // ========================================
  VERCEL_BLOB_READ_WRITE_TOKEN: z.string().min(1, 'VERCEL_BLOB_READ_WRITE_TOKEN is required'),

  // ========================================
  // Redis/KV (OPTIONAL - for caching)
  // ========================================
  KV_REST_API_URL: z.string().url().optional(),
  KV_REST_API_TOKEN: z.string().optional(),
  KV_REST_API_READ_ONLY_TOKEN: z.string().optional(),

  // ========================================
  // GitHub Integration (OPTIONAL)
  // ========================================
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),

  // ========================================
  // OpenAI (OPTIONAL)
  // ========================================
  OPENAI_API_KEY: z.string().optional(),

  // ========================================
  // OpenRouter (OPTIONAL)
  // ========================================
  OPENROUTER_API_KEY: z.string().optional(),

  // ========================================
  // Encryption (OPTIONAL but recommended)
  // ========================================
  ENCRYPTION_MASTER_KEY: z.string().optional(),

  // ========================================
  // Google Maps/Places (OPTIONAL)
  // ========================================
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  GOOGLE_PLACES_API_KEY: z.string().optional(),

  // ========================================
  // Other
  // ========================================
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  DATABASE_URL: z.string().optional(), // Not used, but may be in env
});

// Parse and validate environment variables
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  throw new Error(
    'Environment variable validation failed. Please check your .env.local file.'
  );
}

// Export validated environment variables
export const env = parsed.data;

// Type-safe access to environment variables
export type Env = z.infer<typeof envSchema>;
