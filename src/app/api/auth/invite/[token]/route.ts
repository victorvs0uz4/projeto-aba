import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';

export async function GET(_: NextRequest, { params }: { params: { token: string } }) {
  const user = await prisma.user.findFirst({
    where: {
      inviteToken: params.token,
      inviteExpiresAt: { gt: new Date() },
      emailVerified: false,
    },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    return NextResponse.json(
      { error: 'Link inválido ou expirado. Solicite um novo convite ao administrador.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ name: user.name, email: user.email });
}

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const { password } = await req.json();

  if (!password || password.length < 8) {
    return NextResponse.json(
      { error: 'A senha deve ter pelo menos 8 caracteres.' },
      { status: 400 }
    );
  }

  const user = await prisma.user.findFirst({
    where: {
      inviteToken: params.token,
      inviteExpiresAt: { gt: new Date() },
      emailVerified: false,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: 'Link inválido ou expirado. Solicite um novo convite ao administrador.' },
      { status: 404 }
    );
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      emailVerified: true,
      inviteToken: null,
      inviteExpiresAt: null,
    },
  });

  return NextResponse.json({ success: true });
}
