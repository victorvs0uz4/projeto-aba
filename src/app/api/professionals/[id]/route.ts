import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuth, notFound, ok } from '@/lib/api-helpers';
import { hashPassword } from '@/lib/password';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await getAuth();
  if (error) return error;

  const professional = await prisma.professional.findFirst({
    where: { id: params.id, clinicId: session.user.clinicId },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, active: true } },
      availabilities: true,
      _count: { select: { sessions: true } },
    },
  });

  if (!professional) return notFound();
  return ok(professional);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return ok({ error: 'Não autorizado' }, 403);
  }

  const body = await req.json();
  const { name, email, phone, specialty, weeklyHours, bio, availabilities, active, password } = body;

  const professional = await prisma.professional.findFirst({
    where: { id: params.id, clinicId: session.user.clinicId },
  });

  if (!professional) return notFound();

  await prisma.$transaction(async (tx) => {
    const userUpdate: Record<string, unknown> = { name, email, phone, active };
    if (password) userUpdate.passwordHash = await hashPassword(password);

    await tx.user.update({ where: { id: professional.userId }, data: userUpdate });
    await tx.professional.update({
      where: { id: params.id },
      data: { specialty, weeklyHours, bio, active },
    });

    if (availabilities) {
      await tx.professionalAvailability.deleteMany({ where: { professionalId: params.id } });
      if (availabilities.length > 0) {
        await tx.professionalAvailability.createMany({
          data: availabilities.map((a: { dayOfWeek: string; startTime: string; endTime: string }) => ({
            professionalId: params.id,
            dayOfWeek: a.dayOfWeek,
            startTime: a.startTime,
            endTime: a.endTime,
          })),
        });
      }
    }
  });

  return ok({ success: true });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return ok({ error: 'Não autorizado' }, 403);
  }

  const professional = await prisma.professional.findFirst({
    where: { id: params.id, clinicId: session.user.clinicId },
    include: { _count: { select: { sessions: { where: { status: { not: 'CANCELLED' } } } } } },
  });

  if (!professional) return notFound();

  if (professional._count.sessions > 0) {
    await prisma.professional.update({ where: { id: params.id }, data: { active: false } });
    await prisma.user.update({ where: { id: professional.userId }, data: { active: false } });
    return ok({ success: true, message: 'Profissional desativado (possui sessões ativas).' });
  }

  await prisma.user.delete({ where: { id: professional.userId } });
  return ok({ success: true });
}
