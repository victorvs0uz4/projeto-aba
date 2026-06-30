import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSuperAdminAuth } from '@/lib/super-admin-helpers';
import { verifyPassword, hashPassword } from '@/lib/password';

const MIN_LENGTH = 8;
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{8,}$/;

export async function POST(req: NextRequest) {
  const { session, error } = await getSuperAdminAuth();
  if (error) return error;

  const { currentPassword, newPassword, confirmPassword } = await req.json();

  if (!currentPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 });
  }

  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: 'A nova senha e a confirmação não coincidem.' }, { status: 400 });
  }

  if (newPassword.length < MIN_LENGTH) {
    return NextResponse.json({ error: `A nova senha deve ter no mínimo ${MIN_LENGTH} caracteres.` }, { status: 400 });
  }

  if (!STRONG_PASSWORD.test(newPassword)) {
    return NextResponse.json(
      { error: 'A senha deve conter letra maiúscula, minúscula, número e caractere especial.' },
      { status: 400 },
    );
  }

  const admin = await prisma.superAdmin.findUnique({ where: { id: session!.id } });
  if (!admin) return NextResponse.json({ error: 'Administrador não encontrado.' }, { status: 404 });

  const isValid = await verifyPassword(admin.passwordHash, currentPassword);
  if (!isValid) {
    return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 400 });
  }

  const newHash = await hashPassword(newPassword);
  await prisma.superAdmin.update({ where: { id: admin.id }, data: { passwordHash: newHash } });

  return NextResponse.json({ ok: true });
}
