import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminAuth, notFound, conflict, ok } from '@/lib/api-helpers';
import { sendEmail, buildInviteEmail } from '@/lib/email';
import { randomBytes } from 'crypto';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await getAdminAuth();
  if (error) return error;

  const professional = await prisma.professional.findFirst({
    where: { id: params.id, clinicId: session.user.clinicId },
    include: { user: true },
  });

  if (!professional) return notFound('Profissional não encontrado.');

  if (professional.user.emailVerified) {
    return conflict('Este profissional já ativou a conta.');
  }

  const inviteToken = randomBytes(32).toString('hex');
  const inviteExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: professional.userId },
    data: { inviteToken, inviteExpiresAt },
  });

  const host = req.headers.get('host') ?? '';
  const proto = req.headers.get('x-forwarded-proto') ?? (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const inviteLink = `${proto}://${host}/set-password/${inviteToken}`;
  const html = buildInviteEmail(professional.user.name, inviteLink, 'PROFESSIONAL');

  await sendEmail({
    to: [{ name: professional.user.name, email: professional.user.email }],
    subject: 'Clínica ABA — Novo link de ativação de conta',
    html,
    clinicId: session.user.clinicId,
  });

  return ok({ success: true });
}
