import { NextResponse } from 'next/server';
import { getSuperAdminSession } from './super-admin-auth';

type SuperAdminAuthResult =
  | { session: { id: string; email: string; name: string }; error: null }
  | { session: null; error: NextResponse<{ error: string }> };

export async function getSuperAdminAuth(): Promise<SuperAdminAuthResult> {
  const session = await getSuperAdminSession();
  if (!session) {
    return { session: null, error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) };
  }
  return { session, error: null };
}
