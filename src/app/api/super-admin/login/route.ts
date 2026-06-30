import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, ipFromHeaders } from '@/lib/rate-limit';
import { verifySuperAdminCredentials, createSuperAdminSessionCookie } from '@/lib/super-admin-auth';

export async function POST(req: NextRequest) {
  const { allowed, retryAfterMs } = checkRateLimit(
    `super-admin-login:${ipFromHeaders(req.headers)}`,
    10,
    15 * 60 * 1000,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'E-mail e senha são obrigatórios.' }, { status: 400 });
  }

  const superAdmin = await verifySuperAdminCredentials(email, password);
  if (!superAdmin) {
    return NextResponse.json({ error: 'E-mail ou senha incorretos.' }, { status: 401 });
  }

  await createSuperAdminSessionCookie(superAdmin);

  return NextResponse.json({ success: true });
}
