import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth, getAdminAuth, badRequest, conflict, ok, created } from '@/lib/api-helpers';
import { sendEmail, buildInviteEmail } from '@/lib/email';
import { randomBytes } from 'crypto';

export async function GET() {
  const { session, error } = await getAuth();
  if (error) return error;

  const professionals = await prisma.professional.findMany({
    where: { clinicId: session.user.clinicId },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, active: true, emailVerified: true, inviteExpiresAt: true } },
      availabilities: true,
      _count: { select: { sessions: true } },
    },
    orderBy: { user: { name: 'asc' } },
  });

  return ok(professionals);
}

export async function POST(req: NextRequest) {
  const { session, error } = await getAdminAuth();
  if (error) return error;

  const body = await req.json();
  const { name, email, phone, specialty, weeklyHours, bio, availabilities } = body;

  if (!name || !email) {
    return badRequest('Nome e e-mail são obrigatórios.');
  }

  const existing = await prisma.user.findUnique({
    where: { email_clinicId: { email, clinicId: session.user.clinicId } },
  });
  if (existing) {
    return conflict('Já existe um usuário com este e-mail.');
  }

  const inviteToken = randomBytes(32).toString('hex');
  const inviteExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email, name, phone,
        role: 'PROFESSIONAL',
        clinicId: session.user.clinicId,
        passwordHash: null,
        emailVerified: false,
        inviteToken,
        inviteExpiresAt,
      },
    });

    const professional = await tx.professional.create({
      data: {
        userId: user.id,
        clinicId: session.user.clinicId,
        specialty,
        weeklyHours: weeklyHours ?? 40,
        bio,
      },
    });

    if (availabilities?.length) {
      await tx.professionalAvailability.createMany({
        data: availabilities.map((a: any) => ({
          professionalId: professional.id,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
        })),
      });
    }

    return { user, professional };
  });

  const inviteLink = `${process.env.NEXTAUTH_URL}/set-password/${inviteToken}`;
  const html = buildInviteEmail(name, inviteLink, 'PROFESSIONAL');
  sendEmail({
    to: [{ name, email }],
    subject: 'Bem-vindo(a) à Clínica ABA — Ative sua conta',
    html,
    clinicId: session.user.clinicId,
  }).catch(console.error);

  return created(result.professional);
}
