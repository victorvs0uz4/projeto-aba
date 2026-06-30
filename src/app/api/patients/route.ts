import { NextRequest } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getAuth, getAdminAuth, badRequest, ok, created } from '@/lib/api-helpers';
import { sendEmail, buildInviteEmail } from '@/lib/email';

export async function GET() {
  const { session, error } = await getAuth();
  if (error) return error;

  if (session.user.role === 'GUARDIAN') {
    const guardians = await prisma.guardian.findMany({
      where: { userId: session.user.id },
      include: {
        patient: {
          include: { guardians: { include: { user: { select: { name: true, email: true, phone: true } } } } },
        },
      },
    });
    return ok(guardians.map(g => g.patient));
  }

  const patients = await prisma.patient.findMany({
    where: { clinicId: session.user.clinicId },
    include: {
      guardians: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      _count: { select: { sessions: true } },
    },
    orderBy: { name: 'asc' },
  });

  return ok(patients);
}

export async function POST(req: NextRequest) {
  const { session, error } = await getAdminAuth();
  if (error) return error;

  const body = await req.json();
  const { name, birthDate, treatmentPlan, notes, guardians } = body;

  if (!name) return badRequest('Nome é obrigatório.');

  const newGuardians: { name: string; email: string; inviteToken: string }[] = [];

  const patient = await prisma.$transaction(async (tx) => {
    const p = await tx.patient.create({
      data: {
        name,
        birthDate: birthDate ? new Date(birthDate) : null,
        treatmentPlan,
        notes,
        clinicId: session.user.clinicId,
      },
    });

    if (guardians?.length) {
      for (const g of guardians) {
        let user = await tx.user.findUnique({
          where: { email_clinicId: { email: g.email, clinicId: session.user.clinicId } },
        });

        if (!user) {
          const inviteToken = randomBytes(32).toString('hex');
          const inviteExpiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

          user = await tx.user.create({
            data: {
              name: g.name,
              email: g.email,
              phone: g.phone,
              passwordHash: null,
              emailVerified: false,
              inviteToken,
              inviteExpiresAt,
              role: 'GUARDIAN',
              clinicId: session.user.clinicId,
            },
          });

          newGuardians.push({ name: g.name, email: g.email, inviteToken });
        }

        await tx.guardian.create({
          data: { patientId: p.id, userId: user.id, relationship: g.relationship || 'Responsável' },
        });
      }
    }

    return p;
  });

  for (const guardian of newGuardians) {
    const inviteLink = `${process.env.NEXTAUTH_URL}/set-password/${guardian.inviteToken}`;
    const html = buildInviteEmail(guardian.name, inviteLink, 'GUARDIAN');
    sendEmail({
      to: [{ name: guardian.name, email: guardian.email }],
      subject: 'Bem-vindo(a) à Clínica ABA — Ative sua conta',
      html,
      clinicId: session.user.clinicId,
    }).catch(console.error);
  }

  return created(patient);
}
