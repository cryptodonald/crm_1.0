import { NextResponse } from 'next/server';
import { env } from '@/env';

/**
 * DEBUG endpoint to verify environment variables are loaded
 * REMOVE IN PRODUCTION or protect with authentication
 */
export async function GET() {
  const envCheck = {
    NODE_ENV: env.NODE_ENV,
    hasAirtableKey: !!env.AIRTABLE_API_KEY,
    hasAirtableBaseId: !!env.AIRTABLE_BASE_ID,
    airtableKeyPrefix: env.AIRTABLE_API_KEY?.substring(0, 8) || 'MISSING',
    airtableBaseIdPrefix: env.AIRTABLE_BASE_ID?.substring(0, 8) || 'MISSING',
    hasJwtSecret: !!env.JWT_SECRET,
    hasNextAuthSecret: !!env.NEXTAUTH_SECRET,
    // Process.env direct check
    processEnvCheck: {
      hasAirtableKey: !!process.env.AIRTABLE_API_KEY,
      hasAirtableBaseId: !!process.env.AIRTABLE_BASE_ID,
      airtableKeyPrefix: process.env.AIRTABLE_API_KEY?.substring(0, 8) || 'MISSING',
      airtableBaseIdPrefix: process.env.AIRTABLE_BASE_ID?.substring(0, 8) || 'MISSING',
    }
  };

  return NextResponse.json(envCheck);
}
