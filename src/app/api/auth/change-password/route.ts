import { NextRequest, NextResponse } from 'next/server';
import { getAuth, badRequest, ok } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';
import { hashPassword, verifyPassword } from '@/lib/password';
import { checkRateLimit } from '@/lib/rate-limit';

export async function PATCH(req: NextRequest) {
  const { session, error } = await getAuth();
  if (error) return error;

  const { allowed, retryAfterMs } = checkRateLimit(`change-password:${session.user.id}`, 5, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } },
    );
  }

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword) {
    return badRequest('Informe sua senha atual.');
  }
  if (!newPassword || newPassword.length < 8) {
    return badRequest('A nova senha deve ter pelo menos 8 caracteres.');
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash) {
    return badRequest('Conta sem senha definida.');
  }

  const isValid = await verifyPassword(user.passwordHash, currentPassword);
  if (!isValid) {
    return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 401 });
  }

  if (newPassword === currentPassword) {
    return badRequest('A nova senha deve ser diferente da senha atual.');
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return ok({ success: true });
}
