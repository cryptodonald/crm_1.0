export { proxy as middleware } from './lib/auth-proxy';

// Config must be exported directly, not re-exported
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
