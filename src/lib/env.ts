/**
 * Environment Variables Utilities (Simplified for deployment)
 * Basic environment variable access without Zod validation
 */

// Simple environment access without validation
export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  // Add other vars as needed without validation
  AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY || '',
  AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID || '',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET || '',
  GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY || '',
  VERCEL_BLOB_READ_WRITE_TOKEN: process.env.VERCEL_BLOB_READ_WRITE_TOKEN || '',
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
};

/**
 * Get required environment variable
 * @param name - Environment variable name
 * @returns Environment variable value
 * @throws Error if variable is not found
 */
export function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.warn(`Missing environment variable: ${name}`);
    return '';
  }
  return value;
}

/**
 * Get optional environment variable with default
 * @param name - Environment variable name
 * @param defaultValue - Default value if not found
 * @returns Environment variable value or default
 */
export function getEnvVarWithDefault(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

/**
 * Check if we're in development mode
 */
export const isDev = env.NODE_ENV === 'development';

/**
 * Check if we're in production mode
 */
export const isProd = env.NODE_ENV === 'production';

/**
 * Check if we're in test mode
 */
export const isTest = env.NODE_ENV === 'test';

/**
 * Get the base URL for the application
 */
export const getBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // Browser should use relative path
    return '';
  }
  
  if (process.env.VERCEL_URL) {
    // Reference for vercel.com
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Assume localhost
  return env.NEXT_PUBLIC_APP_URL;
};
