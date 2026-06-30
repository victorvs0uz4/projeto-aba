import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { slugFromHostname, TENANT_HEADER } from '@/lib/tenant';

export async function middleware(req: NextRequest) {
  // 1. Resolve tenant slug from subdomain; fall back to env var for local dev.
  const hostname = req.headers.get('host') ?? '';
  const slug = slugFromHostname(hostname) ?? process.env.CLINIC_SLUG ?? null;

  const requestHeaders = new Headers(req.headers);
  if (slug) requestHeaders.set(TENANT_HEADER, slug);

  const { pathname } = req.nextUrl;

  // 2. Non-dashboard routes just get the tenant header injected.
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // 3. Auth check for dashboard routes.
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (token.mustChangePassword && pathname !== '/primeiro-acesso') {
    return NextResponse.redirect(new URL('/primeiro-acesso', req.url));
  }

  const adminRoutes = [
    '/dashboard/profissionais',
    '/dashboard/pacientes',
    '/dashboard/salas',
    '/dashboard/configuracoes',
  ];

  if (adminRoutes.some((r) => pathname.startsWith(r)) && token.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Run on every route except Next.js internals and static files.
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
