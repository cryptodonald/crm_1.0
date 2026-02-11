import { NextResponse } from 'next/server';
import { env } from '@/env';
import { isCacheAvailable } from '@/lib/cache';
import { testConnection } from '@/lib/postgres';

/**
 * Health Check Endpoint
 * 
 * Validates:
 * - Environment variables loaded
 * - Postgres connectivity
 * - Redis/KV connection
 * - JWT secrets configured
 * 
 * Returns 200 if all OK, 500 with details if any check fails.
 */

export async function GET() {
  const checks: Record<string, { status: 'ok' | 'error'; message?: string }> = {};

  // Check 1: Environment variables
  try {
    checks.env = {
      status: 'ok',
      message: 'Environment variables validated',
    };
  } catch (error: unknown) {
    checks.env = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Check 2: Postgres Database
  try {
    await testConnection();
    checks.database = {
      status: 'ok',
      message: 'Postgres connection OK',
    };
  } catch (error: unknown) {
    checks.database = {
      status: 'error',
      message: `Postgres error: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }

  // Check 3: Redis/KV connection
  try {
    const cacheAvailable = isCacheAvailable();
    checks.cache = {
      status: cacheAvailable ? 'ok' : 'error',
      message: cacheAvailable ? 'Redis KV available' : 'Redis KV not configured (optional)',
    };
  } catch (error: unknown) {
    checks.cache = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Check 4: JWT Secret
  try {
    if (env.JWT_SECRET && env.JWT_SECRET.length >= 32) {
      checks.jwt = {
        status: 'ok',
        message: 'JWT secret configured',
      };
    } else {
      checks.jwt = {
        status: 'error',
        message: 'JWT secret missing or too short',
      };
    }
  } catch (error: unknown) {
    checks.jwt = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Check 5: NextAuth Secret
  try {
    if (env.NEXTAUTH_SECRET && env.NEXTAUTH_SECRET.length >= 32) {
      checks.nextauth = {
        status: 'ok',
        message: 'NextAuth secret configured',
      };
    } else {
      checks.nextauth = {
        status: 'error',
        message: 'NextAuth secret missing or too short',
      };
    }
  } catch (error: unknown) {
    checks.nextauth = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Determine overall status
  const allOk = Object.values(checks).every((check) => check.status === 'ok');
  const status = allOk ? 200 : 500;

  return NextResponse.json(
    {
      status: allOk ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
      version: '2.0.0',
    },
    { status }
  );
}
