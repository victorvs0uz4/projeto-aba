import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth, getAdminAuth, notFound, ok } from '@/lib/api-helpers';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await getAuth();
  if (error) return error;

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, clinicId: session.user.clinicId },
    include: {
      guardians: { include: { user: { select: { id: true, name: true, email: true, phone: true } } } },
      sessions: {
        include: {
          professional: { include: { user: { select: { name: true } } } },
          room: { select: { name: true } },
        },
        orderBy: { startDatetime: 'desc' },
        take: 20,
      },
    },
  });

  if (!patient) return notFound();
  return ok(patient);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await getAdminAuth();
  if (error) return error;

  const body = await req.json();
  const { name, birthDate, treatmentPlan, notes, active } = body;

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, clinicId: session.user.clinicId },
  });

  if (!patient) return notFound();

  await prisma.patient.update({
    where: { id: params.id },
    data: { name, birthDate: birthDate ? new Date(birthDate) : null, treatmentPlan, notes, active },
  });

  return ok({ success: true });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await getAdminAuth();
  if (error) return error;

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, clinicId: session.user.clinicId },
    include: { _count: { select: { sessions: { where: { status: { not: 'CANCELLED' } } } } } },
  });

  if (!patient) return notFound();

  if (patient._count.sessions > 0) {
    await prisma.patient.update({ where: { id: params.id }, data: { active: false } });
    return ok({ success: true, message: 'Paciente desativado (possui sessões ativas).' });
  }

  await prisma.patient.delete({ where: { id: params.id } });
  return ok({ success: true });
}
