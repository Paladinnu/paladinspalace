import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { logger } from './lib/logger';

// Protect everything by default; allowlist public paths below
const PUBLIC_PREFIXES = [
  '/login',
  '/register',
  '/pending',
  '/reset',
  '/auth', // next-auth callbacks
  '/api/auth',
  '/api/password',
  '/api/register',
  '/_next', // Next.js assets
  '/favicon', '/icon', '/apple-icon',
  '/robots.txt', '/sitemap.xml'
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const requestId = req.headers.get('x-request-id') || cryptoRandom();
  // Allow the public welcome page as the first page for unauthenticated users
  if (pathname === '/') {
    const res = NextResponse.next();
    res.headers.set('x-request-id', requestId);
    applySecurityHeaders(res);
    return res;
  }
  // Convenience redirect: /account -> /profile
  if (pathname === '/account') {
    const res = NextResponse.redirect(new URL('/profile', req.url));
    res.headers.set('x-request-id', requestId);
    applySecurityHeaders(res);
    return res;
  }
  // Static uploads caching
  if (pathname.startsWith('/uploads/')) {
    const res = NextResponse.next();
    res.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.headers.set('x-request-id', requestId);
    applySecurityHeaders(res);
    return res;
  }
  // Allowlist public assets and pages
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    const res = NextResponse.next();
    res.headers.set('x-request-id', requestId);
    applySecurityHeaders(res);
    return res;
  }
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const res = NextResponse.redirect(new URL('/login', req.url));
    res.headers.set('x-request-id', requestId);
    applySecurityHeaders(res);
    logger.info('auth_redirect_login', { requestId, path: pathname });
    return res;
  }
  // Admin-only guard: restrict /admin and /api/admin/* to ADMIN role
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const role = (token as any).role;
    if (role !== 'ADMIN') {
      const res = NextResponse.redirect(new URL('/marketplace', req.url));
      res.headers.set('x-request-id', requestId);
      applySecurityHeaders(res);
      logger.info('auth_redirect_admin_only', { requestId, path: pathname, userId: (token as any).sub, role });
      return res;
    }
  }
  // Moderator+ guard: restrict /dashboard/* and /api/mod/* to MODERATOR or ADMIN
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/api/mod')) {
    const role = (token as any).role;
    if (role !== 'MODERATOR' && role !== 'ADMIN') {
      const res = NextResponse.redirect(new URL('/marketplace', req.url));
      res.headers.set('x-request-id', requestId);
      applySecurityHeaders(res);
      logger.info('auth_redirect_mod_only', { requestId, path: pathname, userId: (token as any).sub, role });
      return res;
    }
  }
  if ((token as any).status !== 'APPROVED') {
    // Authenticated but not approved: allow profile management routes
    const PENDING_ALLOWED_PREFIXES = ['/pending', '/profile', '/api/profile'];
    if (PENDING_ALLOWED_PREFIXES.some(p => pathname.startsWith(p))) {
      const res = NextResponse.next();
      res.headers.set('x-request-id', requestId);
      applySecurityHeaders(res);
      return res;
    }
    const res = NextResponse.redirect(new URL('/pending', req.url));
    res.headers.set('x-request-id', requestId);
    applySecurityHeaders(res);
    logger.info('auth_redirect_pending', { requestId, path: pathname, userId: (token as any).sub });
    return res;
  }
  // Access expiry: all non-moderators must have valid accessUntil in the future
  const role = (token as any).role;
  const accessUntil = (token as any).accessUntil ? new Date((token as any).accessUntil) : null;
  const now = new Date();
  if (role !== 'MODERATOR' && role !== 'ADMIN') {
    if (!accessUntil || accessUntil.getTime() < now.getTime()) {
      const res = NextResponse.redirect(new URL('/expired', req.url));
      res.headers.set('x-request-id', requestId);
      applySecurityHeaders(res);
      logger.info('auth_redirect_expired', { requestId, path: pathname, userId: (token as any).sub, accessUntil });
      return res;
    }
  }
  const res = NextResponse.next();
  res.headers.set('x-request-id', requestId);
  applySecurityHeaders(res);
  logger.debug('request_allowed', { requestId, path: pathname, userId: (token as any).sub });
  return res;
}

function cryptoRandom() {
  // Simple random hex (no crypto import in edge by default; Next may polyfill if node runtime)
  return Math.random().toString(16).slice(2, 12);
}

function applySecurityHeaders(res: NextResponse) {
  const strict = process.env.CSP_STRICT === '1';
  const scriptSrc = strict ? "script-src 'self'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
  const styleSrc = strict ? "style-src 'self'" : "style-src 'self' 'unsafe-inline'";
  const csp = [
    "default-src 'self'",
    scriptSrc,
    styleSrc,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'"
  ].join('; ');
  res.headers.set('Content-Security-Policy', csp);
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  res.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  return res;
}

export const config = {
  // Apply middleware to all routes except those starting with the following (negative lookahead not supported here,
  // so we list the root matcher and let the middleware early-return for public prefixes)
  matcher: ['/:path*']
};
