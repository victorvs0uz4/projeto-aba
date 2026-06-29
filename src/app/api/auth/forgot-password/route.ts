import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { sendEmail, buildForgotPasswordEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'Informe o e-mail.' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, active: true, clinicId: true },
  });

  // Resposta genérica independente do e-mail existir, para não expor quais contas existem.
  if (user && user.active) {
    const resetPasswordToken = randomBytes(32).toString('hex');
    const resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken, resetPasswordExpiresAt },
    });

    const resetLink = `${process.env.NEXTAUTH_URL}/reset-password/${resetPasswordToken}`;
    const html = buildForgotPasswordEmail(user.name, resetLink);

    await sendEmail({
      to: [{ name: user.name, email: user.email }],
      subject: 'Redefinição de senha — Clínica ABA',
      html,
      clinicId: user.clinicId,
    });
  }

  return NextResponse.json({
    message: 'Se houver uma conta com esse e-mail, enviaremos um link de redefinição de senha.',
  });
}
