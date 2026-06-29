import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  if (!session.user.mustChangePassword) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
  }

  const { email, password } = await req.json();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 });
  }

  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== session.user.id) {
    return NextResponse.json({ error: 'Este e-mail já está em uso por outra conta.' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      email,
      passwordHash,
      mustChangePassword: false,
      emailVerified: true,
    },
  });

  return NextResponse.json({ success: true });
}
