import { NextRequest, NextResponse } from 'next/server';
import { getToken, decode } from 'next-auth/jwt';
import { slugFromHostname, TENANT_HEADER } from '@/lib/tenant';
import { SUPER_ADMIN_COOKIE } from '@/lib/super-admin-cookie';

const SUPER_ADMIN_PUBLIC_PATHS = ['/super-admin/login', '/api/super-admin/login'];

async function checkSuperAdminSession(req: NextRequest): Promise<boolean> {
  const cookieToken = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  const secret = process.env.NEXTAUTH_SECRET;
  if (!cookieToken || !secret) return false;
  const decoded = await decode({ token: cookieToken, secret }).catch(() => null);
  return !!decoded?.id;
}

export async function middleware(req: NextRequest) {
  const hostname = req.headers.get('host') ?? '';
  const requestHeaders = new Headers(req.headers);
  const { pathname } = req.nextUrl;

  // 1. gestao.* subdomain → super-admin panel with path rewriting.
  //    gestao.example.com/         → /super-admin
  //    gestao.example.com/login    → /super-admin/login
  //    gestao.example.com/minha-conta → /super-admin/minha-conta
  const host = hostname.split(':')[0];
  const hostParts = host.split('.');
  if (hostParts.length >= 2 && hostParts[0] === 'gestao') {
    // set-password is tenant-agnostic and must never be rewritten to /super-admin.
    if (pathname.startsWith('/set-password')) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Map pathname → super-admin pathname
    let superPath: string;
    if (pathname === '/') {
      superPath = '/super-admin';
    } else if (pathname.startsWith('/super-admin') || pathname.startsWith('/api/super-admin')) {
      superPath = pathname;
    } else if (pathname.startsWith('/api/')) {
      superPath = `/api/super-admin${pathname.slice('/api'.length)}`;
    } else {
      superPath = `/super-admin${pathname}`;
    }

    const isPublic = SUPER_ADMIN_PUBLIC_PATHS.includes(superPath);
    if (!isPublic) {
      const authed = await checkSuperAdminSession(req);
      if (!authed) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = '/super-admin/login';
        return NextResponse.redirect(loginUrl);
      }
    }

    if (superPath !== pathname) {
      const url = req.nextUrl.clone();
      url.pathname = superPath;
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // 2. Resolve tenant slug from subdomain; fall back to env var for local dev.
  const slug = slugFromHostname(hostname) ?? process.env.CLINIC_SLUG ?? null;
  if (slug) requestHeaders.set(TENANT_HEADER, slug);

  // 3. Super-admin routes via direct path (local dev without gestao subdomain).
  if (pathname.startsWith('/super-admin') || pathname.startsWith('/api/super-admin')) {
    if (!SUPER_ADMIN_PUBLIC_PATHS.includes(pathname)) {
      const authed = await checkSuperAdminSession(req);
      if (!authed) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/super-admin/login', req.url));
      }
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // 4. Non-dashboard routes just get the tenant header injected.
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // 5. Auth check for dashboard routes.
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
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
