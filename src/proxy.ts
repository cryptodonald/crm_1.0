/**
 * Next.js Proxy — Security Layer
 * 
 * Protects all /api/* routes with:
 * 1. JWT auth verification (via NextAuth getToken)
 * 2. Rate limiting on auth endpoints (brute-force protection)
 * 
 * Public paths (no JWT required):
 * - /api/auth/*       → NextAuth handles its own auth
 * - /api/health       → Public health check
 * - /api/webhooks/*   → Own signature verification
 * - /api/cron/*       → Uses CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ============================================================================
// Configuration
// ============================================================================

/** Paths that don't require JWT authentication */
const PUBLIC_API_PATHS = [
  '/api/auth',
  '/api/health',
  '/api/webhooks',
  '/api/cron',
];

// ============================================================================
// Rate Limiter (lazy singleton for auth endpoints)
// ============================================================================

let _authLimiter: Ratelimit | null | undefined;

function getAuthLimiter(): Ratelimit | null {
  if (_authLimiter !== undefined) return _authLimiter;

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    _authLimiter = null;
    return null;
  }

  _authLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 auth requests/min per IP
    prefix: '@ratelimit:auth',
  });

  return _authLimiter;
}

/** Extract client IP from request headers */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'anonymous'
  );
}

// ============================================================================
// Proxy
// ============================================================================

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /api/* routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // ─── Rate limit auth POST requests ───────────────────────────────
  // Protects login, forgot-password, reset-password from brute force
  if (pathname.startsWith('/api/auth') && request.method === 'POST') {
    const limiter = getAuthLimiter();
    if (limiter) {
      const ip = getClientIp(request);
      const { success, limit, remaining, reset } = await limiter.limit(`auth:${ip}`);

      if (!success) {
        return NextResponse.json(
          {
            error: 'Troppi tentativi. Riprova più tardi.',
            code: 'RATE_LIMIT_EXCEEDED',
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString(),
              'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
            },
          }
        );
      }
    }
  }

  // ─── Skip JWT check for public paths ─────────────────────────────
  if (PUBLIC_API_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // ─── JWT verification for all other API routes ───────────────────
  const token = await getToken({
    req: request,
    secret: process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return NextResponse.json(
      { error: 'Autenticazione richiesta', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

// ============================================================================
// Matcher — only run proxy on API routes
// ============================================================================

export const config = {
  matcher: '/api/:path*',
};
