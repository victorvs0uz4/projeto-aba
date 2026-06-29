import { NextRequest, NextResponse } from 'next/server';
import { getAuth, badRequest, conflict, ok } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';

export async function PATCH(req: NextRequest) {
  const { session, error } = await getAuth();
  if (error) return error;

  const { email, currentPassword } = await req.json();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest('Informe um e-mail válido.');
  }
  if (!currentPassword) {
    return badRequest('Informe sua senha atual para confirmar a alteração.');
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash) {
    return badRequest('Conta sem senha definida.');
  }

  const isValid = await verifyPassword(user.passwordHash, currentPassword);
  if (!isValid) {
    return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 401 });
  }

  if (email === user.email) {
    return badRequest('O novo e-mail deve ser diferente do atual.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return conflict('Este e-mail já está em uso por outra conta.');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { email },
  });

  return ok({ success: true });
}
