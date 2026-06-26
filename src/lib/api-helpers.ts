import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from './auth';

interface AuthSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    clinicId: string;
    professionalId?: string;
  };
}

type AuthResult =
  | { session: AuthSession; error: null }
  | { session: null; error: NextResponse<{ error: string }> };

export async function getAuth(): Promise<AuthResult> {
  const session = await getServerSession(authOptions) as AuthSession | null;
  if (!session) {
    return { session: null, error: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) };
  }
  return { session, error: null };
}

export async function getAdminAuth(): Promise<AuthResult> {
  const result = await getAuth();
  if (result.error) return result;
  if (result.session!.user.role !== 'ADMIN') {
    return {
      session: null,
      error: NextResponse.json({ error: 'Apenas administradores podem realizar esta ação.' }, { status: 403 }),
    };
  }
  return result;
}

export async function getNonGuardianAuth(): Promise<AuthResult> {
  const result = await getAuth();
  if (result.error) return result;
  if (result.session!.user.role === 'GUARDIAN') {
    return {
      session: null,
      error: NextResponse.json({ error: 'Não autorizado' }, { status: 403 }),
    };
  }
  return result;
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function notFound(message = 'Não encontrado') {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function conflict(message: string, conflicts?: unknown[]) {
  return NextResponse.json(
    { error: message, ...(conflicts ? { conflicts } : {}) },
    { status: 409 },
  );
}
