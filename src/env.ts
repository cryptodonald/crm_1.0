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
  // PostgreSQL (Supabase) - REQUIRED
  // ========================================
  POSTGRES_URL: z.string().min(1, 'POSTGRES_URL is required'),
  POSTGRES_URL_NON_POOLING: z.string().min(1, 'POSTGRES_URL_NON_POOLING is required'),
  POSTGRES_PRISMA_URL: z.string().optional(),

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
  // Redis/KV (Upstash) - REQUIRED for caching
  // ========================================
  KV_URL: z.string().url('KV_URL is required'),
  KV_REST_API_URL: z.string().url('KV_REST_API_URL is required'),
  KV_REST_API_TOKEN: z.string().min(1, 'KV_REST_API_TOKEN is required'),
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
  NEXT_PUBLIC_GOOGLE_MAPS_API: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(), // Backwards compatibility
  GOOGLE_PLACES_API_KEY: z.string().optional(),

  // ========================================
  // Meta Lead Ads (OPTIONAL)
  // ========================================
  META_APP_SECRET: z.string().optional(),
  META_PAGE_ACCESS_TOKEN: z.string().optional(),
  META_VERIFY_TOKEN: z.string().optional(),
  META_SOURCE_ID: z.string().uuid().optional(),

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
