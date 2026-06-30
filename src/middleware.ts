import { NextRequest, NextResponse } from 'next/server';
import { getToken, decode } from 'next-auth/jwt';
import { slugFromHostname, TENANT_HEADER } from '@/lib/tenant';
import { SUPER_ADMIN_COOKIE } from '@/lib/super-admin-auth';

const SUPER_ADMIN_PUBLIC_PATHS = ['/super-admin/login', '/api/super-admin/login'];

export async function middleware(req: NextRequest) {
  // 1. Resolve tenant slug from subdomain; fall back to env var for local dev.
  const hostname = req.headers.get('host') ?? '';
  const slug = slugFromHostname(hostname) ?? process.env.CLINIC_SLUG ?? null;

  const requestHeaders = new Headers(req.headers);
  if (slug) requestHeaders.set(TENANT_HEADER, slug);

  const { pathname } = req.nextUrl;

  // 2. Super-admin routes are not tied to any tenant; they have their own session cookie.
  if (pathname.startsWith('/super-admin') || pathname.startsWith('/api/super-admin')) {
    if (!SUPER_ADMIN_PUBLIC_PATHS.includes(pathname)) {
      const cookieToken = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
      const secret = process.env.NEXTAUTH_SECRET;
      const decoded = cookieToken && secret ? await decode({ token: cookieToken, secret }).catch(() => null) : null;

      if (!decoded?.id) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/super-admin/login', req.url));
      }
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // 3. Non-dashboard routes just get the tenant header injected.
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // 4. Auth check for dashboard routes.
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
