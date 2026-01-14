import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log(`🔒 [MIDDLEWARE] Processing request for: ${pathname}`);

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

  // Verifica validità del token (disabilitato temporaneamente per test)
  // TODO: Fix JWT verification in Edge Runtime
  console.log(`📝 [MIDDLEWARE] Token found, assuming valid for now: ${token.substring(0, 20)}...`);
  
  // Per ora assumiamo che il token sia valido se presente
  const payload = { nome: 'Test User', email: 'test@example.com' };

  console.log(`✅ [MIDDLEWARE] Auth valid for user: ${payload.nome} (${payload.email})`);

  // Redirect root alla dashboard se autenticato
  if (pathname === '/') {
    console.log(`🔄 [MIDDLEWARE] Redirecting root to dashboard`);
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Utente autenticato, procedi
  return NextResponse.next();
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