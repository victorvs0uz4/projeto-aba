import { cookies } from 'next/headers';
import { encode, decode, type JWT } from 'next-auth/jwt';
import { prisma } from './prisma';
import { verifyPassword } from './password';
import { SUPER_ADMIN_COOKIE } from './super-admin-cookie';

export { SUPER_ADMIN_COOKIE };
const MAX_AGE = 8 * 60 * 60; // 8 hours

interface SuperAdminPayload {
  id: string;
  email: string;
  name: string;
}

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error('NEXTAUTH_SECRET não configurado.');
  return secret;
}

export async function verifySuperAdminCredentials(email: string, password: string) {
  const superAdmin = await prisma.superAdmin.findUnique({ where: { email } });
  if (!superAdmin) return null;

  const isValid = await verifyPassword(superAdmin.passwordHash, password);
  if (!isValid) return null;

  return { id: superAdmin.id, email: superAdmin.email, name: superAdmin.name };
}

export async function createSuperAdminSessionCookie(payload: SuperAdminPayload) {
  const secret = getSecret();
  const token = await encode({ token: payload as unknown as JWT, secret, maxAge: MAX_AGE });

  cookies().set(SUPER_ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export function clearSuperAdminSessionCookie() {
  cookies().set(SUPER_ADMIN_COOKIE, '', { path: '/', maxAge: 0 });
}

export async function getSuperAdminSession(): Promise<SuperAdminPayload | null> {
  const token = cookies().get(SUPER_ADMIN_COOKIE)?.value;
  if (!token) return null;

  try {
    const secret = getSecret();
    const decoded = await decode({ token, secret });
    if (!decoded?.id || !decoded?.email) return null;
    return { id: decoded.id as string, email: decoded.email as string, name: decoded.name as string };
  } catch {
    return null;
  }
}
