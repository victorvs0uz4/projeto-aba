import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth, getAdminAuth, badRequest, ok, created } from '@/lib/api-helpers';
import { hashPassword } from '@/lib/password';

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
        let user = await tx.user.findUnique({ where: { email: g.email } });

        if (!user) {
          const hash = await hashPassword(g.password || 'Acesso@1234');
          user = await tx.user.create({
            data: {
              name: g.name,
              email: g.email,
              phone: g.phone,
              passwordHash: hash,
              role: 'GUARDIAN',
              clinicId: session.user.clinicId,
            },
          });
        }

        await tx.guardian.create({
          data: { patientId: p.id, userId: user.id, relationship: g.relationship || 'Responsável' },
        });
      }
    }

    return p;
  });

  return created(patient);
}
