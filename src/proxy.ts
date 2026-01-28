import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { authRateLimiter, apiRateLimiter, checkRateLimit } from './lib/ratelimit';

// Route che richiedono autenticazione
const PROTECTED_ROUTES = [
  '/dashboard',
  '/leads',
  '/clients',
  '/activities',
  '/orders',
  '/reports',
  '/calendar',
  '/developers',
  '/api-keys',
  '/change-password',
  '/profile',
  '/admin',
  '/api/admin',
  '/api/user',
];

// Route pubbliche (non richiedono autenticazione)
const PUBLIC_ROUTES = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/reset-password',
  '/api/auth/set-password',
  // Registrazione rimossa - solo inviti admin
];

// API routes che sono sempre accessibili
const PUBLIC_API_ROUTES = [
  '/api/auth/',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log(`🔒 [MIDDLEWARE] Processing request for: ${pathname}`);

  // Rate limiting per auth routes (5 req/min per IP)
  if (pathname.startsWith('/api/auth/')) {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const { success, limit, remaining } = await checkRateLimit(ip, authRateLimiter);
    
    if (!success) {
      console.warn(`🚫 [MIDDLEWARE] Rate limit exceeded for auth: ${ip}`);
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { 
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
          }
        }
      );
    }
    console.log(`✅ [MIDDLEWARE] Auth API rate limit OK: ${remaining}/${limit} remaining`);
  }

  // Verifica se è una route pubblica
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    console.log(`✅ [MIDDLEWARE] Public route allowed: ${pathname}`);
    return NextResponse.next();
  }

  // Verifica se è una API pubblica
  if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
    console.log(`✅ [MIDDLEWARE] Public API allowed: ${pathname}`);
    return NextResponse.next();
  }

  // Verifica se è una route protetta
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  if (!isProtectedRoute) {
    // Route non protetta, procedi normalmente
    console.log(`✅ [MIDDLEWARE] Unprotected route: ${pathname}`);
    return NextResponse.next();
  }

  // Route protetta - verifica autenticazione
  console.log(`🔐 [MIDDLEWARE] Protected route, checking auth: ${pathname}`);

  // Estrai token dal cookie
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    console.log(`❌ [MIDDLEWARE] No auth token found, redirecting to login`);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify JWT with jose (Edge Runtime compatible)
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('❌ [MIDDLEWARE] JWT_SECRET not found in environment');
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256']
    });
    
    // Validate payload structure
    if (!payload.userId || !payload.nome) {
      console.error('❌ [MIDDLEWARE] Invalid token payload structure');
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth-token');
      return response;
    }
    
    console.log(`✅ [MIDDLEWARE] Auth verified for user: ${payload.nome} (${payload.email || 'no-email'})`);
    
    // Rate limiting per protected API routes (30 req/min per user)
    if (pathname.startsWith('/api/')) {
      const userId = payload.userId as string;
      const { success, limit, remaining } = await checkRateLimit(userId, apiRateLimiter);
      
      if (!success) {
        console.warn(`🚫 [MIDDLEWARE] API rate limit exceeded for user: ${userId}`);
        return new NextResponse(
          JSON.stringify({ error: 'Too many API requests. Please slow down.' }),
          { 
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
            }
          }
        );
      }
      console.log(`✅ [MIDDLEWARE] API rate limit OK: ${remaining}/${limit} remaining`);
    }
    
    // Add user info to request headers for API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId as string);
    requestHeaders.set('x-user-nome', payload.nome as string);
    if (payload.email) {
      requestHeaders.set('x-user-email', payload.email as string);
    }
    if (payload.ruolo) {
      requestHeaders.set('x-user-ruolo', payload.ruolo as string);
    }

    // Redirect root alla dashboard se autenticato
    if (pathname === '/') {
      console.log(`🔄 [MIDDLEWARE] Redirecting root to dashboard`);
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Utente autenticato, procedi con headers
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    
  } catch (error) {
    console.error('❌ [MIDDLEWARE] JWT verification failed:', error instanceof Error ? error.message : 'Unknown error');
    
    // Clear invalid token and redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }
}

// Configurazione matcher - definisce su quali route applicare il middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt, sitemap.xml (SEO files)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};